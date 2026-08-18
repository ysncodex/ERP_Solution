# ERP_Solutions — Frontend

React single-page app for the cafe POS, dashboards, expenses, funds, inventory, and reports.

Works with the [`backend`](../backend/) API in production. Offline password fallback is for **local development only** — the live Netlify build always uses the API.

---

## Quick start

```bash
cp .env.example .env
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

Point `VITE_API_URL` at the API (default `http://localhost:3000/api`) and keep the backend running.

---

## Environment

| Variable | Required | Description |
| -------- | -------- | ----------- |
| `VITE_API_URL` | Yes in production | Backend base URL, including `/api` |
| `VITE_OWNER_PASSWORD` | No | Local-only offline owner login fallback (ignored as a login path in production) |
| `VITE_MANAGER_PASSWORD` | No | Local-only offline manager login / PIN fallback |

Set production values in the **Netlify dashboard**, not in committed files.

---

## Screens

- **Login** — Owner or Manager with a password, or **Explore as Visitor** (no password)
- **New Order** — menu, cart, discounts, gifts, cash / bank / bKash, receipt print
- **Order History** — today by default; widen the date range for history
- **POS Sync** — offline queue, failed uploads, posted ledger
- **Owner dashboard** — sales, costs, liquidity, Foodpanda / Foodi / in-store mix
- **Manager dashboard** — shift sales, drawer balances, recent orders
- **Finance** — daily expenses, all records, fixed costs, fund movements
- **Inventory** — product costs and suppliers
- **Analytics** — P&L, period comparison, CSV / Excel / PDF
- **HR** — Staff Roster and Payroll placeholders (coming soon)

Role access is defined in `src/shared/utils/roleAccess.ts`. Owner and Manager can edit; Visitor can open every screen but create / edit / delete stay blocked. Manager-sensitive edits also ask for a PIN.

---

## Business timezone

“Today” is always **Asia/Dhaka (UTC+6)**:

- Dashboards and ERP context default to the current Dhaka day
- Order History opens on today’s orders
- Saved “today” filters reset after midnight Dhaka time on the next page focus
- Helpers: `src/shared/utils/businessDate.ts`

---

## Auth flow

1. **Owner / Manager** — `POST /api/auth/login` with role + password → JWT
2. **Visitor** — `POST /api/auth/visitor` (no password) → read-only JWT, full navigation
3. **Offline fallback** — local development only, if the API is down, using `VITE_OWNER_PASSWORD` / `VITE_MANAGER_PASSWORD`. Production always talks to the live API.

---

## Scripts

```bash
npm run dev        # Vite dev server
npm run build      # Production build → dist/
npm run preview    # Preview the production build
npm run lint       # ESLint
npm run analyze    # Bundle size report
```

---

## Folder structure

```text
frontend/
├── public/                    # Static assets, SPA redirects
├── src/
│   ├── app/                   # Routes, layout, providers
│   ├── features/auth/         # Login
│   ├── modules/               # dashboard, sales, finance, inventory, reports, hr
│   ├── core/
│   │   ├── api/               # Axios client + services
│   │   ├── context/           # ERP state, filters, stats
│   │   └── types/
│   ├── shared/
│   │   ├── components/ui/
│   │   ├── export/            # CSV, Excel, PDF
│   │   └── utils/             # businessDate, formatters, roleAccess
│   ├── App.tsx
│   └── main.tsx
├── netlify.toml
├── vercel.json
├── .env.example
└── vite.config.ts
```

---

## Deploy (Netlify)

1. Base directory: `frontend`
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Environment: `VITE_API_URL=https://erp-solution-c32n.onrender.com/api`

SPA fallback is in `public/_redirects` and `netlify.toml`. `vercel.json` is included if you host on Vercel instead.

---

## Related

- [Root README](../README.md)
- [Backend README](../backend/README.md)
