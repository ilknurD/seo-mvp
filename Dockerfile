# Temel Python imajı
FROM python:3.11-slim

# Ortam değişkeni
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Çalışma dizini oluştur
WORKDIR /app

# Gereksinimleri kopyala
COPY requirements.txt .

# Paketleri yükle
RUN pip install --no-cache-dir -r requirements.txt

# Uygulama dosyalarını kopyala
COPY . .

EXPOSE 5000

# Uygulama başlat
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "5000"]
