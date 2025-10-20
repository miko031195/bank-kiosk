from fastapi import FastAPI, Request, HTTPException
from pydantic import BaseModel
from typing import List
import httpx
import os

app = FastAPI(title="Restoran Kiosk API", version="0.1.0")

# --- MODELLƏR ---
class YemekBase(BaseModel):
    id: int
    ad: str
    qiymet: float

class MasaBase(BaseModel):
    id: int
    ad: str
    status: str

class SifarisMehsulu(BaseModel):
    yemek_id: int
    qty: int

class SifarisBase(BaseModel):
    items: List[SifarisMehsulu]
    amount: float
    payment_type: str

# --- RESTORAN ENDPOINT-LƏRİ ---
@app.get("/")
async def root():
    return {"message": "Backend işləyir!"}

@app.get("/api/menu", response_model=List[YemekBase])
async def get_menu():
    return [
        {"id": 1, "ad": "Pizza", "qiymet": 1},
        {"id": 2, "ad": "Burger", "qiymet": 1},
        {"id": 3, "ad": "Kartof", "qiymet": 1},
    ]

@app.post("/api/orders")
async def create_order(order: SifarisBase):
    return {"status": "ok", "received": order}

@app.get("/api/kitchen/orders")
async def get_kitchen_orders():
    return [{"order_id": 1, "items": [{"yemek_id": 1, "qty": 2}]}]

@app.get("/api/orders/all")
async def get_all_orders():
    return [{"order_id": 1, "amount": 20.0}]

@app.get("/api/tables", response_model=List[MasaBase])
async def get_tables():
    return [
        {"id": 1, "ad": "Masa 1", "status": "free"},
        {"id": 2, "ad": "Masa 2", "status": "busy"},
    ]

@app.post("/api/tables/{table_id}/free")
async def free_table(table_id: int):
    return {"status": "ok", "table_id": table_id}

# --- ÖDƏNİŞ CİHAZI İNTEQRASİYA ENDPOINT-LƏRİ ---
DEVICE_BASE_URL = os.getenv("DEVICE_BASE_URL", "http://192.168.1.100:8080")

@app.post("/api/payment")
async def start_payment(request: Request):
    data = await request.json()
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(f"{DEVICE_BASE_URL}/api/payment", json=data, timeout=10)
            resp.raise_for_status()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Hardware error: {e}")
    return resp.json()

@app.post("/api/query")
async def query_payment(request: Request):
    data = await request.json()
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(f"{DEVICE_BASE_URL}/api/query", json=data, timeout=10)
            resp.raise_for_status()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Hardware error: {e}")
    return resp.json()