# SinarPay Backend - Phase-Based Implementation Plan

**Project**: SinarPay Payment Gateway (NestJS + PostgreSQL + Redis + BullMQ)  
**Target**: Payment Engine PoC with merchant-facing API, webhook delivery, and reconciliation  
**Timeline**: Phased implementation to prevent hallucination and maintain code quality  
**Agent Rules**: Follow SOLID principles, strict type safety, no hardcoding, comprehensive testing

---

## Phase Overview

```
Phase 1: Infrastructure & Foundation (Days 1-2)
  ├── NestJS project scaffold
  ├── Prisma + PostgreSQL schema
  ├── Redis & BullMQ setup
  ├── ConfigModule + env validation
  └── Docker Compose (dev environment)

Phase 2: Authentication & Authorization (Days 3-4)
  ├── JWT auth for internal ops
  ├── API Key + HMAC validation
  ├── RolesGuard & ApiKeyGuard
  └── Database: User, Merchant tables

Phase 3: Core Transaction Engine (Days 5-7)
  ├── Transaction state machine
  ├── Idempotency via Redis
  ├── Merchant + Transaction entities
  ├── Create Payment endpoint (sync QRIS generation)
  └── TransactionHistory audit trail

Phase 4: Bank Callback & Webhook (Days 8-10)
  ├── Inbound callback endpoint (bank notification)
  ├── Status transition validation
  ├── Outbound webhook engine (BullMQ worker)
  ├── HMAC signature generation
  └── WebhookDelivery tracking

Phase 5: Resilience & Circuit Breaker (Days 11-12)
  ├── BullMQ retry with exponential backoff
  ├── Circuit breaker for outbound webhooks
  ├── Dead Letter Queue handling
  └── Graceful degradation tests

Phase 6: Reconciliation & Monitoring (Days 13-14)
  ├── Reconciliation scheduler (daily cron)
  ├── Settlement file simulator
  ├── Mismatch detection & correction
  ├── Audit log module
  └── Centralized logging

Phase 7: Security & Hardening (Days 15)
  ├── Rate limiting (@nestjs/throttler)
  ├── Secret encryption (AES-256-GCM)
  ├── SQL injection prevention review
  ├── CORS configuration
  └── Security checklist validation

Phase 8: Testing & Documentation (Days 16-17)
  ├── Unit tests for state machine
  ├── Integration tests for critical flows
  ├── E2E tests for full payment journey
  ├── Swagger API documentation
  ├── API_CONTRACT.md
  └── README.md with setup instructions

---

## Phase 1: Infrastructure & Foundation

### Deliverables
- [ ] NestJS project created (TypeScript strict mode)
- [ ] Prisma schema initialized with all entities
- [ ] PostgreSQL container running (via docker-compose)
- [ ] Redis container running (via docker-compose)
- [ ] BullMQ installed and working
- [ ] ConfigModule with env validation using Joi/zod
- [ ] `.env.example` with all required variables
- [ ] Basic health check endpoint (`GET /health`)
- [ ] All services can communicate (DB, Redis)

### Agent Instructions
1. **Create NestJS scaffold**: Use `@nestjs/cli` to scaffold new project with TypeScript strict mode enabled
2. **Prisma setup**: 
   - Install `@prisma/client`, `prisma`
   - Create schema file with User, Merchant, Transaction entities (stub structure for Phase 2+)
   - Setup migrations folder
3. **Docker Compose**:
   - PostgreSQL 14+ (port 5432, default creds for dev)
   - Redis 7+ (port 6379)
   - Backend service (Node.js 18+, hot-reload with nodemon)
4. **ConfigModule**: Validate required env vars: DB_URL, REDIS_URL, JWT_SECRET, API_KEY_ENCRYPTION_KEY
5. **No code yet**: Do NOT create auth controllers/services, transaction logic, etc. — only scaffolding.
6. **Commit message**: "chore: setup NestJS project with Prisma, PostgreSQL, Redis, BullMQ, docker-compose"

### Validation Checklist
- [ ] `npm install` succeeds without errors
- [ ] `docker-compose up` starts all services successfully
- [ ] `npm run start:dev` runs NestJS dev server with hot-reload
- [ ] `GET /health` returns `{ "status": "ok" }`
- [ ] `npx prisma migrate dev --name init` succeeds and creates tables

---

## Phase 2: Authentication & Authorization

### Depends On
- Phase 1 (infrastructure ready)

### Deliverables
- [ ] User entity (id, email, passwordHash, role, createdAt)
- [ ] Merchant entity (id, name, apiKeyHash, webhookUrl, status, balance, createdAt)
- [ ] JWT auth module (login endpoint, token generation/refresh)
- [ ] API Key guard (validate merchant API keys from headers)
- [ ] RolesGuard (ADMIN, OPS, MERCHANT roles)
- [ ] Audit interceptor skeleton (will capture logs in Phase 6)
- [ ] Integration test: login flow, token validation, unauthorized access rejected

### Agent Instructions
1. **Database migrations**:
   - User table with email (unique), passwordHash (bcrypt), role enum (ADMIN|OPS|MERCHANT)
   - Merchant table with apiKeyHash, apiSecretHash (encrypted at-rest), webhookUrl, balance, status
   - Add indexes on email, apiKeyHash for performance
2. **Auth service**:
   - `login(email, password)` → issue JWT (access + refresh token)
   - `validateApiKey(apiKey)` → return merchant ID from DB, check merchant status active
   - `createUser()` and `createMerchant()` only for seeding (Phase 2 can use CLI/script)
3. **Guards**:
   - JwtAuthGuard: validate JWT in Authorization header
   - ApiKeyGuard: validate API key + secret from request headers, attach merchant ID to request context
   - RolesGuard: check user role against @Roles() decorator
4. **Controllers** (skeleton only):
   - `POST /auth/login` → { email, password } → returns JWT tokens
   - `POST /auth/refresh` → refresh JWT
5. **Error handling**: Return consistent 401/403 responses, no stack traces
6. **Commit message**: "feat: implement auth module with JWT and API key validation"

### Validation Checklist
- [ ] `POST /auth/login` works with valid creds
- [ ] Invalid JWT returns 401
- [ ] Invalid API key returns 401
- [ ] @Roles() decorator prevents unauthorized access
- [ ] Unit tests pass for auth service logic

---

## Phase 3: Core Transaction Engine

### Depends On
- Phase 2 (auth ready)

### Deliverables
- [ ] Transaction entity (id, merchantId, amount, currency, status, qrisPayload, idempotencyKey, externalRef, createdAt, updatedAt, expiredAt)
- [ ] TransactionHistory entity (id, transactionId, fromStatus, toStatus, reason, createdAt)
- [ ] Transaction state machine (ISSUED → PAID | EXPIRED | CANCELLED)
- [ ] Create Payment endpoint (`POST /v1/payments`)
- [ ] Idempotency service (Redis-based, TTL 24h)
- [ ] QRIS simulator (generate fake QRIS string)
- [ ] Merchant scope validation (can only access own transactions)
- [ ] Unit tests for state transitions, idempotency
- [ ] Integration test: create payment → store in DB → idempotent retry returns same result

### Agent Instructions
1. **Transaction service**:
   - `createTransaction(merchantId, amount, currency, idempotencyKey)` 
     - Check idempotency key in Redis, return cached result if exists
     - Create transaction with status=ISSUED
     - Call QRIS simulator, store payload
     - Store idempotency key in Redis with 24h TTL
     - Return payment details (transactionId, qrisString, expiresAt)
   - `transitionStatus(transactionId, toStatus, reason)` 
     - Validate legal transition (only via state machine lookup table)
     - Use Postgres row-level lock (`SELECT ... FOR UPDATE`) or optimistic locking
     - Write to TransactionHistory
     - Return success or throw clear exception
   - `getTransactionById(transactionId, merchantId)` 
     - Enforce merchantId scope (merchant can only see own transactions)
2. **State machine**:
   - Define legal transitions in code (constant object or enum):
     ```
     {
       ISSUED: [PAID, EXPIRED, CANCELLED],
       PAID: [],
       EXPIRED: [],
       CANCELLED: []
     }
     ```
   - Every transition must write TransactionHistory row
3. **Create Payment endpoint**:
   - Guarded by ApiKeyGuard (extract merchantId)
   - DTO: { amount: number (positive), currency: string (ISO 4217), idempotencyKey: string (UUID) }
   - Validate amount > 0, currency in whitelist (IDR, etc.)
   - Call `createTransaction()`, return QRIS + transaction ID
4. **Idempotency service**:
   - Key format: `idempotency:{idempotencyKey}`
   - Value: stringified JSON of response
   - TTL: 24 hours
   - Check before processing, return cached if exists
5. **QRIS simulator**: Return hardcoded QRIS string (no actual bank integration yet)
6. **Commit message**: "feat: implement transaction state machine and create payment endpoint"

### Validation Checklist
- [ ] `POST /v1/payments` with valid API key creates transaction
- [ ] Duplicate `idempotencyKey` returns cached response
- [ ] Status transition rules enforced (invalid transition rejected)
- [ ] TransactionHistory records all transitions
- [ ] Merchant scope enforced (API key merchant can only see own transactions)
- [ ] Unit tests pass: state machine, idempotency logic
- [ ] Integration test: create-payment flow end-to-end

---

## Phase 4: Bank Callback & Webhook

### Depends On
- Phase 3 (transaction engine ready)

### Deliverables
- [ ] Inbound callback endpoint (`POST /callbacks/bank-notification`)
- [ ] Callback validation (HMAC signature from simulated bank)
- [ ] Status update via transaction service (ISSUED → PAID | CANCELLED)
- [ ] WebhookDelivery entity (tracking outbound webhooks)
- [ ] Webhook service (HMAC signature generation)
- [ ] BullMQ job queue setup for webhook delivery
- [ ] Outbound webhook worker (process and send webhooks to merchant)
- [ ] Unit tests for signature validation, webhook signing
- [ ] Integration test: callback received → transaction updated → merchant webhook sent

### Agent Instructions
1. **Callback service**:
   - `POST /callbacks/bank-notification` (no API key guard, signed by bank)
   - Payload: { transactionId, status (PAID|FAILED|EXPIRED), externalRef, bankSignature }
   - Validate bank signature (HMAC-SHA256 using simulated bank secret)
   - If invalid, return 401 (not 200 — fail loudly)
   - Call transaction.transitionStatus() with new status
   - Publish event to webhook worker (via BullMQ)
2. **Webhook service**:
   - `generateSignature(payload, merchantSecret)` → HMAC-SHA256 (hex string)
   - `sendWebhook(transactionId, merchantId, payload)` → add to BullMQ queue
3. **WebhookDelivery entity**:
   - Track each webhook attempt: { transactionId, merchantId, payload, status (PENDING|DELIVERED|FAILED), attemptCount, lastAttemptAt, nextRetryAt }
4. **BullMQ setup**:
   - Queue name: `webhook-delivery`
   - Job data: { transactionId, merchantId, payload }
   - Register worker processor (Phase 5 for retry logic)
5. **Bank simulator**:
   - Create endpoint `POST /test/bank-payment-confirm` (dev only)
   - Admin can trigger payment notification (for manual testing)
   - Signature: HMAC-SHA256 with hardcoded bank secret
6. **Commit message**: "feat: implement inbound callback and outbound webhook engine"

### Validation Checklist
- [ ] `POST /callbacks/bank-notification` with valid signature updates transaction
- [ ] Invalid signature returns 401
- [ ] Valid callback publishes webhook job to BullMQ
- [ ] Webhook includes HMAC signature in header
- [ ] Unit tests: signature validation, HMAC generation
- [ ] Integration test: callback → status change → webhook queued

---

## Phase 5: Resilience & Circuit Breaker

### Depends On
- Phase 4 (webhook queue ready)

### Deliverables
- [ ] BullMQ webhook worker with retry logic (exponential backoff)
- [ ] Circuit breaker for webhook delivery (opossum or manual implementation)
- [ ] Dead Letter Queue for failed webhooks (after max retries)
- [ ] WebhookDelivery status tracking (PENDING → DELIVERED | FAILED)
- [ ] Webhook retry configuration (attempts: 5, backoff: exponential)
- [ ] Manual replay endpoint for DLQ (admin only, Phase 6)
- [ ] Unit tests for retry strategy, circuit breaker behavior
- [ ] Integration test: webhook failure → retry with backoff → success

### Agent Instructions
1. **BullMQ webhook worker**:
   - Listen on `webhook-delivery` queue
   - Job handler: fetch merchant webhook URL, POST payload with signature header
   - On success: mark WebhookDelivery.status = DELIVERED
   - On failure: throw error (BullMQ will retry)
   - BullMQ retry config: 
     ```
     {
       attempts: 5,
       backoff: { type: 'exponential', delay: 5000 }
     }
     ```
     This gives delays: 5s, 15s, 45s, 135s, 405s (≈ 6.75 min total)
2. **Circuit breaker**:
   - If webhook endpoint returns 500+ or timeout 3 times in a row, "open" circuit
   - Stop sending webhooks to that merchant temporarily (30s half-open cooldown)
   - Log circuit status changes
   - Can use `opossum` library or manual state machine in WebhookService
3. **Dead Letter Queue**:
   - When BullMQ max retries exceeded, catch error and:
     - Mark WebhookDelivery.status = FAILED
     - Log to audit: { transactionId, merchantId, reason: "max retries exceeded", payload }
     - Push to DLQ table (or separate Redis key `dlq:webhook:{id}`)
4. **Error handling**:
   - Distinguish transient errors (network timeout, 5xx) from permanent (4xx, invalid URL)
   - For permanent errors, fail immediately (don't retry)
5. **Commit message**: "feat: implement webhook retry with exponential backoff and circuit breaker"

### Validation Checklist
- [ ] Webhook job retries automatically on failure
- [ ] Exponential backoff delays are correct (5s, 15s, 45s, etc.)
- [ ] Circuit breaker opens after threshold failures
- [ ] Failed webhooks moved to DLQ after max retries
- [ ] Unit tests: retry strategy, circuit breaker state transitions
- [ ] Integration test: simulate merchant endpoint failure → retry → eventually success or DLQ

---

## Phase 6: Reconciliation & Audit

### Depends On
- Phase 5 (all transaction flows working)

### Deliverables
- [ ] AuditLog entity (actorId, actorType, action, resourceType, resourceId, metadata JSON, createdAt)
- [ ] Reconciliation entity (internalTxnId, bankTxnId, status, discrepancy, resolvedAt, createdAt)
- [ ] Audit interceptor (log all CRUD operations on transactions, merchants, webhooks)
- [ ] Reconciliation service (compare internal transactions vs bank settlement file)
- [ ] Reconciliation scheduler (daily cron at specific time, e.g., 2 AM UTC)
- [ ] Settlement file simulator (returns fake settlement data for testing)
- [ ] Mismatch detection (internal status != bank status)
- [ ] Auto-correction mechanism (reconciliation can fix mismatched transactions)
- [ ] Reconciliation report endpoint (`GET /admin/reconciliation-report`)
- [ ] Logging module (Winston or Pino, centralized logs)

### Agent Instructions
1. **AuditLog service**:
   - Inject into transaction, merchant, webhook controllers
   - Log format: { timestamp, actorId, actorType: MERCHANT|OPS|SYSTEM, action, resourceType, resourceId, metadata: {...} }
   - Examples:
     - Action: "CREATE_TRANSACTION", Metadata: { amount, merchantId }
     - Action: "STATUS_TRANSITION", Metadata: { fromStatus, toStatus, reason }
     - Action: "WEBHOOK_SENT", Metadata: { webhookUrl, attemptCount }
2. **Reconciliation service**:
   - `performDailyReconciliation()`:
     - Fetch all transactions from DB with status PAID in last 24h
     - Call bank simulator to get settlement file
     - For each transaction: compare internal status vs bank settlement
     - Detect mismatches (e.g., internal ISSUED but bank says PAID)
     - For mismatches: call transaction.transitionStatus() to correct
     - Store reconciliation result in Reconciliation table
   - `getSettlementFile()` → calls bank simulator endpoint
3. **Reconciliation scheduler** (NestJS `@nestjs/schedule`):
   - Register cron job: `@Cron('0 2 * * *')` (daily 2 AM UTC)
   - Log start/end of reconciliation
4. **Bank settlement simulator** (`GET /test/settlement-file`):
   - Return list of transactions settled in last 24h
   - Format: [{ txnId, amount, status: PAID|FAILED, settledAt }]
   - Include intentional mismatches for testing (e.g., 1 transaction marked FAILED locally but PAID in bank)
5. **Logging**:
   - Use Winston (structured JSON logs) or Pino
   - Log to console (dev) + file (prod)
   - Log levels: ERROR, WARN, INFO, DEBUG
   - Include: timestamp, context, message, metadata (actorId, resourceId, etc.)
6. **Commit message**: "feat: implement reconciliation scheduler, audit logging, and mismatch correction"

### Validation Checklist
- [ ] All transactions create AuditLog entry
- [ ] Reconciliation scheduler runs daily
- [ ] Mismatches detected correctly
- [ ] Auto-correction via transitionStatus works
- [ ] Reconciliation report shows correct data
- [ ] Logs structured and queryable

---

## Phase 7: Security & Hardening

### Depends On
- Phase 6 (all features implemented)

### Deliverables
- [ ] Rate limiting enabled (@nestjs/throttler, 100 requests per minute per IP)
- [ ] Secret encryption (AES-256-GCM) for apiSecretHash, sensitive metadata
- [ ] SQL injection prevention review (Prisma safe by default, validate manually)
- [ ] CORS configuration (whitelist merchant dashboard URL)
- [ ] HTTPS enforcement in production config
- [ ] Error responses sanitized (no stack traces, no internal details)
- [ ] Security headers (X-Content-Type-Options, X-Frame-Options, etc.)
- [ ] All sensitive fields masked in logs
- [ ] `.env` file gitignored, `.env.example` committed
- [ ] Security checklist from backend_AGENT.md passed

### Agent Instructions
1. **Rate limiting**:
   - Install `@nestjs/throttler`
   - Configure: 100 requests/minute per IP for public endpoints
   - 1000 requests/minute for authenticated endpoints
   - Apply @Throttle() decorator selectively
2. **Secret encryption**:
   - Use `crypto.AES-256-GCM` (Node.js built-in)
   - Encryption key from env: `ENCRYPTION_KEY` (base64-encoded 32-byte key)
   - Encrypt: `apiSecretHash` at write time
   - Decrypt: at validation time only, never log plaintext
3. **CORS**:
   - Configure `@nestjs/common/app.enableCors()` with whitelist
   - Whitelist: FRONTEND_URL from env (defaults to localhost:3000)
4. **Error responses**:
   - HttpExceptionFilter that removes stack traces
   - Return: { statusCode, message, timestamp }
   - Example: 404 → { statusCode: 404, message: "Transaction not found", timestamp: "..." }
5. **Security headers** (via middleware or helmet):
   - Install `@nestjs/helmet`
   - Apply globally: enable X-Content-Type-Options, X-Frame-Options, etc.
6. **Input validation**:
   - Review all DTO class-validator decorators
   - No hardcoded paths or credentials in code
7. **Commit message**: "chore: implement rate limiting, secret encryption, CORS, and security headers"

### Validation Checklist
- [ ] Rate limiting works (test with curl/ab)
- [ ] Secrets encrypted in DB
- [ ] Error responses don't leak internal details
- [ ] All security checklist items from backend_AGENT.md passed
- [ ] No plaintext secrets in code
- [ ] CORS allows frontend domain only

---

## Phase 8: Testing & Documentation

### Depends On
- Phase 7 (all features implemented and hardened)

### Deliverables
- [ ] Unit test suite (state machine, auth, idempotency, signature validation)
- [ ] Integration test suite (auth flow, create-payment flow, callback flow, webhook flow)
- [ ] E2E test (full journey: create payment → bank callback → webhook delivered)
- [ ] All critical services have >80% code coverage
- [ ] Swagger API documentation (@nestjs/swagger)
- [ ] API_CONTRACT.md (all endpoints, request/response examples)
- [ ] README.md (setup, env vars, docker-compose, how to run tests)
- [ ] Changelog.md (summary of features by phase)

### Agent Instructions
1. **Unit tests** (Jest):
   - Transaction service: state machine transitions, idempotency
   - Auth service: JWT generation, API key validation, password hashing
   - Webhook service: HMAC signature generation
   - Idempotency service: Redis cache operations
2. **Integration tests** (Supertest):
   - Auth flow: login → get token → use token on protected route
   - Create payment: valid request → transaction created → response includes QRIS
   - Callback flow: bank notification → signature validated → status updated → webhook queued
   - Webhook flow: webhook worker processes job → sends to merchant → marks delivered
3. **E2E test** (full flow):
   - Seed merchant + user
   - Merchant login → get API key
   - Create payment request (with signature)
   - Admin triggers bank callback (via simulator)
   - Verify transaction status changed
   - Verify webhook sent to mock merchant endpoint
4. **Swagger**:
   - Document all endpoints with @ApiOperation, @ApiResponse
   - Document all DTOs with @ApiProperty
   - Include examples in schema
5. **Documentation**:
   - README.md: setup, env, docker-compose, test commands
   - API_CONTRACT.md: all endpoints (method, path, request/response, error codes)
   - Include webhook signature example + verification code
6. **Commit message**: "docs: add comprehensive test suite and API documentation"

### Validation Checklist
- [ ] `npm test` runs all unit + integration tests
- [ ] `npm run test:e2e` runs full E2E flow
- [ ] Coverage >80% for services
- [ ] `npm run build` succeeds
- [ ] Swagger accessible at `http://localhost:3000/api/docs`
- [ ] README clear and complete
- [ ] All API endpoints documented in API_CONTRACT.md

