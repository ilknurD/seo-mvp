import os
import datetime
from datetime import date, timedelta
from dotenv import load_dotenv

from fastapi import FastAPI, Depends, HTTPException, Response, Request
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import RedirectResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request as GoogleRequest
import httpx
from httpx import TimeoutException, HTTPStatusError, RequestError
from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Text, func, BigInteger, CheckConstraint, Numeric
from sqlalchemy.orm import relationship, backref
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.exc import IntegrityError
from sqlalchemy.dialects.postgresql import UUID, JSONB, INET
from sqlalchemy.future import select
from pydantic import BaseModel
from passlib.hash import bcrypt
from io import BytesIO
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
import jwt
import httplib2
import http.client
from urllib.parse import urlparse
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas
from io import BytesIO
from pdf_builder import create_seo_pdf, create_page_analysis_pdf
from models import Base, User, TokenStorage, SiteSettings, GoogleAnalyticsProperty, Site

load_dotenv()
os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'

# ---------- FastAPI ----------
app = FastAPI(title="SEOMVP Backend", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- DB ----------
DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL is None:
    raise ValueError("DATABASE_URL environment variable is not set")
engine = create_async_engine(DATABASE_URL, echo=False)
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

# ---------- JWT ----------
SECRET = os.getenv("JWT_SECRET", "change-me")

def create_jwt(user_id: int):
    return jwt.encode({"sub": str(user_id)}, SECRET, algorithm="HS256")

# ---------- DB HELPERS ----------
async def get_db():
    async with async_session() as session:
        yield session

# ---------- MODELS ----------
class LoginPayload(BaseModel):
    username: str
    password: str

# ---------- AUTH ----------
GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"

# .env'den gelen bilgileri kullanarak yetkilendirme akışını oluşturuyoruz
flow = Flow.from_client_config(
    {
        "web": {
            "client_id": os.getenv("GOOGLE_CLIENT_ID"),
            "client_secret": os.getenv("GOOGLE_CLIENT_SECRET"),
            "auth_uri": GOOGLE_AUTH_URL,
            "token_uri": GOOGLE_TOKEN_URL,
            "redirect_uris": [os.getenv("REDIRECT_URI")],
        }
    },
    scopes=[
        "https://www.googleapis.com/auth/webmasters.readonly",
        "openid",
        "https://www.googleapis.com/auth/userinfo.profile",
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/analytics.readonly"  # Google Analytics izni
    ]
)
flow.redirect_uri = os.getenv("REDIRECT_URI")


# ---------- ENDPOINTS ----------
@app.post("/auth/login")
async def login(payload: LoginPayload, response: Response, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(User).where(User.username == payload.username))
    user = res.scalar_one_or_none()
    if not user or not bcrypt.verify(payload.password, user.hashed_password):
        return RedirectResponse(url="/auth/google", status_code=302)
    token = create_jwt(user.id)
    response.set_cookie(key="token", value=token, httponly=True)
    return {"ok": True}

@app.get("/login")
async def google_login():
    auth_url, _ = flow.authorization_url(
        prompt="consent",
        access_type="offline"
    )
    return RedirectResponse(auth_url)

@app.get("/auth/google/callback")
async def google_callback(request: Request, db: AsyncSession = Depends(get_db)):
    try:
        flow.fetch_token(authorization_response=str(request.url))
        creds = flow.credentials
        service = build("oauth2", "v2", credentials=creds)
        user_info = service.userinfo().get().execute()
        google_id = user_info["id"]

        res = await db.execute(select(User).where(User.google_id == google_id))
        user = res.scalar_one_or_none()
        if not user:
            user = User(username=user_info["email"], google_id=google_id, hashed_password="")
            db.add(user)
            await db.commit()
            await db.refresh(user)

        res = await db.execute(select(TokenStorage).where(TokenStorage.user_id == user.id))
        token_storage = res.scalar_one_or_none()
        
        if not token_storage:
            token_storage = TokenStorage(
                user_id=user.id,
                access_token=creds.token,
                refresh_token=creds.refresh_token,
                token_uri=creds.token_uri,
                client_id=creds.client_id,
                client_secret=creds.client_secret,
                scopes=",".join(creds.scopes),
                expiry=creds.expiry
            )
            db.add(token_storage)
        else:
            token_storage.access_token = creds.token
            token_storage.refresh_token = creds.refresh_token
            token_storage.scopes = ",".join(creds.scopes)
            token_storage.expiry = creds.expiry
        
        await db.commit()
        
        # JWT token oluştur
        token = create_jwt(user.id)
        
        redirect_response = RedirectResponse(
            url="http://localhost:3000/dashboard", 
            status_code=302
        )
        
        # Cookie ayarlarını localhost için optimize
        redirect_response.set_cookie(
            key="token", 
            value=token, 
            httponly=True,
            samesite="lax",  
            secure=False,   
            max_age=86400,   
            path="/",     
            domain=None      
        )
        
        return redirect_response

    except Exception as e:
        print(f"Callback işlemi sırasında bir hata oluştu: {e}")
        raise HTTPException(status_code=500, detail="Kimlik doğrulama işlemi sırasında bir hata oluştu.")
        
def create_jwt (user_id: int):
    """
    Kullanıcı ID'sine göre JWT oluşturur.
    """
    return jwt.encode({"sub": str(user_id)}, SECRET, algorithm="HS256")

@app.get("/auth/status")
async def auth_status(request: Request):
    """
    Kullanıcının oturum açıp açmadığını kontrol eder.
    """
    # Cookie'yi almaya çalış
    jwt_token = request.cookies.get("token")
    
    # Debug için cookie'leri yazdır
    print(f"Mevcut cookie'ler: {request.cookies}")
    print(f"Token cookie: {jwt_token}")
    
    if not jwt_token:
        print("Cookie'de token bulunamadı")
        raise HTTPException(status_code=401, detail="Yetkilendirme token'ı bulunamadı.")
    
    try:
        payload = jwt.decode(jwt_token, SECRET, algorithms=["HS256"])
        user_id = int(payload.get("sub"))  # String'den integer'a çevir
        print(f"Token geçerli, user_id: {user_id}")
        return {"isAuthenticated": True, "userId": user_id}
    except jwt.InvalidTokenError as e:
        print(f"Token geçersiz: {e}")
        raise HTTPException(status_code=401, detail="Geçersiz token.")
    except (ValueError, TypeError) as e:
        print(f"User ID parse hatası: {e}")
        raise HTTPException(status_code=401, detail="Geçersiz token formatı.")


# Ek olarak logout endpoint'i ekle
@app.post("/auth/logout")
async def logout(response: Response):
    """
    Kullanıcının oturumunu kapatır
    """
    response.delete_cookie(key="token", path="/")
    return {"message": "Başarıyla çıkış yapıldı"}


# Test endpoint'i ekle (geliştirme için)
@app.get("/auth/test-cookie")
async def test_cookie(response: Response):
    """
    Cookie ayarlama testleri için
    """
    test_token = create_jwt(999)  # Test user ID
    response.set_cookie(
        key="test_token",
        value=test_token,
        httponly=True,
        samesite="lax",
        secure=False,
        max_age=3600,
        path="/"
    )
    return {"message": "Test cookie ayarlandı"}


@app.get("/auth/check-test-cookie")
async def check_test_cookie(request: Request):
    """
    Test cookie'sini kontrol et
    """
    test_token = request.cookies.get("test_token")
    all_cookies = dict(request.cookies)
    return {
        "test_token": test_token,
        "all_cookies": all_cookies,
        "has_test_token": test_token is not None
    }

# ---------- GSC ROUTES ----------
@app.get("/gsc_sites")
async def get_gsc_sites(request: Request, db: AsyncSession = Depends(get_db)):
    print("Frontend'den /gsc_sites rotasına istek geldi.")
    try:
        jwt_token = request.cookies.get("token")
        if not jwt_token:
            print("Hata: Çerezlerde yetkilendirme token'ı bulunamadı.")
            raise HTTPException(status_code=401, detail="Yetkilendirme token'ı bulunamadı.")
        
        try:
            payload = jwt.decode(jwt_token, SECRET, algorithms=["HS256"])
            user_id = int(payload.get("sub"))
            if not user_id:
                raise HTTPException(status_code=401, detail="Geçersiz token.")
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=401, detail="Geçersiz token.")

        res = await db.execute(select(TokenStorage).where(TokenStorage.user_id == user_id))
        token_storage = res.scalar_one_or_none()
        if not token_storage:
            raise HTTPException(status_code=401, detail="Kullanıcı için Google token'ı bulunamadı.")
        
        creds = Credentials(
            token=token_storage.access_token,
            refresh_token=token_storage.refresh_token,
            token_uri=token_storage.token_uri,
            client_id=token_storage.client_id,
            client_secret=token_storage.client_secret,
            scopes=token_storage.scopes.split(","),
            expiry=token_storage.expiry
        )
        
        if not creds.valid:
            if creds.expired and creds.refresh_token:
                creds.refresh(GoogleRequest())
                token_storage.access_token = creds.token
                token_storage.expiry = creds.expiry
                await db.commit()
            else:
                raise HTTPException(status_code=401, detail="Token süresi doldu ve yenilenemedi.")

        service = build('searchconsole', 'v1', credentials=creds)
        site_list = service.sites().list().execute()
        
        print(f"Google API'den gelen ham yanıt: {site_list}")
        
        if 'siteEntry' in site_list:
            return site_list['siteEntry']
        else:
            return JSONResponse(content=[], status_code=200)

    except HTTPException as e:
        print(f"HTTP İstisnası yakalandı: {e.detail}")
        raise
    except http.client.RemoteDisconnected as e:
        print(f"Hata: API isteği sırasında sunucu bağlantısı beklenmedik bir şekilde kapandı. {e}")
        raise HTTPException(status_code=500, detail="API isteği sırasında sunucu bağlantısı beklenmedik bir şekilde kapandı.")
    except Exception as e:
        print(f"GSC API isteği sırasında beklenmedik bir hata oluştu: {type(e).__name__} - {e}")
        raise HTTPException(status_code=500, detail=f"API isteği sırasında bir hata oluştu: {str(e)}")


