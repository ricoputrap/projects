# Soegih MVP Implementation Plan — Test-Driven Development with Supabase Auth

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy the Soegih MVP — a single-user personal finance web app with wallet management, transaction tracking, and AI-powered natural language transaction entry.

**Architecture:** Monorepo with three services (NestJS backend, Python FastAPI AI service, React frontend) communicating via REST. Backend handles all business logic and data persistence via Prisma + Supabase Postgres. The AI service is a stateless parser that converts natural language to structured transaction data. Frontend is a CSR React app served by nginx behind Caddy. **Authentication is handled by Supabase Auth** (no custom auth logic).

**Tech Stack:** NestJS + TypeScript + Prisma, Python FastAPI + LangChain + gpt-4o-mini, React + Vite, Postgres (Supabase), Supabase Auth, Pino logging, Caddy reverse proxy, Docker Compose.

---

## Chunk 1: Infrastructure & Monorepo Setup

### Task 1: Initialize Monorepo Root

**Files:**
- Create: `.gitignore`
- Create: `.env.example`

- [ ] **Step 1: Create .gitignore**

```gitignore
node_modules/
.venv/
__pycache__/
*.pyc
.env
.env.local
dist/
build/
.idea/
.vscode/
*.swp
.DS_Store
*.log
logs/
```

- [ ] **Step 2: Create .env.example**

```env
DATABASE_URL=postgresql://user:password@host:5432/soegih
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ...
OPENAI_API_KEY=sk-...
BACKEND_PORT=3000
AI_SERVICE_PORT=8000
AI_SERVICE_URL=http://ai:8000
VITE_API_BASE_URL=http://localhost/api/v1
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

- [ ] **Step 3: Commit**

```bash
git add .gitignore .env.example
git commit -m "chore: initialize monorepo root with Supabase Auth config"
```

---

### Task 2: Scaffold NestJS Backend

**Files:**
- Create: `backend/` (NestJS project)

- [ ] **Step 1: Scaffold NestJS**

```bash
npx @nestjs/cli new backend --package-manager pnpm --skip-git
```

- [ ] **Step 2: Install dependencies**

```bash
cd backend
pnpm add @nestjs/config @nestjs/axios @supabase/supabase-js
pnpm add @prisma/client prisma
pnpm add nestjs-pino pino-http pino-pretty
pnpm add class-validator class-transformer axios
```

- [ ] **Step 3: Remove NestJS boilerplate**

Delete `src/app.controller.ts`, `src/app.controller.spec.ts`, `src/app.service.ts`. Update `src/app.module.ts` to remove references to them.

- [ ] **Step 4: Commit**

```bash
git add backend/
git commit -m "chore: scaffold NestJS backend"
```

---

### Task 3: Scaffold Python AI Service

**Files:**
- Create: `ai/requirements.txt`
- Create: `ai/app/__init__.py`
- Create: `ai/app/main.py`
- Create: `ai/app/config.py`
- Create: `ai/tests/__init__.py`

- [ ] **Step 1: Create requirements.txt**

```txt
fastapi==0.115.0
uvicorn[standard]==0.30.0
langchain==0.3.0
langchain-openai==0.2.0
pydantic==2.9.0
pydantic-settings==2.5.0
python-dotenv==1.0.0
httpx==0.27.0
pytest==8.3.0
pytest-asyncio==0.24.0
```

- [ ] **Step 2: Create app/config.py**

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    openai_api_key: str
    ai_service_port: int = 8000

    class Config:
        env_file = ".env"

settings = Settings()
```

- [ ] **Step 3: Create app/main.py**

```python
from fastapi import FastAPI
from app.routers import chat

app = FastAPI(title="Soegih AI Service")
app.include_router(chat.router, prefix="/ai", tags=["ai"])

@app.get("/health")
def health():
    return {"status": "ok"}
```

- [ ] **Step 4: Commit**

```bash
git add ai/
git commit -m "chore: scaffold Python AI service"
```

