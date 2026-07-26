"""Backend API tests — Sanjeev Mill Udhyog Credit Management (Khata)."""
import os
import re
from pathlib import Path

import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL missing")
BASE_URL = base_url.rstrip("/")


@pytest.fixture(scope="session")
def test_credentials():
    p = Path("/app/memory/test_credentials.md")
    if not p.exists():
        pytest.skip("missing credentials file")
    c = p.read_text(encoding="utf-8")
    e = re.search(r'(?im)^\s*(?:[-*]\s*)?(?:\*\*)?email(?:\*\*)?\s*:\s*`?([^`\s]+)', c)
    pw = re.search(r'(?im)^\s*(?:[-*]\s*)?(?:\*\*)?password(?:\*\*)?\s*:\s*`?([^`\s]+)', c)
    if not e or not pw:
        pytest.skip("no creds parsed")
    return {"email": e.group(1), "password": pw.group(1)}


@pytest.fixture(scope="session")
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def auth_token(api_client, test_credentials):
    r = api_client.post(f"{BASE_URL}/api/auth/login", json=test_credentials, timeout=30)
    if r.status_code != 200:
        pytest.fail(f"login failed {r.status_code}: {r.text[:300]}")
    t = r.json().get("token")
    if not t:
        pytest.fail("no token in login response")
    return t


@pytest.fixture(scope="session")
def auth(auth_token):
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="session")
def created_customer_ids():
    return []


@pytest.fixture(scope="session", autouse=True)
def cleanup(created_customer_ids, auth):
    yield
    for cid in created_customer_ids:
        requests.delete(f"{BASE_URL}/api/customers/{cid}", headers=auth, timeout=30)