@app.get("/sites")
async def get_sites(request: Request, db: AsyncSession = Depends(get_db)):
    # 1. Kimlik doğrulama kontrolü
    jwt_token = request.cookies.get("token")
    if not jwt_token:
        print("Hata: Token bulunamadı")
        raise HTTPException(status_code=401, detail="Not logged in")
    
    try:
        payload = jwt.decode(jwt_token, SECRET, algorithms=["HS256"])
        user_id = int(payload["sub"])
        print(f"Token doğrulandı, user_id: {user_id}")
    except (jwt.InvalidTokenError, ValueError, TypeError) as e:
        print(f"Token doğrulama hatası: {e}")
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # 2. Kullanıcının Google token'ını veritabanından al
    res = await db.execute(select(TokenStorage).where(TokenStorage.user_id == user_id))
    token_storage = res.scalar_one_or_none()
    if not token_storage:
        print("Hata: Google token bulunamadı")
        raise HTTPException(status_code=401, detail="No Google token found")
    
    # 3. Google Credentials oluştur
    creds = Credentials(
        token=token_storage.access_token,
        refresh_token=token_storage.refresh_token,
        token_uri=token_storage.token_uri,
        client_id=token_storage.client_id,
        client_secret=token_storage.client_secret,
        scopes=token_storage.scopes.split(","),
        expiry=token_storage.expiry
    )
    
    # 4. Token yenileme kontrolü
    if not creds.valid and creds.expired and creds.refresh_token:
        try:
            print("Token yenileniyor...")
            creds.refresh(GoogleRequest())
            # Veritabanını güncelle
            token_storage.access_token = creds.token
            token_storage.expiry = creds.expiry
            await db.commit()
            print("Token başarıyla yenilendi")
        except Exception as e:
            print(f"Token yenileme hatası: {e}")
            raise HTTPException(status_code=401, detail="Token refresh failed")
    
    # 5. Google Search Console servisini oluştur
    try:
        print("Google Search Console servisi oluşturuluyor...")
        service = build('searchconsole', 'v1', credentials=creds)
        print("Google Search Console servisi başarıyla oluşturuldu")
    except Exception as e:
        print(f"Google API servisi oluşturulamadı: {e}")
        raise HTTPException(status_code=500, detail="Failed to create Google API service")
    
    # 6. Site listesini al - EK HATA YAKALAMA EKLEDİK
    try:
        print("Site listesi alınıyor...")
        site_list = service.sites().list().execute()
        print(f"Google API'den gelen ham yanıt: {site_list}")
        
        # Yanıtın yapısını kontrol et
        if not site_list:
            print("Hata: Google API boş yanıt döndürdü")
            return {"sites": []}
            
        if 'siteEntry' not in site_list:
            print("Hata: Yanıtta 'siteEntry' anahtarı bulunamadı")
            print(f"Yanıt anahtarları: {list(site_list.keys())}")
            return {"sites": []}
        
        # Her site için permissionLevel bilgisini ekle
        sites = []
        for site in site_list['siteEntry']:
            site_url = site.get('siteUrl', '')
            permission_level = site.get('permissionLevel', '')
            
            print(f"Site bulundu: {site_url}, Yetki: {permission_level}")
            
            # Sadece tam yetkili veya sahip olduğumuz siteleri ekle
            if permission_level in ['siteOwner', 'siteFullUser']:
                sites.append({
                    'siteUrl': site_url,
                    'permissionLevel': permission_level
                })
            else:
                print(f"Site atlandı: {site_url}, Yetki: {permission_level}")
        
        print(f"Döndürülecek siteler: {sites}")
        return {"sites": sites}

    except Exception as e:
        print(f"Site listesi alınırken hata: {type(e).__name__} - {e}")
    
    # Google API hatalarını daha yakalayalım
    if hasattr(e, 'reason') and e.reason in ['quotaExceeded', 'dailyLimitExceeded']:
        print("Hata: Google API kotası aşıldı")
        raise HTTPException(status_code=429, detail="Google API quota exceeded")
    elif hasattr(e, 'code') and e.code == 403:
        print("Hata: Google API erişim reddedildi")
        raise HTTPException(status_code=403, detail="Google API access denied")
    elif hasattr(e, 'code') and e.code == 401:
        print("Hata: Google token geçersiz")
        raise HTTPException(status_code=401, detail="Google token invalid")
    else:
        raise HTTPException(status_code=500, detail=f"Failed to fetch sites: {str(e)}")


@app.get("/sites/{site}/pages")
async def get_pages(site: str, request: Request, db: AsyncSession = Depends(get_db)):
    print(f"=== Sayfalar endpoint'ine istek geldi: {site} ===")
    
    try:
        # 1. Kimlik doğrulama kontrolü
        jwt_token = request.cookies.get("token")
        if not jwt_token:
            print("Hata: Token bulunamadı")
            raise HTTPException(status_code=401, detail="Not logged in")
        
        try:
            payload = jwt.decode(jwt_token, SECRET, algorithms=["HS256"])
            user_id = int(payload["sub"])
            print(f"Token doğrulandı, user_id: {user_id}")
        except (jwt.InvalidTokenError, ValueError, TypeError) as e:
            print(f"Token doğrulama hatası: {e}")
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # 2. Kullanıcının Google token'ını veritabanından al
        res = await db.execute(select(TokenStorage).where(TokenStorage.user_id == user_id))
        token_storage = res.scalar_one_or_none()
        if not token_storage:
            print("Hata: Google token bulunamadı")
            raise HTTPException(status_code=401, detail="No Google token found")
        
        # 3. Google Credentials oluştur
        creds = Credentials(
            token=token_storage.access_token,
            refresh_token=token_storage.refresh_token,
            token_uri=token_storage.token_uri,
            client_id=token_storage.client_id,
            client_secret=token_storage.client_secret,
            scopes=token_storage.scopes.split(","),
            expiry=token_storage.expiry
        )
        
        # 4. Token yenileme kontrolü
        if not creds.valid and creds.expired and creds.refresh_token:
            try:
                print("Token yenileniyor...")
                creds.refresh(GoogleRequest())
                # Veritabanını güncelle
                token_storage.access_token = creds.token
                token_storage.expiry = creds.expiry
                await db.commit()
                print("Token başarıyla yenilendi")
            except Exception as e:
                print(f"Token yenileme hatası: {e}")
                raise HTTPException(status_code=401, detail="Token refresh failed")
        
        # 5. Google Search Console servisini oluştur
        try:
            print("Google Search Console servisi oluşturuluyor...")
            service = build('searchconsole', 'v1', credentials=creds)
            print("Google Search Console servisi başarıyla oluşturuldu")
        except Exception as e:
            print(f"Google API servisi oluşturulamadı: {e}")
            raise HTTPException(status_code=500, detail="Failed to create Google API service")
        
        # 6. Sayfaları al
        try:
            print("Sayfalar alınıyor...")
            
            # Son 30 günün verilerini al
            end_date = date.today()
            start_date = end_date - timedelta(days= date_range)
            
            request_body = {
                "startDate": start_date.strftime("%Y-%m-%d"),
                "endDate": end_date.strftime("%Y-%m-%d"),
                "dimensions": ["page"],
                "rowLimit": 20
            }
            
            # Google API tam URL formatı bekler: https://domain.com/
            site_url = f"https://{site}/"
            print(f"Site URL: {site_url}")
            
            response = service.searchanalytics().query(
                siteUrl=site_url,
                body=request_body
            ).execute()
            
            print(f"Google API yanıtı: {response}")
            
            pages = []
            if "rows" in response:
                for row in response["rows"]:
                    page_url = row["keys"][0]
                    # URL'den başlık oluştur
                    page_title = page_url.split("/")[-1] or "Ana Sayfa"
                    
                    pages.append({
                        "url": page_url,
                        "title": page_title
                    })
            
            print(f"Döndürülen sayfalar: {pages}")
            return {"pages": pages}
        
        except Exception as e:
            print(f"Sayfaları getirme hatası: {type(e).__name__} - {e}")
            raise HTTPException(status_code=500, detail=f"Failed to fetch pages: {str(e)}")
    
    except HTTPException:
        # HTTPException'ları yeniden yükselt
        raise
    except Exception as e:
        print(f"Beklenmedik hata: {type(e).__name__} - {e}")
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")

