# Soegih - Free Notes

DATE: Thursday, 12 March 2026

---

## Data Model

### IDs → UUID v4 for all entities

- IDs appear in API URLs → non-guessable is better
- No sequential enumeration
- Performance difference is negligible for a personal app

### WALLET

```
- id: uuid (PK)
- name: string (not null)
- balance: decimal(15, 2)
- type: "cash" | "bank" | "e_wallet" | "other"
- created_at, updated_at, deleted_at
```

### CATEGORY

```
- id: uuid (PK)
- name: string (not null)
- description: string (nullable)
- type: "expense" | "income"
- created_at, updated_at, deleted_at
```

### TRANSACTION_EVENT

```
- id: uuid (PK)
- type: "expense" | "income" | "transfer"
- note: string (nullable)
- category_id: uuid (FK → CATEGORY, nullable)  -- nullable: transfers have no category
- occurred_at: timestamptz                      -- timezone-aware!
- created_at, updated_at, deleted_at
```

### POSTING

```
- id: uuid (PK)
- event_id: uuid (FK → TRANSACTION_EVENT)
- wallet_id: uuid (FK → WALLET)
- amount: decimal(15, 2)   -- SIGNED: positive = money in, negative = money out
- created_at, updated_at, deleted_at
```

### Notes on POSTING.amount (signed)

Direction is encoded in the sign of amount:

- Expense → 1 posting, amount = -50.00
- Income → 1 posting, amount = +1000.00
- Transfer → 2 postings: source = -100.00, destination = +100.00

Wallet balance change = SUM(amount) WHERE wallet_id = X

### WALLET.balance → stored (denormalized)

Don't recompute from postings on every query.
Update it atomically within a DB transaction when creating/deleting a transaction.

### Soft delete + unique constraint

Use Postgres partial unique indexes instead of appending unix timestamp to name.

```sql
CREATE UNIQUE INDEX ON wallet(name) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX ON category(name, type) WHERE deleted_at IS NULL;
```

Deleted records stop participating in the constraint naturally, no need to mutate the name.

---

## AI Feature

- Simple chat interface
- User types naturally → AI parses expense/income/transfer
- AI shows a formatted transaction card → user confirms → backend creates the records
- Never auto-create without confirmation

### Implementation notes

- Send wallet list + category list in system prompt on every request so AI can map to correct IDs
- Use function calling / structured output → typed transaction object, not free text
- Model: Claude API, claude-sonnet-4-6

---

## Tech Stack

### Frontend → React + Vite (CSR)

- Static files served by nginx
- SSR (Next.js) is overkill: app is behind auth, no SEO needed, adds operational complexity
- CSR = simpler deployment, lower complexity

### Backend → NestJS + TypeScript

- Good portfolio/resume project, opinionated structure forces good habits
- ORM: Prisma (better DX than TypeORM, first-class TS types, good migration tooling)

### Database → Postgres via Supabase

- Managed Postgres, no need to self-host
- Not using realtime features

### Reverse Proxy → Caddy

- Auto HTTPS
- Simpler config than nginx for this use case

### Deployment → Docker Compose on VPS

```
caddy (reverse proxy, port 80/443)
  ├── /api → nestjs container
  └── /    → nginx container serving Vite static build
```

Supabase Postgres is external — no Postgres in Docker.

### AI → Claude API (Anthropic)

- Function calling for structured transaction parsing
- Model: claude-sonnet-4-6
