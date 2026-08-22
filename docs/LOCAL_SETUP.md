# Local Setup Guide

This guide explains how to run the SinarPay monorepo locally and what each service is responsible for.

## Required tools

- Node.js LTS
- npm
- Docker Desktop or Docker Engine
- Git (optional, but recommended)

## Ports

- Frontend: http://localhost:3001
- Backend API: http://localhost:3000
- Swagger: http://localhost:3000/api/docs
- Health check: http://localhost:3000/api/health

## One-command startup

From the repo root:

```bash
npm run start
```

This command will:

1. check Node.js and npm
2. install dependencies
3. create env files if missing
4. start PostgreSQL and Redis with Docker Compose
5. run Prisma schema sync using `db push`
6. seed the default admin user
7. launch the frontend and backend together

## Stop everything

```bash
npm run stop
```

This stops the app processes and Docker Compose services.

## Manual startup

If you want to run steps manually:

```bash
npm install
docker compose up -d postgres redis
npm run db:prepare
npm run dev
```

## Database and auth setup

The backend depends on PostgreSQL and Redis. Without those, login and payments will fail.

The app seeds an admin user automatically when you run `npm run db:prepare`:

```text
Email: admin@sinarpay.test
Password: password123
```

## Troubleshooting

### Docker Desktop is not ready

If Docker Desktop says it cannot start:

```bash
docker context ls
```

Then ensure the active context is either `default` or `desktop-linux`.

### Port conflict

Frontend runs on port 3001 because backend uses port 3000. If you want both on 3000, you must move one of them.

### Login returns 500

This usually means Prisma schema was not synced or the admin user was not seeded.

Run:

```bash
npm run db:prepare
```

Then retry login.

### API route returns 404

The backend uses a global `/api` prefix. For example:

- `GET http://localhost:3000/api/health` ✅
- `POST http://localhost:3000/api/auth/login` ✅
- `GET http://localhost:3000/` ❌

## Useful commands

```bash
npm run build
npm run build:frontend
npm run build:backend
npm run test --workspace=apps/backend
npm run db:prepare
npm run db:seed:admin
```
