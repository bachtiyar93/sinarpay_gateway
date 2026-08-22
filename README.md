# SinarPay Gateway

Phase-based implementation of the SinarPay payment gateway.

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
- `FRONTEND_URL`

## Run with Docker

```bash
docker-compose up
```

## API Docs

- Swagger: `http://localhost:3000/api/docs`
- Health: `http://localhost:3000/api/health`

## Notes

- Backend uses strict TypeScript.
- Phases 1-8 are implemented in order.