---

## Agent Collaboration Rules

### Before Starting Any Phase
1. **Read full phase requirements** — do not skip or assume
2. **Check dependencies** — ensure previous phases are complete and passing tests
3. **Communicate blockers** — if something is unclear, ask user before implementing

### During Implementation
1. **Commit frequently** — one logical feature per commit, clear message
2. **Test first** — write test before or immediately after feature code
3. **No hallucination** — do NOT invent features beyond the phase scope
4. **Follow SOLID** — single responsibility, dependency injection, no circular dependencies
5. **Strict type safety** — TypeScript strict mode, no `any` types
6. **Validate all input** — DTO validation, guard against injection
7. **Log decisions** — why a choice was made (comment for non-obvious code)

### Code Quality Checklist (per commit)
- [ ] Code follows NestJS best practices (module/controller/service/DTO structure)
- [ ] All new functions have TypeScript types (no implicit `any`)
- [ ] Error handling is explicit (throw or return error, not swallow)
- [ ] Database operations use Prisma (no raw SQL)
- [ ] State transitions via single `transitionStatus()` method
- [ ] Tests added for new logic
- [ ] `npm run lint` passes
- [ ] `npm test` passes

### Documentation Updates
- Update `ARCHITECTURE.md` if design changes significantly
- Keep `README.md` in sync with env vars, setup steps
- Add API endpoint notes to `API_CONTRACT.md` as features ship

