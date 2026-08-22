# SinarPay AI Agent Rules & Standards

**Purpose**: Ensure consistent, high-quality, hallucination-free code generation across all phases  
**Audience**: AI agents implementing backend and frontend  
**Authority**: User agrees to enforce these rules for all code changes

---

## Core Principles

### 1. No Hallucination
- **Rule**: Never invent features, endpoints, or behaviors beyond the current phase scope
- **Action**: If feature is unclear or missing, ask user or document assumption in commit message
- **Example BAD**: Phase 1 agent adds JWT refresh token logic (belongs to Phase 2)
- **Example GOOD**: Phase 1 agent stubs JWT module, documents "refresh token logic deferred to Phase 2"

### 2. Single Responsibility Principle (SOLID)
- **Rule**: Each class/service/component has ONE job
- **Backend Example**: TransactionService handles state machine ONLY; WebhookService handles delivery
- **Frontend Example**: PaymentForm handles form logic; PaymentResult handles display
- **Action**: If function does multiple things, split into separate functions/services

### 3. Strict Type Safety
- **Rule**: No `any` types, no implicit types, TypeScript strict mode enforced
- **Backend**: `tsc --strict` passes, all service return types explicit
- **Frontend**: All props typed, React.FC<Props>, no untyped API responses
- **Action**: Use `type` or `interface`, not loose objects; validate at boundaries

