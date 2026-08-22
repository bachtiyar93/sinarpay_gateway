# API Contract

## Health

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/health` | Health check |

## Auth

| Method | Path | Description |
| --- | --- | --- |
| POST | `/api/auth/login` | Email/password login |
| POST | `/api/auth/refresh` | Refresh token rotation |

### Login Request

```json
{ "email": "admin@sinarpay.test", "password": "password123" }
```

### Login Response

```json
{ "accessToken": "...", "refreshToken": "...", "expiresIn": 3600 }
```

## Payments

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/api/v1/payments` | `x-api-key` | Create QRIS payment |

### Request

```json
{ "amount": 100000, "currency": "IDR", "idempotencyKey": "uuid" }
```

### Response

```json
{
  "transactionId": "txn-1",
  "qrisString": "...",
  "amount": 100000,
  "currency": "IDR",
  "status": "ISSUED",
  "expiresAt": "2026-08-22T..."
}
```

## Callbacks

| Method | Path | Description |
| --- | --- | --- |
| POST | `/api/callbacks/bank-notification` | Signed bank callback |
| POST | `/api/test/bank-payment-confirm` | Dev-only bank simulator |

## Admin

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/admin/reconciliation-report` | Reconciliation report |
| POST | `/api/admin/webhooks/dlq/:deliveryId/replay` | Replay webhook DLQ item |
| GET | `/api/test/settlement-file` | Dev settlement simulator |

## Security

- JWT and API key guards are enforced where required.
- All callbacks require HMAC validation.
- Rate limiting is enabled globally.
