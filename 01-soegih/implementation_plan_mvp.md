# Soegih MVP Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy the Soegih MVP — a single-user personal finance web app with wallet management, transaction tracking, and AI-powered natural language transaction entry.

**Architecture:** Monorepo with three services (NestJS backend, Python FastAPI AI service, React frontend) communicating via REST. Backend handles all business logic and data persistence via Prisma + Supabase Postgres. The AI service is a stateless parser that converts natural language to structured transaction data. Frontend is a CSR React app served by nginx behind Caddy.

**Tech Stack:** NestJS + TypeScript + Prisma, Python FastAPI + LangChain + gpt-4o-mini, React + Vite, Postgres (Supabase), JWT auth, Pino logging, Caddy reverse proxy, Docker Compose.

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
JWT_SECRET=change_me_in_production
JWT_EXPIRES_IN=7d
OPENAI_API_KEY=sk-...
BACKEND_PORT=3000
AI_SERVICE_PORT=8000
AI_SERVICE_URL=http://ai:8000
VITE_API_BASE_URL=http://localhost/api/v1
SEED_EMAIL=admin@soegih.app
SEED_PASSWORD=changeme123
```

- [ ] **Step 3: Commit**

```bash
git add .gitignore .env.example
git commit -m "chore: initialize monorepo root"
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
pnpm add @nestjs/config @nestjs/jwt @nestjs/passport @nestjs/axios passport passport-jwt
pnpm add @prisma/client prisma
pnpm add nestjs-pino pino-http pino-pretty
pnpm add bcrypt class-validator class-transformer axios
pnpm add -D @types/passport-jwt @types/bcrypt
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
- Create: `frontend/` (Vite + React project)

- [ ] **Step 1: Scaffold Vite project**

```bash
pnpm create vite@latest frontend -- --template react-ts
cd frontend && pnpm install
pnpm add react-router-dom axios recharts
```

- [ ] **Step 2: Remove boilerplate**

Delete `src/App.css`, `src/assets/react.svg`. Clear `src/App.tsx` to a minimal stub.

- [ ] **Step 3: Create module-based structure**

```bash
cd frontend
mkdir -p src/modules/{auth,wallet,category,transaction,dashboard,ai}/{components,hooks,services,types}
mkdir -p src/shared/{components,hooks,utils,types}
mkdir -p src/assets
```

- [ ] **Step 4: Commit**

```bash
git add frontend/
git commit -m "chore: scaffold React frontend"
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

## Chunk 2: Backend Foundation — Prisma & Auth

### Task 6: Prisma Schema & Migrations

**Files:**
- Create: `backend/prisma/schema.prisma`
- Create: `backend/prisma/seed.ts`

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
  id            String     @id @default(uuid())
  email         String     @unique
  password_hash String
  created_at    DateTime   @default(now())
  updated_at    DateTime   @updatedAt
  deleted_at    DateTime?
  wallets       Wallet[]
  categories    Category[]
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

- [ ] **Step 5: Create prisma/seed.ts**

```typescript
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_EMAIL ?? 'admin@soegih.app';
  const password = process.env.SEED_PASSWORD ?? 'changeme123';
  const existing = await prisma.user.findFirst({ where: { email } });
  if (existing) { console.log('User already exists.'); return; }
  await prisma.user.create({
    data: { email, password_hash: await bcrypt.hash(password, 12) },
  });
  console.log(`Created user: ${email}`);
}

main().finally(() => prisma.$disconnect());
```

Add to `backend/package.json`:
```json
"prisma": { "seed": "ts-node prisma/seed.ts" }
```

- [ ] **Step 6: Commit**

```bash
git add backend/prisma/ backend/package.json
git commit -m "feat(backend): add Prisma schema, migrations, and seed script"
```

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

### Task 8: Auth Module

**Files:**
- Create: `backend/src/modules/auth/dto/login.dto.ts`
- Create: `backend/src/modules/auth/strategies/jwt.strategy.ts`
- Create: `backend/src/common/guards/jwt-auth.guard.ts`
- Create: `backend/src/modules/auth/auth.service.ts`
- Create: `backend/src/modules/auth/auth.service.spec.ts`
- Create: `backend/src/modules/auth/auth.controller.ts`
- Create: `backend/src/modules/auth/auth.module.ts`

- [ ] **Step 1: Create login.dto.ts**

```typescript
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail() email: string;
  @IsString() @MinLength(8) password: string;
}
```

- [ ] **Step 2: Write failing test**

```typescript
// auth.service.spec.ts
import { Test } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;

  const mockUser = {
    id: 'uuid-1', email: 'test@example.com',
    password_hash: bcrypt.hashSync('password123', 10),
    deleted_at: null,
  };

  beforeEach(async () => {
    prisma = { user: { findFirst: jest.fn().mockResolvedValue(mockUser) } };
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: { sign: jest.fn().mockReturnValue('token') } },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(AuthService);
  });

  it('returns access_token on valid credentials', async () => {
    const result = await service.login('test@example.com', 'password123');
    expect(result).toHaveProperty('access_token');
  });

  it('throws on wrong password', async () => {
    await expect(service.login('test@example.com', 'wrong')).rejects.toThrow();
  });

  it('throws when user not found', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    await expect(service.login('x@x.com', 'password123')).rejects.toThrow();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
cd backend && pnpm test -- auth.service.spec
```
Expected: FAIL — `AuthService` not found.

- [ ] **Step 4: Create auth.service.ts**

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findFirst({ where: { email, deleted_at: null } });
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return { access_token: this.jwt.sign({ sub: user.id, email: user.email }) };
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd backend && pnpm test -- auth.service.spec
```
Expected: PASS — 3 tests passing.

- [ ] **Step 6: Create jwt.strategy.ts**

```typescript
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get<string>('JWT_SECRET'),
    });
  }
  async validate(payload: { sub: string; email: string }) {
    return { id: payload.sub, email: payload.email };
  }
}
```

- [ ] **Step 7: Create jwt-auth.guard.ts**

```typescript
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

- [ ] **Step 8: Create auth.controller.ts**

```typescript
import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }

  @Post('logout')
  @HttpCode(200)
  logout() { return { message: 'Logged out' }; }
}
```

- [ ] **Step 9: Create auth.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (c: ConfigService) => ({
        secret: c.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: c.get('JWT_EXPIRES_IN', '7d') },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
```

Add `AuthModule` to `app.module.ts` imports.

- [ ] **Step 10: Commit**

```bash
git add backend/src/modules/auth/ backend/src/common/
git commit -m "feat(backend): add auth module with JWT login"
```

---

## Chunk 3: Backend — Wallets & Categories

### Task 9: Wallet Module

**Files:**
- Create: `backend/src/modules/wallet/dto/create-wallet.dto.ts`
- Create: `backend/src/modules/wallet/dto/update-wallet.dto.ts`
- Create: `backend/src/modules/wallet/wallet.service.ts`
- Create: `backend/src/modules/wallet/wallet.service.spec.ts`
- Create: `backend/src/modules/wallet/wallet.controller.ts`
- Create: `backend/src/modules/wallet/wallet.module.ts`