### 4. Explicit Error Handling
- **Rule**: Errors must not be silently swallowed; always handle or propagate
- **Backend**: Throw ApplicationException with clear message, caught by HttpExceptionFilter
- **Frontend**: Catch promises, show error toast, log to monitoring
- **Action**: If you catch error, you must handle it (don't just re-throw)

### 5. No Hardcoding
- **Rule**: Credentials, URLs, secrets, magic numbers → environment variables
- **Backend**: DB URLs, JWT secrets, encryption keys in `.env`
- **Frontend**: API_URL, feature flags in environment
- **Action**: Every string that could change belongs in config, not code

### 6. Test-First Mindset
- **Rule**: Write test before or immediately after feature code
- **Backend**: Unit test for service logic before creating controller endpoint
- **Frontend**: Component test before shipping interactive button
- **Action**: If code has no test, it's incomplete

### 7. Dependency Injection (DI)
- **Rule**: Inject dependencies, never use `new` for services
- **Backend**: NestJS @Injectable() + constructor injection (no `new TransactionService()`)
- **Frontend**: Props drilling or React Context, not global instances
- **Action**: This enables testing and reduces coupling

### 8. Database Transactions & Consistency
- **Rule**: Financial data (transactions, balances) require ACID guarantees
- **Backend**: Use Prisma `$transaction()` for multi-step operations, row-level locks for state
- **Frontend**: N/A, but assume backend handles this
- **Action**: Never issue separate queries that could partially fail

### 9. Security by Default
- **Rule**: Assume untrusted input, validate/sanitize everything
- **Backend**: Validate DTOs, check ownership (merchantId scope), hash passwords, encrypt secrets
- **Frontend**: Validate form input, escape HTML, use httpOnly cookies, sanitize displayed data
- **Action**: Security is not optional; don't defer to "later phases"

### 10. Documentation Synchronization
- **Rule**: If you change code behavior, update docs immediately (don't defer)
- **Backend**: Update `API_CONTRACT.md` when endpoint signature changes
- **Frontend**: Update `README.md` when env variables change
- **Action**: Docs lag = hallucination in future phases

---

## Backend-Specific Rules

### Architecture
1. **Module structure**: Each module has `.module.ts`, `.service.ts`, `.controller.ts`, `dto/` folder
2. **Service layer**: All business logic lives in services, controllers route HTTP requests only
3. **DTO validation**: Every DTO has `class-validator` decorators; validate in Pipes
4. **Database access**: Prisma only (no raw SQL except migrations)
5. **State machine**: Transaction state changes ONLY via `transitionStatus()` method, never direct update

### Code Style
- Use async/await, not callbacks
- Throw specific exceptions: `BadRequestException`, `UnauthorizedException`, not generic Error
- Name files in kebab-case: `transaction.service.ts`, `api-key.guard.ts`
- Const before let, never var
- Use enums for status/role, not string literals

### Testing
- Service unit tests: mock database (Prisma mocks), test logic in isolation
- Integration tests: real database (test instance), real request/response cycle
- E2E tests: full journey, verify end state in DB
- Minimum coverage: services 80%, controllers 70%

### Security
- Never log passwords, API secrets, private keys
- Use bcrypt for passwords, AES-256-GCM for sensitive data at-rest
- Validate HMAC signatures BEFORE processing; fail on signature mismatch
- Check resource ownership: ensure merchantId matches JWT context before returning data
- Use row-level locks (SELECT ... FOR UPDATE) for concurrent updates

### Database
- Migrations required for schema changes: `npx prisma migrate dev --name description`
- Indexes on frequently queried columns: email, merchantId, status
- Foreign key constraints enforced (Prisma relations)
- Timestamps: createdAt, updatedAt auto-managed by Prisma

### Logging & Monitoring
- Use structured logging (JSON format): { timestamp, level, context, message, metadata }
- Log at INFO: state transitions, webhook delivery status, reconciliation results
- Log at ERROR: exceptions, auth failures, external API errors
- Log at DEBUG: detailed flow, parameter values (no secrets)

---

## Frontend-Specific Rules

### Architecture
1. **Component hierarchy**: Pages call hooks, hooks call lib/api, components are presentational
2. **Page structure**: `app/(merchant)/dashboard/page.tsx` is a Server Component; client logic in components
3. **API layer**: All fetch calls in `lib/api/`, wrapped by hooks in `hooks/`
4. **State management**: TanStack Query for server state, useState for UI state only
5. **Form validation**: Zod schema + react-hook-form, validate before submit

### Code Style
- Functional components only (no class components)
- Use TypeScript interfaces for Props, export from component file
- Event handlers named `handleXxx`, derived state named `isXxx` or `canXxx`
- CSS: TailwindCSS classes, no CSS files (use shadcn components for complex UI)
- Files: camelCase for components (PaymentForm.tsx), kebab-case for utilities (format-currency.ts)

### Testing
- Component tests: render component, interact (click, type), verify output
- Hook tests: renderHook, call hook, verify state changes
- Page tests: render page, verify data fetched + displayed, verify user interactions
- Minimum coverage: utilities 80%, components 70%, pages 60%

### Performance
- Memoize expensive computations: React.memo, useMemo
- Lazy load pages: `next/dynamic` for off-screen routes
- Image optimization: use `next/image` Image component, not <img>
- TanStack Query caching: default staleTime 5 minutes, refetchInterval as needed
- Avoid re-renders: proper dependency arrays in useEffect, stable callbacks

### UX/Accessibility
- Loading state on every async operation: skeleton, spinner, disable button
- Error messages: clear, actionable, not technical jargon
- Keyboard navigation: tab order, focus management, Enter to submit forms
- ARIA labels: <label> for inputs, aria-live for toast notifications
- Mobile first: responsive design, test on viewport <768px

### Security
- httpOnly cookies: store JWT in cookie, never localStorage
- CORS: frontend can only call backend (NEXT_PUBLIC_API_URL)
- XSS prevention: escape user data, use DOMPurify if rendering HTML
- Sensitive data: never log API responses with tokens/secrets
- CSRF: use SameSite cookies (default in Next.js)

### Environment Variables
- Prefix with `NEXT_PUBLIC_` only for vars safe to expose (API URL, feature flags)
- Server-only vars: database URLs, internal API keys, webhooks (no `NEXT_PUBLIC_` prefix)
- `.env.local` in .gitignore, `.env.example` committed with placeholder values

---

## Commit Message Format

### Structure
```
<type>: <subject>

<body (optional)>

<footer (optional)>
```

### Types
- `feat`: New feature (e.g., "feat: add create payment endpoint")
- `fix`: Bug fix (e.g., "fix: correct status transition validation")
- `chore`: Setup, dependencies, tooling (e.g., "chore: setup NestJS project")
- `docs`: Documentation update (e.g., "docs: add API_CONTRACT.md")
- `test`: Add/update tests (e.g., "test: add unit tests for state machine")
- `refactor`: Code restructure without changing behavior (e.g., "refactor: extract webhook service")
- `style`: Code formatting (e.g., "style: format imports")

### Subject
- 50 chars max
- Imperative mood ("add", not "adds", "added")
- No period at end
- Lowercase (except proper nouns)

### Body (optional)
- Explain *why*, not *what* (what is in code)
- Wrap at 72 chars
- Separate from subject with blank line
- Reference issue/phase if applicable

### Example (Good)
```
feat: implement transaction state machine

Implement legal state transitions: ISSUED → PAID | EXPIRED | CANCELLED
Uses row-level locking to prevent race conditions between callback and
expiry job. Writes to TransactionHistory on every transition.

Covers Phase 3 requirement for state machine strictness.
```

### Example (Bad)
```
Added stuff
implement transaction functionality and webhook logic
WIP state transitions
```

---

## Code Review Checklist (Before Commit)

### Pre-Commit
- [ ] Code compiles/runs without errors
- [ ] No console.log, console.error left behind (use logger)
- [ ] No commented-out code
- [ ] No hardcoded secrets
- [ ] Dependencies are actually used (no unused imports)

### Linting & Formatting
- [ ] `npm run lint` passes (ESLint for both backend/frontend)
- [ ] `npm run format` or `npx prettier --write` applied (if project uses Prettier)
- [ ] No TypeScript strict mode errors (`tsc --strict`)

### Testing
- [ ] New code has test coverage (unit or integration)
- [ ] All existing tests still pass (`npm test`)
- [ ] Edge cases considered and tested

### Behavior
- [ ] Feature matches phase requirements (no extra scope)
- [ ] Error handling implemented (no silent failures)
- [ ] Security checklist items applied (auth, validation, secrets)
- [ ] Database transactions used where needed (backend)
- [ ] Loading/error states handled (frontend)

### Documentation
- [ ] Commit message follows format
- [ ] README updated if env vars/setup changed
- [ ] Inline comments explain *why*, not *what*
- [ ] API docs/contract updated (backend)

### Dependency Injection & Modularity
- [ ] Services injected via constructor (backend)
- [ ] No circular dependencies (both)
- [ ] Components accept props, don't fetch own data (frontend)

### Database (Backend Only)
- [ ] Prisma migration created for schema changes
- [ ] Migration tested (can migrate forward + backward)
- [ ] Indexes added to frequently queried columns
- [ ] Foreign keys and relations defined

---

## Common Pitfalls & How to Avoid

### Hallucination Examples

| BAD | GOOD | Phase |
|-----|------|-------|
| "I'll add WebSocket for real-time" | "Use TanStack Query polling for PoC" | Frontend Phase 4 |
| "Implement OAuth flow" | "Use JWT + API key guard as spec'd" | Backend Phase 2 |
| "Add discount codes feature" | "Only implement payment + refund" | Any |
| "Use GraphQL instead of REST" | "Follow backend_AGENT.md tech stack" | Any |

### Security Pitfalls

| BAD | GOOD | Why |
|-----|------|-----|
| Store secrets in code | Read from .env file | Prevents accidental leaks |
| Log passwords | Never log sensitive data | Prevents exposure in logs |
| Trust client input | Validate all DTOs server-side | Prevents injection attacks |
| Use JWT in localStorage | Use httpOnly cookies | Prevents XSS token theft |
| Decrypt secrets per request | Decrypt once, cache in memory | Performance + security |

### Type Safety Pitfalls

| BAD | GOOD | Why |
|-----|------|-----|
| `const data: any = response.json()` | `const data: PaymentResponse = ...` | Catch errors at compile time |
| `if (status == 'PAID')` | `if (status === TransactionStatus.PAID)` | Enum prevents typos |
| Props without types | `interface Props { name: string }` | Self-documenting, IDE help |
| `.then().catch()` without typing | `async/await` with typed returns | Cleaner, easier to debug |

---

## When in Doubt

### Ask User, Don't Assume
- "Should X support Y?" → Ask, don't implement speculatively
- "Is backend endpoint ready?" → Check backend implementation, ask if unclear
- "What's the priority between A and B?" → Ask, respect the decision

### Reference Authority
- Backend: `backend_AGENT.md` is source of truth for tech stack + structure
- Frontend: `frontend_AGENT.md` is source of truth for pages + components
- Architecture: `ARCHITECTURE.md` defines data flows + security model
- Phase: Current phase plan is the contract; don't invent Phase N+1 work

### Document Assumptions
If you make an assumption (e.g., "I assume idempotency key TTL is 24h"), write it in a comment or commit message so next agent can verify.

---

## Quality Gates (Non-Negotiable)

Before marking a phase complete, these MUST pass:

### Backend
- `npm run lint` → 0 violations
- `npm run build` → 0 TypeScript errors
- `npm test` → all tests pass, coverage ≥ specified target
- Commit message follows format
- No hardcoded secrets in code/DB
- All security checklist items from backend_AGENT.md verified

### Frontend
- `npm run lint` → 0 violations
- `npm run build` → 0 TypeScript errors
- `npm test` → all tests pass, coverage ≥ specified target
- Commit message follows format
- No hardcoded API keys/secrets
- Middleware or route guards protect authenticated routes

### Both
- Feature works as specified in phase
- No "WIP", "TODO", "FIXME" left in code
- No circular dependencies detected
- Performance acceptable (no 1000+ ms page loads)

---

## Escalation Path

If you encounter something unexpected:

1. **Unclear requirement?** → Reread phase plan, check related AGENT.md files
2. **Dependent backend/frontend not ready?** → Document blocker, ask user to unblock
3. **Design decision conflict?** → Ask user, get alignment before coding
4. **Tech stack limitation?** → Ask user, justify deviation with concrete evidence
5. **Out of scope?** → Ask user, confirm if this phase includes it

Do NOT:
- Implement workaround without asking
- Defer to a later phase without documenting
- Change tech stack silently
- Commit code that doesn't match phase requirements

---

## Summary: Agent's Checklist Before Starting

```
Before you begin ANY phase:

[ ] Have I read the full phase description in the plan?
[ ] Do I understand the deliverables and success criteria?
[ ] Are all dependencies (previous phases) complete?
[ ] Have I reviewed the relevant AGENT.md (backend_AGENT.md or frontend_AGENT.md)?
[ ] Do I know where to commit code and what message format to use?
[ ] Do I have the current status of backend/frontend (what's working)?
[ ] Am I clear on what's OUT of scope for this phase?

If you answered NO to any of these, STOP and ask the user before proceeding.
```

---

**Version**: 1.0  
**Last Updated**: 2024-08-22  
**Authority**: User + Copilot AI  
**Status**: Effective immediately for all phases