@app.get("/sites/{site}/lighthouse")
async def get_lighthouse_data(site: str, url: str, request: Request, db: AsyncSession = Depends(get_db)):
    # URL'yi decode et
    from urllib.parse import unquote
    decoded_url = unquote(url)
    
    try:
        print(f"Lighthouse endpoint'i çağrıldı: site={site}, url={decoded_url}")
        
        # 1. Kimlik doğrulama kontrolü
        jwt_token = request.cookies.get("token")
        if not jwt_token:
            print("Hata: Token bulunamadı")
            raise HTTPException(status_code=401, detail="Not logged in")
        
        try:
            payload = jwt.decode(jwt_token, SECRET, algorithms=["HS256"])
            user_id = int(payload["sub"])
            print(f"Token doğrulandı, user_id: {user_id}")
        except (jwt.InvalidTokenError, ValueError, TypeError) as e:
            print(f"Token doğrulama hatası: {e}")
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # 2. Kullanıcının Google token'ını veritabanından al
        res = await db.execute(select(TokenStorage).where(TokenStorage.user_id == user_id))
        token_storage = res.scalar_one_or_none()
        if not token_storage:
            print("Hata: Google token bulunamadı")
            raise HTTPException(status_code=401, detail="No Google token found")
        
        # 3. Google Credentials oluştur
        creds = Credentials(
            token=token_storage.access_token,
            refresh_token=token_storage.refresh_token,
            token_uri=token_storage.token_uri,
            client_id=token_storage.client_id,
            client_secret=token_storage.client_secret,
            scopes=token_storage.scopes.split(","),
            expiry=token_storage.expiry
        )
        
        # 4. Token yenileme kontrolü
        if not creds.valid and creds.expired and creds.refresh_token:
            try:
                print("Token yenileniyor...")
                creds.refresh(GoogleRequest())
                # Veritabanını güncelle
                token_storage.access_token = creds.token
                token_storage.expiry = creds.expiry
                await db.commit()
                print("Token başarıyla yenilendi")
            except Exception as e:
                print(f"Token yenileme hatası: {e}")
                raise HTTPException(status_code=401, detail="Token refresh failed")
        
        # 5. Site ayarlarından API Key'i al
        settings_res = await db.execute(select(SiteSettings).where(SiteSettings.site == site))
        site_settings = settings_res.scalar_one_or_none()
        
        if not site_settings or not site_settings.api_key or site_settings.api_key_status != 'valid':
            print("Hata: Geçerli API Key bulunamadı")
            raise HTTPException(status_code=400, detail="No valid API key found for this site")
        
        api_key = site_settings.api_key  # Veritabanından API key'i al
        print(f"Kullanılan API Key: {api_key[:10]}...")
        
        # 6. PageSpeed Insights API'sini kullanarak Lighthouse verilerini al
        ps_api_url = f"https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url={decoded_url}&key={api_key}&category=performance&category=seo&category=accessibility&category=best-practices"
        
        print(f"Lighthouse API URL: {ps_api_url}")
        
        async with httpx.AsyncClient(timeout=30.0) as client:  # Zaman aşımını 30 saniyeye ayarla
            response = await client.get(ps_api_url)
            print(f"Lighthouse API yanıt durumu: {response.status_code}")
            
            if response.status_code != 200:
                print(f"Lighthouse API hatası: {response.status_code} - {response.text}")
                raise HTTPException(status_code=response.status_code, detail=f"Lighthouse API error: {response.text}")
            
            data = response.json()
            print("Lighthouse API yanıtı başarıyla alındı")
            
            # Lighthouse sonuçlarını işle
            if "lighthouseResult" not in data:
                print("Hata: Yanıtta lighthouseResult anahtarı bulunamadı")
                raise HTTPException(status_code=500, detail="Invalid Lighthouse API response format")
            
            lighthouse_result = data["lighthouseResult"]
            
            if "categories" not in lighthouse_result:
                print("Hata: Yanıtta categories anahtarı bulunamadı")
                raise HTTPException(status_code=500, detail="Invalid Lighthouse API response format")
            
            categories = lighthouse_result["categories"]
            
            return {
                "performance": {
                    "score": categories["performance"]["score"],
                    "audits": lighthouse_result["audits"]
                },
                "seo": {
                    "score": categories["seo"]["score"],
                    "audits": lighthouse_result["audits"]
                },
                "accessibility": {
                    "score": categories["accessibility"]["score"],
                    "audits": lighthouse_result["audits"]
                },
                "bestPractices": {
                    "score": categories["best-practices"]["score"],
                    "audits": lighthouse_result["audits"]
                }
            }
    
    except httpx.TimeoutException:
        print("Hata: Lighthouse API zaman aşımına uğradı")
        raise HTTPException(status_code=504, detail="Lighthouse API request timed out")
    except httpx.HTTPStatusError as e:
        print(f"Lighthouse API HTTP hatası: {e.response.status_code} - {e.response.text}")
        raise HTTPException(status_code=e.response.status_code, detail=f"Lighthouse API error: {e.response.text}")
    except httpx.RequestError as e:
        print(f"Lighthouse API isteği hatası: {e}")
        raise HTTPException(status_code=500, detail=f"Lighthouse API request error: {str(e)}")
    except KeyError as e:
        print(f"Lighthouse API yanıtında eksik anahtar: {e}")
        raise HTTPException(status_code=500, detail=f"Lighthouse API response missing key: {str(e)}")
    except Exception as e:
        print(f"Lighthouse verisi alma hatası: {type(e).__name__} - {e}")
        raise HTTPException(status_code=500, detail=f"Lighthouse analizi yapılamadı: {str(e)}")

@app.get("/sites/{site}/page-analysis")
async def analyze_page(site: str, url: str, request: Request, db: AsyncSession = Depends(get_db)):
    # Kimlik doğrulama ve Google API entegrasyonu kodları...
    
    # URL'yi decode et
    from urllib.parse import unquote
    decoded_url = unquote(url)
    
    # Burada sayfa analizi yapan bir API çağrısı yapın
    # Örnek bir yanıt:
    return {
        "overallScore": 78,
        "performance": {
            "score": 85,
            "metrics": {
                "First Contentful Paint": {"value": "1.2s", "status": "good"},
                "Largest Contentful Paint": {"value": "2.8s", "status": "needs-improvement"},
                "Cumulative Layout Shift": {"value": "0.05", "status": "good"},
                "Time to Interactive": {"value": "3.1s", "status": "needs-improvement"}
            }
        },
        "seo": {
            "score": 92,
            "issues": [
                {"type": "error", "title": "Meta description eksik", "pages": 3},
                {"type": "warning", "title": "H1 etiketi birden fazla", "pages": 2},
                {"type": "success", "title": "Alt text mevcut", "pages": "Tüm resimler"}
            ]
        },
        "accessibility": {
            "score": 68,
            "issues": [
                {"type": "error", "title": "Renk kontrastı yetersiz", "count": 5},
                {"type": "warning", "title": "Form etiketleri eksik", "count": 3},
                {"type": "error", "title": "Alt text eksik", "count": 8}
            ]
        },
        "bestPractices": {
            "score": 83,
            "items": [
                {"title": "HTTPS kullanımı", "status": "pass"},
                {"title": "Modern resim formatları", "status": "fail"},
                {"title": "Güvenlik başlıkları", "status": "pass"},
                {"title": "Console hataları", "status": "warning"}
            ]
        },
        "pageDetails": [
            {"url": "/anasayfa", "title": "Ana Sayfa", "status": "good", "loadTime": "2.1s", "issues": 2},
            {"url": "/hakkimizda", "title": "Hakkımızda", "status": "average", "loadTime": "3.2s", "issues": 5},
            {"url": "/iletisim", "title": "İletişim", "status": "poor", "loadTime": "4.8s", "issues": 8},
            {"url": "/urunler", "title": "Ürünler", "status": "good", "loadTime": "2.5s", "issues": 3},
            {"url": "/blog", "title": "Blog", "status": "average", "loadTime": "3.1s", "issues": 4}
        ],
        "recommendations": [
            "Resim boyutlarını optimize edin ve modern formatlar (WebP) kullanın",
            "Eksik meta description'ları tamamlayın",
            "Sayfa yükleme hızını artırmak için CSS ve JavaScript'i minimize edin",
            "Erişilebilirlik için renk kontrast oranlarını artırın"
        ]
    }