### Handoff to Next Phase
1. **Verify**: All tests pass, no console warnings
2. **Document**: What was built, what assumptions were made
3. **Next agent**: Read this plan fully before starting next phase

---

## Testing Strategy

### Unit Tests (Jest)
- **Service logic**: state machine, auth, crypto
- **DTOs**: validation rules
- **Utility functions**: formatting, encryption/decryption
- **Mocks**: database (via Prisma mock or jest mocks), external services
- **Location**: `src/**/*.spec.ts`
- **Command**: `npm test`

### Integration Tests (Supertest + Jest)
- **Controllers**: HTTP request/response, status codes
- **End-to-end flows**: auth → payment → callback (using real DB, but scoped to test data)
- **Database interactions**: create, read, update operations
- **Location**: `test/integration/**/*.spec.ts`
- **Command**: `npm run test:integration`

### E2E Tests (Supertest)
- **Full user journey**: Merchant flow from login to payment to webhook
- **Real DB setup** (test instance), real Redis
- **Seed data**: test merchant, test user
- **Location**: `test/e2e/**/*.spec.ts`
- **Command**: `npm run test:e2e`

### Coverage Target
- Services: >80%
- Controllers: >70%
- Overall: >75%

---

## Environment Variables (`.env`)

```
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/sinarpay

# Redis
REDIS_URL=redis://localhost:6379

# Auth
JWT_SECRET=your-secret-key-min-32-chars
JWT_EXPIRATION=3600

# API Key & Secret Encryption
ENCRYPTION_KEY=base64-encoded-32-byte-key

# Bank Simulator (hardcoded for PoC, change for security testing)
BANK_HMAC_SECRET=bank-secret-key

# Admin
ADMIN_EMAIL=admin@sinarpay.local
ADMIN_PASSWORD_HASH=bcrypt-hash

# Frontend (CORS whitelist)
FRONTEND_URL=http://localhost:3000

# Logging
LOG_LEVEL=info
LOG_FILE=/var/log/sinarpay/app.log

# Rate Limiting
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW_MS=60000
```

