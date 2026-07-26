# Sanjeev Mill Udhyog — Credit Management System (Khata)

## Original Problem Statement
Professional Credit Management System for "Sanjeev Mill Udhyog" (Nepali mill business). A customer credit/khata (ledger) tracking system that tracks credit sales, auto-calculates running dues, and prints/exports customer ledgers. Currency: Nepali Rupees (Rs.). Design: warm parchment tones, deep maroon accents, brass detail lines, serif headings, monospace numbers.

## User Personas
- **Mill Owner (single admin)** — logs in with email/password, adds customers, records credit sales & payments, prints ledgers.

## Core Requirements (static)
1. Customer profiles: photo (base64), name, phone, address, date added.
2. Per-customer ledger: charge entries (date/product/qty/rate → auto Amount) & payment entries (date/amount/note) with running balance.
3. Auto totals: Total Charged, Total Paid, Remaining Due.
4. Edit/delete customers & entries with confirmation.
5. Dashboard KPIs + highest-debtors list.
6. Print Ledger (clean printable per-customer statement, browser print-to-PDF).
7. JWT email/password auth, persistent MongoDB storage, owner-scoped data.
8. Mobile responsive, Nepali khata aesthetic.

## Architecture
- **Backend**: FastAPI + Motor MongoDB. JWT (Bearer) auth via bcrypt-hashed passwords. Admin seeded on startup. Endpoints under `/api`:
  - `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout`
  - `GET/POST /api/customers`, `GET/PATCH/DELETE /api/customers/{id}`
  - `POST /api/customers/{id}/charges`, `POST /api/customers/{id}/payments`
  - `PATCH/DELETE /api/entries/{id}`
  - `GET /api/dashboard/stats`
- **Frontend**: React + react-router + Tailwind + shadcn components + sonner toasts. Token in `localStorage.khata_token`. Google Fonts: Playfair Display (headings), Space Mono (numbers), Inter (UI).
- **Design**: parchment (#FDFBF7) background, maroon (#7B1E27) primary, brass (#C5A059) accents, book-spine left border, sharp corners, `@media print` styles for the print ledger.

## Implemented (2026-02)
- JWT auth + admin seeding (owner@sanjeevmill.com / Sanjeev@2026)
- Dashboard with 4 KPI tiles + Top Debtors table
- Customer CRUD with photo upload (client-side compress → base64)
- Search/filter by name & phone
- Ledger with charge + payment forms; live Amount = Qty × Rate preview
- Running balance table with delete-per-row
- Delete confirmation dialogs for customer & entries
- Print Ledger route `/customers/:id/print` with clean printable A4 layout, auto `window.print()`
- Test coverage: 37/37 backend pytest, full frontend Playwright E2E via testing agent

## Backlog / Next Actions (P0 / P1 / P2)
- **P1** — Cursive "signature line" export as PDF via jsPDF for one-click download alongside browser print.
- **P1** — Bulk WhatsApp/SMS payment reminder to top debtors (Twilio integration).
- **P2** — Nepali (Devanagari) UI toggle & Nepali date (BS) formatting.
- **P2** — Inventory / stock tracking with low-stock warnings.
- **P2** — Multi-user (staff accounts scoped to owner) with role-based permissions.
- **P2** — Backend hardening: rate-limit login, replace CORS `*` with explicit origin, aggregation-based due totals, ignore client `amount` on PATCH for charges.
