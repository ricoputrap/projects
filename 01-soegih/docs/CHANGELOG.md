# Changelog

All notable changes to the Soegih MVP project are documented here.

## Status: Planning Phase

Initial documentation and planning complete. Implementation begins with Chunk 1.

---

## [Pending] Chunk 1: Infrastructure & Monorepo Setup
- Task 1: Initialize monorepo root
- Task 2: Scaffold NestJS backend
- Task 3: Scaffold Python AI service
- Task 4: Scaffold React frontend
- Task 5: Docker Compose + Caddy

## [Pending] Chunk 2: Backend Foundation — Prisma & Supabase Auth
- Task 6: Prisma schema & migrations
- Task 7: Prisma service + app bootstrap
- Task 8: Supabase JWT validation guard

## [Pending] Chunk 3: Backend — Wallets & Categories
- Task 9: Wallet module (TDD)
- Task 10: Category module (TDD)

## [Pending] Chunk 4: Backend — Transactions & Dashboard
- Task 11: Transaction module (TDD)
- Task 12: Dashboard module (TDD)
- Task 13: AI proxy module

## [Pending] Chunk 5: Python AI Service — TDD
- Task 14: Transaction parsing chain

## [Pending] Chunk 6: Frontend Foundation & Auth
- Task 15: Shared API client + types
- Task 16: Auth module + routing

## [Pending] Chunk 7: Frontend — Wallets, Categories, Transactions
- Task 17: Wallet module (frontend)
- Task 18: Category module (frontend)
- Task 19: Transaction module (frontend)

## [Pending] Chunk 8: Frontend — Dashboard & AI Chat
- Task 20: Dashboard module (frontend)
- Task 21: AI chat module (frontend)

## [Pending] Chunk 9: Deployment
- Task 22: Local integration test
- Task 23: VPS deployment

---

## Format

Completed chunks are moved to the top with `[YYYY-MM-DD]` date and marked `(Complete)`. Each task lists the files created/modified and key accomplishments.

Example (future):
```
## [2026-03-15] Chunk 1: Infrastructure & Monorepo Setup (Complete)
- ✅ Task 1: Initialize monorepo root (.gitignore, .env.example)
- ✅ Task 2: Scaffold NestJS backend (backend/ with dependencies)
- ✅ Task 3: Scaffold Python AI service (ai/ with FastAPI setup)
- ✅ Task 4: Scaffold React frontend (frontend/ with TanStack Router)
- ✅ Task 5: Docker Compose + Caddy (docker-compose.yml, Caddyfile, Dockerfiles)
```
