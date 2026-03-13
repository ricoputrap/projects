# System Architecture

## Overview

Soegih is a personal finance web application with three main services:

1. **React frontend** — Single-page application with wallet, transaction, and AI chat modules
2. **NestJS backend** — REST API handling business logic, data validation, and persistence
3. **Python AI service** — Stateless LLM-powered transaction parser

All services communicate via HTTP/REST. Authentication is delegated to Supabase Auth.

## System Diagram

```
┌────────────────────────────────────────────────────────────┐
│                  Frontend (React + Vite)                   │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │  Auth Module     │  │  Dashboard       │                │
│  │  (Supabase)      │  │  (Net Worth,     │                │
│  └────────┬─────────┘  │   Expense Chart) │                │
│           │            └─────────┬────────┘                │
│  ┌────────┴──────────┐  ┌────────┴────────┐  ┌───────────┐ │
│  │ Wallet Module     │  │ Transaction     │  │ AI Chat   │ │
│  │ (CRUD, Balance)   │  │ Module(List,    │  │ Module    │ │
│  │                   │  │ Create, Delete) │  │ (Parser)  │ │
│  └────────┬──────────┘  └────────┬────────┘  └────┬──────┘ │
│           │                      │                │        │
│           └──────────────────────┴────────────────┘        │
│                    API Client (axios)                      │
│         ┌──────────────────────────────────┐               │
│         │ Auto-attach Supabase JWT token   │               │
│         └────────────┬─────────────────────┘               │
└──────────────────────┼─────────────────────────────────────┘
                       │ HTTP + Bearer Token
┌──────────────────────▼──────────────────────────────────┐
│           Backend (NestJS + Prisma + Postgres)          │
│                                                         │
│  ┌────────────────────────────────────────────────────┐ │
│  │           SupabaseJwtGuard (All Routes)            │ │
│  │      Validates JWT → Extracts User ID              │ │
│  └────────────────────────────────────────────────────┘ │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐    │
│  │ Wallet API   │  │ Category API │  │ Transaction │    │
│  │ CRUD         │  │ CRUD         │  │ API         │    │
│  │ GET /wallets │  │ GET /cats    │  │ POST        │    │
│  └──────┬───────┘  └───────┬──────┘  └──────┬──────┘    │
│         │                  │                │           │
│  ┌──────┴──────────┐  ┌────┴─────────────┐  │           │
│  │  Dashboard API  │  │  AI Proxy Module │  │           │
│  │  GET /dashboard │  │  Chat Parser     │  │           │
│  └────────┬────────┘  └────┬─────────────┘  │           │
│           │                │                │           │
│           └────────────────┼────────────────┘           │
│                            │                            │
│            ┌───────────────┼───────────────┐            │
│            │               │               │            │
│     ┌──────▼──────┐ ┌──────▼────────┐ ┌────▼────────┐   │
│     │   Prisma    │ │ Postgres DB   │ │ GetUser     │   │
│     │   ORM       │ │ (Tables:      │ │ Decorator   │   │
│     │             │ │ users,        │ │             │   │
│     │             │ │ wallets,      │ │             │   │
│     │             │ │ categories,   │ │             │   │
│     │             │ │ transactions) │ │             │   │
│     └─────────────┘ └───────────────┘ └─────────────┘   │
└─────────────────────────────────────────────────────────┘
           │                          │
           │                          │
    ┌──────▼────────┐          ┌──────▼──────────┐
    │  Supabase     │          │  AI Service     │
    │  Auth         │          │  (FastAPI)      │
    │  (JWT Secret) │          │                 │
    │               │          │  LangChain +    │
    │               │          │  gpt-4o-mini    │
    │               │          │                 │
    │               │          │  POST /ai/chat  │
    │               │          │  Parse natural  │
    │               │          │  language →     │
    │               │          │  structured     │
    │               │          │  transaction    │
    └───────────────┘          └─────────────────┘
```

## Data Flow

### Authentication Flow

1. User submits email/password on `/login`
2. Frontend calls `supabase.auth.signInWithPassword()`
3. Supabase returns JWT token and sets session
4. Frontend stores session in localStorage (Supabase handles this)
5. For subsequent API calls, axios interceptor attaches JWT: `Authorization: Bearer <token>`
6. Backend `SupabaseJwtGuard` validates token against Supabase
7. If valid, extracts `user.id` and attaches to request
8. Controller receives authenticated user via `@GetUser()` decorator

### Transaction Creation Flow

1. User enters transaction details (type, amount, wallet, category, date)
2. Frontend creates `CreateTransactionDto` payload
3. POST `/api/v1/transactions` with JWT
4. Backend validates wallet/category ownership (user_id match)
5. Within Prisma transaction:
   - Create `TransactionEvent` (expense/income/transfer)
   - Create `Posting` entries (wallet debits/credits)
   - Update wallet balances
6. Return full transaction with postings and category
7. Frontend updates UI

### Transaction Update Flow (Limited Fields)

