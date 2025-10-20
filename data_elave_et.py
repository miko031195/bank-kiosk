from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from main import Yemek # Əsas faylımızdan Yemek modelini import edirik

# Bazaya qoşuluruq
engine = create_engine("sqlite:///./restoran.db")
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

# Əlavə etmək istədiyimiz məhsullar
yeni_yemekler = [
    Yemek(ad="Burger", qiymet=8.50, kateqoriya="Yemək"),
    Yemek(ad="Pizza", qiymet=12.00, kateqoriya="Yemək"),
    Yemek(ad="Coca-Cola", qiymet=2.00, kateqoriya="İçki"),
]

# Məhsulları bazaya əlavə edirik
for item in yeni_yemekler:
    db.add(item)

db.commit() # Dəyişiklikləri yadda saxlayırıq
db.close()

print("Məlumatlar bazaya uğurla əlavə edildi!")