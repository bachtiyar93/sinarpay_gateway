# SinarPay Backend

## Run

```bash
npm install
npm run build
npm run lint
npm test
npm run test:e2e
```

## Env

Copy `.env.example` to `.env` and set:

- `DATABASE_URL`
- `REDIS_HOST`
- `REDIS_PORT`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `ENCRYPTION_KEY`
- `BANK_CALLBACK_SECRET`
- `FRONTEND_URL`

## Docs

- Swagger: `http://localhost:3000/api/docs`
- API contract: `../../API_CONTRACT.md`
- Changelog: `../../CHANGELOG.md`