- [ ] **Step 1: Create DTOs**

```typescript
// dto/create-wallet.dto.ts
import { IsString, IsEnum, IsNotEmpty } from 'class-validator';
export enum WalletType { cash = 'cash', bank = 'bank', e_wallet = 'e_wallet', other = 'other' }

export class CreateWalletDto {
  @IsString() @IsNotEmpty() name: string;
  @IsEnum(WalletType) type: WalletType;
}
```

```typescript
// dto/update-wallet.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateWalletDto } from './create-wallet.dto';
export class UpdateWalletDto extends PartialType(CreateWalletDto) {}
```

- [ ] **Step 2: Write failing tests**

```typescript
// wallet.service.spec.ts
import { Test } from '@nestjs/testing';
import { WalletService } from './wallet.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

const USER_ID = 'user-uuid';
const mockWallet = { id: 'w1', user_id: USER_ID, name: 'Main', balance: '0.00', type: 'cash', created_at: new Date(), updated_at: new Date(), deleted_at: null };

describe('WalletService', () => {
  let service: WalletService;
  let prisma: any;

  beforeEach(async () => {
    prisma = { wallet: { findMany: jest.fn().mockResolvedValue([mockWallet]), findFirst: jest.fn().mockResolvedValue(mockWallet), create: jest.fn().mockResolvedValue(mockWallet), update: jest.fn().mockResolvedValue(mockWallet) } };
    const module = await Test.createTestingModule({
      providers: [WalletService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(WalletService);
  });

  it('findAll returns wallets for user', async () => {
    const result = await service.findAll(USER_ID);
    expect(result).toHaveLength(1);
  });

  it('findOne throws NotFoundException when not found', async () => {
    prisma.wallet.findFirst.mockResolvedValue(null);
    await expect(service.findOne('bad', USER_ID)).rejects.toThrow(NotFoundException);
  });

  it('softDelete sets deleted_at', async () => {
    await service.softDelete('w1', USER_ID);
    expect(prisma.wallet.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ deleted_at: expect.any(Date) }) })
    );
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
cd backend && pnpm test -- wallet.service.spec
```
Expected: FAIL — `WalletService` not found.

- [ ] **Step 4: Create wallet.service.ts**

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { UpdateWalletDto } from './dto/update-wallet.dto';

@Injectable()
export class WalletService {
  constructor(private prisma: PrismaService) {}

  findAll(user_id: string) {
    return this.prisma.wallet.findMany({ where: { user_id, deleted_at: null }, orderBy: { created_at: 'asc' } });
  }

  async findOne(id: string, user_id: string) {
    const wallet = await this.prisma.wallet.findFirst({ where: { id, user_id, deleted_at: null } });
    if (!wallet) throw new NotFoundException('Wallet not found');
    return wallet;
  }

  create(user_id: string, dto: CreateWalletDto) {
    return this.prisma.wallet.create({ data: { user_id, name: dto.name, type: dto.type, balance: 0 } });
  }

  async update(id: string, user_id: string, dto: UpdateWalletDto) {
    await this.findOne(id, user_id);
    return this.prisma.wallet.update({ where: { id }, data: dto });
  }

  async softDelete(id: string, user_id: string) {
    await this.findOne(id, user_id);
    return this.prisma.wallet.update({ where: { id }, data: { deleted_at: new Date() } });
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd backend && pnpm test -- wallet.service.spec
```
Expected: PASS — 3 tests passing.

- [ ] **Step 6: Create wallet.controller.ts**

```typescript
import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { WalletService } from './wallet.service';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { UpdateWalletDto } from './dto/update-wallet.dto';

@Controller('wallets')
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(private wallet: WalletService) {}

  @Get() findAll(@Request() req: any) { return this.wallet.findAll(req.user.id); }
  @Get(':id') findOne(@Param('id') id: string, @Request() req: any) { return this.wallet.findOne(id, req.user.id); }
  @Post() create(@Body() dto: CreateWalletDto, @Request() req: any) { return this.wallet.create(req.user.id, dto); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateWalletDto, @Request() req: any) { return this.wallet.update(id, req.user.id, dto); }
  @Delete(':id') softDelete(@Param('id') id: string, @Request() req: any) { return this.wallet.softDelete(id, req.user.id); }
}
```

- [ ] **Step 7: Create wallet.module.ts, register in AppModule**

```typescript
import { Module } from '@nestjs/common';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';

@Module({ controllers: [WalletController], providers: [WalletService] })
export class WalletModule {}
```

Add `WalletModule` to `app.module.ts` imports.

- [ ] **Step 8: Commit**

```bash
git add backend/src/modules/wallet/
git commit -m "feat(backend): add wallet module"
```

---

### Task 10: Category Module

**Files:**
- Create: `backend/src/modules/category/` (same structure as wallet)

- [ ] **Step 1: Create DTOs**

```typescript
// dto/create-category.dto.ts
import { IsString, IsEnum, IsOptional, IsNotEmpty } from 'class-validator';
export enum CategoryType { expense = 'expense', income = 'income' }

export class CreateCategoryDto {
  @IsString() @IsNotEmpty() name: string;
  @IsOptional() @IsString() description?: string;
  @IsEnum(CategoryType) type: CategoryType;
}
```

```typescript
// dto/update-category.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateCategoryDto } from './create-category.dto';
export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}
```

- [ ] **Step 2: Write failing tests**

```typescript
// category.service.spec.ts
import { Test } from '@nestjs/testing';
import { CategoryService } from './category.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

const USER_ID = 'user-uuid';
const mockCategory = { id: 'c1', user_id: USER_ID, name: 'Food', description: null, type: 'expense', created_at: new Date(), updated_at: new Date(), deleted_at: null };

