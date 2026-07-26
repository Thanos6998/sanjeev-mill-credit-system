from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal

import bcrypt
import jwt
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict, field_validator


# ─── Config ──────────────────────────────────────────────────────────
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXP_MIN = 60 * 24 * 7  # 7 days


def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]


# ─── Auth helpers ────────────────────────────────────────────────────
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXP_MIN),
        "type": "access",
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"id": payload["sub"]})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user.pop("_id", None)
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ─── Models ──────────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    email: EmailStr
    name: str
    role: str


class CustomerCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    phone: str = Field("", max_length=40)
    address: str = Field("", max_length=300)
    photo: Optional[str] = None  # base64 data URL

    @field_validator("name")
    @classmethod
    def name_stripped(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Name is required")
        return v


class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    photo: Optional[str] = None


class Customer(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    owner_id: str
    name: str
    phone: str = ""
    address: str = ""
    photo: Optional[str] = None
    created_at: str


class ChargeCreate(BaseModel):
    date: str
    product: str = Field(..., min_length=1, max_length=120)
    quantity: float = Field(..., gt=0)
    rate: float = Field(..., gt=0)

    @field_validator("date")
    @classmethod
    def valid_date(cls, v):
        datetime.fromisoformat(v)
        return v


class PaymentCreate(BaseModel):
    date: str
    amount: float = Field(..., gt=0)
    note: str = ""

    @field_validator("date")
    @classmethod
    def valid_date(cls, v):
        datetime.fromisoformat(v)
        return v


class EntryUpdate(BaseModel):
    date: Optional[str] = None
    product: Optional[str] = None
    quantity: Optional[float] = None
    rate: Optional[float] = None
    amount: Optional[float] = None
    note: Optional[str] = None


class LedgerEntry(BaseModel):
    id: str
    customer_id: str
    owner_id: str
    type: Literal["charge", "payment"]
    date: str
    product: Optional[str] = None
    quantity: Optional[float] = None
    rate: Optional[float] = None
    amount: float  # for charge = qty*rate; for payment = paid amount
    note: str = ""
    created_at: str


# ─── App ─────────────────────────────────────────────────────────────
app = FastAPI(title="Sanjeev Mill Udhyog — Credit Management")
api = APIRouter(prefix="/api")


def clean_doc(d: dict) -> dict:
    d.pop("_id", None)
    return d


# ─── Auth routes ─────────────────────────────────────────────────────
@api.post("/auth/login")
async def login(payload: LoginRequest):
    email = payload.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(user["id"], user["email"])
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "role": user["role"],
        },
    }


@api.get("/auth/me", response_model=UserOut)
async def me(current: dict = Depends(get_current_user)):
    return UserOut(**current)


@api.post("/auth/logout")
async def logout():
    return {"ok": True}


# ─── Customer routes ─────────────────────────────────────────────────
async def _due_for_customer(customer_id: str, owner_id: str) -> dict:
    charged = 0.0
    paid = 0.0
    async for e in db.entries.find({"customer_id": customer_id, "owner_id": owner_id}):
        if e["type"] == "charge":
            charged += float(e.get("amount", 0))
        else:
            paid += float(e.get("amount", 0))
    return {"total_charged": charged, "total_paid": paid, "due": charged - paid}


@api.get("/customers")
async def list_customers(current: dict = Depends(get_current_user)):
    customers = await db.customers.find({"owner_id": current["id"]}).sort("created_at", -1).to_list(1000)
    results = []
    for c in customers:
        clean_doc(c)
        totals = await _due_for_customer(c["id"], current["id"])
        results.append({**c, **totals})
    return results