---

### Task 4: Scaffold React Frontend

**Files:**
- Create: `frontend/` (Vite + React + TanStack Router project)

- [ ] **Step 1: Scaffold project with create-tsrouter-app**

```bash
pnpx create-tsrouter-app@latest frontend
# Select: React, TypeScript, Vite, file-based routing
cd frontend && pnpm install
```

`create-tsrouter-app` sets up `@tanstack/react-router`, `@tanstack/router-vite-plugin`, and the `routeTree.gen.ts` auto-generation pipeline.

- [ ] **Step 2: Install additional dependencies**

```bash
cd frontend
pnpm add axios recharts @tanstack/react-table @supabase/supabase-js
```

- [ ] **Step 3: Remove boilerplate**

Delete any generated demo route files and placeholder components that won't be used. Keep `src/routes/__root.tsx` and `src/main.tsx` — these will be modified in Task 16.

- [ ] **Step 4: Create module-based structure**

```bash
cd frontend
mkdir -p src/modules/{auth,wallet,category,transaction,dashboard,ai}/{components,hooks,services,types}
mkdir -p src/shared/{components,hooks,utils,types}
mkdir -p src/assets
```

- [ ] **Step 5: Commit**

```bash
git add frontend/
git commit -m "chore: scaffold React frontend with TanStack Router"
```

---

### Task 5: Docker Compose + Caddy

**Files:**
- Create: `docker-compose.yml`
- Create: `Caddyfile`
- Create: `backend/Dockerfile`
- Create: `ai/Dockerfile`
- Create: `frontend/Dockerfile`
- Create: `frontend/nginx.conf`

- [ ] **Step 1: Create backend/Dockerfile**

```dockerfile
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN npx prisma generate
RUN pnpm build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
EXPOSE 3000
CMD ["node", "dist/main"]
```

- [ ] **Step 2: Create ai/Dockerfile**

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

- [ ] **Step 3: Create frontend/nginx.conf**

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

- [ ] **Step 4: Create frontend/Dockerfile**

```dockerfile
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

- [ ] **Step 5: Create docker-compose.yml**

```yaml
version: "3.9"
services:
  caddy:
    image: caddy:2-alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - backend
      - frontend

  frontend:
    build: ./frontend
    restart: unless-stopped

  backend:
    build: ./backend
    restart: unless-stopped
    env_file: .env
    depends_on:
      - ai

  ai:
    build: ./ai
    restart: unless-stopped
    env_file: .env

volumes:
  caddy_data:
  caddy_config:
