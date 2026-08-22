# SinarPay Project Planning - Executive Summary

**Created**: 2024-08-22  
**Project**: SinarPay Payment Gateway (Backend NestJS + Frontend Next.js)  
**Approach**: Phase-based implementation with strict no-hallucination rules  
**Timeline**: ~17 days per stack (Backend first, then Frontend after Backend Phase 6+)

---

## 📁 Planning Structure

```
.planning/
├── AGENT_RULES.md                 # Core rules for all agents (START HERE)
├── backend/
│   └── BACKEND_PHASES.md          # 8-phase backend implementation plan
├── frontend/
│   └── FRONTEND_PHASES.md         # 8-phase frontend implementation plan (depends on backend)
└── README.md                       # This file
```

---

## 🎯 Key Principles (MUST READ)

1. **No Hallucination**: Agents ONLY implement what's in the current phase scope
2. **Single Responsibility**: Each service/component has ONE job (SOLID)
3. **Type Safety**: TypeScript strict mode, no `any` types
4. **Test First**: Write tests before or immediately after code
5. **Security Default**: Validate all input, encrypt secrets, no hardcoding
6. **Explicit Errors**: All errors handled, never silently swallowed
7. **Dependency Injection**: NestJS @Injectable, not manual `new`
8. **Documentation Sync**: Update docs immediately with code changes
9. **Clear Commits**: Every commit has clear message following format
10. **Ask Before Guessing**: If unclear, ask user—don't assume

👉 **Full details**: Read `.planning/AGENT_RULES.md` before starting any phase

---

## 🔄 Workflow

### Backend Implementation
```
Phase 1: Infrastructure          (NestJS scaffold, Prisma, Docker)
    ↓
Phase 2: Auth                    (JWT, API Key, Guards)
    ↓
Phase 3: Core Transaction        (State machine, Idempotency)
    ↓
Phase 4: Bank Callback & Webhook (Inbound/Outbound webhook)
    ↓
Phase 5: Resilience              (Retry, Circuit Breaker, DLQ)
    ↓
Phase 6: Reconciliation & Audit  (Daily reconciliation, Logging)
    ↓
Phase 7: Security Hardening      (Rate limit, Encryption, CORS)
    ↓
Phase 8: Testing & Documentation (Unit/Integration/E2E tests, Swagger, README)
    ✓ Backend complete
```

### Frontend Implementation (After Backend Phase 6+ Stable)
```
Phase 1: Project Setup           (Next.js, TailwindCSS, shadcn/ui, TanStack Query)
    ↓
Phase 2: Auth & Routing          (Login, JWT cookies, Middleware protection)
    ↓
Phase 3: Dashboard Layout        (Sidebar, Header, Navigation)
    ↓
Phase 4: Overview Page           (Analytics, Charts, Real-time data)
    ↓
Phase 5: Transaction Management  (Table, Filter, Export, Pagination)
    ↓
Phase 6: Payment Generator       (Form, QRIS display, Copy to clipboard)
    ↓
Phase 7: Settings Pages          (API Keys, Webhooks, Profile)
    ↓
Phase 8: Testing & Documentation (Unit/Component/Integration tests, README, Storybook)
    ✓ Frontend complete
```

---

## 📋 Backend Phases at a Glance

### Phase 1: Infrastructure & Foundation
- **Deliverables**: NestJS scaffold, Prisma schema, PostgreSQL, Redis, Docker Compose
- **Key Files**: `src/app.module.ts`, `src/main.ts`, `database/prisma/schema.prisma`
- **Success**: `npm run dev` starts server, health check at `/health` works
- **Validation**: `npm install`, `docker-compose up`, `npx prisma migrate dev` all succeed

### Phase 2: Authentication & Authorization
- **Deliverables**: User/Merchant tables, JWT auth, API Key guard, RolesGuard
- **Key Files**: `src/modules/auth/`, `src/common/guards/`
- **Success**: Login works, JWT tokens issued, API key validation working
- **Tests**: Auth service unit tests for JWT/password logic

### Phase 3: Core Transaction Engine
- **Deliverables**: Transaction state machine, Idempotency (Redis), Create Payment endpoint
- **Key Files**: `src/modules/transactions/`, `src/modules/transactions/services/`
- **Success**: Create payment → returns QRIS, duplicate idempotency key returns cached result
- **Tests**: State machine transitions, idempotency logic, integration test for create-payment

### Phase 4: Bank Callback & Webhook
- **Deliverables**: Inbound callback endpoint, Outbound webhook via BullMQ, HMAC signatures
- **Key Files**: `src/modules/callbacks/`, `src/modules/webhooks/`, `src/modules/webhooks/workers/`
- **Success**: Bank callback → updates transaction → sends webhook to merchant
- **Tests**: Signature validation, webhook job queuing, merchant endpoint calls

