# SinarPay Gateway

Phase-based implementation of the SinarPay payment gateway.

## Quick start (single command)

From the repo root, run:

```bash
npm run start
```

This launcher will:

- check whether Node.js and npm are installed
- install workspace dependencies
- create `.env` / `.env.local` from examples if missing
- start PostgreSQL and Redis through Docker Compose
- sync Prisma schema to the database
- seed the default admin user
- run backend and frontend together in one terminal

## Stop everything

```bash
npm run stop
```

This stops the frontend, backend, and Docker Compose services for PostgreSQL and Redis.

## Prerequisites

- Node.js LTS
- npm
- Docker Desktop / Docker Engine
- Git (optional, but recommended for cloning and branch workflows)

Note: `npm run start` cannot fully boot the app unless Docker is available and running, because the backend depends on PostgreSQL and Redis.
If Docker Desktop is still starting, the launcher will wait automatically for the engine (up to 5 minutes) before failing.

### Troubleshooting Docker startup

If you get `Docker Desktop is unable to start`:

1. Open Docker Desktop and wait until status shows **Engine running**.
2. Run `docker context ls` and ensure the active context is valid (`default` or `desktop-linux`).
3. Retry `npm run start`.

### Default login

After the DB is ready, the app creates a default admin account automatically.

```text
Email: admin@sinarpay.test
Password: password123
```

## Manual commands

```bash
npm install
# Start database services
docker compose up -d postgres redis
# Sync Prisma schema and seed default admin login
npm run db:prepare
npm run dev
# Stop everything
npm run stop
```

## Backend

```bash
cd apps/backend
npm install
npm run build
npm run lint
npm test
npm run test:e2e
```

## Environment

Copy `apps/backend/.env.example` to `apps/backend/.env` and fill:

- `DATABASE_URL`
- `REDIS_HOST`
- `REDIS_PORT`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `ENCRYPTION_KEY`
- `BANK_CALLBACK_SECRET`
- `FRONTEND_URL=http://localhost:3001`

Frontend env:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
BACKEND_API_URL=http://localhost:3000
```

Note: frontend runs on port 3001, while backend API stays on port 3000.

## App URLs

- Frontend: `http://localhost:3001`
- Backend API: `http://localhost:3000`
- Swagger: `http://localhost:3000/api/docs`
- Health: `http://localhost:3000/api/health`
- Login endpoint: `POST http://localhost:3000/api/auth/login`

## Notes

- Backend uses strict TypeScript.
- Frontend uses TanStack Query + modular Zustand stores.
- For local development, PostgreSQL and Redis must be available for the backend to boot successfully.
- The default login is only available after the seed step runs successfully.
- If you want the frontend to run on port 3000 too, you must move the backend to another port or add a reverse proxy.