describe('CategoryService', () => {
  let service: CategoryService;
  let prisma: any;

  beforeEach(async () => {
    prisma = { category: { findMany: jest.fn().mockResolvedValue([mockCategory]), findFirst: jest.fn().mockResolvedValue(mockCategory), create: jest.fn().mockResolvedValue(mockCategory), update: jest.fn().mockResolvedValue(mockCategory) } };
    const module = await Test.createTestingModule({
      providers: [CategoryService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(CategoryService);
  });

  it('findAll returns categories for user', async () => {
    expect(await service.findAll(USER_ID)).toHaveLength(1);
  });

  it('findOne throws NotFoundException when not found', async () => {
    prisma.category.findFirst.mockResolvedValue(null);
    await expect(service.findOne('bad', USER_ID)).rejects.toThrow(NotFoundException);
  });

  it('softDelete sets deleted_at', async () => {
    await service.softDelete('c1', USER_ID);
    expect(prisma.category.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ deleted_at: expect.any(Date) }) })
    );
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
cd backend && pnpm test -- category.service.spec
```

- [ ] **Step 4: Create category.service.ts** (mirror wallet.service.ts, replacing `wallet` → `category`)

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd backend && pnpm test -- category.service.spec
```

- [ ] **Step 6: Create category.controller.ts and category.module.ts** (mirror wallet controller/module pattern). Register `CategoryModule` in `app.module.ts`.

- [ ] **Step 7: Commit**

```bash
git add backend/src/modules/category/
git commit -m "feat(backend): add category module"
```

---

## Chunk 4: Backend — Transactions & Dashboard

### Task 11: Transaction Module

This is the most critical backend module. Creating a transaction must:
1. Validate wallet/category ownership
2. Create `transaction_event`
3. Create 1 or 2 `posting` rows
4. Update `wallet.balance`

Steps 2–4 run inside a single Prisma `$transaction`.

**Files:**
- Create: `backend/src/modules/transaction/dto/create-transaction.dto.ts`
- Create: `backend/src/modules/transaction/transaction.service.ts`
- Create: `backend/src/modules/transaction/transaction.service.spec.ts`
- Create: `backend/src/modules/transaction/transaction.controller.ts`
- Create: `backend/src/modules/transaction/transaction.module.ts`

- [ ] **Step 1: Create create-transaction.dto.ts**

```typescript
import { IsString, IsEnum, IsOptional, IsNumber, IsPositive, IsISO8601, IsUUID } from 'class-validator';

export enum TransactionType { expense = 'expense', income = 'income', transfer = 'transfer' }

export class CreateTransactionDto {
  @IsEnum(TransactionType) type: TransactionType;
  @IsNumber() @IsPositive() amount: number;
  @IsUUID() wallet_id: string;
  @IsOptional() @IsUUID() destination_wallet_id?: string;
  @IsOptional() @IsUUID() category_id?: string;
  @IsOptional() @IsString() note?: string;
  @IsISO8601() occurred_at: string;
}
```

- [ ] **Step 2: Write failing tests for core business rules**

```typescript
// transaction.service.spec.ts
import { Test } from '@nestjs/testing';
import { TransactionService } from './transaction.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TransactionType } from './dto/create-transaction.dto';

const USER_ID = 'user-uuid';

describe('TransactionService - validation', () => {
  let service: TransactionService;
  let prisma: any;

  const mockWallet = { id: 'w1', user_id: USER_ID, balance: '100.00', deleted_at: null };
  const mockCategory = { id: 'c1', user_id: USER_ID, type: 'expense', deleted_at: null };
  const mockEvent = { id: 'evt-1', type: 'expense', postings: [] };

  beforeEach(async () => {
    prisma = {
      wallet: { findFirst: jest.fn().mockResolvedValue(mockWallet) },
      category: { findFirst: jest.fn().mockResolvedValue(mockCategory) },
      $transaction: jest.fn().mockImplementation((fn) => fn(prisma)),
      transaction_event: { create: jest.fn().mockResolvedValue(mockEvent), findFirst: jest.fn().mockResolvedValue(mockEvent) },
      posting: { create: jest.fn().mockResolvedValue({}) },
    };
    const module = await Test.createTestingModule({
      providers: [TransactionService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(TransactionService);
  });

  it('throws BadRequestException when category_id missing for expense', async () => {
    await expect(service.create(USER_ID, { type: TransactionType.expense, amount: 50, wallet_id: 'w1', occurred_at: new Date().toISOString() }))
      .rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException when destination_wallet_id missing for transfer', async () => {
    await expect(service.create(USER_ID, { type: TransactionType.transfer, amount: 50, wallet_id: 'w1', occurred_at: new Date().toISOString() }))
      .rejects.toThrow(BadRequestException);
  });

  it('throws NotFoundException when wallet not found', async () => {
    prisma.wallet.findFirst.mockResolvedValue(null);
    await expect(service.create(USER_ID, { type: TransactionType.expense, amount: 50, wallet_id: 'bad', category_id: 'c1', occurred_at: new Date().toISOString() }))
      .rejects.toThrow(NotFoundException);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
cd backend && pnpm test -- transaction.service.spec
```

- [ ] **Step 4: Create transaction.service.ts**

```typescript
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTransactionDto, TransactionType } from './dto/create-transaction.dto';

@Injectable()
export class TransactionService {
  constructor(private prisma: PrismaService) {}

  async findAll(user_id: string, month?: string) {
    const where: any = {
      deleted_at: null,
      postings: { some: { wallet: { user_id, deleted_at: null } } },
    };
    if (month) {
      const [year, m] = month.split('-').map(Number);
      where.occurred_at = { gte: new Date(year, m - 1, 1), lt: new Date(year, m, 1) };
    }
    return this.prisma.transaction_event.findMany({
      where,
      include: { postings: { include: { wallet: true } }, category: true },
      orderBy: { occurred_at: 'desc' },
    });
  }

  async findOne(id: string, user_id: string) {
    const event = await this.prisma.transaction_event.findFirst({
      where: { id, deleted_at: null, postings: { some: { wallet: { user_id } } } },
      include: { postings: { include: { wallet: true } }, category: true },
    });
    if (!event) throw new NotFoundException('Transaction not found');
    return event;
  }

  async create(user_id: string, dto: CreateTransactionDto) {
    if (dto.type !== TransactionType.transfer && !dto.category_id) {
      throw new BadRequestException('category_id is required for expense/income');
    }
    if (dto.type === TransactionType.transfer && !dto.destination_wallet_id) {
      throw new BadRequestException('destination_wallet_id is required for transfer');
    }

    const sourceWallet = await this.prisma.wallet.findFirst({ where: { id: dto.wallet_id, user_id, deleted_at: null } });
    if (!sourceWallet) throw new NotFoundException('Source wallet not found');

    if (dto.type === TransactionType.transfer) {
      const destWallet = await this.prisma.wallet.findFirst({ where: { id: dto.destination_wallet_id, user_id, deleted_at: null } });
      if (!destWallet) throw new NotFoundException('Destination wallet not found');
    }

    if (dto.category_id) {
      const cat = await this.prisma.category.findFirst({ where: { id: dto.category_id, user_id, deleted_at: null } });
      if (!cat) throw new NotFoundException('Category not found');
    }

    return this.prisma.$transaction(async (tx) => {
      const event = await tx.transaction_event.create({
        data: { type: dto.type, note: dto.note, category_id: dto.category_id ?? null, occurred_at: new Date(dto.occurred_at) },
      });

      if (dto.type === TransactionType.expense) {
        await tx.posting.create({ data: { event_id: event.id, wallet_id: dto.wallet_id, amount: -dto.amount } });
        await tx.wallet.update({ where: { id: dto.wallet_id }, data: { balance: { decrement: dto.amount } } });
      } else if (dto.type === TransactionType.income) {
        await tx.posting.create({ data: { event_id: event.id, wallet_id: dto.wallet_id, amount: dto.amount } });
        await tx.wallet.update({ where: { id: dto.wallet_id }, data: { balance: { increment: dto.amount } } });
      } else {
        await tx.posting.create({ data: { event_id: event.id, wallet_id: dto.wallet_id, amount: -dto.amount } });
        await tx.posting.create({ data: { event_id: event.id, wallet_id: dto.destination_wallet_id!, amount: dto.amount } });
        await tx.wallet.update({ where: { id: dto.wallet_id }, data: { balance: { decrement: dto.amount } } });
        await tx.wallet.update({ where: { id: dto.destination_wallet_id }, data: { balance: { increment: dto.amount } } });
      }

      return tx.transaction_event.findFirst({
        where: { id: event.id },
        include: { postings: { include: { wallet: true } }, category: true },
      });
    });
  }

  async softDelete(id: string, user_id: string) {
    const event = await this.findOne(id, user_id);
    return this.prisma.$transaction(async (tx) => {
      for (const posting of (event as any).postings) {
        await tx.wallet.update({ where: { id: posting.wallet_id }, data: { balance: { decrement: Number(posting.amount) } } });
        await tx.posting.update({ where: { id: posting.id }, data: { deleted_at: new Date() } });
      }
      return tx.transaction_event.update({ where: { id }, data: { deleted_at: new Date() } });
    });
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd backend && pnpm test -- transaction.service.spec
```
Expected: PASS.

- [ ] **Step 6: Create transaction.controller.ts**

```typescript
import { Controller, Get, Post, Delete, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TransactionService } from './transaction.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';

@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionController {
  constructor(private tx: TransactionService) {}

  @Get() findAll(@Request() req: any, @Query('month') month?: string) { return this.tx.findAll(req.user.id, month); }
  @Get(':id') findOne(@Param('id') id: string, @Request() req: any) { return this.tx.findOne(id, req.user.id); }
  @Post() create(@Body() dto: CreateTransactionDto, @Request() req: any) { return this.tx.create(req.user.id, dto); }
  @Delete(':id') softDelete(@Param('id') id: string, @Request() req: any) { return this.tx.softDelete(id, req.user.id); }
}
```

- [ ] **Step 7: Create transaction.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { TransactionController } from './transaction.controller';
import { TransactionService } from './transaction.service';

@Module({ controllers: [TransactionController], providers: [TransactionService], exports: [TransactionService] })
export class TransactionModule {}
```

Add `TransactionModule` to `app.module.ts` imports.

- [ ] **Step 8: Commit**

```bash
git add backend/src/modules/transaction/
git commit -m "feat(backend): add transaction module with atomic balance updates"
```

---

### Task 12: Dashboard Module

**Files:**
- Create: `backend/src/modules/dashboard/dashboard.service.ts`
- Create: `backend/src/modules/dashboard/dashboard.service.spec.ts`
- Create: `backend/src/modules/dashboard/dashboard.controller.ts`
- Create: `backend/src/modules/dashboard/dashboard.module.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// dashboard.service.spec.ts
import { Test } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('DashboardService', () => {
  let service: DashboardService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      wallet: { findMany: jest.fn().mockResolvedValue([{ balance: '500.00' }, { balance: '200.00' }]) },
      posting: { findMany: jest.fn().mockResolvedValue([
        { amount: '-50.00', transaction_event: { type: 'expense', category: { name: 'Food' } } },
        { amount: '1000.00', transaction_event: { type: 'income', category: null } },
      ]) },
    };
    const module = await Test.createTestingModule({
      providers: [DashboardService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(DashboardService);
  });

  it('returns net_worth as sum of all wallet balances', async () => {
    const result = await service.getSummary('user-uuid');
    expect(result.net_worth).toBe(700);
  });

  it('returns correct total_income and total_expense', async () => {
    const result = await service.getSummary('user-uuid');
    expect(result.total_income).toBe(1000);
    expect(result.total_expense).toBe(50);
  });

  it('returns expense_by_category array', async () => {
    const result = await service.getSummary('user-uuid');
    expect(result.expense_by_category).toEqual([{ name: 'Food', amount: 50 }]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && pnpm test -- dashboard.service.spec
```

- [ ] **Step 3: Create dashboard.service.ts**

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getSummary(user_id: string) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const wallets = await this.prisma.wallet.findMany({ where: { user_id, deleted_at: null } });
    const net_worth = wallets.reduce((sum, w) => sum + Number(w.balance), 0);

    const postings = await this.prisma.posting.findMany({
      where: {
        deleted_at: null,
        wallet: { user_id, deleted_at: null },
        transaction_event: { deleted_at: null, occurred_at: { gte: monthStart, lt: monthEnd }, type: { in: ['expense', 'income'] } },
      },
      include: { transaction_event: { include: { category: true } } },
    });

    let total_income = 0;
    let total_expense = 0;
    const expense_map: Record<string, number> = {};

    for (const p of postings) {
      const amount = Number(p.amount);
      if (p.transaction_event.type === 'income') {
        total_income += amount;
      } else {
        total_expense += Math.abs(amount);
        const name = p.transaction_event.category?.name ?? 'Uncategorized';
        expense_map[name] = (expense_map[name] ?? 0) + Math.abs(amount);
      }
    }

    return {
      net_worth,
      total_income,
      total_expense,
      expense_by_category: Object.entries(expense_map).map(([name, amount]) => ({ name, amount })),
      month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
    };
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd backend && pnpm test -- dashboard.service.spec
```
Expected: PASS — 3 tests passing.

- [ ] **Step 5: Create dashboard.controller.ts and dashboard.module.ts**

```typescript
// dashboard.controller.ts
import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private dashboard: DashboardService) {}
  @Get() getSummary(@Request() req: any) { return this.dashboard.getSummary(req.user.id); }
}
```

Register `DashboardModule` in `app.module.ts`.

- [ ] **Step 6: Commit**

```bash
git add backend/src/modules/dashboard/
git commit -m "feat(backend): add dashboard module"
```

---

### Task 13: AI Proxy Module (Backend)

**Files:**
- Create: `backend/src/modules/ai/dto/chat.dto.ts`
- Create: `backend/src/modules/ai/ai.service.ts`
- Create: `backend/src/modules/ai/ai.controller.ts`
- Create: `backend/src/modules/ai/ai.module.ts`

- [ ] **Step 1: Create chat.dto.ts**

```typescript
import { IsString, IsNotEmpty } from 'class-validator';
export class ChatDto {
  @IsString() @IsNotEmpty() message: string;
}
```

- [ ] **Step 2: Create ai.service.ts**

```typescript
import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';
import { TransactionService } from '../transaction/transaction.service';
import { CreateTransactionDto } from '../transaction/dto/create-transaction.dto';

@Injectable()
export class AiService {
  constructor(
    private http: HttpService,
    private config: ConfigService,
    private prisma: PrismaService,
    private transactionService: TransactionService,
  ) {}

  async chat(user_id: string, message: string) {
    const [wallets, categories] = await Promise.all([
      this.prisma.wallet.findMany({ where: { user_id, deleted_at: null } }),
      this.prisma.category.findMany({ where: { user_id, deleted_at: null } }),
    ]);
    const aiUrl = this.config.get<string>('AI_SERVICE_URL');
    const { data } = await firstValueFrom(
      this.http.post(`${aiUrl}/ai/chat`, { message, wallets, categories })
    );
    return data;
  }

  confirm(user_id: string, dto: CreateTransactionDto) {
    return this.transactionService.create(user_id, dto);
  }
}
```

- [ ] **Step 3: Create ai.controller.ts**

```typescript
import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AiService } from './ai.service';
import { ChatDto } from './dto/chat.dto';
import { CreateTransactionDto } from '../transaction/dto/create-transaction.dto';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private ai: AiService) {}
  @Post('chat') chat(@Body() dto: ChatDto, @Request() req: any) { return this.ai.chat(req.user.id, dto.message); }
  @Post('chat/confirm') confirm(@Body() dto: CreateTransactionDto, @Request() req: any) { return this.ai.confirm(req.user.id, dto); }
}
```

- [ ] **Step 4: Create ai.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { TransactionModule } from '../transaction/transaction.module';

@Module({
  imports: [HttpModule, TransactionModule],
  controllers: [AiController],
  providers: [AiService],
})
export class AiModule {}
```

Add `AiModule` to `app.module.ts` imports.

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/ai/
git commit -m "feat(backend): add AI proxy module"
```

---

## Chunk 5: Python AI Service

### Task 14: Transaction Parsing Chain

**Files:**
- Create: `ai/app/schemas/transaction.py`
- Create: `ai/app/chains/transaction_chain.py`
- Create: `ai/app/routers/__init__.py`
- Create: `ai/app/routers/chat.py`
- Create: `ai/tests/test_chat.py`

- [ ] **Step 1: Create schemas/transaction.py**

```python
from pydantic import BaseModel
from typing import Literal, Optional

class WalletContext(BaseModel):
    id: str
    name: str
    type: str
    balance: str

class CategoryContext(BaseModel):
    id: str
    name: str
    type: Literal["expense", "income"]

class ParsedTransaction(BaseModel):
    transaction_type: Literal["expense", "income", "transfer"]
    amount: float
    wallet_id: str
    destination_wallet_id: Optional[str] = None
    category_id: Optional[str] = None
    note: Optional[str] = None
    occurred_at: str  # ISO 8601

class ChatRequest(BaseModel):
    message: str
    wallets: list[WalletContext]
    categories: list[CategoryContext]

class ChatResponse(BaseModel):
    parsed: ParsedTransaction
    summary: str
```

- [ ] **Step 2: Create chains/transaction_chain.py**

```python
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from app.schemas.transaction import ParsedTransaction, ChatRequest
from app.config import settings
from datetime import datetime

def build_context(request: ChatRequest) -> str:
    wallets = "\n".join([f"- id={w.id}, name={w.name}, type={w.type}" for w in request.wallets])
    categories = "\n".join([f"- id={c.id}, name={c.name}, type={c.type}" for c in request.categories])
    return f"Wallets:\n{wallets}\n\nCategories:\n{categories}"

def parse_transaction(request: ChatRequest) -> ParsedTransaction:
    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0, api_key=settings.openai_api_key)
    structured_llm = llm.with_structured_output(ParsedTransaction)

    system = f"""You are a personal finance assistant. Parse the user's natural language input
into a structured transaction. Today's date is {datetime.now().strftime('%Y-%m-%d')}.

Use ONLY the wallet IDs and category IDs listed below. Pick the closest match.
For transfers, set destination_wallet_id. For expenses/income, set category_id.
Set occurred_at to today's date in ISO 8601 unless the user specifies a date.

{build_context(request)}"""

    chain = ChatPromptTemplate.from_messages([("system", system), ("human", "{message}")]) | structured_llm
    return chain.invoke({"message": request.message})
```

- [ ] **Step 3: Write failing test**

```python
# tests/test_chat.py
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from app.main import app

client = TestClient(app)

def test_health():
    response = client.get("/health")
    assert response.status_code == 200

def test_chat_returns_parsed_transaction():
    mock_parsed = MagicMock(
        transaction_type="expense", amount=42.0, wallet_id="w1",
        destination_wallet_id=None, category_id="c1", note="coffee",
        occurred_at="2026-03-12T00:00:00",
    )
    with patch("app.routers.chat.parse_transaction", return_value=mock_parsed):
        response = client.post("/ai/chat", json={
            "message": "spent $42 on coffee",
            "wallets": [{"id": "w1", "name": "Main", "type": "cash", "balance": "100.00"}],
            "categories": [{"id": "c1", "name": "Food", "type": "expense"}],
        })
    assert response.status_code == 200
    data = response.json()
    assert data["parsed"]["transaction_type"] == "expense"
    assert data["parsed"]["amount"] == 42.0
    assert "summary" in data
```

- [ ] **Step 4: Run test to verify it fails**

```bash
cd ai && python -m pytest tests/test_chat.py -v
```
Expected: FAIL — `app.routers.chat` not found.

- [ ] **Step 5: Create routers/chat.py**

```python
from fastapi import APIRouter
from app.schemas.transaction import ChatRequest, ChatResponse, ParsedTransaction
from app.chains.transaction_chain import parse_transaction

router = APIRouter()

def build_summary(parsed: ParsedTransaction) -> str:
    amount = f"${parsed.amount:.2f}"
    if parsed.transaction_type == "expense":
        return f"Record expense of {amount}"
    elif parsed.transaction_type == "income":
        return f"Record income of {amount}"
    return f"Transfer {amount} between wallets"

@router.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    parsed = parse_transaction(request)
    return ChatResponse(parsed=parsed, summary=build_summary(parsed))
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
cd ai && python -m pytest tests/test_chat.py -v
```
Expected: PASS — 2 tests passing.

- [ ] **Step 7: Commit**

```bash
git add ai/
git commit -m "feat(ai): add transaction parsing chain with LangChain + gpt-4o-mini"
```

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
```

- [ ] **Step 2: Create shared/api/api-client.ts**

```typescript
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';
export const apiClient = axios.create({ baseURL: BASE_URL });

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);
```

- [ ] **Step 3: Create shared/hooks/use-auth.ts**

```typescript
import { useState } from 'react';

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('access_token'));
  const login = (token: string) => { localStorage.setItem('access_token', token); setIsAuthenticated(true); };
  const logout = () => { localStorage.removeItem('access_token'); setIsAuthenticated(false); };
  return { isAuthenticated, login, logout };
}
```

- [ ] **Step 4: Update main.tsx**

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><BrowserRouter><App /></BrowserRouter></React.StrictMode>
);
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/shared/ frontend/src/main.tsx
git commit -m "feat(frontend): add API client, shared types, and auth hook"
```

---

### Task 16: Auth Module + Routing (Frontend)

**Files:**
- Create: `frontend/src/modules/auth/services/auth.service.ts`
- Create: `frontend/src/modules/auth/components/LoginPage.tsx`
- Create: `frontend/src/shared/components/ProtectedRoute.tsx`
- Create: `frontend/src/shared/components/Layout.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Create auth/services/auth.service.ts**

```typescript
import { apiClient } from '../../../shared/api/api-client';
export const authService = {
  login: (email: string, password: string) =>
    apiClient.post<{ access_token: string }>('/auth/login', { email, password }),
  logout: () => apiClient.post('/auth/logout'),
};
```

- [ ] **Step 2: Create auth/components/LoginPage.tsx**

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/auth.service';
import { useAuth } from '../../../shared/hooks/use-auth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const { data } = await authService.login(email, password);
      login(data.access_token);
      navigate('/');
    } catch { setError('Invalid email or password'); }
  };

  return (
    <div style={{ maxWidth: 400, margin: '100px auto', padding: 24 }}>
      <h1>Soegih</h1>
      <form onSubmit={handleSubmit}>
        <div><label>Email<br /><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label></div>
        <div><label>Password<br /><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label></div>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit">Login</button>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Create shared/components/ProtectedRoute.tsx**

```tsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/use-auth';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}
```

- [ ] **Step 4: Create shared/components/Layout.tsx**

```tsx
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { authService } from '../../modules/auth/services/auth.service';
import { useAuth } from '../hooks/use-auth';

export default function Layout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const handleLogout = async () => { await authService.logout(); logout(); navigate('/login'); };

  return (
    <div>
      <nav style={{ display: 'flex', gap: 16, padding: '12px 24px', borderBottom: '1px solid #eee' }}>
        <Link to="/">Dashboard</Link>
        <Link to="/wallets">Wallets</Link>
        <Link to="/categories">Categories</Link>
        <Link to="/transactions">Transactions</Link>
        <Link to="/ai">AI Assistant</Link>
        <button onClick={handleLogout} style={{ marginLeft: 'auto' }}>Logout</button>
      </nav>
      <main style={{ padding: 24 }}><Outlet /></main>
    </div>
  );
}
```

- [ ] **Step 5: Update App.tsx with full routing**

```tsx
import { Routes, Route } from 'react-router-dom';
import LoginPage from './modules/auth/components/LoginPage';
import ProtectedRoute from './shared/components/ProtectedRoute';
import Layout from './shared/components/Layout';
import DashboardPage from './modules/dashboard/components/DashboardPage';
import WalletPage from './modules/wallet/components/WalletPage';
import CategoryPage from './modules/category/components/CategoryPage';
import TransactionPage from './modules/transaction/components/TransactionPage';
import AiChatPage from './modules/ai/components/AiChatPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<DashboardPage />} />
        <Route path="wallets" element={<WalletPage />} />
        <Route path="categories" element={<CategoryPage />} />
        <Route path="transactions" element={<TransactionPage />} />
        <Route path="ai" element={<AiChatPage />} />
      </Route>
    </Routes>
  );
}
```

Stub all page components with `export default function XPage() { return <div>X</div>; }` so the app compiles.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/modules/auth/ frontend/src/shared/components/ frontend/src/App.tsx
git commit -m "feat(frontend): add auth, layout, and routing"
```

---

## Chunk 7: Frontend — Wallets, Categories, Transactions

### Task 17: Wallet Module (Frontend)

**Files:**
- Create: `frontend/src/modules/wallet/services/wallet.service.ts`
- Create: `frontend/src/modules/wallet/hooks/use-wallets.ts`
- Create: `frontend/src/modules/wallet/components/WalletForm.tsx`
- Create: `frontend/src/modules/wallet/components/WalletList.tsx`
- Create: `frontend/src/modules/wallet/components/WalletPage.tsx`

- [ ] **Step 1: Create wallet/services/wallet.service.ts**

```typescript
import { apiClient } from '../../../shared/api/api-client';
import type { Wallet } from '../../../shared/types';

export const walletService = {
  getAll: () => apiClient.get<Wallet[]>('/wallets'),
  create: (data: { name: string; type: Wallet['type'] }) => apiClient.post<Wallet>('/wallets', data),
  update: (id: string, data: Partial<{ name: string; type: Wallet['type'] }>) => apiClient.patch<Wallet>(`/wallets/${id}`, data),
  delete: (id: string) => apiClient.delete(`/wallets/${id}`),
};
```

- [ ] **Step 2: Create wallet/hooks/use-wallets.ts**

```typescript
import { useState, useEffect } from 'react';
import { walletService } from '../services/wallet.service';
import type { Wallet } from '../../../shared/types';

export function useWallets() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = async () => {
    setLoading(true);
    const { data } = await walletService.getAll();
    setWallets(data);
    setLoading(false);
  };

  useEffect(() => { refetch(); }, []);
  return { wallets, loading, refetch };
}
```

- [ ] **Step 3: Create WalletForm.tsx**

```tsx
import { useState } from 'react';
import { walletService } from '../services/wallet.service';
import type { Wallet } from '../../../shared/types';

const TYPES: Wallet['type'][] = ['cash', 'bank', 'e_wallet', 'other'];

interface Props { onSuccess: () => void; onCancel: () => void; }

export default function WalletForm({ onSuccess, onCancel }: Props) {
  const [name, setName] = useState('');
  const [type, setType] = useState<Wallet['type']>('cash');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await walletService.create({ name, type }); onSuccess(); }
    catch { setError('Failed to create wallet. Name + type combination may already exist.'); }
  };

  return (
    <form onSubmit={handleSubmit}>
      <label>Name<br /><input value={name} onChange={(e) => setName(e.target.value)} required /></label>
      <label>Type<br />
        <select value={type} onChange={(e) => setType(e.target.value as Wallet['type'])}>
          {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </label>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <button type="submit">Save</button>
      <button type="button" onClick={onCancel}>Cancel</button>
    </form>
  );
}
```

- [ ] **Step 4: Create WalletList.tsx**

```tsx
import type { Wallet } from '../../../shared/types';
import { walletService } from '../services/wallet.service';

interface Props { wallets: Wallet[]; onDelete: () => void; }

export default function WalletList({ wallets, onDelete }: Props) {
  const handleDelete = async (id: string) => {
    if (!confirm('Delete this wallet?')) return;
    await walletService.delete(id);
    onDelete();
  };

  if (wallets.length === 0) return <p>No wallets yet.</p>;

  return (
    <ul>
      {wallets.map((w) => (
        <li key={w.id}>
          <strong>{w.name}</strong> ({w.type}) — Balance: {w.balance}
          <button onClick={() => handleDelete(w.id)} style={{ marginLeft: 8 }}>Delete</button>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 5: Create WalletPage.tsx**

```tsx
import { useState } from 'react';
import { useWallets } from '../hooks/use-wallets';
import WalletList from './WalletList';
import WalletForm from './WalletForm';

export default function WalletPage() {
  const { wallets, loading, refetch } = useWallets();
  const [showForm, setShowForm] = useState(false);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h2>Wallets</h2>
      <button onClick={() => setShowForm(true)}>+ Add Wallet</button>
      {showForm && <WalletForm onSuccess={() => { setShowForm(false); refetch(); }} onCancel={() => setShowForm(false)} />}
      <WalletList wallets={wallets} onDelete={refetch} />
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/modules/wallet/
git commit -m "feat(frontend): add wallet module"
```

---

### Task 18: Category Module (Frontend)

Follow the exact same pattern as Task 17. Key differences:
- `CategoryForm` fields: `name` (text), `description` (text, optional), `type` (select: `expense` | `income`)
- `CategoryList` groups categories by type under "Expense Categories" / "Income Categories" headings
- Service: `categoryService` hitting `/categories` endpoints

- [ ] **Step 1: Create category/services/category.service.ts**
- [ ] **Step 2: Create category/hooks/use-categories.ts** — export `useCategories()` with same shape as `useWallets()`
- [ ] **Step 3: Create CategoryForm.tsx** — name, description (optional), type fields
- [ ] **Step 4: Create CategoryList.tsx** — grouped by type
- [ ] **Step 5: Create CategoryPage.tsx**
- [ ] **Step 6: Commit**

```bash
git add frontend/src/modules/category/
git commit -m "feat(frontend): add category module"
```

---

### Task 19: Transaction Module (Frontend)

**Files:**
- Create: `frontend/src/modules/transaction/services/transaction.service.ts`
- Create: `frontend/src/modules/transaction/hooks/use-transactions.ts`
- Create: `frontend/src/modules/transaction/components/TransactionForm.tsx`
- Create: `frontend/src/modules/transaction/components/TransactionList.tsx`
- Create: `frontend/src/modules/transaction/components/TransactionPage.tsx`

- [ ] **Step 1: Create transaction/services/transaction.service.ts**

```typescript
import { apiClient } from '../../../shared/api/api-client';
import type { Transaction } from '../../../shared/types';

export interface CreateTransactionPayload {
  type: 'expense' | 'income' | 'transfer';
  amount: number;
  wallet_id: string;
  destination_wallet_id?: string;
  category_id?: string;
  note?: string;
  occurred_at: string;
}

export const transactionService = {
  getAll: (month?: string) => apiClient.get<Transaction[]>('/transactions', { params: month ? { month } : {} }),
  create: (data: CreateTransactionPayload) => apiClient.post<Transaction>('/transactions', data),
  delete: (id: string) => apiClient.delete(`/transactions/${id}`),
};
```

- [ ] **Step 2: Create transaction/hooks/use-transactions.ts**

```typescript
import { useState, useEffect } from 'react';
import { transactionService } from '../services/transaction.service';
import type { Transaction } from '../../../shared/types';

export function useTransactions(month?: string) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = async () => {
    setLoading(true);
    const { data } = await transactionService.getAll(month);
    setTransactions(data);
    setLoading(false);
  };

  useEffect(() => { refetch(); }, [month]);
  return { transactions, loading, refetch };
}
```

- [ ] **Step 3: Create TransactionForm.tsx**

Form fields:
- `type` — select: expense / income / transfer
- `amount` — number input
- `wallet_id` — select from wallets prop
- `destination_wallet_id` — select from wallets, visible only when type = transfer
- `category_id` — select from categories filtered to match type, visible when type ≠ transfer
- `note` — text, optional
- `occurred_at` — date input, default today

Accept `wallets: Wallet[]` and `categories: Category[]` as props. On submit, call `transactionService.create(...)` and invoke `onSuccess`.

- [ ] **Step 4: Create TransactionList.tsx**

Display each transaction showing: date, type badge, amount (absolute value), wallet name(s) from postings, category name, note. Include a Delete button with `confirm()` dialog.

- [ ] **Step 5: Create TransactionPage.tsx**

- Month selector (`<input type="month">`) defaulting to current month
- Fetch wallets and categories to pass to `TransactionForm`
- "Add Transaction" button → shows `TransactionForm`
- `TransactionList` below

- [ ] **Step 6: Commit**

```bash
git add frontend/src/modules/transaction/
git commit -m "feat(frontend): add transaction module"
```

---

## Chunk 8: Frontend — Dashboard & AI Chat

### Task 20: Dashboard Module (Frontend)

**Files:**
- Create: `frontend/src/modules/dashboard/services/dashboard.service.ts`
- Create: `frontend/src/modules/dashboard/hooks/use-dashboard.ts`
- Create: `frontend/src/modules/dashboard/components/ExpensePieChart.tsx`
- Create: `frontend/src/modules/dashboard/components/DashboardPage.tsx`

- [ ] **Step 1: Create dashboard/services/dashboard.service.ts**

```typescript
import { apiClient } from '../../../shared/api/api-client';
import type { DashboardSummary } from '../../../shared/types';
export const dashboardService = { getSummary: () => apiClient.get<DashboardSummary>('/dashboard') };
```

- [ ] **Step 2: Create dashboard/hooks/use-dashboard.ts**

```typescript
import { useState, useEffect } from 'react';
import { dashboardService } from '../services/dashboard.service';
import type { DashboardSummary } from '../../../shared/types';

export function useDashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    dashboardService.getSummary().then(({ data }) => { setSummary(data); setLoading(false); });
  }, []);
  return { summary, loading };
}
```

- [ ] **Step 3: Create ExpensePieChart.tsx**

```tsx
import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A569BD', '#48C9B0'];

