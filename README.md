# Baaki

Baaki is a digital khata for Nepali local stores. It keeps the notebook flow simple:

- Add a customer
- Write a `BAAKI` entry when goods are taken
- Write a `PAYMENT` entry when money comes back
- Always calculate balances from ledger entries

This version adds risk badges, analytics, offline quick entry, SMS reminders, share links, exports, multi-store memberships, staff roles, and subscriptions without changing the core append-only ledger model.

The visible dates and numbers can now be shown in Nepali locale formatting, and Free stores can send a simple in-app Premium request without needing a full payment gateway first.

## Stack

- Next.js App Router
- Supabase Auth
- PostgreSQL on Supabase
- Tailwind CSS

## Folder Structure

```text
app/
  (app)/
    dashboard/page.tsx
    customers/page.tsx
    customers/[id]/page.tsx
    layout.tsx
  (auth)/
    login/page.tsx
    signup/page.tsx
  api/
    analytics/summary/route.ts
    customers/route.ts
    customers/[id]/share-token/route.ts
    export/customer-ledger/route.ts
    ledger/route.ts
    ledger/[customerId]/route.ts
    sms/send-reminder/route.ts
  k/[customerId]/page.tsx
  actions.ts
  globals.css
  layout.tsx
  page.tsx
  setup/page.tsx
components/
  quick-entry-form.tsx
  risk-badge.tsx
  section-card.tsx
  send-reminder-button.tsx
  share-actions.tsx
  store-switcher.tsx
  submit-button.tsx
lib/
  analytics.ts
  auth.ts
  baaki.ts
  cache.ts
  export.ts
  risk.ts
  shares.ts
  sms.ts
  utils.ts
  supabase/
    middleware.ts
    server.ts
supabase/
  schema.sql
middleware.ts
```

## Setup

1. Create a Supabase project.
2. Run the SQL from [supabase/schema.sql](./supabase/schema.sql).
   The file is written to be re-runnable while you iterate.
3. Copy `.env.example` to `.env.local`.
4. Add your Supabase URL and anon key.
5. Add Sparrow or Twilio credentials if you want SMS reminders.
6. Install dependencies with `npm install`.
7. Start the app with `npm run dev`.

## Important Database Logic

Customer balances are computed from ledger rows:

```sql
sum(case when type = 'BAAKI' then amount else 0 end)
-
sum(case when type = 'PAYMENT' then amount else 0 end)
```

Running balance inside a single customer ledger uses a SQL window function:

```sql
sum(
  case when type = 'BAAKI' then amount else -amount end
) over (order by created_at asc, id asc)
```

## API Endpoints

- `POST /api/ledger`
- `GET /api/ledger/:customerId?page=1&pageSize=25`
- `GET /api/customers`
- `POST /api/customers`
- `GET /api/analytics/summary`
- `POST /api/sms/send-reminder`
- `POST /api/customers/:id/share-token`
- `GET /api/export/customer-ledger?customerId=...&format=csv`
- `GET /api/export/customer-ledger?customerId=...&format=pdf`

## Notes

- Free account: up to 50 customers, full core khata flow.
- Premium account: unlimited customers, SMS reminders, richer analytics, and faster operational tools.
- Premium activation is currently handled through an in-app request flow stored in `subscription_upgrade_requests`.
- `profiles` keeps the active store pointer, while `store_memberships` allows one user to work across multiple stores.
- Staff can create ledger entries. Owners manage customers, store settings, subscriptions, and sharing flows.
- RLS policies keep all tenant data scoped to the active `store_id`.
- `ledger_entries` remain the immutable event log, and `audit_logs` capture creation events separately.
- No `balance` column is stored anywhere. The khata is always rebuilt from ledger entries.