---

## Deployment Considerations (Future)

- Prisma migrations in CI/CD pipeline (verify schema changes)
- Redis cluster setup for production
- PostgreSQL backups and HA
- BullMQ worker scaling (separate containers)
- ELK stack or CloudWatch for centralized logging
- API Gateway (Kong, AWS API Gateway) for rate limiting + auth
- Secrets vault (AWS Secrets Manager, HashiCorp Vault)

---

## Success Criteria (Final Checklist)

### Code Quality
- [ ] Zero TypeScript strict mode errors
- [ ] Zero eslint violations
- [ ] No `console.log()` in production code (use logger)
- [ ] No plaintext secrets in git
- [ ] SOLID principles followed (no god objects)

### Features
- [ ] All 8 phases completed
- [ ] State machine enforced (no illegal transitions)
- [ ] Idempotency working correctly
- [ ] Webhooks retrying with exponential backoff
- [ ] Reconciliation running daily
- [ ] Audit trail complete

### Testing
- [ ] Unit tests: >80% coverage (services)
- [ ] Integration tests: all critical flows covered
- [ ] E2E test: full payment journey passing
- [ ] All tests passing (`npm test && npm run test:integration && npm run test:e2e`)

### Documentation
- [ ] ARCHITECTURE.md updated
- [ ] API_CONTRACT.md comprehensive
- [ ] README.md clear + complete
- [ ] Swagger docs accessible
- [ ] All code comments explain *why*, not *what*

### Security
- [ ] All security checklist items from backend_AGENT.md passed
- [ ] Secrets encrypted at-rest
- [ ] No stack traces in error responses
- [ ] CORS configured
- [ ] Rate limiting enabled
- [ ] HMAC signatures validated on inbound + outbound

---

**Next Step**: Begin Phase 1 with infrastructure setup. Read Phase 1 requirements fully before starting.