@app.get("/sites/{site}/settings")
async def get_site_settings(site: str, request: Request, db: AsyncSession = Depends(get_db)):
    print(f"=== Site ayarları endpoint'ine istek geldi: {site} ===")

    jwt_token = request.cookies.get("token")
    if not jwt_token:
        raise HTTPException(status_code=401, detail="Not logged in")

    try:
        payload = jwt.decode(jwt_token, SECRET, algorithms=["HS256"])
        user_id = int(payload["sub"])
    except (jwt.InvalidTokenError, ValueError, TypeError) as e:
        raise HTTPException(status_code=401, detail="Invalid token")

    try:
        # Önce sites tablosunda kayıt var mı?
        site_result = await db.execute(select(Site).where(Site.site_url == site))
        site_record = site_result.scalar_one_or_none()

        if not site_record:
            return {
                "apiKey": "",
                "apiKeyStatus": "not_set",
                "lastTested": None
            }

        # Şimdi SiteSettings var mı?
        # Şimdi SiteSettings var mı?
        settings_result = await db.execute(
            select(SiteSettings)
            .join(Site)
            .where(Site.site_url == site)
        )
        settings = settings_result.scalar_one_or_none()


        if not settings:
            return {
                "apiKey": "",
                "apiKeyStatus": "not_set",
                "lastTested": None
            }

        return {
            "apiKey": settings.api_key,
            "apiKeyStatus": settings.api_key_status,
            "lastTested": settings.last_tested
        }

    except Exception as e:
        print(f"Site ayarları hatası: {e}")
        raise HTTPException(status_code=500, detail=f"Ayarlar alınamadı: {str(e)}")

#---API Key'i Kaydeden Endpoint---
@app.post("/sites/{site}/settings/api-key")
async def save_api_key(site: str, request: Request, db: AsyncSession = Depends(get_db)):
    print(f"=== API Key kaydetme endpoint'ine istek geldi: {site} ===")
    
    try:
        # Kimlik doğrulama kodları
        jwt_token = request.cookies.get("token")
        if not jwt_token:
            print("Hata: Token bulunamadı")
            raise HTTPException(status_code=401, detail="Not logged in")
        
        try:
            payload = jwt.decode(jwt_token, SECRET, algorithms=["HS256"])
            user_id = int(payload["sub"])
            print(f"Token doğrulandı, user_id: {user_id}")
        except (jwt.InvalidTokenError, ValueError, TypeError) as e:
            print(f"Token doğrulama hatası: {e}")
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # İstek gövdesini al
        try:
            data = await request.json()
            api_key = data.get("apiKey", "")
            print(f"Alınan API Key: {api_key[:10]}...")  # Güvenlik için sadece ilk 10 karakteri göster
        except Exception as e:
            print(f"İstek gövdesi okuma hatası: {e}")
            raise HTTPException(status_code=400, detail="Invalid request body")
        
        # Veritabanında site ayarlarını güncelle veya oluştur
        try:
            res = await db.execute(select(SiteSettings).where(SiteSettings.site == site))
            settings = res.scalar_one_or_none()
            
            if settings:
                print("Mevcut ayarlar güncelleniyor")
                settings.api_key = api_key
                settings.api_key_status = "valid" if api_key else "not_set"
                settings.updated_at = datetime.datetime.now()
            else:
                print("Yeni ayarlar oluşturuluyor")
                settings = SiteSettings(
                    site=site,
                    api_key=api_key,
                    api_key_status="valid" if api_key else "not_set",
                    created_at=datetime.datetime.now(),
                    updated_at=datetime.datetime.now()
                )
                db.add(settings)
            
            await db.commit()
            print("Veritabanı işlemleri tamamlandı")
            
            return {
                "apiKey": api_key,
                "apiKeyStatus": "valid" if api_key else "not_set",
                "lastTested": datetime.datetime.now()
            }
        except Exception as e:
            print(f"Veritabanı hatası: {e}")
            await db.rollback()
            raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    
    except HTTPException:
        # HTTPException'ları yeniden yükselt
        raise
    except Exception as e:
        print(f"Beklenmedik hata: {type(e).__name__} - {e}")
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")

#---API Key'i Test Eden Endpoint---
@app.post("/sites/{site}/settings/test-api-key")
async def test_api_key(site: str, request: Request, db: AsyncSession = Depends(get_db)):
    print(f"=== API Key test endpoint'ine istek geldi: {site} ===")
    
    try:
        # Kimlik doğrulama kodları
        jwt_token = request.cookies.get("token")
        if not jwt_token:
            print("Hata: Token bulunamadı")
            raise HTTPException(status_code=401, detail="Not logged in")
        
        try:
            payload = jwt.decode(jwt_token, SECRET, algorithms=["HS256"])
            user_id = int(payload["sub"])
            print(f"Token doğrulandı, user_id: {user_id}")
        except (jwt.InvalidTokenError, ValueError, TypeError) as e:
            print(f"Token doğrulama hatası: {e}")
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # İstek gövdesini al
        try:
            data = await request.json()
            api_key = data.get("apiKey", "")
            print(f"Test edilecek API Key: {api_key[:10]}...")
        except Exception as e:
            print(f"İstek gövdesi okuma hatası: {e}")
            raise HTTPException(status_code=400, detail="Invalid request body")
        
        if not api_key:
            print("Hata: API Key boş")
            return {"success": False, "message": "API key boş"}
        
        # Test URL'si ile PageSpeed Insights API'sini test et
        try:
            test_url = "https://example.com"
            ps_api_url = f"https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url={test_url}&key={api_key}"
            
            async with httpx.AsyncClient() as client:
                response = await client.get(ps_api_url)
                
                if response.status_code == 200:
                    print("API Key testi başarılı")
                    return {"success": True, "message": "API key geçerli ve çalışıyor"}
                else:
                    print(f"API Key testi başarısız: {response.status_code}")
                    return {"success": False, "message": f"API key geçersiz: {response.status_code}"}
        except Exception as e:
            print(f"API Key test sırasında hata: {e}")
            return {"success": False, "message": f"Test sırasında hata: {str(e)}"}
    
    except HTTPException:
        # HTTPException'ları yeniden yükselt
        raise
    except Exception as e:
        print(f"Beklenmedik hata: {type(e).__name__} - {e}")
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")

@app.delete("/sites/{site}/settings/api-key")
async def remove_api_key(site: str, request: Request, db: AsyncSession = Depends(get_db)):
    print(f"=== API Key kaldırma endpoint'ine istek geldi: {site} ===")
    
    try:
        # Kimlik doğrulama kodları
        jwt_token = request.cookies.get("token")
        if not jwt_token:
            print("Hata: Token bulunamadı")
            raise HTTPException(status_code=401, detail="Not logged in")
        
        try:
            payload = jwt.decode(jwt_token, SECRET, algorithms=["HS256"])
            user_id = int(payload["sub"])
            print(f"Token doğrulandı, user_id: {user_id}")
        except (jwt.InvalidTokenError, ValueError, TypeError) as e:
            print(f"Token doğrulama hatası: {e}")
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Veritabanında site ayarlarını güncelle
        try:
            res = await db.execute(select(SiteSettings).where(SiteSettings.site == site))
            settings = res.scalar_one_or_none()
            
            if settings:
                print("Mevcut ayarlar güncelleniyor")
                settings.api_key = ""
                settings.api_key_status = "not_set"
                settings.updated_at = datetime.datetime.now()
                await db.commit()
                print("API Key başarıyla kaldırıldı")
                return {"message": "API key başarıyla kaldırıldı"}
            else:
                print("Kaldırılacak ayar bulunamadı")
                return {"message": "Kaldırılacak ayar bulunamadı"}
        except Exception as e:
            print(f"Veritabanı hatası: {e}")
            await db.rollback()
            raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    
    except HTTPException:
        # HTTPException'ları yeniden yükselt
        raise
    except Exception as e:
        print(f"Beklenmedik hata: {type(e).__name__} - {e}")
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")

#---API Key'i Kaldıran Endpoint---
@app.delete("/sites/{site}/settings/api-key")
async def remove_api_key(site: str, request: Request, db: AsyncSession = Depends(get_db)):
    # Kimlik doğrulama kodları...
    
    try:
        res = await db.execute(select(SiteSettings).where(SiteSettings.site == site))
        settings = res.scalar_one_or_none()
        
        if settings:
            settings.api_key = ""
            settings.api_key_status = "not_set"
            await db.commit()
        
        return {"message": "API key başarıyla kaldırıldı"}
    except Exception as e:
        print(f"API key kaldırma hatası: {e}")
        raise HTTPException(status_code=500, detail=f"API key kaldırılamadı: {str(e)}")