1. User edits transaction: note, category, amount, or wallet
2. Frontend sends PATCH `/api/v1/transactions/{id}` with changed fields only
3. Backend validates:
   - `type` and `occurred_at` are immutable (error if attempted to change)
   - Wallet belongs to user
   - Category matches transaction type (required for expense/income, NULL for transfer)
4. Within Prisma transaction:
   - If amount changed: Reverse original posting, create new posting with delta
   - If wallet changed: Update posting.wallet_id
   - If category changed: Update transaction_event.category_id
   - If note changed: Update transaction_event.note
   - Recalculate affected wallet balances
5. Return updated transaction with recalculated postings
6. Frontend updates UI

**Immutable Fields:** `type` and `occurred_at` are locked after creation and cannot be changed.

### AI Chat Flow

1. User types: "spent $50 on coffee"
2. Frontend calls POST `/api/v1/ai/chat` with message + wallet/category context
3. Backend fetches user's wallets and categories from DB
4. Backend forwards to AI service: POST to FastAPI with message, wallets, categories
5. AI service uses LangChain → gpt-4o-mini to parse natural language
6. Returns `ParsedTransaction` with suggested values
7. Frontend displays confirmation card
8. User confirms → POST `/api/v1/ai/chat/confirm` with final payload
9. Backend creates transaction via normal flow

## Frontend Structure

See [/frontend/src/](../frontend/src/) for the actual structure.

**Key directories:**

- `src/modules/` — Feature modules (auth, wallet, category, transaction, dashboard, ai)
- `src/routes/` — TanStack Router file-based routes
- `src/shared/` — Shared components, hooks, types, API client

**Routes:**

- `/login` — Login page
- `/_app` — Protected layout (checks `isAuthenticated`)
- `/_app/` — Dashboard
- `/_app/wallets` — Wallet management
- `/_app/categories` — Category management
- `/_app/transactions` — Transaction list with server-side pagination
- `/_app/ai` — AI chat assistant

## Backend Structure

See [/backend/src/](../backend/src/) for the actual structure.

**Key directories:**

- `src/modules/` — Feature modules (wallet, category, transaction, dashboard, ai)
- `src/common/` — Shared guards, decorators, filters
- `src/prisma/` — Prisma client service

**Main modules:**

- **Wallet** — CRUD for user wallets
- **Category** — CRUD for expense/income categories
- **Transaction** — Create, list, delete transactions; handles balance updates
- **Dashboard** — Current month summary (net worth, income, expense breakdown)
- **AI** — Proxy to Python AI service; confirms parsed transactions

**Guards & Middleware:**

- `SupabaseJwtGuard` — Validates Supabase JWT on protected routes
- `GetUser` decorator — Extracts authenticated user from request

## Python AI Service Structure

See [/ai/](../ai/) for the actual structure.

**Key components:**

- `app/config.py` — Settings (OPENAI_API_KEY, port)
- `app/main.py` — FastAPI app definition
- `app/schemas/transaction.py` — Pydantic models for chat request/response
- `app/chains/transaction_chain.py` — LangChain pipeline for parsing
- `app/routers/chat.py` — POST `/ai/chat` endpoint

**Flow:**

1. Receives user message + wallet/category context
2. Builds system prompt with available wallets and categories
3. Invokes gpt-4o-mini via LangChain with structured output (ParsedTransaction)
4. Returns parsed fields + human-readable summary

## Infrastructure

See [docker-compose.yml](../docker-compose.yml) for actual config.

**Services:**

- **caddy** — Reverse proxy on port 80, routes `/api/*` → backend, others → frontend
- **frontend** — Nginx serving React SPA on port 80 (internal)
- **backend** — NestJS app on port 3000 (internal)
- **ai** — FastAPI on port 8000 (internal)

**Environment:**

- Backend connects to Postgres via `DATABASE_URL`
- Backend validates Supabase JWT via `SUPABASE_URL` + `SUPABASE_ANON_KEY`
- Frontend uses `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` for Supabase client
- AI service uses `OPENAI_API_KEY` for LLM access

## Database Schema

See [docs/DATA_MODELS.md](./DATA_MODELS.md) for full schema details.

**Key entities:**

- `users` — Synced with Supabase Auth; user_id is the Supabase UID
- `wallet` — User's bank accounts, wallets, e-wallets
- `category` — Expense/income categories
- `transaction_event` — A transaction (expense/income/transfer)
- `posting` — Individual wallet impact of a transaction

**Soft deletion:** All tables have `deleted_at` field; queries filter `WHERE deleted_at IS NULL`.

## Authentication & Authorization

**Supabase Auth:**

- Handles signup, login, password reset, email verification
- Manages JWT tokens (automatically refreshed by Supabase client)
- Backend never stores passwords; only validates JWTs

**Authorization:**

- Backend checks user ownership of resources (e.g., wallet belongs to authenticated user)
- All queries filtered by `user_id` to ensure data isolation
- Frontend routes guarded by `beforeLoad` checks on `context.auth.isAuthenticated`

---

**Last updated:** [Auto-updated after each chunk]
**Current status:** [Pending implementation — see CHANGELOG.md]
