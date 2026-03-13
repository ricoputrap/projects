# Deployment Guide

Complete instructions for local development and production deployment.

## Table of Contents

1. [Local Development Setup](#local-development-setup)
2. [Local Integration Testing](#local-integration-testing)
3. [VPS Deployment](#vps-deployment)
4. [Environment Variables](#environment-variables)
5. [Troubleshooting](#troubleshooting)

---

## Local Development Setup

### Prerequisites

- Node.js 20+ (for backend & frontend)
- pnpm (package manager)
- Python 3.12+ (for AI service)
- Docker & Docker Compose (for all services)
- Git

### Option 1: Docker Compose (Recommended for Integration)

Fastest way to spin up the full stack locally.

#### 1. Clone Repository

```bash
git clone <repo-url>
cd soegih
```

#### 2. Set Up Environment

```bash
cp .env.example .env
```

Edit `.env` with:
- `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/soegih`
- `SUPABASE_URL=https://your-project.supabase.co` (from Supabase dashboard)
- `SUPABASE_ANON_KEY=eyJ...` (from Supabase dashboard)
- `OPENAI_API_KEY=sk-...` (from OpenAI)
- Leave other vars as defaults for local dev

#### 3. Start Services

```bash
docker-compose up --build
```

This starts:
- **Caddy** on http://localhost (reverse proxy)
- **Frontend** on http://localhost/ (Nginx SPA)
- **Backend** on http://localhost/api/v1 (NestJS, port 3000 internal)
- **AI Service** on port 8000 (internal, FastAPI)

#### 4. Wait for Services

```bash
# Check logs
docker-compose logs -f backend

# Wait for "NestJS application successfully started" message
```

#### 5. Run Database Migrations

```bash
# In a new terminal
docker exec <backend-container-id> npx prisma migrate deploy
```

Get container ID:
```bash
docker ps | grep backend
```

#### 6. Seed Test User

```bash
docker exec <backend-container-id> npx prisma db seed
```

Or create via Supabase dashboard:
- Go to https://supabase.com/dashboard
- Select your project
- Auth → Users → Add user
- Email: `admin@soegih.app`, Password: `changeme123`

#### 7. Test Frontend

Open http://localhost in browser. Login with test credentials.

---

### Option 2: Local Development (Without Docker)

For faster iteration on individual services.

#### Backend

```bash
cd backend
pnpm install
npx prisma migrate dev
npm run start:dev
```

Runs on http://localhost:3000/api/v1

#### Frontend

```bash
cd frontend
pnpm install
npm run dev
```

Runs on http://localhost:5173

#### AI Service

```bash
cd ai
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Runs on http://localhost:8000

**Note:** You'll need to handle CORS and environment variable setup manually.

---

## Local Integration Testing

### Test Flow

1. **User Login**
   - Navigate to http://localhost/login
   - Enter: `admin@soegih.app` / `changeme123`
   - Should redirect to dashboard

2. **Create Wallet**
   - Go to http://localhost/wallets
   - Click "Add Wallet"
   - Name: "Test Wallet", Type: "bank"
   - Verify wallet appears in list

3. **Create Category**
   - Go to http://localhost/categories
   - Click "Add Category"
   - Name: "Food", Type: "expense"
   - Verify category appears

4. **Create Transaction**
   - Go to http://localhost/transactions
   - Click "Add Transaction"
   - Type: "expense", Amount: 25.50, Wallet: "Test Wallet", Category: "Food", Note: "Lunch"
   - Verify in list and wallet balance updated

5. **Test AI Chat**
   - Go to http://localhost/ai
   - Type: "spent $15 on coffee"
   - Verify parsed values, confirm to create transaction

6. **Check Dashboard**
   - Go to http://localhost/
   - Verify net worth, income, expense, and pie chart

### API Testing with cURL

```bash
# Get JWT token (from browser, copy from Supabase session in localStorage)
TOKEN="eyJ..."

# Create wallet
curl -X POST http://localhost/api/v1/wallets \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Savings","type":"bank"}'

# List wallets
curl -X GET http://localhost/api/v1/wallets \
  -H "Authorization: Bearer $TOKEN"

# Get dashboard
curl -X GET http://localhost/api/v1/dashboard \
  -H "Authorization: Bearer $TOKEN"
```

---

## VPS Deployment

### Prerequisites

- VPS with Ubuntu 20.04+ (or similar Linux)
- 2GB+ RAM, 20GB+ disk
- Docker & Docker Compose installed
- Domain name (for HTTPS)
- Supabase project set up

### 1. Prepare VPS

```bash
# SSH into VPS
ssh root@<vps-ip>

# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
apt install docker-compose -y
```

### 2. Clone Repository

```bash
git clone <repo-url> /opt/soegih
cd /opt/soegih
```

### 3. Set Up Environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Database (use Supabase managed Postgres connection string)
DATABASE_URL=postgresql://postgres:<password>@<project>.supabase.co:5432/postgres

# Supabase Auth
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_ANON_KEY=eyJ...

# OpenAI
OPENAI_API_KEY=sk-...

# Services
BACKEND_PORT=3000
AI_SERVICE_PORT=8000
AI_SERVICE_URL=http://ai:8000
VITE_API_BASE_URL=https://yourdomain.app/api/v1
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### 4. Update Caddyfile for Domain

Edit `Caddyfile`:

```
yourdomain.app {
    handle /api/* {
        reverse_proxy backend:3000
    }
    handle {
        reverse_proxy frontend:80
    }
}
```

### 5. Build & Deploy

```bash
docker-compose up -d --build

# Wait for services to start
sleep 30

# Check logs
docker-compose logs -f backend
```

### 6. Run Migrations

```bash
docker exec soegih-backend-1 npx prisma migrate deploy
```

### 7. Create Production User

```bash
# Option A: Supabase dashboard
# Log in to https://supabase.com/dashboard
# Create user via Auth → Users

# Option B: Supabase CLI
supabase auth admin create-user \
  --email admin@yourdomain.app \
  --password <strong-password>
```

### 8. Enable HTTPS

Caddy automatically handles HTTPS for registered domains. For self-signed:

```
yourdomain.app {
    tls internal  # Self-signed cert (development only)
    # ... rest of config
}
```

### 9. Monitor & Maintain

```bash
# View logs
docker-compose logs -f

# Restart specific service
docker-compose restart backend

# Stop all
docker-compose down

# Backup database (via Supabase dashboard)
```

---

## Environment Variables

### Backend

| Variable | Example | Notes |
|----------|---------|-------|
| `DATABASE_URL` | `postgresql://...` | Postgres connection string |
| `SUPABASE_URL` | `https://project.supabase.co` | For JWT validation |
| `SUPABASE_ANON_KEY` | `eyJ...` | Public key for client-side auth |
| `OPENAI_API_KEY` | `sk-...` | For LLM in AI service |
| `BACKEND_PORT` | `3000` | Port to listen on |
| `AI_SERVICE_URL` | `http://ai:8000` | AI service endpoint (Docker) |
| `NODE_ENV` | `production` | Set to `production` on VPS |

### Frontend

| Variable | Example | Notes |
|----------|---------|-------|
| `VITE_API_BASE_URL` | `http://localhost/api/v1` | Backend API endpoint |
| `VITE_SUPABASE_URL` | `https://project.supabase.co` | For Supabase client |
| `VITE_SUPABASE_ANON_KEY` | `eyJ...` | Public key for auth |

### AI Service

| Variable | Example | Notes |
|----------|---------|-------|
| `OPENAI_API_KEY` | `sk-...` | LLM API key |
| `AI_SERVICE_PORT` | `8000` | Port to listen on |

---

## Troubleshooting

### Backend won't start

```bash
# Check logs
docker-compose logs backend

# Common issues:
# - DATABASE_URL wrong → verify in Supabase
# - Port already in use → change BACKEND_PORT
# - Migrations failed → check database connection
```

### Migrations fail

```bash
# Reset database (CAREFUL - deletes data)
docker exec soegih-backend-1 npx prisma migrate reset

# Or, list migrations
docker exec soegih-backend-1 npx prisma migrate status
```

### Frontend shows "Cannot GET /"

- Check Caddy reverse proxy config
- Verify frontend service is running: `docker ps | grep frontend`
- Check frontend logs: `docker-compose logs frontend`

### API returns 401 Unauthorized

- Verify JWT token is valid
- Check Supabase project credentials in `.env`
- Token may have expired → refresh in Supabase client

### AI service returns 500

```bash
# Check logs
docker-compose logs ai

# Verify OPENAI_API_KEY is set
# Check network connectivity to OpenAI API
```

### Cannot connect to database

```bash
# Test connection locally
psql $DATABASE_URL -c "SELECT 1;"

# On VPS, whitelist IP
# In Supabase: Project Settings → Database → Connection Pooling
```

---

## Scaling Considerations

For production with multiple users:

1. **Database:** Use Supabase managed Postgres (scales automatically)
2. **Backend:** Run multiple instances behind load balancer
3. **Frontend:** CDN (e.g., Cloudflare) for static assets
4. **AI Service:** Implement request queue/rate limiting
5. **Monitoring:** Add Prometheus/Grafana for metrics

---

**Last updated:** [Planning phase]
**Source:** [docker-compose.yml](../docker-compose.yml), [Caddyfile](../Caddyfile)
