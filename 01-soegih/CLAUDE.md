# Implementation Guide

## Task Autonomy

- **Simple tasks** (single file, clear requirements): Work autonomously
- **Medium-to-advanced tasks** (multiple files, architectural decisions, complex business logic): Pair with user before implementation
- When in doubt, ask the user

## Naming Conventions

Follow these exactly (from project_spec.md section 8):

| Layer                | Convention   | Example                   |
| -------------------- | ------------ | ------------------------- |
| DB columns           | `snake_case` | `created_at`, `wallet_id` |
| API JSON             | `snake_case` | `{"created_at": "..."}`   |
| NestJS files         | `kebab-case` | `wallet.service.ts`       |
| NestJS classes       | `PascalCase` | `WalletService`           |
| React components     | `PascalCase` | `WalletCard.tsx`          |
| React non-components | `kebab-case` | `use-wallet.ts`           |
| Python files         | `snake_case` | `wallet_router.py`        |

## Code Organization

- Follow the feature module structure in project_spec.md (modules → wallet/category/transaction/dashboard/ai each with components/hooks/services/types)
- NestJS modules in `src/modules/`; shared code in `src/common/`
- Each feature is isolated and self-contained

## API & Data Patterns

- Use PATCH for partial updates, DELETE for soft deletion (no hard deletes)
- Paginated responses use the format from spec section 6: `{ data: [...], meta: { total, page, limit, total_pages } }`
- Transactions: server-side pagination/sorting; Wallets/Categories: client-side via TanStack Table
- Soft deletion standard: all tables have `deleted_at`, uniqueness via partial indexes

## Transaction Editing Constraints

Users can edit transactions, but with strict limits:

**Editable Fields:**
- `note` — Change transaction description
- `category_id` — Change category (expense/income only; must be NULL for transfer)
- `amount` — Change transaction amount (recalculates postings and wallet balances)
- `wallet_id` — Change source wallet (for expense/income, or source for transfer)

**Immutable Fields (Locked after creation):**
- `type` — Cannot change between expense/income/transfer
- `occurred_at` — Cannot change transaction date

**Implementation:**
- PATCH `/api/v1/transactions/{id}` endpoint with validation
- Reject if `type` or `occurred_at` in request body
- For amount changes: reverse original posting, create new with delta
- Ensure category_id aligns with transaction type (required for expense/income, NULL for transfer)

## Logging

- Use `nestjs-pino` with JSON format from spec section 7
- Include `context`, `request_id`, and `user_id` (where applicable)

## Tech Stack

- Do not suggest alternatives to chosen tech: NestJS+Typescript, FastAPI+Python, React+Vite, Prisma, Postgres, TanStack Router/Table, Pino, JWT, LangChain
- These are deliberate choices

## Test-Driven Development

- Write tests **before** implementation code
- Red → Green → Refactor cycle
- Unit tests for services/business logic
- Integration tests for API endpoints
- Test coverage should reflect criticality (auth, transactions are high-priority)
- Run tests before committing

## Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):
- `feat(scope): description` — new feature
- `fix(scope): description` — bug fix
- `chore(scope): description` — maintenance, deps, config
- `docs(scope): description` — documentation
- `refactor(scope): description` — code restructure (no behavior change)
- `test(scope): description` — tests
- `style(scope): description` — formatting, linting
- `perf(scope): description` — performance improvement

Examples:
- `feat(wallet): add wallet balance sync`
- `fix(auth): correct JWT expiration validation`
- `chore(deps): upgrade prisma to latest`

## When to Ask

- Medium-to-advanced complexity → plan & ask before coding
- Architectural decisions → get alignment first
- Multi-file changes → confirm approach with user

## Documentation

### Living Documentation

All documentation is kept in sync with implementation:

- **[docs/README.md](docs/README.md)** — Documentation index
- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** — High-level system overview with ASCII diagrams; links to actual code
- **[docs/CHANGELOG.md](docs/CHANGELOG.md)** — Updated per chunk with completed tasks
- **[docs/DATA_MODELS.md](docs/DATA_MODELS.md)** — Database schema and entity relationships (auto-generated from Prisma)
- **[docs/API_REFERENCE.md](docs/API_REFERENCE.md)** — Backend API endpoints and usage examples
- **[docs/AUTH_FLOW.md](docs/AUTH_FLOW.md)** — Supabase JWT validation flow and authentication
- **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** — Local setup, integration testing, and VPS deployment

### Auto-Generation Scripts

```bash
# Generate schema documentation from Prisma schema
npm run gen:schema-docs
```

Add to `backend/package.json`:
```json
{
  "scripts": {
    "gen:schema-docs": "node ../../scripts/generate-schema-docs.js"
  }
}
```

### Update Process (Per Chunk)

1. Implement the chunk (tasks, tests, code)
2. Update **docs/ARCHITECTURE.md** with new components/endpoints added
3. Run auto-generation scripts (e.g., `npm run gen:schema-docs`)
4. Update **docs/CHANGELOG.md** with completed tasks and files created
5. Commit documentation changes as part of final chunk commit

Example commit message:
```
feat(soegih): implement Chunk 2 — Backend Foundation

- Task 6: Prisma schema & migrations
- Task 7: Prisma service + app bootstrap
- Task 8: Supabase JWT validation guard

docs: update ARCHITECTURE.md, generate schema docs, update CHANGELOG.md
```

### Documentation Guidelines

- Keep **ARCHITECTURE.md** high-level and visual; link to actual files in `/src` rather than duplicating code
- Use text-based ASCII diagrams for flows, architecture, and entity relationships
- Keep reference docs (DATA_MODELS, API_REFERENCE) in sync with actual implementation
- Focus documentation on "what exists now", not "what will be implemented"
- When adding new API endpoints, update **docs/API_REFERENCE.md** with curl examples
- When schema changes, run auto-generation to keep **docs/generated/schema.prisma.md** current
