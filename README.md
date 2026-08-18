# ERP_Solutions

**Cafe operations, POS, and finance — in one dashboard.**

ERP_Solutions is a full-stack system for cafe and restaurant teams in Bangladesh. It covers the counter (orders, receipts, payments), the back office (expenses, funds, suppliers), and the books (daily KPIs, P&L, exports). Built for **Asia/Dhaka (UTC+6)** and **BDT (৳)**, with cash, bank, and bKash in the same ledger.

| | |
| --- | --- |
| **Version** | 2.6 |
| **Live app** | [erpasolutions.netlify.app](https://erpasolutions.netlify.app) |
| **API health** | [erp-solution-c32n.onrender.com/api/health](https://erp-solution-c32n.onrender.com/api/health) |

> **Try it without a password:** open the live app and click **Explore as Visitor**. You can open every screen. You cannot save, edit, or delete.

> The first load after idle time can take up to a minute while the free-tier API wakes up.

---

## Why it exists

Most small cafes split work across a POS screen, a notebook, and a spreadsheet. ERP_Solutions keeps that flow in one product:

- Take an order, print a receipt, and post it to the ledger.
- Track product costs, rent, and other fixed expenses against the same day.
- Move money between cash, bank, bKash, and a reserve account.
- Read today’s numbers first — then open history when you need it.

---

## What you can do

### Counter
- **New Order** — menu grid, cart, discounts, gifts, table / takeaway / delivery
- **Payments** — cash, bank, and bKash
- **Receipts** — customer receipt and kitchen chit
- **Order History** — today’s tickets by default; date filters for the past
- **POS Sync** — offline queue, retry failed uploads, and reconcile posted sales

### Operations
- **Owner dashboard** — sales, costs, liquidity, and channel mix (in-store, Foodpanda, Foodi)
- **Manager dashboard** — shift view: live sales, drawer balances, recent orders
- **Daily expenses & all records** — product costs and the full transaction list
- **Fixed costs** — rent, utilities, and other recurring items
- **Fund management** — add, withdraw, and transfer between accounts
- **Product costs & suppliers** — purchases linked to suppliers
- **Analytics** — period P&L, comparison, daily trend, CSV / Excel / PDF export

### Access
| Role | Access |
| ---- | ------ |
| **Owner** | Full access — finance, inventory, reports, and HR placeholders |
| **Manager** | Floor operations — orders, menu, selected costs, manager PIN for sensitive edits |
| **Visitor** | Full navigation, **view only** — no password, no edits. Built for public demos and LinkedIn |

Staff Roster and Payroll are in the sidebar as **coming soon**.

---

## Tech stack

| Layer | Stack | Host |
| ----- | ----- | ---- |
| **Frontend** | React 19, Vite, TypeScript, Tailwind CSS | [Netlify](https://www.netlify.com/) |
| **Backend** | Express, Prisma, Zod, JWT | [Render](https://render.com/) |
| **Database** | PostgreSQL | [Neon](https://neon.tech/) (or any Postgres) |

Also used: Axios, React Router, Recharts, React Hook Form, bcrypt, Helmet, CORS, login rate limiting.

```text
Browser (Netlify)
    │  JWT
    ▼
Express API (Render)  ──►  PostgreSQL (Neon)
```

---

## Repository layout

```text
ERP_Solutions/
├── frontend/          # React SPA — POS + ERP UI
├── backend/           # Express API + Prisma
├── README.md
└── .gitignore
```

- [Frontend README](frontend/README.md)
- [Backend README](backend/README.md)

---

## Quick start

You need **Node.js 20+** and a PostgreSQL database.

### 1. Backend

```bash
cd backend
cp .env.example .env
```

Set `DATABASE_URL`, `JWT_SECRET`, `OWNER_PASSWORD`, and `MANAGER_PASSWORD` in `.env`.

```bash
npm install
npm run db:deploy
npm run db:seed
npm run dev
```

API: `http://localhost:3000/api` — health check: `http://localhost:3000/api/health`.

Optional local Postgres (Docker): from `backend/`, run `docker compose up -d`, then point `DATABASE_URL` at `localhost:5433`.

### 2. Frontend

```bash
cd frontend
cp .env.example .env
```

Set `VITE_API_URL=http://localhost:3000/api`.

```bash
npm install
npm run dev
```

App: `http://localhost:5173`. Sign in as **Owner** or **Manager** with the passwords you put in the backend `.env`, or click **Explore as Visitor** (no password, view only).

Seed loads a cafe menu plus **June–August 2026** demo sales, costs, orders, suppliers, and fund movements so dashboards are not empty.

---

## Business day

All reporting uses **Asia/Dhaka**, not the server clock.

- Dashboard, KPIs, and Order History open on **today** in Dhaka time.
- Use date filters when you need history.
- Transaction dates are stored as **UTC noon** of that business day so grouping stays stable worldwide.

Helpers: `frontend/src/shared/utils/businessDate.ts` and `backend/src/utils/businessDate.ts`.

---

## Environment

Passwords and secrets are **never** stored in source. Use `.env` locally and host dashboards in production.

| Where | Variables |
| ----- | --------- |
| `backend/.env` | `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`, `OWNER_PASSWORD`, `MANAGER_PASSWORD` |
| `frontend/.env` | `VITE_API_URL` (required in production). Local-only offline fallback: `VITE_OWNER_PASSWORD`, `VITE_MANAGER_PASSWORD` |

Copy from `.env.example` files. Never commit a real `.env`.

---

## Deploy

| Service | Host | Notes |
| ------- | ---- | ----- |
| Frontend | Netlify | Base directory `frontend`. Set `VITE_API_URL` to `https://erp-solution-c32n.onrender.com/api` |
| Backend | Render | Root directory `backend`. Set `CORS_ORIGIN` to `https://erpasolutions.netlify.app` (also allow-listed in code) |
| Database | Neon PostgreSQL | Use `sslmode=require` |

After the first backend deploy, run `npm run db:deploy` and `npm run db:seed` once against production so Owner, Manager, and the read-only **Visitor** account exist. (`db:deploy` is already in the Render build command; seed is a one-off.)

Details: [frontend/README.md](frontend/README.md) and [backend/README.md](backend/README.md).

---

## Security

- `.env` files are gitignored — do not commit credentials.
- Login uses JWT (`POST /api/auth/login`). Password hashes are bcrypt (cost 12) and never returned by the API.
- Login is rate-limited. Helmet and CORS are enabled on the API.
- If secrets were ever pushed to GitHub, rotate `DATABASE_URL`, `JWT_SECRET`, and login passwords immediately.

---

## Team

| Role | Name |
| ---- | ---- |
| **Founder** | Md. Yeasin |
| **Co-founder** | Md Sharif Patwary |

Contact: [yeasin7y@gmail.com](mailto:yeasin7y@gmail.com)