### Phase 5: Resilience & Circuit Breaker
- **Deliverables**: BullMQ retry with exponential backoff, Circuit breaker, Dead Letter Queue
- **Key Files**: Webhook worker retry config, WebhookService circuit breaker logic
- **Success**: Failed webhook retries with delays (5s, 15s, 45s, etc.), circuit opens on threshold
- **Tests**: Retry strategy, circuit breaker state transitions, DLQ handling

### Phase 6: Reconciliation & Audit
- **Deliverables**: Daily reconciliation cron, Audit log interceptor, Settlement simulator
- **Key Files**: `src/modules/reconciliation/`, `src/modules/audit-log/`
- **Success**: Daily job detects mismatches, corrects status, generates report
- **Tests**: Mismatch detection, auto-correction, audit logging

### Phase 7: Security & Hardening
- **Deliverables**: Rate limiting, Secret encryption (AES-256-GCM), CORS, Security headers
- **Key Files**: `src/main.ts` (helmet, throttler config), encryption service
- **Success**: Rate limiting enforced, secrets encrypted in DB, error responses sanitized
- **Checks**: All security checklist items from backend_AGENT.md passing

### Phase 8: Testing & Documentation
- **Deliverables**: Unit/Integration/E2E tests, Swagger docs, API_CONTRACT.md, README.md
- **Key Files**: `test/` folder, `ARCHITECTURE.md`, `README.md`
- **Success**: `npm test` all pass (>80% coverage), Swagger at `/api/docs`, README clear
- **Validation**: Build succeeds, no TypeScript errors, ESLint passes

---

## 📋 Frontend Phases at a Glance

### Phase 1: Project Setup & Foundation
- **Deliverables**: Next.js scaffold, TailwindCSS, shadcn/ui, TanStack Query
- **Key Files**: `app/layout.tsx`, `lib/query-client.ts`
- **Success**: `npm run dev` starts on port 3000, basic components render

### Phase 2: Authentication & Routing
- **Deliverables**: Login page, JWT cookies, Middleware protection, Role-based guards
- **Key Files**: `app/(auth)/login/page.tsx`, `app/api/auth/`, `middleware.ts`
- **Success**: Login works, JWT stored in cookie, unauthenticated redirected to /login

### Phase 3: Dashboard Layout
- **Deliverables**: Main layout, Sidebar nav, Header with user dropdown, Responsive design
- **Key Files**: `app/(merchant)/layout.tsx`, `components/sidebar.tsx`, `components/header.tsx`
- **Success**: Sidebar + header render, navigation links work, active route highlighted

### Phase 4: Overview Page
- **Deliverables**: Analytics cards (TPV, Success Rate, Balance), Charts, Recent transactions preview
- **Key Files**: `app/(merchant)/dashboard/page.tsx`, `components/transaction-trend-chart.tsx`
- **Success**: Fetches analytics from backend, displays in cards/chart, real-time refresh works

### Phase 5: Transaction Management
- **Deliverables**: Transactions table, Filter panel, Transaction detail modal, CSV export
- **Key Files**: `app/(merchant)/transactions/page.tsx`, `components/transaction-table.tsx`
- **Success**: Table displays with sorting/filtering, detail modal shows, export downloads CSV

### Phase 6: Payment Generator
- **Deliverables**: Payment form, QRIS display, Copy to clipboard, Error handling
- **Key Files**: `app/(merchant)/payment-generator/page.tsx`, `components/payment-form.tsx`
- **Success**: Form validates, submit creates payment, result displays with QRIS

### Phase 7: Settings Pages
- **Deliverables**: API Keys (masked, reveal, regenerate), Webhook URL (update, test), Profile view
- **Key Files**: `app/(merchant)/settings/`, `components/api-key-display.tsx`
- **Success**: API key masked/revealed, webhook URL updated, test endpoint called

### Phase 8: Testing & Documentation
- **Deliverables**: Unit/Component/Integration tests, README, Storybook (optional)
- **Key Files**: `test/` folder, `README.md`, `.storybook/`
- **Success**: `npm test` all pass, build succeeds with zero TS errors, README clear

---

## 🔐 Security Checklist (Backend)

All items from `backend_AGENT.md` Section 7, verified by Phase 7:

- [ ] Merchant-facing endpoints guarded by API Key
- [ ] Inbound signatures validated (HMAC-SHA256 from bank)
- [ ] Outbound webhooks signed (HMAC-SHA256 to merchant)
- [ ] Idempotency key stored in Redis with 24h TTL
- [ ] No sensitive data in plaintext (passwords, secrets)
- [ ] Rate limiting enabled (100 req/min default)
- [ ] Error responses sanitized (no stack traces)

---

## 📊 Tech Stack

### Backend
- **Language**: TypeScript (strict mode)
- **Framework**: NestJS 10+
- **Database**: PostgreSQL 14+ + Prisma ORM
- **Cache**: Redis 7+
- **Queue**: BullMQ (job processor)
- **Auth**: JWT + API Key + HMAC
- **Validation**: class-validator + class-transformer
- **Docs**: Swagger (@nestjs/swagger)
- **Testing**: Jest + Supertest
- **Container**: Docker + Docker Compose