#--- Google Search Console'dan Sayfa Verilerini Getiren Endpoint ---
@app.get("/sites/{site}/search-console")
async def get_search_console_data(site: str, url: str, request: Request, db: AsyncSession = Depends(get_db)):
    # URL'yi decode et
    from urllib.parse import unquote
    decoded_url = unquote(url)
    
    try:
        # 1. Kimlik doğrulama kontrolü
        jwt_token = request.cookies.get("token")
        if not jwt_token:
            print("Hata: Token bulunamadı")
            raise HTTPException(status_code=401, detail="Not logged in")
        
        try:
            payload = jwt.decode(jwt_token, SECRET, algorithms=["HS256"])
            user_id = int(payload["sub"])
            print(f"Token doğrulandı, user_id: {user_id}")
        except (jwt.InvalidTokenError, ValueError, TypeError) as e:
            print(f"Token doğrulama hatası: {e}")
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # 2. Kullanıcının Google token'ını veritabanından al
        res = await db.execute(select(TokenStorage).where(TokenStorage.user_id == user_id))
        token_storage = res.scalar_one_or_none()
        if not token_storage:
            print("Hata: Google token bulunamadı")
            raise HTTPException(status_code=401, detail="No Google token found")
        
        # 3. Google Credentials oluştur
        creds = Credentials(
            token=token_storage.access_token,
            refresh_token=token_storage.refresh_token,
            token_uri=token_storage.token_uri,
            client_id=token_storage.client_id,
            client_secret=token_storage.client_secret,
            scopes=token_storage.scopes.split(","),
            expiry=token_storage.expiry
        )
        
        # 4. Token yenileme kontrolü
        if not creds.valid and creds.expired and creds.refresh_token:
            try:
                print("Token yenileniyor...")
                creds.refresh(GoogleRequest())
                # Veritabanını güncelle
                token_storage.access_token = creds.token
                token_storage.expiry = creds.expiry
                await db.commit()
                print("Token başarıyla yenilendi")
            except Exception as e:
                print(f"Token yenileme hatası: {e}")
                raise HTTPException(status_code=401, detail="Token refresh failed")
        
        # 5. Google Search Console API'sini kullanarak sayfa verilerini al
        service = build('searchconsole', 'v1', credentials=creds)
        
        # Son 30 günün verilerini al
        end_date = date.today()
        start_date = end_date - datetime.timedelta(days=30)
        
        request_body = {
            "startDate": start_date.strftime("%Y-%m-%d"),
            "endDate": end_date.strftime("%Y-%m-%d"),
            "dimensions": ["page"],
            "dimensionFilterGroups": [{
                "filters": [{
                    "dimension": "page",
                    "operator": "equals",
                    "expression": decoded_url
                }]
            }],
            "rowLimit": 10
        }
        
        response = service.searchanalytics().query(
            siteUrl=f"https://{site}/",
            body=request_body
        ).execute()
        
        pageDetails = []
        if "rows" in response:
            for row in response["rows"]:
                pageDetails.append({
                    "path": row["keys"][0],
                    "clicks": row["clicks"],
                    "impressions": row["impressions"],
                    "ctr": row["ctr"],
                    "position": row["position"]
                })
        
        return {"pageDetails": pageDetails}
    except Exception as e:
        print(f"Search Console verisi alma hatası: {e}")
        raise HTTPException(status_code=500, detail=f"Search Console verileri alınamadı: {str(e)}")

@app.get("/keyword-analysis")
async def keyword_analysis(request: Request, db: AsyncSession = Depends(get_db)):
    jwt_token = request.cookies.get("token")
    if not jwt_token:
        raise HTTPException(status_code=401, detail="Not logged in")

    payload = jwt.decode(jwt_token, SECRET, algorithms=["HS256"])
    user_id = int(payload["sub"])

    # fetch Google token
    res = await db.execute(select(TokenStorage).where(TokenStorage.user_id == user_id))
    token_storage = res.scalar_one_or_none()
    if not token_storage:
        raise HTTPException(status_code=401, detail="No Google token")

    creds = Credentials(
        token=token_storage.access_token,
        refresh_token=token_storage.refresh_token,
        token_uri=token_storage.token_uri,
        client_id=token_storage.client_id,
        client_secret=token_storage.client_secret,
        scopes=token_storage.scopes.split(","),
        expiry=token_storage.expiry
    )

    service = build('searchconsole', 'v1', credentials=creds)
    end = date.today()
    start = end - datetime.timedelta(days=30)
    rows = service.searchanalytics().query(
        siteUrl="https://ilknurdmn.com.tr",
        body={
            "startDate": str(start),
            "endDate": str(end),
            "dimensions": ["query"],
            "rowLimit": 50
        }
    ).execute().get("rows", [])

    return {"keywords": rows}

@app.get("/sites/{domain}/pdf")
async def generate_pdf(domain: str, request: Request, db: AsyncSession = Depends(get_db)):
    # 1. Kimlik doğrulama kontrolü
    jwt_token = request.cookies.get("token")
    if not jwt_token:
        print("Hata: Çerezlerde token bulunamadı")
        raise HTTPException(status_code=401, detail="Not logged in")
    
    try:
        payload = jwt.decode(jwt_token, SECRET, algorithms=["HS256"])
        user_id = int(payload["sub"])
        print(f"Token doğrulandı, user_id: {user_id}")
    except (jwt.InvalidTokenError, ValueError, TypeError) as e:
        print(f"Token doğrulama hatası: {e}")
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # 2. Kullanıcının Google token'ını veritabanından al
    res = await db.execute(select(TokenStorage).where(TokenStorage.user_id == user_id))
    token_storage = res.scalar_one_or_none()
    if not token_storage:
        print("Hata: Kullanıcı için Google token'ı bulunamadı")
        raise HTTPException(status_code=401, detail="No Google token found")
    
    # 3. Google Credentials oluştur
    creds = Credentials(
        token=token_storage.access_token,
        refresh_token=token_storage.refresh_token,
        token_uri=token_storage.token_uri,
        client_id=token_storage.client_id,
        client_secret=token_storage.client_secret,
        scopes=token_storage.scopes.split(","),
        expiry=token_storage.expiry
    )
    
    # 4. Token yenileme kontrolü
    if not creds.valid:
        if creds.expired and creds.refresh_token:
            try:
                print("Token yenileniyor...")
                creds.refresh(GoogleRequest())
                # Veritabanını güncelle
                token_storage.access_token = creds.token
                token_storage.expiry = creds.expiry
                await db.commit()
                print("Token başarıyla yenilendi")
            except Exception as e:
                print(f"Token yenileme hatası: {e}")
                raise HTTPException(status_code=401, detail="Token refresh failed")
        else:
            print("Hata: Token geçersiz ve yenilenemez")
            raise HTTPException(status_code=401, detail="Invalid token and cannot refresh")

    # 5. Google Search Console servisini oluştur
    try:
        service = build('searchconsole', 'v1', credentials=creds)
        print("Google Search Console servisi oluşturuldu")
    except Exception as e:
        print(f"Google API servisi oluşturulamadı: {e}")
        raise HTTPException(status_code=500, detail="Failed to create Google API service")
    
    # 6. Tarih aralığını belirle (son 30 gün)
    end = date.today()
    start = end - datetime.timedelta(days=30)
    print(f"Tarih aralığı: {start} - {end}")
    
    # 7. Domain'i tam URL'ye dönüştür
    # Google API tam URL formatı bekler: https://domain.com/
    site_url = f"https://{domain}/"
    print(f"Site URL: {site_url}")
    
    try:
        # 8. Anahtar kelime verilerini al
        print("Anahtar kelime verileri çekiliyor...")
        request_body = {
            "startDate": str(start),
            "endDate": str(end),
            "dimensions": ["query"],
            "rowLimit": 50,
            "dataState": "all"  # Tüm verileri dahil et
        }
        
        response = service.searchanalytics().query(
            siteUrl=site_url,
            body=request_body
        ).execute()
        
        rows = response.get("rows", [])
        print(f"Alınan anahtar kelime sayısı: {len(rows)}")
        
        # 9. PDF oluştur
        print("PDF oluşturuluyor...")
        from pdf_builder import create_seo_pdf
        pdf_buffer = create_seo_pdf(domain, rows)
        print("PDF başarıyla oluşturuldu")
        
        # 10. PDF dosyasını döndür
        return Response(
            content=pdf_buffer.getvalue(),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={domain}_seo_raporu.pdf"}
        )
    
    except Exception as e:
        print(f"PDF oluşturulurken hata: {type(e).__name__} - {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to generate PDF: {str(e)}"
        )

