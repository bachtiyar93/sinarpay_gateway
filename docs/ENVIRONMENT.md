# Environment Reference

This file documents the environment values used by the project and explains what each variable is for.

## Backend env

Copy `apps/backend/.env.example` to `apps/backend/.env` and fill the required values.

```env
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://sinarpay:sinarpay_password@localhost:5432/sinarpay_db?schema=public
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
JWT_SECRET=your_jwt_secret_key_min_32_chars_required_for_security!
JWT_EXPIRES_IN=1d
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key_min_32_chars_for_security!
JWT_REFRESH_EXPIRES_IN=7d
ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
BANK_CALLBACK_SECRET=sinarpay_bank_simulator_secret_key_minimum_32_characters!
WEBHOOK_MAX_RETRIES=5
FRONTEND_URL=http://localhost:3001
```

## Frontend env

Create `apps/frontend/.env.local` from `.env.example` if it does not exist.

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
BACKEND_API_URL=http://localhost:3000
```

## Notes

- Backend listens on port 3000.
- Frontend runs on port 3001.
- The frontend calls the backend through the API URL environment variable.
- `NEXT_PUBLIC_API_URL` is the app URL used by the browser and client code.
- `BACKEND_API_URL` is used by the server-side proxy routes in Next.js.

## Default admin account

After running Prisma sync and seed:

```text
Email: admin@sinarpay.test
Password: password123
```

## Troubleshooting

### Prisma schema not synced

```bash
npm run db:prepare
```

### Login 500 error

Check that PostgreSQL is running and the database was seeded.

```bash
docker compose ps
npm run db:prepare
```