@api.post("/customers")
async def create_customer(payload: CustomerCreate, current: dict = Depends(get_current_user)):
    doc = {
        "id": str(uuid.uuid4()),
        "owner_id": current["id"],
        "name": payload.name.strip(),
        "phone": payload.phone.strip(),
        "address": payload.address.strip(),
        "photo": payload.photo,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.customers.insert_one(doc)
    clean_doc(doc)
    return {**doc, "total_charged": 0, "total_paid": 0, "due": 0}


@api.get("/customers/{customer_id}")
async def get_customer(customer_id: str, current: dict = Depends(get_current_user)):
    c = await db.customers.find_one({"id": customer_id, "owner_id": current["id"]})
    if not c:
        raise HTTPException(status_code=404, detail="Customer not found")
    clean_doc(c)
    totals = await _due_for_customer(customer_id, current["id"])
    entries = await db.entries.find({"customer_id": customer_id, "owner_id": current["id"]}).to_list(5000)
    for e in entries:
        clean_doc(e)
    entries.sort(key=lambda e: (e["date"], e["created_at"]))
    return {"customer": {**c, **totals}, "entries": entries}


@api.patch("/customers/{customer_id}")
async def update_customer(customer_id: str, payload: CustomerUpdate, current: dict = Depends(get_current_user)):
    c = await db.customers.find_one({"id": customer_id, "owner_id": current["id"]})
    if not c:
        raise HTTPException(status_code=404, detail="Customer not found")
    updates = {k: v for k, v in payload.model_dump(exclude_none=True).items()}
    if updates:
        await db.customers.update_one({"id": customer_id}, {"$set": updates})
    c = await db.customers.find_one({"id": customer_id})
    clean_doc(c)
    totals = await _due_for_customer(customer_id, current["id"])
    return {**c, **totals}


@api.delete("/customers/{customer_id}")
async def delete_customer(customer_id: str, current: dict = Depends(get_current_user)):
    c = await db.customers.find_one({"id": customer_id, "owner_id": current["id"]})
    if not c:
        raise HTTPException(status_code=404, detail="Customer not found")
    await db.customers.delete_one({"id": customer_id})
    await db.entries.delete_many({"customer_id": customer_id, "owner_id": current["id"]})
    return {"ok": True}


# ─── Ledger entry routes ─────────────────────────────────────────────
@api.post("/customers/{customer_id}/charges")
async def add_charge(customer_id: str, payload: ChargeCreate, current: dict = Depends(get_current_user)):
    c = await db.customers.find_one({"id": customer_id, "owner_id": current["id"]})
    if not c:
        raise HTTPException(status_code=404, detail="Customer not found")
    amount = round(payload.quantity * payload.rate, 2)
    doc = {
        "id": str(uuid.uuid4()),
        "customer_id": customer_id,
        "owner_id": current["id"],
        "type": "charge",
        "date": payload.date,
        "product": payload.product.strip(),
        "quantity": payload.quantity,
        "rate": payload.rate,
        "amount": amount,
        "note": "",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.entries.insert_one(doc)
    clean_doc(doc)
    return doc


@api.post("/customers/{customer_id}/payments")
async def add_payment(customer_id: str, payload: PaymentCreate, current: dict = Depends(get_current_user)):
    c = await db.customers.find_one({"id": customer_id, "owner_id": current["id"]})
    if not c:
        raise HTTPException(status_code=404, detail="Customer not found")
    doc = {
        "id": str(uuid.uuid4()),
        "customer_id": customer_id,
        "owner_id": current["id"],
        "type": "payment",
        "date": payload.date,
        "product": None,
        "quantity": None,
        "rate": None,
        "amount": round(payload.amount, 2),
        "note": payload.note.strip(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.entries.insert_one(doc)
    clean_doc(doc)
    return doc


@api.patch("/entries/{entry_id}")
async def update_entry(entry_id: str, payload: EntryUpdate, current: dict = Depends(get_current_user)):
    e = await db.entries.find_one({"id": entry_id, "owner_id": current["id"]})
    if not e:
        raise HTTPException(status_code=404, detail="Entry not found")
    updates = payload.model_dump(exclude_none=True)
    # If quantity or rate changes for a charge, recompute amount
    if e["type"] == "charge" and ("quantity" in updates or "rate" in updates):
        q = updates.get("quantity", e.get("quantity", 0)) or 0
        r = updates.get("rate", e.get("rate", 0)) or 0
        if q <= 0 or r <= 0:
            raise HTTPException(status_code=400, detail="Quantity and rate must be positive")
        updates["amount"] = round(q * r, 2)
    if e["type"] == "payment" and "amount" in updates:
        if updates["amount"] <= 0:
            raise HTTPException(status_code=400, detail="Amount must be positive")
        updates["amount"] = round(updates["amount"], 2)
    if updates:
        await db.entries.update_one({"id": entry_id}, {"$set": updates})
    e = await db.entries.find_one({"id": entry_id})
    clean_doc(e)
    return e


@api.delete("/entries/{entry_id}")
async def delete_entry(entry_id: str, current: dict = Depends(get_current_user)):
    e = await db.entries.find_one({"id": entry_id, "owner_id": current["id"]})
    if not e:
        raise HTTPException(status_code=404, detail="Entry not found")
    await db.entries.delete_one({"id": entry_id})
    return {"ok": True}


# ─── Dashboard ───────────────────────────────────────────────────────
@api.get("/dashboard/stats")
async def dashboard_stats(current: dict = Depends(get_current_user)):
    customers = await db.customers.find({"owner_id": current["id"]}).to_list(5000)
    total_customers = len(customers)
    total_charged = 0.0
    total_paid = 0.0
    per_customer = []
    for c in customers:
        totals = await _due_for_customer(c["id"], current["id"])
        total_charged += totals["total_charged"]
        total_paid += totals["total_paid"]
        per_customer.append({
            "id": c["id"],
            "name": c["name"],
            "phone": c.get("phone", ""),
            "photo": c.get("photo"),
            "due": totals["due"],
        })
    per_customer.sort(key=lambda x: x["due"], reverse=True)
    top = [p for p in per_customer if p["due"] > 0][:5]
    return {
        "total_customers": total_customers,
        "total_charged": round(total_charged, 2),
        "total_paid": round(total_paid, 2),
        "total_due": round(total_charged - total_paid, 2),
        "top_debtors": top,
    }


@api.get("/")
async def root():
    return {"app": "Sanjeev Mill Udhyog — Credit Management", "ok": True}


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# ─── Startup: seed admin, indexes ────────────────────────────────────
@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.customers.create_index([("owner_id", 1), ("created_at", -1)])
    await db.entries.create_index([("customer_id", 1), ("date", 1)])

    admin_email = os.environ["ADMIN_EMAIL"].lower().strip()
    admin_password = os.environ["ADMIN_PASSWORD"]
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "Sanjeev Mill Owner",
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info(f"Seeded admin user {admin_email}")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_password(admin_password)}},
        )
        logger.info(f"Reset admin password for {admin_email}")


@app.on_event("shutdown")
async def shutdown():
    client.close()
