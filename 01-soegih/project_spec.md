# Soegih - Project Specification Document

DATE: Thursday, 12 March 2026

---

## A. Product Requirements

### 1. Who is the product for?

For the MVP, this is a single-user personal finance app built for the developer's own use. In future development phases, it will be shipped as a public paid SaaS product. Architecture decisions should avoid hard-coding single-user assumptions where it doesn't cost extra effort.

### 2. What problems does it solve?

Lack of visibility into spending patterns, wallet balances, and net worth over time. The app supports both manual transaction entry and an AI chat interface for natural language input, giving the user flexibility in how they log transactions.

### 3. What does the project do?

Manages wallets, expense/income categories, and transactions (expense, income, transfer). Provides a dashboard with monthly expense/income totals, net worth, and expense distribution by category. Supports manual transaction entry and an AI chat interface that parses natural language into structured transactions for user confirmation before saving.

---

## B. Technical Design

### 1. Tech Stack

| Layer | Choice |
|---|---|
| Frontend | React + Vite (CSR), served by nginx |
| Backend | NestJS + TypeScript |
| AI Service | Python FastAPI + LangChain |
| ORM | Prisma |
| Database | Postgres via Supabase |
| Auth | JWT (single user in DB) |
| AI Model | OpenAI API (`gpt-4o-mini`) via LangChain |
| Logging | Pino via `nestjs-pino` |
| Reverse proxy | Caddy (auto HTTPS) |
| Deployment | Docker Compose on VPS |

### 2. Data Flow

**Standard request flow:**
```
Browser → Caddy → NestJS (/api/v1/...) → Prisma → Supabase Postgres
                                        ← JSON response ←
```

**Auth flow:**
```
POST /api/v1/auth/login → NestJS validates credentials → returns JWT
Subsequent requests: Authorization: Bearer <token> header → NestJS JWT guard
```

**AI chat flow:**
```
Browser → Caddy → NestJS (/api/v1/ai/chat)
                      → FastAPI AI service (internal)
                            → LangChain → Claude API
                            ← structured transaction object
                      ← confirmation card shown to user
User confirms → NestJS creates transaction (standard flow)
```

### 3. Project Structure

```
soegih/
├── frontend/                  # React + Vite
│   ├── src/
│   │   ├── modules/
│   │   │   ├── wallet/
│   │   │   │   ├── components/
│   │   │   │   ├── hooks/
│   │   │   │   ├── services/
│   │   │   │   └── types/
│   │   │   ├── category/
│   │   │   ├── transaction/
│   │   │   ├── dashboard/
│   │   │   └── ai/
│   │   ├── shared/            # shared components, hooks, utils, types
│   │   └── assets/
│   └── ...
├── backend/                   # NestJS
│   ├── src/
│   │   ├── modules/           # feature modules: wallet, category, transaction, auth, ai
│   │   ├── prisma/            # Prisma schema + migrations
│   │   └── common/            # shared guards, filters, interceptors, pipes
│   └── ...
├── ai/                        # Python FastAPI
│   ├── app/
│   │   ├── routers/
│   │   ├── chains/            # LangChain chains
│   │   └── schemas/           # Pydantic models
│   └── ...
├── docker-compose.yml
├── Caddyfile
└── .env.example
```

Docker Compose containers: `caddy`, `frontend` (nginx), `backend` (NestJS), `ai` (FastAPI).

### 4. Data Schema

```
users
- id:            uuid (PK)
- email:         string (unique)
- password_hash: string
- created_at, updated_at, deleted_at

wallet
- id:         uuid (PK)
- user_id:    uuid (FK → users)
- name:       string
- balance:    decimal(15, 2)
- type:       "cash" | "bank" | "e_wallet" | "other"
- created_at, updated_at, deleted_at
- partial unique index: (user_id, name, type) WHERE deleted_at IS NULL

category
- id:          uuid (PK)
- user_id:     uuid (FK → users)
- name:        string
- description: string (nullable)
- type:        "expense" | "income"
- created_at, updated_at, deleted_at
- partial unique index: (user_id, name, type) WHERE deleted_at IS NULL

transaction_event
- id:          uuid (PK)
- type:        "expense" | "income" | "transfer"
- note:        string (nullable)
- category_id: uuid (FK → category, nullable) -- null for transfers
- occurred_at: timestamptz
- created_at, updated_at, deleted_at

posting
- id:        uuid (PK)
- event_id:  uuid (FK → transaction_event)
- wallet_id: uuid (FK → wallet)
- amount:    decimal(15, 2) -- signed: positive = money in, negative = money out
- created_at, updated_at, deleted_at
```

**Posting rules:**
- Expense: 1 posting, amount = negative (e.g., -50.00)
- Income: 1 posting, amount = positive (e.g., +1000.00)
- Transfer: 2 postings — source wallet = negative, destination wallet = positive

`wallet.balance` is a stored (denormalized) field, updated atomically within a DB transaction on every create/delete of a transaction.

All tables use soft deletion (`deleted_at`). Uniqueness is enforced via partial indexes scoped to non-deleted rows.

### 5. API Design

All endpoints are prefixed with `/api/v1/`. `PATCH` is used for partial updates. `DELETE` performs soft deletion.

```
Auth
POST   /api/v1/auth/login
POST   /api/v1/auth/logout

Wallets
GET    /api/v1/wallets
POST   /api/v1/wallets
GET    /api/v1/wallets/:id
PATCH  /api/v1/wallets/:id
DELETE /api/v1/wallets/:id

Categories
GET    /api/v1/categories
POST   /api/v1/categories
GET    /api/v1/categories/:id
PATCH  /api/v1/categories/:id
DELETE /api/v1/categories/:id

Transactions
GET    /api/v1/transactions          -- supports ?month=YYYY-MM for filtering
POST   /api/v1/transactions
GET    /api/v1/transactions/:id
PATCH  /api/v1/transactions/:id
DELETE /api/v1/transactions/:id

Dashboard
GET    /api/v1/dashboard

AI
POST   /api/v1/ai/chat
POST   /api/v1/ai/chat/confirm       -- triggers real transaction creation
```

### 6. Logging Format

Using `nestjs-pino`. Every log line is a JSON object:

```json
{
  "level": "info",
  "time": "2026-03-12T10:00:00.000Z",
  "context": "WalletService",
  "msg": "wallet created",
  "request_id": "uuid-v4",
  "user_id": "uuid-v4"
}
```

- `level`: `trace` | `debug` | `info` | `warn` | `error` | `fatal`
- `context`: the NestJS class/module name
- `request_id`: auto-generated per request for tracing
- `user_id`: attached once JWT is verified, omitted on auth routes
- Error logs additionally include `err.message` and `err.stack`

### 7. Naming Convention

| Layer | Convention | Example |
|---|---|---|
| DB columns | `snake_case` | `created_at`, `wallet_id` |
| Prisma schema fields | `snake_case` (mapped via `@map`/`@@map`) | `created_at`, `wallet_id` |
| API JSON fields | `snake_case` | `{"created_at": "..."}` |
| NestJS files | `kebab-case` | `wallet.service.ts`, `transaction-event.controller.ts` |
| NestJS classes | `PascalCase` | `WalletService`, `TransactionEventController` |
| React component files | `PascalCase` | `WalletCard.tsx`, `TransactionList.tsx` |
| React non-component files | `kebab-case` | `use-wallet.ts`, `wallet.service.ts` |
| Python files | `snake_case` | `wallet_router.py`, `transaction_chain.py` |
| Environment variables | `SCREAMING_SNAKE_CASE` | `DATABASE_URL`, `JWT_SECRET` |