@app.get("/inspect-url")
async def inspect_url(url: str, request: Request, db: AsyncSession = Depends(get_db)):
    # 1. Kimlik doğrulama kontrolü
    jwt_token = request.cookies.get("token")
    if not jwt_token:
        raise HTTPException(status_code=401, detail="Not logged in")
    
    try:
        payload = jwt.decode(jwt_token, SECRET, algorithms=["HS256"])
        user_id = int(payload["sub"])
    except (jwt.InvalidTokenError, ValueError, TypeError):
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # 2. Kullanıcının Google token'ını veritabanından al
    res = await db.execute(select(TokenStorage).where(TokenStorage.user_id == user_id))
    token_storage = res.scalar_one_or_none()
    if not token_storage:
        raise HTTPException(status_code=401, detail="No Google token found")
    
    # 3. Google Credentials oluştur
    creds = Credentials(
        token=token_storage.access_token,
        refresh_token=token_storage.refresh_token,
        token_uri=token_storage.token_uri,
        client_id=token_storage.client_id,
        client_secret=token_storage.client_secret,
        scopes=token_storage.scopes.split(","),
        expiry=token_storage.expiry
    )
    
    # 4. Token yenileme kontrolü
    if not creds.valid and creds.expired and creds.refresh_token:
        try:
            creds.refresh(GoogleRequest())
            # Veritabanını güncelle
            token_storage.access_token = creds.token
            token_storage.expiry = creds.expiry
            await db.commit()
        except Exception as e:
            print(f"Token yenileme hatası: {e}")
            raise HTTPException(status_code=401, detail="Token refresh failed")
    
    # 5. Google Search Console servisini oluştur
    try:
        service = build('searchconsole', 'v1', credentials=creds)
        print("Google Search Console servisi oluşturuldu")
    except Exception as e:
        print(f"Google API servisi oluşturulamadı: {e}")
        raise HTTPException(status_code=500, detail="Failed to create Google API service")
    
    # 6. URL'yi tam URL'ye dönüştür (eğer http/https yoksa)
    if not url.startswith(('http://', 'https://')):
        url = f"https://{url}"
    
    try:
        # 7. URL'nin ait olduğu siteyi bul
        from urllib.parse import urlparse
        parsed_url = urlparse(url)
        domain = parsed_url.netloc
        
        # 8. Kullanıcının sitelerini al
        sites_response = service.sites().list().execute()
        user_sites = []
        
        if 'siteEntry' in sites_response:
            for site in sites_response['siteEntry']:
                if site.get('permissionLevel') in ['siteOwner', 'siteFullUser']:
                    # Site URL'ini temizle
                    site_url = site['siteUrl'].replace('https://', '').replace('http://', '').replace('/', '')
                    user_sites.append(site_url)
        
        print(f"Kullanıcının siteleri: {user_sites}")
        print(f"İncelenen domain: {domain}")
        
        # 9. Domain'in kullanıcının sitelerinde olup olmadığını kontrol et
        if domain not in user_sites:
            raise HTTPException(
                status_code=403, 
                detail=f"You do not have permission to inspect URLs for {domain}. Please use one of your verified sites: {', '.join(user_sites)}"
            )
        
        # 10. URL inceleme isteği
        print(f"URL incelemesi yapılıyor: {url}")
        inspection_result = service.urlInspection().index().inspect(
            body={
                "inspectionUrl": url,
                "siteUrl": f"https://{domain}/"
            }
        ).execute()
        
        return inspection_result
    except HTTPException:
        raise
    except Exception as e:
        print(f"URL incelemesi sırasında hata: {type(e).__name__} - {e}")
        raise HTTPException(status_code=500, detail=f"URL inspection failed: {str(e)}")

@app.get("/sites/{domain}/keywords")
async def get_keywords(
    domain: str, 
    request: Request, 
    db: AsyncSession = Depends(get_db)
):
    # 1. Kimlik doğrulama kontrolü
    jwt_token = request.cookies.get("token")
    if not jwt_token:
        raise HTTPException(status_code=401, detail="Not logged in")
    
    try:
        payload = jwt.decode(jwt_token, SECRET, algorithms=["HS256"])
        user_id = int(payload["sub"])
    except (jwt.InvalidTokenError, ValueError, TypeError):
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # 2. Kullanıcının Google token'ını veritabanından al
    res = await db.execute(select(TokenStorage).where(TokenStorage.user_id == user_id))
    token_storage = res.scalar_one_or_none()
    if not token_storage:
        raise HTTPException(status_code=401, detail="No Google token found")
    
    # 3. Google Credentials oluştur
    creds = Credentials(
        token=token_storage.access_token,
        refresh_token=token_storage.refresh_token,
        token_uri=token_storage.token_uri,
        client_id=token_storage.client_id,
        client_secret=token_storage.client_secret,
        scopes=token_storage.scopes.split(","),
        expiry=token_storage.expiry
    )
    
    # 4. Token yenileme kontrolü
    if not creds.valid and creds.expired and creds.refresh_token:
        try:
            creds.refresh(GoogleRequest())
            # Veritabanını güncelle
            token_storage.access_token = creds.token
            token_storage.expiry = creds.expiry
            await db.commit()
        except Exception as e:
            print(f"Token yenileme hatası: {e}")
            raise HTTPException(status_code=401, detail="Token refresh failed")
    
    # 5. Google Search Console servisini oluştur
    try:
        service = build('searchconsole', 'v1', credentials=creds)
    except Exception as e:
        print(f"Google API servisi oluşturulamadı: {e}")
        raise HTTPException(status_code=500, detail="Failed to create Google API service")
    
    # 6. Tarih aralığını belirle (son 30 gün)
    end = date.today()
    start = end - datetime.timedelta(days=30)
    
    # 7. Domain'i tam URL'ye dönüştür
    # Google API tam URL formatı bekler: https://domain.com/
    site_url = f"https://{domain}/"
    
    # 8. Anahtar kelime verilerini al
    try:
        print(f"Anahtar kelimeler alınıyor: {site_url}")
        request_body = {
            "startDate": str(start),
            "endDate": str(end),
            "dimensions": ["query"],
            "rowLimit": 50,
            "dataState": "all"  # Tüm verileri dahil et
        }
        
        response = service.searchanalytics().query(
            siteUrl=site_url,
            body=request_body
        ).execute()
        
        # 9. Yanıtı işle
        rows = response.get("rows", [])
        print(f"Alınan anahtar kelime sayısı: {len(rows)}")
        
        # 10. Verileri döndür
        return {"keywords": rows}
    
    except Exception as e:
        print(f"Anahtar kelime verileri alınırken hata: {type(e).__name__} - {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to fetch keyword data: {str(e)}"
        )

@app.post("/sites/{site}/generate-keyword-pdf")
async def generate_keyword_pdf(site: str, request: Request, db: AsyncSession = Depends(get_db)):
    """
    Anahtar kelime analizi PDF raporu oluşturur.
    
    Args:
        site (str): Site adı
        request (Request): HTTP isteği
        db (AsyncSession): Veritabanı session'ı
        
    Returns:
        Response: PDF dosyası
    """
    try:
        # Kimlik doğrulama kontrolü
        jwt_token = request.cookies.get("token")
        if not jwt_token:
            raise HTTPException(status_code=401, detail="Not logged in")
        
        try:
            payload = jwt.decode(jwt_token, SECRET, algorithms=["HS256"])
            user_id = int(payload["sub"])
        except (jwt.InvalidTokenError, ValueError, TypeError) as e:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # İstek gövdesini al
        data = await request.json()
        keywords_data = data.get("keywordsData", [])
        
        # PDF oluştur
        from pdf_builder import create_seo_pdf
        pdf_buffer = create_seo_pdf(site, keywords_data)
        
        # PDF'i yanıt olarak döndür
        return Response(
            content=pdf_buffer.getvalue(),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={site}_anahtar_kelime_raporu.pdf"}
        )
    
    except Exception as e:
        print(f"PDF oluşturma hatası: {e}")
        raise HTTPException(status_code=500, detail=f"PDF oluşturulamadı: {str(e)}")

@app.post("/sites/{site}/generate-page-analysis-pdf")
async def generate_page_analysis_pdf(site: str, request: Request, db: AsyncSession = Depends(get_db)):
    """
    Sayfa analizi PDF raporu oluşturur.
    
    Args:
        site (str): Site adı
        request (Request): HTTP isteği
        db (AsyncSession): Veritabanı session'ı
        
    Returns:
        Response: PDF dosyası
    """
    try:
        # Kimlik doğrulama kontrolü
        jwt_token = request.cookies.get("token")
        if not jwt_token:
            raise HTTPException(status_code=401, detail="Not logged in")
        
        try:
            payload = jwt.decode(jwt_token, SECRET, algorithms=["HS256"])
            user_id = int(payload["sub"])
        except (jwt.InvalidTokenError, ValueError, TypeError) as e:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # İstek gövdesini al
        data = await request.json()
        selected_page = data.get("selectedPage", "")
        page_data = data.get("pageData", {})
        
        # PDF oluştur
        from pdf_builder import create_page_analysis_pdf
        pdf_buffer = create_page_analysis_pdf(site, page_data, selected_page)
        
        # PDF'i yanıt olarak döndür
        return Response(
            content=pdf_buffer.getvalue(),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={site}_sayfa_analizi_raporu.pdf"}
        )
    
    except Exception as e:
        print(f"PDF oluşturma hatası: {e}")
        raise HTTPException(status_code=500, detail=f"PDF oluşturulamadı: {str(e)}")

