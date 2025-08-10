# models.py

from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Text, func, BigInteger, CheckConstraint, Numeric
from sqlalchemy.orm import relationship, backref
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.dialects.postgresql import UUID, JSONB, INET
import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=True)
    hashed_password = Column(String(255), nullable=False)
    google_id = Column(String(50), unique=True, nullable=True)
    is_active = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    
    # İlişkiler
    sites = relationship("Site", back_populates="user", cascade="all, delete-orphan")
    tokens = relationship("TokenStorage", back_populates="user", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<User(id={self.id}, username='{self.username}')>"

class TokenStorage(Base):
    __tablename__ = "tokens"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    access_token = Column(Text, nullable=False)
    refresh_token = Column(Text, nullable=True)
    token_uri = Column(String(255), nullable=False)
    client_id = Column(String(255), nullable=False)
    client_secret = Column(String(255), nullable=False)
    scopes = Column(String(500), nullable=False)
    expiry = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    
    # İlişkiler
    user = relationship("User", back_populates="tokens")
    
    def __repr__(self):
        return f"<TokenStorage(id={self.id}, user_id={self.user_id})>"

class Site(Base):
    __tablename__ = "sites"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    site_url = Column(String(255), unique=True, index=True, nullable=False)
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    
    # Google Analytics Property ile ilişki
    analytics_property = relationship(
        "GoogleAnalyticsProperty", 
        back_populates="site", 
        uselist=False,
        cascade="all, delete-orphan"
    )
    
    # İlişkiler
    user = relationship("User", back_populates="sites")
    
    def __repr__(self):
        return f"<Site(id={self.id}, site_url='{self.site_url}')>"

class SiteSettings(Base):
    __tablename__ = "site_settings"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    site_id = Column(BigInteger, ForeignKey("sites.id", ondelete="CASCADE"), nullable=False, unique=True)
    api_key = Column(String(255), nullable=True)
    api_key_status = Column(String(20), default="not_set")  # not_set, valid, invalid
    last_tested = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    
    # İlişkiler
    site = relationship("Site", backref="settings", uselist=False)
    
    def __repr__(self):
        return f"<SiteSettings(id={self.id}, site_id={self.site_id}, status='{self.api_key_status}')>"

class GoogleAnalyticsProperty(Base):
    __tablename__ = "google_analytics_properties"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    site_id = Column(BigInteger, ForeignKey("sites.id", ondelete="CASCADE"), nullable=False)
    property_id = Column(String(255), unique=True, nullable=False)  # Örn: "properties/123456789"
    measurement_id = Column(String(50), nullable=True)  # Örn: "G-XXXXXXXXXX"
    is_active = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    
    # Site ile ilişki
    site = relationship("Site", back_populates="analytics_property")
    
    def __repr__(self):
        return f"<GoogleAnalyticsProperty(id={self.id}, property_id='{self.property_id}')>"

# PostgreSQL için tablo oluşturma fonksiyonu
def create_tables(engine):
    """Veritabanı tablolarını oluşturur"""
    Base.metadata.create_all(engine)
    print("Tablolar başarıyla oluşturuldu")

# PostgreSQL için tablo silme fonksiyonu
def drop_tables(engine):
    """Veritabanı tablolarını siler"""
    Base.metadata.drop_all(engine)
    print("Tablolar başarıyla silindi")