interface Props { data: { name: string; amount: number }[]; }

export default function ExpensePieChart({ data }: Props) {
  if (data.length === 0) return <p>No expense data this month.</p>;
  return (
    <PieChart width={400} height={300}>
      <Pie data={data} dataKey="amount" nameKey="name" cx="50%" cy="50%" outerRadius={100}>
        {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
      </Pie>
      <Tooltip formatter={(v: number) => `$${v.toFixed(2)}`} />
      <Legend />
    </PieChart>
  );
}
```

- [ ] **Step 4: Create DashboardPage.tsx**

```tsx
import { useDashboard } from '../hooks/use-dashboard';
import ExpensePieChart from './ExpensePieChart';

export default function DashboardPage() {
  const { summary, loading } = useDashboard();
  if (loading) return <div>Loading...</div>;
  if (!summary) return <div>No data available.</div>;

  return (
    <div>
      <h2>Dashboard — {summary.month}</h2>
      <div style={{ display: 'flex', gap: 32, marginBottom: 24 }}>
        <div><h3>Net Worth</h3><p style={{ fontSize: 24 }}>${summary.net_worth.toFixed(2)}</p></div>
        <div><h3>This Month</h3><p>Income: ${summary.total_income.toFixed(2)}</p><p>Expense: ${summary.total_expense.toFixed(2)}</p></div>
      </div>
      <h3>Expense Breakdown</h3>
      <ExpensePieChart data={summary.expense_by_category} />
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/modules/dashboard/
git commit -m "feat(frontend): add dashboard module with pie chart"
```

---

### Task 21: AI Chat Module (Frontend)

**Files:**
- Create: `frontend/src/modules/ai/types/index.ts`
- Create: `frontend/src/modules/ai/services/ai.service.ts`
- Create: `frontend/src/modules/ai/components/TransactionConfirmCard.tsx`
- Create: `frontend/src/modules/ai/components/AiChatPage.tsx`

- [ ] **Step 1: Create ai/types/index.ts**

```typescript
export interface ParsedTransaction {
  transaction_type: 'expense' | 'income' | 'transfer';
  amount: number;
  wallet_id: string;
  destination_wallet_id?: string;
  category_id?: string;
  note?: string;
  occurred_at: string;
}
export interface ChatResponse { parsed: ParsedTransaction; summary: string; }
```

- [ ] **Step 2: Create ai/services/ai.service.ts**

```typescript
import { apiClient } from '../../../shared/api/api-client';
import type { ChatResponse } from '../types';
import type { CreateTransactionPayload } from '../../transaction/services/transaction.service';
import type { Transaction } from '../../../shared/types';

export const aiService = {
  chat: (message: string) => apiClient.post<ChatResponse>('/ai/chat', { message }),
  confirm: (payload: CreateTransactionPayload) => apiClient.post<Transaction>('/ai/chat/confirm', payload),
};
```

- [ ] **Step 3: Create TransactionConfirmCard.tsx**

```tsx
import type { ParsedTransaction } from '../types';
import type { Wallet, Category } from '../../../shared/types';

interface Props {
  parsed: ParsedTransaction; summary: string;
  wallets: Wallet[]; categories: Category[];
  onConfirm: () => void; onCancel: () => void;
}

export default function TransactionConfirmCard({ parsed, summary, wallets, categories, onConfirm, onCancel }: Props) {
  const wallet = wallets.find((w) => w.id === parsed.wallet_id);
  const destWallet = wallets.find((w) => w.id === parsed.destination_wallet_id);
  const category = categories.find((c) => c.id === parsed.category_id);

  return (
    <div style={{ border: '1px solid #ccc', padding: 16, borderRadius: 8, marginTop: 16 }}>
      <h3>Confirm Transaction</h3>
      <p><strong>Summary:</strong> {summary}</p>
      <p><strong>Type:</strong> {parsed.transaction_type}</p>
      <p><strong>Amount:</strong> ${parsed.amount.toFixed(2)}</p>
      <p><strong>Wallet:</strong> {wallet?.name ?? parsed.wallet_id}</p>
      {destWallet && <p><strong>To Wallet:</strong> {destWallet.name}</p>}
      {category && <p><strong>Category:</strong> {category.name}</p>}
      {parsed.note && <p><strong>Note:</strong> {parsed.note}</p>}
      <p><strong>Date:</strong> {parsed.occurred_at.slice(0, 10)}</p>
      <button onClick={onConfirm}>Confirm & Save</button>
      <button onClick={onCancel} style={{ marginLeft: 8 }}>Cancel</button>
    </div>
  );
}
```

- [ ] **Step 4: Create AiChatPage.tsx**

```tsx
import { useState } from 'react';
import { aiService } from '../services/ai.service';
import TransactionConfirmCard from './TransactionConfirmCard';
import { useWallets } from '../../wallet/hooks/use-wallets';
import { useCategories } from '../../category/hooks/use-categories';
import type { ChatResponse } from '../types';

export default function AiChatPage() {
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<ChatResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const { wallets } = useWallets();
  const { categories } = useCategories();

  const handleChat = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(''); setResult(null); setSaved(false);
    try {
      const { data } = await aiService.chat(message);
      setResult(data);
    } catch { setError('Failed to parse. Please try rephrasing.'); }
    finally { setLoading(false); }
  };

  const handleConfirm = async () => {
    if (!result) return;
    await aiService.confirm({
      type: result.parsed.transaction_type,
      amount: result.parsed.amount,
      wallet_id: result.parsed.wallet_id,
      destination_wallet_id: result.parsed.destination_wallet_id,
      category_id: result.parsed.category_id,
      note: result.parsed.note,
      occurred_at: result.parsed.occurred_at,
    });
    setResult(null); setMessage(''); setSaved(true);
  };

  return (
    <div>
      <h2>AI Assistant</h2>
      <p>Describe a transaction in plain English.</p>
      <form onSubmit={handleChat}>
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder='e.g. "spent 50k on groceries from BCA"'
          style={{ width: '100%', marginBottom: 8 }}
          required
        />
        <button type="submit" disabled={loading}>{loading ? 'Parsing...' : 'Parse'}</button>
      </form>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {saved && <p style={{ color: 'green' }}>Transaction saved successfully!</p>}
      {result && (
        <TransactionConfirmCard
          parsed={result.parsed} summary={result.summary}
          wallets={wallets} categories={categories}
          onConfirm={handleConfirm} onCancel={() => setResult(null)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/modules/ai/
git commit -m "feat(frontend): add AI chat module with confirmation card"
```

---

## Chunk 9: Deployment

### Task 22: Local Integration Test

- [ ] **Step 1: Build all services locally**

```bash
cd /repo-root
cp .env.example .env   # fill in real values
docker compose build
docker compose up -d
```

- [ ] **Step 2: Run migrations and seed**

```bash
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npx prisma db seed
```

- [ ] **Step 3: Smoke test locally**

- `http://localhost` → login page loads
- Login → redirected to dashboard
- Create wallet → appears in list
- Create category → appears in list
- Add expense → wallet balance decreases, dashboard updates
- Transfer between wallets → both balances update
- AI chat: type "spent $20 on coffee" → confirmation card appears → confirm → transaction saved
- Check `http://localhost/api/v1/dashboard` returns JSON

- [ ] **Step 4: Fix any issues found, commit**

```bash
git add .
git commit -m "fix: resolve integration issues found during local smoke test"
```

---

### Task 23: VPS Deployment

- [ ] **Step 1: Push code to remote**

```bash
git push origin master
```

- [ ] **Step 2: On VPS — clone and configure**

```bash
git clone <repo-url> soegih && cd soegih
cp .env.example .env
# Edit .env with production values:
#   DATABASE_URL=<supabase connection string>
#   JWT_SECRET=<strong random secret>
#   OPENAI_API_KEY=<your key>
#   SEED_EMAIL / SEED_PASSWORD
```

- [ ] **Step 3: Update Caddyfile for production domain**

```
yourdomain.com {
    handle /api/* {
        reverse_proxy backend:3000
    }
    handle {
        reverse_proxy frontend:80
    }
}
```

- [ ] **Step 4: Deploy**

```bash
docker compose build
docker compose up -d
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npx prisma db seed
```

- [ ] **Step 5: Verify production**

- Visit `https://yourdomain.com` → login page loads with HTTPS
- Run through the same smoke test as Task 22 on production

- [ ] **Step 6: Final commit**

```bash
git add Caddyfile
git commit -m "chore: update Caddyfile for production domain"
git push
```

---

*End of MVP Implementation Plan*