@app.post("/sites/add")
async def add_site(site_data: dict, db: AsyncSession = Depends(get_db)):
    """Yeni site ekleme endpoint'i"""
    try:
        site_url = site_data.get("siteUrl")
        if not site_url:
            raise HTTPException(status_code=400, detail="Site URL is required")
        
        # URL temizleme
        clean_site = site_url.replace("https://", "").replace("http://", "").rstrip("/")
        
        # Site var mı
        site_result = await db.execute(
            select(Site).where(Site.site_url == clean_site)
        )
        site_record = site_result.scalar_one_or_none()
        
        if not site_record:
            site_record = Site(site_url=clean_site)
            db.add(site_record)
            await db.commit()
            await db.refresh(site_record)
        
        return {"success": True, "site": clean_site, "site_id": site_record.id}
        
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

#--- Google Analytics Property ID'sini Kaydeden Endpoint ---
def normalize_site_url(url):
    """Site URL'sini standart hale getirir (protokolü ve sonundaki slaşı kaldırır)"""
    url = url.replace("https://", "").replace("http://", "").rstrip("/")
    return url

@app.post("/sites/{site}/save-analytics-property")
async def save_analytics_property(site: str, request: Request, db: AsyncSession = Depends(get_db)):
    try:
        # Kimlik doğrulama
        jwt_token = request.cookies.get("token")
        if not jwt_token:
            raise HTTPException(status_code=401, detail="Not logged in")
        
        payload = jwt.decode(jwt_token, SECRET, algorithms=["HS256"])
        user_id = int(payload["sub"])
        
        data = await request.json()
        property_id = data.get("propertyId", "")
        measurement_id = data.get("measurementId", "")
        
        if not property_id:
            raise HTTPException(status_code=400, detail="Property ID is required")
        
        # Site URL'sini standart hale getir
        normalized_site = normalize_site_url(site)
        
        # Site var mı kontrol et, yoksa oluştur
        site_result = await db.execute(
            select(Site).where(Site.site_url == normalized_site)
        )
        site_record = site_result.scalar_one_or_none()
        
        if not site_record:
            # Önce bu site için bir kayıt var mı diye kontrol et (farklı formatta olabilir)
            existing_site = await db.execute(
                select(Site).where(Site.site_url.ilike(f"%{normalized_site}%"))
            )
            existing_site = existing_site.scalar_one_or_none()
            
            if existing_site:
                site_record = existing_site
            else:
                site_record = Site(site_url=normalized_site, user_id=user_id)
                db.add(site_record)
                await db.commit()
                await db.refresh(site_record)
        
        # Analytics property kaydet
        analytics_record = await db.execute(
            select(GoogleAnalyticsProperty).where(
                GoogleAnalyticsProperty.site_id == site_record.id
            )
        )
        analytics_record = analytics_record.scalar_one_or_none()
        
        if analytics_record:
            analytics_record.property_id = property_id
            analytics_record.measurement_id = measurement_id
            analytics_record.is_active = True
        else:
            analytics_record = GoogleAnalyticsProperty(
                site_id=site_record.id,
                property_id=property_id,
                measurement_id=measurement_id,
                is_active=True
            )
            db.add(analytics_record)
        
        await db.commit()
        
        return {
            "success": True,
            "message": "Google Analytics property başarıyla kaydedildi",
            "property_id": property_id
        }
        
    except IntegrityError as e:
        await db.rollback()
        print(f"Veritabanı bütünlük hatası: {e}")
        raise HTTPException(status_code=400, detail="Bu site için zaten bir kayıt var")
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        print(f"Analytics property kaydetme hatası: {e}")
        raise HTTPException(status_code=500, detail=str(e))