### Frontend
- **Language**: TypeScript (strict mode)
- **Framework**: Next.js 14+ (App Router)
- **Styling**: TailwindCSS + shadcn/ui
- **Data Fetch**: TanStack Query
- **Forms**: react-hook-form + Zod
- **Charts**: Recharts
- **Testing**: Jest + React Testing Library
- **Container**: Docker (multi-stage build)

---

## 🚀 Getting Started

### For Backend Agent
1. Read `.planning/AGENT_RULES.md` fully (15 min)
2. Read `.planning/backend/BACKEND_PHASES.md` fully (20 min)
3. Read `backend_AGENT.md` in repo root (20 min)
4. Read `ARCHITECTURE.md` in repo root (20 min)
5. Begin Phase 1 with understanding of full scope

### For Frontend Agent
1. Read `.planning/AGENT_RULES.md` fully (15 min)
2. Read `.planning/frontend/FRONTEND_PHASES.md` fully (20 min)
3. Read `frontend_AGENT.md` in repo root (20 min)
4. Verify Backend Phase 6+ is complete and tests passing
5. Begin Phase 1 with understanding of full scope

---

## 📝 Documentation Standards

### Commit Message Format
```
<type>: <subject>

<body (optional)>

<footer>
Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `chore`: Setup/tooling
- `docs`: Documentation
- `test`: Tests
- `refactor`: Restructure
- `style`: Formatting

### Example (Good)
```
feat: implement transaction state machine

Implement legal state transitions: ISSUED → PAID | EXPIRED | CANCELLED
Uses row-level locking to prevent race conditions. Writes to
TransactionHistory on every transition.

Phase 3 Backend requirement.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>
```

---

## 🔄 Phase Handoff Checklist

### Before Marking Phase Complete
1. [ ] All deliverables implemented
2. [ ] Tests written and passing
3. [ ] `npm run lint` passes (0 violations)
4. [ ] `npm run build` succeeds (0 errors)
5. [ ] Commit message follows format
6. [ ] README/docs updated
7. [ ] No hardcoded secrets
8. [ ] No console.log/TODO/FIXME left
9. [ ] TypeScript strict mode verified
10. [ ] All success criteria from phase met

### Documentation Update
- [ ] README.md: new env vars, setup steps, if changed
- [ ] API_CONTRACT.md: new endpoints, if backend
- [ ] ARCHITECTURE.md: major design changes, if applicable
- [ ] Phase plan: notes about deviations, assumptions

### Handoff to Next Phase
- [ ] Write summary: what was built, any blockers/assumptions
- [ ] Commit with clear message
- [ ] Next agent reads this phase plan fully before starting
- [ ] Verify previous phase tests still pass

---

## ❓ FAQ

### Q: What if a phase has a blocker?
A: Document clearly in commit message + comments. Ask user to unblock before continuing.

### Q: Can I skip a phase?
A: No. Phases are ordered by dependency. Phase 3 requires Phase 2 auth to work.

### Q: What if backend endpoint not ready when frontend starts?
A: Frontend Phase 2 agent can mock the API response locally until backend is ready, then swap.

### Q: Do I need to read all phases?
A: Yes. Know the full journey so you understand why this phase matters and what comes next.

### Q: Can I add features beyond scope?
A: No. Ask user first. Document assumptions if you make them.

### Q: How do I handle edge cases not mentioned in phase?
A: Implement defensively (validation, error handling), test, and document in comments why.

---

## 📞 Support & Escalation

If stuck:
1. **Reread phase requirements** — often the answer is there
2. **Check AGENT_RULES.md** — common pitfalls documented
3. **Ask user** — clarify requirements, unblock dependencies
4. **Document assumption** — if you must guess, make it explicit

Do NOT silently work around problems or defer to later phases.

---

## ✅ Success Criteria (Final)

### Backend Complete (Phase 8)
- [x] All 8 phases implemented
- [x] Tests pass: `npm test` (>80% coverage)
- [x] Build succeeds: `npm run build` (0 errors)
- [x] Linting passes: `npm run lint` (0 violations)
- [x] API docs: Swagger at `/api/docs`
- [x] State machine enforced (no illegal transitions)
- [x] Webhooks retry with exponential backoff
- [x] Reconciliation running daily
- [x] All security checklist items verified
- [x] README clear + complete

### Frontend Complete (Phase 8)
- [x] All 8 phases implemented
- [x] Tests pass: `npm test` (>80% coverage)
- [x] Build succeeds: `npm run build` (0 errors)
- [x] Linting passes: `npm run lint` (0 violations)
- [x] Auth working (login → dashboard → logout)
- [x] All pages responsive + accessible
- [x] All forms validating correctly
- [x] Data fetching + caching working
- [x] Error/loading states handled
- [x] README clear + complete

---

**Next Step**: Start Backend Phase 1 with full understanding of all 8 phases and AGENT_RULES.

**Questions?**: Refer to plan files or ask user for clarification before implementing.
