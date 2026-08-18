# ERP_Solutions — Backend API

Express REST API with Prisma and PostgreSQL. It stores orders, the sales/expense ledger, fund movements, menu, and suppliers for the ERP_Solutions frontend.

---

## Requirements

- Node.js 20+ (LTS recommended)
- PostgreSQL (Neon, Docker, or any hosted Postgres)

---

## Setup

```bash
cp .env.example .env
npm install
npm run db:deploy    # apply migrations
npm run db:seed      # users + menu + demo data
npm run dev          # http://localhost:3000
```

Base path: `/api` — for example `http://localhost:3000/api/health`.

### Local Postgres with Docker

```bash
docker compose up -d
```

Then set `DATABASE_URL` to the instance on port **5433** (see `docker-compose.yml`). Adminer is at `http://localhost:8080`.

---

## Environment

Copy `.env.example` and fill in real values. **Do not commit `.env`.**

| Variable | Required | Description |
| -------- | -------- | ----------- |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | At least 16 characters |
| `JWT_EXPIRES_IN` | No | Token lifetime (default `7d`) |
| `CORS_ORIGIN` | No | Extra frontend origins, comma-separated. Production always allows `https://erpasolutions.netlify.app` in code. |
| `PORT` | No | Server port (default `3000`) |
| `OWNER_PASSWORD` | Seed | Owner password for `db:seed` |
| `MANAGER_PASSWORD` | Seed | Manager password for `db:seed` |

---

## Database

```bash
npm run db:deploy     # production: prisma migrate deploy
npm run db:migrate    # development: create + apply a migration
npm run db:seed       # owner, manager, visitor, menu, Jun–Aug 2026 demo data
npm run db:generate   # regenerate Prisma client
npm run db:check      # connectivity smoke test
```

### Seeded roles

| Role | Login | Notes |
| ---- | ----- | ----- |
| `owner` | role + password | Full access |
| `manager` | role + password | Operations + approval PIN |
| `visitor` | `POST /auth/visitor` (no password) | Full navigation, GET only |

Passwords come from `OWNER_PASSWORD` / `MANAGER_PASSWORD`. Visitor is seeded without a usable password — the explore button issues a read-only JWT. Demo seed also inserts suppliers, cost catalogs, fund movements, and daily sales/orders for **2026-06-01 → 2026-08-15**.

---

## Business timezone

Reporting and date filters use **Asia/Dhaka (UTC+6)**.

- Helpers: `src/utils/businessDate.ts`, `src/utils/query.ts`
- Transaction `date` fields are stored at **UTC noon** of the business-day key
- Monthly/daily reports use `dateRangeWhere()` — not the server’s local clock

---

## API overview

All routes sit under `/api`. Protected routes need `Authorization: Bearer <token>`.

### Auth

- `POST /auth/login` — `{ role, password }` → JWT (rate limited)
- `POST /auth/visitor` — passwordless read-only session (rate limited)
- `GET /auth/verify` — validate token
- `GET /health` — liveness (`{ status: "ok" | "starting", uptime, timestamp }`)

### Sales

- `GET/POST /sales`, `GET/PUT/DELETE /sales/:id`
- `GET /sales/stats`, `GET /sales/recent`

### Expenses

- `GET/POST /expenses`, `GET/PUT/DELETE /expenses/:id`
- `GET /expenses/stats`, product/fixed cost lists and catalogs

### Funds

- `GET/POST /funds`, `GET/DELETE /funds/:id`
- `GET /funds/balances`, `GET /funds/accounts`

### Reports

- `GET /reports/daily?date=YYYY-MM-DD`
- `GET /reports/monthly?month=YYYY-MM`
- `GET /reports/profit-loss`, `/reports/custom`, `/reports/export`

### Catalog

- Menu items (`/menu`)
- Suppliers (`/suppliers`)

Mutations require `owner` or `manager`. Visitor tokens can read every GET route and are rejected on POST / PUT / PATCH / DELETE.

---

## Folder structure

```text
backend/
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   ├── seed/                  # menu + demo dataset
│   └── migrations/
├── src/
│   ├── server.ts
│   ├── app.ts
│   ├── config/                # env + CORS allow-list
│   ├── lib/prisma.ts
│   ├── middleware/            # JWT auth, errors
│   ├── modules/               # auth, sales, expenses, funds, reports, menu, suppliers
│   └── utils/                 # businessDate, query, serialize
├── docker-compose.yml
├── render.yaml
├── .env.example
└── package.json
```

---

## Deploy (Render)

1. Connect the repo, set root directory to `backend`
2. Set env vars in the Render dashboard (never in git)
3. Build: `npm install && npm run db:deploy` (`postinstall` runs `prisma generate`)
4. Start: `npm start`
5. Run `npm run db:seed` once against the production database so Owner, Manager, and Visitor exist

Set `CORS_ORIGIN` in the Render dashboard to exactly:

`https://erpasolutions.netlify.app`

No trailing slash. The API also allow-lists this origin in code so a missing env var cannot block the live site.

Blueprint: `render.yaml`.

---

## Scripts

| Command | Purpose |
| ------- | ------- |
| `npm run dev` | Dev server with `tsx watch` |
| `npm start` | Production server |
| `npm run typecheck` | TypeScript check |
| `npm run db:deploy` | Apply pending migrations |
| `npm run db:seed` | Seed database |

---

## Security

- Password hashes live only in the database (bcrypt, cost 12)
- `passwordHash` is never returned in API responses
- Helmet, CORS, and login rate limiting are on by default
- Keep `JWT_SECRET` and `DATABASE_URL` in host env vars only
- Rotate all secrets if they were ever committed to version control

---

## Related

- [Root README](../README.md)
- [Frontend README](../frontend/README.md)
