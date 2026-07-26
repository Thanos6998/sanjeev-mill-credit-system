# Auth Testing Playbook — Sanjeev Mill Udhyog

Auth: JWT (Bearer) email/password. Admin seeded on startup.

## Credentials
- Email: `owner@sanjeevmill.com`
- Password: `Sanjeev@2026`

## MongoDB Verification
```
mongosh
use test_database
db.users.find({role: "admin"}).pretty()
db.users.getIndexes()  # expect unique index on email
```
- bcrypt hash must start with `$2b$`

## API tests
```
API=$(grep REACT_APP_BACKEND_URL /app/frontend/.env | cut -d '=' -f2)
curl -s -X POST "$API/api/auth/login" -H "Content-Type: application/json" \
  -d '{"email":"owner@sanjeevmill.com","password":"Sanjeev@2026"}'
# → { token, user }

TOKEN=<from above>
curl -s "$API/api/auth/me" -H "Authorization: Bearer $TOKEN"
```

## Frontend
- Visit `/login`, enter credentials → redirects to `/`
- `localStorage.khata_token` set
- Refresh keeps user logged in (calls `/api/auth/me`)
- Logout button clears token & returns to `/login`