# ─── Health / root ───────────────────────────────────────────────────
class TestHealth:
    def test_root(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/", timeout=30)
        assert r.status_code == 200
        assert r.json().get("ok") is True


# ─── Auth ────────────────────────────────────────────────────────────
class TestAuth:
    def test_login_success(self, api_client, test_credentials):
        r = api_client.post(f"{BASE_URL}/api/auth/login", json=test_credentials, timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert isinstance(d["token"], str) and len(d["token"]) > 10
        assert d["user"]["email"] == test_credentials["email"]
        assert d["user"]["role"] == "admin"
        assert "password_hash" not in d["user"]

    def test_login_wrong_password(self, api_client, test_credentials):
        r = api_client.post(f"{BASE_URL}/api/auth/login",
                            json={"email": test_credentials["email"], "password": "WRONG_pw_1"}, timeout=30)
        assert r.status_code == 401

    def test_login_unknown_email(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/auth/login",
                            json={"email": "nobody@example.com", "password": "x"}, timeout=30)
        assert r.status_code == 401

    def test_login_invalid_email_format(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/auth/login", json={"email": "notanemail", "password": "x"}, timeout=30)
        assert r.status_code == 422

    def test_me(self, api_client, auth, test_credentials):
        r = api_client.get(f"{BASE_URL}/api/auth/me", headers=auth, timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert d["email"] == test_credentials["email"]
        assert d["role"] == "admin"

    def test_me_no_token(self, api_client):
        r = requests.get(f"{BASE_URL}/api/auth/me", timeout=30)
        assert r.status_code == 401

    def test_me_bad_token(self):
        r = requests.get(f"{BASE_URL}/api/auth/me",
                         headers={"Authorization": "Bearer garbage.token.here"}, timeout=30)
        assert r.status_code == 401

    def test_logout(self, api_client, auth):
        r = api_client.post(f"{BASE_URL}/api/auth/logout", headers=auth, timeout=30)
        assert r.status_code == 200


# ─── Auth guard on all protected routes ──────────────────────────────
class TestAuthGuards:
    @pytest.mark.parametrize("method,path", [
        ("get", "/api/customers"),
        ("post", "/api/customers"),
        ("get", "/api/customers/abc"),
        ("patch", "/api/customers/abc"),
        ("delete", "/api/customers/abc"),
        ("post", "/api/customers/abc/charges"),
        ("post", "/api/customers/abc/payments"),
        ("patch", "/api/entries/abc"),
        ("delete", "/api/entries/abc"),
        ("get", "/api/dashboard/stats"),
    ])
    def test_requires_auth(self, method, path):
        r = getattr(requests, method)(f"{BASE_URL}{path}", json={}, timeout=30)
        assert r.status_code == 401, f"{method} {path} -> {r.status_code}"


# ─── Customer CRUD ───────────────────────────────────────────────────
class TestCustomers:
    def test_create_and_get(self, api_client, auth, created_customer_ids):
        payload = {"name": "TEST_Ram Bahadur", "phone": "9800000001", "address": "TEST_Biratnagar"}
        r = api_client.post(f"{BASE_URL}/api/customers", json=payload, headers=auth, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "_id" not in d
        assert d["name"] == payload["name"]
        assert d["phone"] == payload["phone"]
        assert d["due"] == 0
        cid = d["id"]
        created_customer_ids.append(cid)

        g = api_client.get(f"{BASE_URL}/api/customers/{cid}", headers=auth, timeout=30)
        assert g.status_code == 200
        gd = g.json()
        assert gd["customer"]["name"] == payload["name"]
        assert gd["customer"]["due"] == 0
        assert gd["entries"] == []

    def test_list_contains_created(self, api_client, auth, created_customer_ids):
        r = api_client.get(f"{BASE_URL}/api/customers", headers=auth, timeout=30)
        assert r.status_code == 200
        lst = r.json()
        assert isinstance(lst, list)
        ids = [c["id"] for c in lst]
        assert created_customer_ids[0] in ids
        for c in lst:
            assert "_id" not in c
            assert "due" in c and "total_charged" in c and "total_paid" in c
        # newest first
        assert lst[0]["created_at"] >= lst[-1]["created_at"]

    def test_create_empty_name_rejected(self, api_client, auth):
        r = api_client.post(f"{BASE_URL}/api/customers", json={"name": "   "}, headers=auth, timeout=30)
        assert r.status_code == 422

    def test_update_persists(self, api_client, auth, created_customer_ids):
        cid = created_customer_ids[0]
        r = api_client.patch(f"{BASE_URL}/api/customers/{cid}",
                             json={"name": "TEST_Ram Updated", "phone": "9811111111"},
                             headers=auth, timeout=30)
        assert r.status_code == 200
        assert r.json()["name"] == "TEST_Ram Updated"
        g = api_client.get(f"{BASE_URL}/api/customers/{cid}", headers=auth, timeout=30)
        assert g.json()["customer"]["name"] == "TEST_Ram Updated"
        assert g.json()["customer"]["phone"] == "9811111111"
        assert g.json()["customer"]["address"] == "TEST_Biratnagar"

    def test_get_nonexistent(self, api_client, auth):
        r = api_client.get(f"{BASE_URL}/api/customers/does-not-exist", headers=auth, timeout=30)
        assert r.status_code == 404


# ─── Ledger entries ──────────────────────────────────────────────────
class TestLedger:
    @pytest.fixture(scope="class")
    def cust(self, api_client, auth, created_customer_ids):
        r = api_client.post(f"{BASE_URL}/api/customers",
                            json={"name": "TEST_Ledger Cust", "phone": "9822222222"},
                            headers=auth, timeout=30)
        assert r.status_code == 200
        cid = r.json()["id"]
        created_customer_ids.append(cid)
        return cid

    def test_add_charge_computes_amount(self, api_client, auth, cust):
        r = api_client.post(f"{BASE_URL}/api/customers/{cust}/charges",
                            json={"date": "2026-07-01", "product": "Rice Flour", "quantity": 12.5, "rate": 80},
                            headers=auth, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["type"] == "charge"
        assert d["amount"] == 1000.0
        assert "_id" not in d

    def test_add_payment(self, api_client, auth, cust):
        r = api_client.post(f"{BASE_URL}/api/customers/{cust}/payments",
                            json={"date": "2026-07-02", "amount": 400, "note": "TEST_cash"},
                            headers=auth, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["type"] == "payment"
        assert d["amount"] == 400.0
        assert d["note"] == "TEST_cash"

    def test_totals_recompute(self, api_client, auth, cust):
        g = api_client.get(f"{BASE_URL}/api/customers/{cust}", headers=auth, timeout=30)
        c = g.json()["customer"]
        assert c["total_charged"] == 1000.0
        assert c["total_paid"] == 400.0
        assert c["due"] == 600.0
        entries = g.json()["entries"]
        assert len(entries) == 2
        # sorted by date asc
        assert entries[0]["date"] <= entries[1]["date"]

    def test_charge_validation(self, api_client, auth, cust):
        for bad in [{"date": "2026-07-01", "product": "X", "quantity": 0, "rate": 10},
                    {"date": "2026-07-01", "product": "X", "quantity": 1, "rate": -5},
                    {"date": "not-a-date", "product": "X", "quantity": 1, "rate": 5},
                    {"date": "2026-07-01", "product": "", "quantity": 1, "rate": 5}]:
            r = api_client.post(f"{BASE_URL}/api/customers/{cust}/charges", json=bad, headers=auth, timeout=30)
            assert r.status_code == 422, f"{bad} -> {r.status_code}"

    def test_payment_validation(self, api_client, auth, cust):
        for bad in [{"date": "2026-07-01", "amount": 0},
                    {"date": "2026-07-01", "amount": -100}]:
            r = api_client.post(f"{BASE_URL}/api/customers/{cust}/payments", json=bad, headers=auth, timeout=30)
            assert r.status_code == 422, f"{bad} -> {r.status_code}"

    def test_charge_on_missing_customer(self, api_client, auth):
        r = api_client.post(f"{BASE_URL}/api/customers/nope/charges",
                            json={"date": "2026-07-01", "product": "X", "quantity": 1, "rate": 1},
                            headers=auth, timeout=30)
        assert r.status_code == 404

    def test_update_entry_recomputes(self, api_client, auth, cust):
        g = api_client.get(f"{BASE_URL}/api/customers/{cust}", headers=auth, timeout=30)
        charge = [e for e in g.json()["entries"] if e["type"] == "charge"][0]
        r = api_client.patch(f"{BASE_URL}/api/entries/{charge['id']}", json={"rate": 100}, headers=auth, timeout=30)
        assert r.status_code == 200
        assert r.json()["amount"] == 1250.0
        g2 = api_client.get(f"{BASE_URL}/api/customers/{cust}", headers=auth, timeout=30)
        assert g2.json()["customer"]["due"] == 850.0
        # revert
        api_client.patch(f"{BASE_URL}/api/entries/{charge['id']}", json={"rate": 80}, headers=auth, timeout=30)

    def test_delete_entry(self, api_client, auth, cust):
        g = api_client.get(f"{BASE_URL}/api/customers/{cust}", headers=auth, timeout=30)
        pay = [e for e in g.json()["entries"] if e["type"] == "payment"][0]
        r = api_client.delete(f"{BASE_URL}/api/entries/{pay['id']}", headers=auth, timeout=30)
        assert r.status_code == 200
        g2 = api_client.get(f"{BASE_URL}/api/customers/{cust}", headers=auth, timeout=30)
        assert g2.json()["customer"]["total_paid"] == 0
        assert g2.json()["customer"]["due"] == 1000.0
        assert len(g2.json()["entries"]) == 1

    def test_delete_missing_entry(self, api_client, auth):
        r = api_client.delete(f"{BASE_URL}/api/entries/nope", headers=auth, timeout=30)
        assert r.status_code == 404


# ─── Dashboard ───────────────────────────────────────────────────────
class TestDashboard:
    def test_stats(self, api_client, auth):
        r = api_client.get(f"{BASE_URL}/api/dashboard/stats", headers=auth, timeout=30)
        assert r.status_code == 200
        d = r.json()
        for k in ["total_customers", "total_charged", "total_paid", "total_due", "top_debtors"]:
            assert k in d
        assert isinstance(d["top_debtors"], list)
        assert len(d["top_debtors"]) <= 5
        assert round(d["total_charged"] - d["total_paid"], 2) == d["total_due"]
        # retry once: other parallel workers may create/delete customers between calls
        matched = False
        for _ in range(3):
            lst = api_client.get(f"{BASE_URL}/api/customers", headers=auth, timeout=30).json()
            st = api_client.get(f"{BASE_URL}/api/dashboard/stats", headers=auth, timeout=30).json()
            if st["total_customers"] == len(lst):
                matched = True
                break
        assert matched, "dashboard total_customers never matched /api/customers length"
        for t in d["top_debtors"]:
            assert t["due"] > 0
            assert "_id" not in t


# ─── Cascade delete ──────────────────────────────────────────────────
class TestCascadeDelete:
    def test_delete_customer_removes_entries(self, api_client, auth):
        c = api_client.post(f"{BASE_URL}/api/customers", json={"name": "TEST_Cascade"}, headers=auth, timeout=30).json()
        cid = c["id"]
        e = api_client.post(f"{BASE_URL}/api/customers/{cid}/charges",
                            json={"date": "2026-07-05", "product": "Wheat", "quantity": 2, "rate": 50},
                            headers=auth, timeout=30).json()
        eid = e["id"]
        d = api_client.delete(f"{BASE_URL}/api/customers/{cid}", headers=auth, timeout=30)
        assert d.status_code == 200
        assert api_client.get(f"{BASE_URL}/api/customers/{cid}", headers=auth, timeout=30).status_code == 404
        assert api_client.delete(f"{BASE_URL}/api/entries/{eid}", headers=auth, timeout=30).status_code == 404

    def test_delete_missing_customer(self, api_client, auth):
        r = api_client.delete(f"{BASE_URL}/api/customers/nope", headers=auth, timeout=30)
        assert r.status_code == 404


# ─── Data isolation ──────────────────────────────────────────────────
class TestIsolation:
    def test_foreign_owner_token_cannot_read(self, api_client, auth, created_customer_ids):
        """A token signed for a different (nonexistent) user must be rejected."""
        import jwt as pyjwt
        from dotenv import dotenv_values as dv
        secret = dv("/app/backend/.env").get("JWT_SECRET")
        if not secret:
            pytest.skip("JWT_SECRET unavailable")
        from datetime import datetime, timezone, timedelta
        tok = pyjwt.encode({"sub": "fake-user-id", "email": "x@y.com", "type": "access",
                            "exp": datetime.now(timezone.utc) + timedelta(minutes=10)}, secret, algorithm="HS256")
        r = requests.get(f"{BASE_URL}/api/customers", headers={"Authorization": f"Bearer {tok}"}, timeout=30)
        assert r.status_code == 401