```

- [ ] **Step 6: Create Caddyfile**

```
:80 {
    handle /api/* {
        reverse_proxy backend:3000
    }
    handle {
        reverse_proxy frontend:80
    }
}
```

(For production with a real domain, replace `:80` with `yourdomain.com` — Caddy handles HTTPS automatically.)

- [ ] **Step 7: Commit**

```bash
git add docker-compose.yml Caddyfile backend/Dockerfile ai/Dockerfile frontend/Dockerfile frontend/nginx.conf
git commit -m "chore: add Docker Compose and Caddy config"
```

---

## Chunk 2: Backend Foundation — Prisma & Supabase Auth

### Task 6: Prisma Schema & Migrations

**Files:**
- Create: `backend/prisma/schema.prisma`

- [ ] **Step 1: Initialize Prisma**

```bash
cd backend && npx prisma init --datasource-provider postgresql
```

- [ ] **Step 2: Write schema.prisma**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id         String     @id
  created_at DateTime   @default(now())
  updated_at DateTime   @updatedAt
  deleted_at DateTime?
  wallets    Wallet[]
  categories Category[]
  @@map("users")
}

model Wallet {
  id         String     @id @default(uuid())
  user_id    String
  name       String
  balance    Decimal    @db.Decimal(15, 2)
  type       WalletType
  created_at DateTime   @default(now())
  updated_at DateTime   @updatedAt
  deleted_at DateTime?
  user       User       @relation(fields: [user_id], references: [id])
  postings   Posting[]
  @@map("wallet")
}

model Category {
  id           String       @id @default(uuid())
  user_id      String
  name         String
  description  String?
  type         CategoryType
  created_at   DateTime     @default(now())
  updated_at   DateTime     @updatedAt
  deleted_at   DateTime?
  user         User         @relation(fields: [user_id], references: [id])
  transactions TransactionEvent[]
  @@map("category")
}

model TransactionEvent {
  id          String          @id @default(uuid())
  type        TransactionType
  note        String?
  category_id String?
  occurred_at DateTime
  created_at  DateTime        @default(now())
  updated_at  DateTime        @updatedAt
  deleted_at  DateTime?
  category    Category?       @relation(fields: [category_id], references: [id])
  postings    Posting[]
  @@map("transaction_event")
}

model Posting {
  id         String           @id @default(uuid())
  event_id   String
  wallet_id  String
  amount     Decimal          @db.Decimal(15, 2)
  created_at DateTime         @default(now())
  updated_at DateTime         @updatedAt
  deleted_at DateTime?
  event      TransactionEvent @relation(fields: [event_id], references: [id])
  wallet     Wallet           @relation(fields: [wallet_id], references: [id])
  @@map("posting")
}

enum WalletType   { cash bank e_wallet other }
enum CategoryType { expense income }
enum TransactionType { expense income transfer }
```

- [ ] **Step 3: Create initial migration**

```bash
cd backend && npx prisma migrate dev --name init
```

- [ ] **Step 4: Add partial unique indexes via raw migration**

```bash
npx prisma migrate dev --name add_partial_unique_indexes --create-only
```

Edit the generated SQL file, replace its contents with:

```sql
CREATE UNIQUE INDEX "wallet_user_id_name_type_active_key"
  ON "wallet"("user_id", "name", "type")
  WHERE "deleted_at" IS NULL;

CREATE UNIQUE INDEX "category_user_id_name_type_active_key"
  ON "category"("user_id", "name", "type")
  WHERE "deleted_at" IS NULL;
```

Then run:

```bash
npx prisma migrate deploy
```

- [ ] **Step 5: Commit**

```bash
git add backend/prisma/
git commit -m "feat(backend): add Prisma schema and migrations with Supabase Auth"
```

**Note:** User creation is handled via Supabase Auth. After deploying, create seed users via Supabase dashboard or CLI: `supabase auth admin create-user --email admin@soegih.app --password changeme123`.

---

### Task 7: Prisma Service + App Bootstrap

**Files:**
- Create: `backend/src/prisma/prisma.service.ts`
- Create: `backend/src/prisma/prisma.module.ts`
- Create: `backend/src/common/filters/http-exception.filter.ts`
- Modify: `backend/src/main.ts`
- Modify: `backend/src/app.module.ts`

- [ ] **Step 1: Create prisma.service.ts**

```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() { await this.$connect(); }
}
```

- [ ] **Step 2: Create prisma.module.ts**

```typescript
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({ providers: [PrismaService], exports: [PrismaService] })
export class PrismaModule {}
```

- [ ] **Step 3: Create http-exception.filter.ts**

```typescript
import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const body = exception.getResponse();
    response.status(status).json({
      status_code: status,
      message: typeof body === 'object' ? (body as any).message : body,
      timestamp: new Date().toISOString(),
    });
  }
}
```

- [ ] **Step 4: Update main.ts**

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(process.env.BACKEND_PORT ?? 3000);
}
bootstrap();
```

- [ ] **Step 5: Update app.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { APP_FILTER } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRoot({
      pinoHttp: {
        transport: process.env.NODE_ENV !== 'production' ? { target: 'pino-pretty' } : undefined,
      },
    }),
    PrismaModule,
  ],
  providers: [{ provide: APP_FILTER, useClass: HttpExceptionFilter }],
})
export class AppModule {}
```

- [ ] **Step 6: Commit**

```bash
git add backend/src/
git commit -m "feat(backend): add PrismaService, Pino logging, and global exception filter"
```

---

### Task 8: Supabase JWT Validation Guard

**Files:**
- Create: `backend/src/common/guards/supabase-jwt.guard.ts`
- Create: `backend/src/common/decorators/get-user.decorator.ts`

**Note:** Authentication is delegated to Supabase Auth. The frontend sends Supabase JWT tokens with requests. The backend validates these tokens against Supabase.

- [ ] **Step 1: Create supabase-jwt.guard.ts**

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { CanActivate, ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseJwtGuard implements CanActivate {
  private supabase: any;

  constructor(private config: ConfigService) {
    const url = this.config.get<string>('SUPABASE_URL');
    const key = this.config.get<string>('SUPABASE_ANON_KEY');
    this.supabase = createClient(url, key);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    const token = authHeader.slice(7);

    try {
      const { data, error } = await this.supabase.auth.getUser(token);
      if (error || !data.user) {
        throw new UnauthorizedException('Invalid token');
      }
      request.user = { id: data.user.id, email: data.user.email };
      return true;
    } catch {
      throw new UnauthorizedException('Token validation failed');
    }
  }
}
```

- [ ] **Step 2: Create get-user.decorator.ts**

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const GetUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  }
);
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/common/
git commit -m "feat(backend): add Supabase JWT validation guard"
```

---

## Chunk 3: Backend — Wallets & Categories

### Task 9: Wallet Module (TDD)

(Same as original plan — no auth changes needed. Use `@UseGuards(SupabaseJwtGuard)` instead of `@UseGuards(JwtAuthGuard)` on the controller.)

---

### Task 10: Category Module (TDD)

(Same as original plan — no auth changes needed. Use `@UseGuards(SupabaseJwtGuard)` on the controller.)

---

## Chunk 4: Backend — Transactions & Dashboard

### Task 11: Transaction Module (TDD) with Create, Update, List, Delete

**Files:**
- Create: `backend/src/modules/transaction/dto/create-transaction.dto.ts`
- Create: `backend/src/modules/transaction/dto/update-transaction.dto.ts`
- Create: `backend/src/modules/transaction/transaction.service.ts`
- Create: `backend/src/modules/transaction/transaction.service.spec.ts`
- Create: `backend/src/modules/transaction/transaction.controller.ts`
- Create: `backend/src/modules/transaction/transaction.module.ts`

**Key Constraints:**
- Create: Full control over type, amount, wallet, category, note, date
- **Update: Limited to note, category, amount, and wallet_id ONLY**
  - Cannot change `type` (expense ↔ income ↔ transfer) — locked after creation
  - Cannot change `occurred_at` (date) — locked after creation
  - Amount changes: Reverse original posting, create new posting with delta
- Delete: Soft delete with balance reversal (existing behavior)

Use `@UseGuards(SupabaseJwtGuard)` on all controller methods.

---

### Task 12: Dashboard Module (TDD)

(Same as original plan — no auth changes needed. Use `@UseGuards(SupabaseJwtGuard)` on the controller.)

---

### Task 13: AI Proxy Module

(Same as original plan — no auth changes needed. Use `@UseGuards(SupabaseJwtGuard)` on the controller.)

---

## Chunk 5: Python AI Service — TDD

### Task 14: Transaction Parsing Chain (TDD)

(Same as original plan — no changes needed.)

---

## Chunk 6: Frontend Foundation & Auth

### Task 15: Shared API Client + Types

**Files:**
- Create: `frontend/src/shared/types/index.ts`
- Create: `frontend/src/shared/api/api-client.ts`
- Create: `frontend/src/shared/hooks/use-auth.ts`
- Modify: `frontend/src/main.tsx`

- [ ] **Step 1: Create shared/types/index.ts**

```typescript
export interface Wallet {
  id: string; name: string; balance: string;
  type: 'cash' | 'bank' | 'e_wallet' | 'other';
}
export interface Category {
  id: string; name: string; description: string | null;
  type: 'expense' | 'income';
}
export interface Posting { id: string; wallet_id: string; amount: string; wallet: Wallet; }
export interface Transaction {
  id: string; type: 'expense' | 'income' | 'transfer';
  note: string | null; occurred_at: string;
  category: Category | null; postings: Posting[];
}
export interface DashboardSummary {
  net_worth: number; total_income: number; total_expense: number;
  expense_by_category: { name: string; amount: number }[];
  month: string;
}
export interface PaginatedResponse<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; total_pages: number };
}
```

- [ ] **Step 2: Create shared/api/api-client.ts**

```typescript
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';
export const apiClient = axios.create({ baseURL: BASE_URL });

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

apiClient.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession();
  if (data.session?.access_token) {
    config.headers.Authorization = `Bearer ${data.session.access_token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      supabase.auth.signOut();
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);
```

- [ ] **Step 3: Create shared/hooks/use-auth.ts**

```typescript
import { useState, useEffect } from 'react';
import { supabase } from '../api/api-client';
import type { User } from '@supabase/supabase-js';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isAuthenticated = !!user;

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription?.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return { user, isAuthenticated, isLoading, login, logout };
}
```

- [ ] **Step 4: Update main.tsx**

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';
import { useAuth } from './shared/hooks/use-auth';

const router = createRouter({
  routeTree,
  context: { auth: undefined! },
});

declare module '@tanstack/react-router' {
  interface Register { router: typeof router }
}

function App() {
  const auth = useAuth();
  return <RouterProvider router={router} context={{ auth }} />;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><App /></React.StrictMode>
);
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/shared/ frontend/src/main.tsx
git commit -m "feat(frontend): add API client, shared types, and Supabase Auth hook"
```

---

### Task 16: Auth Module + Routing (Frontend)

**Files:**
- Create: `frontend/src/modules/auth/services/auth.service.ts`
- Modify: `frontend/src/routes/__root.tsx`
- Create: `frontend/src/routes/login.tsx`
- Create: `frontend/src/routes/_app.tsx`
- Create: `frontend/src/routes/_app/index.tsx`
- Create: `frontend/src/routes/_app/wallets.tsx`
- Create: `frontend/src/routes/_app/categories.tsx`
- Create: `frontend/src/routes/_app/transactions.tsx`
- Create: `frontend/src/routes/_app/ai.tsx`
- Create: `frontend/src/shared/components/AppLayout.tsx`

- [ ] **Step 1: Create auth/services/auth.service.ts**

```typescript
import { supabase } from '../../../shared/api/api-client';

export const authService = {
  login: (email: string, password: string) =>
    supabase.auth.signInWithPassword({ email, password }),
  signup: (email: string, password: string) =>
    supabase.auth.signUp({ email, password }),
  logout: () => supabase.auth.signOut(),
  getSession: () => supabase.auth.getSession(),
};
```

- [ ] **Step 2: Update src/routes/__root.tsx**

```tsx
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';
import type { useAuth } from '../shared/hooks/use-auth';

interface RouterContext {
  auth: ReturnType<typeof useAuth>;
}

export const Route = createRootRouteWithContext<RouterContext>()(
  {
    component: () => <Outlet />,
  }
);
```

- [ ] **Step 3: Create src/routes/login.tsx**

```tsx
import { createFileRoute, useRouter } from '@tanstack/react-router';
import { useState } from 'react';
import { authService } from '../modules/auth/services/auth.service';

export const Route = createFileRoute('/login')(
  {
    beforeLoad: ({ context }) => {
      if (context.auth.isAuthenticated) {
        throw Route.redirect({ to: '/' });
      }
    },
    component: LoginPage,
  }
);

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await authService.login(email, password);
      await router.invalidate();
      router.navigate({ to: '/' });
    } catch {
      setError('Invalid email or password');
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '100px auto', padding: 24 }}>
      <h1>Soegih</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label>
            Email
            <br />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
        </div>
        <div>
          <label>
            Password
            <br />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
        </div>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit">Login</button>
      </form>
    </div>
  );
}
```

- [ ] **Step 4: Create src/shared/components/AppLayout.tsx**

```tsx
import { Link, Outlet, useRouter } from '@tanstack/react-router';
import { authService } from '../../modules/auth/services/auth.service';

interface Props {
  onLogout: () => void;
}

export default function AppLayout({ onLogout }: Props) {
  const router = useRouter();

  const handleLogout = async () => {
    await authService.logout();
    onLogout();
    await router.invalidate();
    router.navigate({ to: '/login' });
  };

  return (
    <div>
      <nav
        style={{
          display: 'flex',
          gap: 16,
          padding: '12px 24px',
          borderBottom: '1px solid #eee',
        }}
      >
        <Link to="/">Dashboard</Link>
        <Link to="/wallets">Wallets</Link>
        <Link to="/categories">Categories</Link>
        <Link to="/transactions">Transactions</Link>
        <Link to="/ai">AI Assistant</Link>
        <button
          onClick={handleLogout}
          style={{ marginLeft: 'auto' }}
        >
          Logout
        </button>
      </nav>
      <main style={{ padding: 24 }}>
        <Outlet />
      </main>
    </div>
  );
}
```

- [ ] **Step 5: Create src/routes/_app.tsx (pathless auth guard + layout)**

```tsx
import { createFileRoute, redirect } from '@tanstack/react-router';
import AppLayout from '../shared/components/AppLayout';

export const Route = createFileRoute('/_app')(
  {
    beforeLoad: ({ context }) => {
      if (!context.auth.isAuthenticated) {
        throw redirect({ to: '/login' });
      }
    },
    component: () => {
      const { auth } = Route.useRouteContext();
      return <AppLayout onLogout={auth.logout} />;
    },
  }
);
```

- [ ] **Step 6: Create child route stubs**

```tsx
// src/routes/_app/index.tsx
import { createFileRoute } from '@tanstack/react-router';
export const Route = createFileRoute('/_app/')({
  component: () => <div>Dashboard</div>,
});

// src/routes/_app/wallets.tsx
import { createFileRoute } from '@tanstack/react-router';
export const Route = createFileRoute('/_app/wallets')({
  component: () => <div>Wallets</div>,
});

// src/routes/_app/categories.tsx
import { createFileRoute } from '@tanstack/react-router';
export const Route = createFileRoute('/_app/categories')({
  component: () => <div>Categories</div>,
});

// src/routes/_app/transactions.tsx
import { createFileRoute } from '@tanstack/react-router';
export const Route = createFileRoute('/_app/transactions')({
  component: () => <div>Transactions</div>,
});

// src/routes/_app/ai.tsx
import { createFileRoute } from '@tanstack/react-router';
export const Route = createFileRoute('/_app/ai')({
  component: () => <div>AI Assistant</div>,
});
```

- [ ] **Step 7: Commit**

```bash
git add frontend/src/routes/ frontend/src/modules/auth/ frontend/src/shared/components/
git commit -m "feat(frontend): add Supabase Auth, layout, and TanStack Router file-based routing"
```

---

## Chunk 7: Frontend — Wallets, Categories, Transactions

### Task 17-19: Wallet, Category, Transaction Modules (Frontend)

**Task 17 (Wallet):** Same as original plan — no auth changes needed. Import from shared API client.

**Task 18 (Category):** Same as original plan — no auth changes needed. Import from shared API client.

**Task 19 (Transaction):** Same as original plan, PLUS add transaction editing with constraints:
- Add **TransactionEditModal** or **TransactionEditForm** component
- Display transaction in list with "Edit" button
- Modal/form shows only editable fields:
  - Note (text input)
  - Category (dropdown — expense/income only, NULL for transfer)
  - Amount (number input)
  - Wallet (dropdown — source wallet)
- Gray out/hide immutable fields:
  - Type (expense/income/transfer) — locked
  - Occurred_at (date) — locked
  - Destination_wallet (for transfer) — locked
- Call PATCH `/api/v1/transactions/{id}` on save
- Show validation errors if category doesn't match type
- Refresh transaction list after update

---

## Chunk 8: Frontend — Dashboard & AI Chat

### Task 20-21: Dashboard & AI Chat Modules (Frontend)

(Same as original plan — no auth changes needed. Import from shared API client.)

---

## Chunk 9: Deployment

### Task 22: Local Integration Test

- [ ] **Step 1: Set up Supabase locally (optional)**

For local development, you can use Supabase CLI:
```bash
supabase start
```

Or skip local Supabase and use a Supabase cloud project (free tier).

- [ ] **Step 2: Update .env with Supabase credentials**

```bash
cp .env.example .env
# Edit .env with real SUPABASE_URL and SUPABASE_ANON_KEY from Supabase dashboard
```

- [ ] **Step 3: Start services locally**

```bash
docker-compose up --build
```

- [ ] **Step 4: Create a test user in Supabase**

Via Supabase dashboard or CLI:
```bash
supabase auth admin create-user --email admin@soegih.app --password changeme123
```

- [ ] **Step 5: Verify all endpoints**

- Login: `POST /api/v1/auth/login` → Now handled by frontend via Supabase
- Create wallet: `POST /api/v1/wallets` (with Supabase JWT)
- Create transaction: `POST /api/v1/transactions` (with Supabase JWT)
- Get dashboard: `GET /api/v1/dashboard` (with Supabase JWT)
- AI chat: `POST /api/v1/ai/chat` (with Supabase JWT)

- [ ] **Step 6: Test frontend**

Open http://localhost in browser. Login with Supabase credentials. Verify UI navigation, wallet CRUD, transaction creation, and dashboard display.

- [ ] **Step 7: Commit**

```bash
git add docker-compose.yml
git commit -m "test(integration): verify all services work end-to-end locally with Supabase Auth"
```

---

### Task 23: VPS Deployment

- [ ] **Step 1: Set up Supabase project**

Create a Supabase project at https://supabase.com (free tier available).

- [ ] **Step 2: Prepare environment**

On VPS:
```bash
git clone <repo>
cd <repo>
cp .env.example .env
# Edit .env with:
# - DATABASE_URL from Supabase
# - SUPABASE_URL from Supabase
# - SUPABASE_ANON_KEY from Supabase
# - OPENAI_API_KEY
# - Domain for Caddyfile
```

- [ ] **Step 3: Build and deploy**

```bash
docker-compose -f docker-compose.yml up -d
docker exec <backend-container-id> npx prisma migrate deploy
```

- [ ] **Step 4: Create production user**

```bash
supabase auth admin create-user --email admin@yourdomain.app --password <strong-password>
```

- [ ] **Step 5: Verify production health**

- Check Caddy logs: `docker logs <caddy-container-id>`
- Test endpoints via domain
- Monitor logs: `docker logs -f <service-container-id>`

- [ ] **Step 6: Commit**

```bash
git add .env.example
git commit -m "chore(deployment): production configuration with Supabase ready"
```

---

## Summary

**Total: 23 tasks across 9 chunks**

**Key Difference:** Authentication is now delegated to **Supabase Auth**. No custom JWT logic in the backend. Frontend uses Supabase client for login/logout. Backend validates incoming Supabase JWT tokens via `SupabaseJwtGuard`.

**Benefits:**
- Simpler backend (no password hashing, JWT signing)
- Built-in email verification, password reset, 2FA support
- Secure token refresh handling
- Better security posture (Supabase handles compliance)

All other patterns remain the same: TDD for business logic, modular architecture, REST API, Prisma ORM, etc.
