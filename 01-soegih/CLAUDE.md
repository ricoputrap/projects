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