#--- Google Analytics Property ID'sini Getiren Endpoint ---
@app.get("/sites/{site}/analytics-property")
async def get_analytics_property(site: str, request: Request, db: AsyncSession = Depends(get_db)):
    """Belirtilen site için analytics property bilgilerini döndürür"""
    try:
        # Kimlik doğrulama
        jwt_token = request.cookies.get("token")
        if not jwt_token:
            raise HTTPException(status_code=401, detail="Not logged in")
        
        payload = jwt.decode(jwt_token, SECRET, algorithms=["HS256"])
        user_id = int(payload["sub"])
        
        # Site URL'sini standart hale getir
        normalized_site = normalize_site_url(site)
        
        # Siteyi veritabanından al
        site_result = await db.execute(
            select(Site).where(Site.site_url == normalized_site)
        )
        site_record = site_result.scalar_one_or_none()
        
        if not site_record:
            # Farklı formatta kayıtlı olabilir
            site_result = await db.execute(
                select(Site).where(Site.site_url.ilike(f"%{normalized_site}%"))
            )
            site_record = site_result.scalar_one_or_none()
            
            if not site_record:
                return {"success": False, "message": "Site not found"}
        
        # Analytics property bilgilerini getir
        analytics_result = await db.execute(
            select(GoogleAnalyticsProperty).where(
                GoogleAnalyticsProperty.site_id == site_record.id
            )
        )
        analytics_record = analytics_result.scalar_one_or_none()
        
        if not analytics_record:
            return {"success": False, "message": "Analytics property not found"}
        
        return {
            "success": True,
            "property_id": analytics_record.property_id,
            "measurement_id": analytics_record.measurement_id,
            "is_active": analytics_record.is_active
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Analytics property getirme hatası: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/user/sites")
async def get_user_sites(request: Request, db: AsyncSession = Depends(get_db)):
    """Kullanıcının tüm sitelerini ve analytics property bilgilerini döndürür"""
    try:
        # Kimlik doğrulama
        jwt_token = request.cookies.get("token")
        if not jwt_token:
            raise HTTPException(status_code=401, detail="Not logged in")
        
        payload = jwt.decode(jwt_token, SECRET, algorithms=["HS256"])
        user_id = int(payload["sub"])
        
        # Kullanıcının sitelerini getir
        sites = await db.execute(
            select(Site).where(Site.user_id == user_id)
        )
        sites = sites.scalars().all()
        
        result = []
        for site in sites:
            # Her site için analytics property bilgilerini getir
            analytics = await db.execute(
                select(GoogleAnalyticsProperty).where(
                    GoogleAnalyticsProperty.site_id == site.id
                )
            )
            analytics = analytics.scalar_one_or_none()
            
            result.append({
                "site_url": site.site_url,
                "analytics_property": {
                    "property_id": analytics.property_id if analytics else None,
                    "measurement_id": analytics.measurement_id if analytics else None,
                    "is_active": analytics.is_active if analytics else False
                } if analytics else None
            })
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Kullanıcı siteleri getirme hatası: {e}")
        raise HTTPException(status_code=500, detail=str(e))


#--- Trafik Analizi Endpoint'i ---
@app.get("/sites/{site}/traffic-analysis")
async def get_traffic_analysis(site: str, request: Request, db: AsyncSession = Depends(get_db)):
    """
    Belirtilen site için trafik analizi verilerini döndürür.
    
    Args:
        site (str): Analiz edilecek site
        request (Request): HTTP isteği
        db (AsyncSession): Veritabanı session'ı
        
    Returns:
        dict: Trafik analizi verileri
    """
    try:
        # 1. Kimlik doğrulama kontrolü
        jwt_token = request.cookies.get("token")
        if not jwt_token:
            raise HTTPException(status_code=401, detail="Not logged in")
        
        try:
            payload = jwt.decode(jwt_token, SECRET, algorithms=["HS256"])
            user_id = int(payload["sub"])
        except (jwt.InvalidTokenError, ValueError, TypeError) as e:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # 2. Kullanıcının Google token'ını veritabanından al
        res = await db.execute(select(TokenStorage).where(TokenStorage.user_id == user_id))
        token_storage = res.scalar_one_or_none()
        if not token_storage:
            raise HTTPException(status_code=401, detail="No Google token found")
        
        # 3. Google Credentials oluştur
        creds = Credentials(
            token=token_storage.access_token,
            refresh_token=token_storage.refresh_token,
            token_uri=token_storage.token_uri,
            client_id=token_storage.client_id,
            client_secret=token_storage.client_secret,
            scopes=token_storage.scopes.split(","),
            expiry=token_storage.expiry
        )
        
        # 4. Token yenileme kontrolü
        if not creds.valid and creds.expired and creds.refresh_token:
            try:
                creds.refresh(GoogleRequest())
                # Veritabanını güncelle
                token_storage.access_token = creds.token
                token_storage.expiry = creds.expiry
                await db.commit()
            except Exception as e:
                print(f"Token yenileme hatası: {e}")
                raise HTTPException(status_code=401, detail="Token refresh failed")
        
        # 5. Siteyi ve Google Analytics Property'yi veritabanından al
        site_result = await db.execute(
            select(Site).where(Site.site_url.ilike(f"%{site}%"))
        )
        site_record = site_result.scalar_one_or_none()
        
        if not site_record:
            raise HTTPException(status_code=404, detail="Site not found")
        
        analytics_result = await db.execute(
            select(GoogleAnalyticsProperty).where(
                GoogleAnalyticsProperty.site_id == site_record.id
            )
        )
        analytics_record = analytics_result.scalar_one_or_none()
        
        if not analytics_record:
            raise HTTPException(status_code=404, detail="Google Analytics property not found")
        
        # 6. Google Analytics API'sini kullanarak trafik verilerini al
        try:
            # Google Analytics 4 API'sini kullan
            service = build('analyticsdata', 'v1beta', credentials=creds)
            
            # Tarih aralığını al
            date_range = int(request.query_params.get("days", "30"))
            end_date = date.today()
            start_date = end_date - datetime.timedelta(days=date_range)
            
            # Google Analytics property ID'sini kullan
            property_id = analytics_record.property_id
            property_path = f"properties/{property_id}"
            
            # Toplam kullanıcı sayısını al
            request_body = {
                'dateRanges': [{
                    'startDate': start_date.strftime("%Y-%m-%d"), 
                    'endDate': end_date.strftime("%Y-%m-%d")
                }],
                'metrics': [{'name': 'activeUsers'}]
            }
            total_users_request = service.properties().runReport(
                property=property_path,
                body=request_body
            ).execute()
                        
            total_users = 0
            if 'rows' in total_users_request and total_users_request['rows']:
                total_users = sum(int(row['metricValues'][0]['value']) for row in total_users_request['rows'])
            
            # Sayfa görüntüleme sayısını al
            request_body = {
                'dateRanges': [{
                    'startDate': start_date.strftime("%Y-%m-%d"), 
                    'endDate': end_date.strftime("%Y-%m-%d")
                }],
                'metrics': [{'name': 'screenPageViews'}]
            }
            pageviews_request = service.properties().runReport(
                property=property_path,
                body=request_body
            ).execute()
            
            total_pageviews = 0
            if 'rows' in pageviews_request and pageviews_request['rows']:
                total_pageviews = sum(int(row['metricValues'][0]['value']) for row in pageviews_request['rows'])
            
            # Oturum süresini al
            request_body = {
                'dateRanges': [{
                    'startDate': start_date.strftime("%Y-%m-%d"), 
                    'endDate': end_date.strftime("%Y-%m-%d")
                }],
                'metrics': [{'name': 'averageSessionDuration'}]
            }
            session_duration_request = service.properties().runReport(
                property=property_path,
                body=request_body
            ).execute()
            
            avg_session_duration = "00:00"
            if 'rows' in session_duration_request and session_duration_request['rows']:
                total_duration = sum(float(row['metricValues'][0]['value']) for row in session_duration_request['rows'])
                avg_seconds = total_duration / len(session_duration_request['rows'])
                minutes = int(avg_seconds // 60)
                seconds = int(avg_seconds % 60)
                avg_session_duration = f"{minutes:02d}:{seconds:02d}"
            
            # Çıkış oranını al
            request_body = {
                'dateRanges': [{
                    'startDate': start_date.strftime("%Y-%m-%d"), 
                    'endDate': end_date.strftime("%Y-%m-%d")
                }],
                'metrics': [{'name': 'bounceRate'}]
            }
            bounce_rate_request = service.properties().runReport(
                property=property_path,
                body=request_body
            ).execute()
            
            bounce_rate = 0
            if 'rows' in bounce_rate_request and bounce_rate_request['rows']:
                total_bounce_rate = sum(float(row['metricValues'][0]['value']) for row in bounce_rate_request['rows'])
                bounce_rate = (total_bounce_rate / len(bounce_rate_request['rows'])) * 100
            
            # En popüler sayfaları al
            request_body = {
                'dateRanges': [{
                    'startDate': start_date.strftime("%Y-%m-%d"), 
                    'endDate': end_date.strftime("%Y-%m-%d")
                }],
                'dimensions': [{'name': 'pagePath'}],
                'metrics': [{'name': 'screenPageViews'}]
            }
            top_pages_request = service.properties().runReport(
                property=property_path,
                body=request_body
            ).execute()
            
            top_pages = []
            if 'rows' in top_pages_request and top_pages_request['rows']:
                # Sayfa görüntüleme sayısına göre sırala
                sorted_pages = sorted(
                    top_pages_request['rows'], 
                    key=lambda x: int(x['metricValues'][0]['value']), 
                    reverse=True
                )
                
                total_pageviews_in_top = sum(int(row['metricValues'][0]['value']) for row in sorted_pages)
                
                for page in sorted_pages[:5]:  # İlk 5 sayfa
                    page_path = page['dimensionValues'][0]['value']
                    page_views = int(page['metricValues'][0]['value'])
                    percentage = (page_views / total_pageviews_in_top) * 100 if total_pageviews_in_top > 0 else 0
                    
                    top_pages.append({
                        "page": page_path,
                        "visits": page_views,
                        "percentage": percentage
                    })
            
            # Trafik kaynaklarını al
            request_body = {
                'dateRanges': [{
                    'startDate': start_date.strftime("%Y-%m-%d"), 
                    'endDate': end_date.strftime("%Y-%m-%d")
                }],
                'dimensions': [{'name': 'sessionDefaultChannelGroup'}],
                'metrics': [{'name': 'activeUsers'}]
            }
            traffic_sources_request = service.properties().runReport(
                property=property_path,
                body=request_body
            ).execute()
            
            traffic_sources = []
            if 'rows' in traffic_sources_request and traffic_sources_request['rows']:
                total_users_in_sources = sum(int(row['metricValues'][0]['value']) for row in traffic_sources_request['rows'])
                
                for source in traffic_sources_request['rows']:
                    channel = source['dimensionValues'][0]['value']
                    users = int(source['metricValues'][0]['value'])
                    percentage = (users / total_users_in_sources) * 100 if total_users_in_sources > 0 else 0
                    
                    # Kanal adını Türkçeleştir
                    channel_name = {
                        'Organic Search': 'Organik Arama',
                        'Direct': 'Direkt',
                        'Social': 'Sosyal Medya',
                        'Referral': 'Referans',
                        'Paid Search': 'Ücretli Arama',
                        'Display': 'Görüntülü Reklam',
                        'Email': 'E-posta'
                    }.get(channel, channel)
                    
                    traffic_sources.append({
                        "source": channel_name,
                        "visits": users,
                        "percentage": percentage
                    })
            
            # Önceki ayla karşılaştırma için bir önceki ayın verilerini al
            prev_start_date = start_date - datetime.timedelta(days=date_range)
            prev_end_date = start_date
            
            request_body = {
                'dateRanges': [{
                    'startDate': prev_start_date.strftime("%Y-%m-%d"), 
                    'endDate': prev_end_date.strftime("%Y-%m-%d")
                }],
                'metrics': [{'name': 'activeUsers'}]
            }
            prev_users_request = service.properties().runReport(
                property=property_path,
                body=request_body
            ).execute()
            
            prev_users = 0
            if 'rows' in prev_users_request and prev_users_request['rows']:
                prev_users = sum(int(row['metricValues'][0]['value']) for row in prev_users_request['rows'])
            
            # Büyüme oranını hesapla
            monthly_growth = 0
            if prev_users > 0:
                monthly_growth = ((total_users - prev_users) / prev_users) * 100
            
            return {
                "totalVisits": total_users,
                "organicTraffic": int(total_users * 0.7),  # Yaklaşık değer
                "bounceRate": bounce_rate,
                "avgSessionDuration": avg_session_duration,
                "pageViews": total_pageviews,
                "monthlyGrowth": monthly_growth,
                "topPages": top_pages,
                "trafficSources": traffic_sources
            }
            
        except Exception as e:
            print(f"Google Analytics API hatası: {e}")
            raise HTTPException(status_code=500, detail=f"Google Analytics API error: {str(e)}")
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Trafik analizi hatası: {type(e).__name__} - {e}")
        raise HTTPException(status_code=500, detail=f"Traffic analysis failed: {str(e)}")

# ---------- STARTUP ----------
@app.on_event("startup")
async def on_startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

# ---------- RUN ----------
if __name__ == "__main__":
    import uvicorn
    # Artık 5000 portunu kullanıyor
    uvicorn.run("main:app", host="0.0.0.0", port=5000, reload=True)
