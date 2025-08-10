import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from models import Base, create_tables

DATABASE_URL = "postgresql+asyncpg://postgres:admin123@localhost:5432/seomvp"

async def main():
    """Ana fonksiyon"""
    # Asenkron motor oluştur
    engine = create_async_engine(DATABASE_URL, echo=True)  # echo=True SQL sorgularını gösterir
    
    # Tabloları oluştur
    async with engine.begin() as conn:
        await conn.run_sync(create_tables)
    
    # Motoru kapat
    await engine.dispose()
    
    print("Veritabanı tabloları başarıyla oluşturuldu")

if __name__ == "__main__":
    asyncio.run(main())