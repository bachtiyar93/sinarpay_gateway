# SinarPay Frontend

Frontend for the SinarPay merchant dashboard built with Next.js App Router.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000

## Environment variables

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

## Scripts

```bash
npm run dev
npm run build
npm run lint
```

## Notes

- Server state is handled by TanStack Query.
- Page/UI state is handled by modular Zustand stores.
- The app uses mock fallback data when backend endpoints are temporarily unavailable.
- The merchant flow includes Dashboard, Transactions, Payment Generator, and Settings.

## Backend API reference

- NestJS Swagger: http://localhost:3000/api/docs
- Base URL for frontend calls: http://localhost:3000
