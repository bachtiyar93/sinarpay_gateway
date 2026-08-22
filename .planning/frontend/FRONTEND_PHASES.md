# SinarPay Frontend - Phase-Based Implementation Plan

**Project**: SinarPay Merchant Dashboard (Next.js + TailwindCSS + shadcn/ui + TanStack Query)  
**Target**: Merchant-facing dashboard for payment management, analytics, and settings  
**Timeline**: Phased implementation after backend API is stable (depends on Backend Phase 6+)  
**Agent Rules**: Follow Next.js best practices, strict TypeScript, no hardcoding, component reusability, accessibility

---

## Phase Overview

```
Depends On: Backend Phase 6+ (reconciliation, audit, all flows stable)

Phase 1: Project Setup & Foundation (Days 1-2)
  ├── Next.js 14+ scaffold (App Router, TypeScript strict)
  ├── TailwindCSS + shadcn/ui components
  ├── TanStack Query setup
  ├── Environment configuration
  └── Docker setup for frontend

Phase 2: Authentication & Routing (Days 3-4)
  ├── Login page (form + validation)
  ├── Auth middleware (JWT cookie validation)
  ├── Role-based route protection
  ├── Session management
  └── Logout flow

Phase 3: Merchant Dashboard - Layout & Navigation (Days 5-6)
  ├── Main dashboard layout (sidebar, header, footer)
  ├── Navigation menu with role separation
  ├── User profile dropdown
  ├── Theme configuration (light/dark mode optional)
  └── Responsive mobile view

Phase 4: Overview Page - Analytics & Summary (Days 7-8)
  ├── TPV card (Total Processing Value)
  ├── Success rate card
  ├── Merchant balance card
  ├── Transaction trend chart (Recharts line chart)
  ├── Recent transactions preview
  └── Real-time data refresh (TanStack Query polling)

Phase 5: Transaction Management Page (Days 9-11)
  ├── Transactions table (sortable, filterable)
  ├── Filter panel (status, date range, amount range)
  ├── Transaction detail view (modal or detail page)
  ├── Export to CSV button
  ├── Pagination
  └── Real-time status updates

Phase 6: Payment Generator Page (Days 12-13)
  ├── Create payment form (amount, description)
  ├── Form validation with Zod
  ├── Submit to backend
  ├── Display payment result (QRIS, payment link)
  ├── Copy to clipboard functionality
  └── Error handling

Phase 7: Settings Pages (Days 14-15)
  ├── API Keys page (display masked, reveal, regenerate)
  ├── Webhook URL settings (update, test endpoint)
  ├── Merchant profile (name, contact, status view)
  ├── Confirmation dialogs for destructive actions
  └── Success/error notifications

Phase 8: Testing & Documentation (Days 16-17)
  ├── Component tests (React Testing Library)
  ├── Integration tests (page flows)
  ├── E2E tests (Playwright, optional)
  ├── Storybook for component library
  ├── README.md setup guide
  └── TypeScript strict mode compliance

---

## Phase 1: Project Setup & Foundation

### Deliverables
- [ ] Next.js 14+ project created (App Router, TypeScript strict mode)
- [ ] TailwindCSS configured
- [ ] shadcn/ui components installed (Button, Card, Input, Dialog, Table, Form, etc.)
- [ ] TanStack Query (@tanstack/react-query) configured
- [ ] Environment variables (.env.local)
- [ ] Docker setup for local frontend development
- [ ] Basic page structure (layout.tsx, page.tsx)
- [ ] No authentication logic yet—just basic structure

### Agent Instructions
1. **Create Next.js project**:
   - Command: `npx create-next-app@latest sinarpay-frontend --typescript --tailwind --app`
   - Enable TypeScript strict mode in `tsconfig.json`
   - Update `next.config.js` for any custom config (API proxy if needed)
2. **Install dependencies**:
   - `npm install @tanstack/react-query`
   - `npm install react-hook-form zod @hookform/resolvers`
   - `npm install recharts` (for charts)
   - `npm install class-variance-authority clsx tailwind-merge` (for shadcn/ui)
   - `npm install @radix-ui/react-dialog @radix-ui/react-select` (and other shadcn base components)
   - Use `npx shadcn-ui@latest add button card input form dialog table` (install common components)
3. **Project structure**:
   ```
   app/
     layout.tsx              # Root layout
     page.tsx                # Home (redirect to login or dashboard)
     (auth)/
       login/page.tsx        # Stub
     (merchant)/
       layout.tsx            # Stub (dashboard layout)
       dashboard/page.tsx    # Stub (overview)
       transactions/page.tsx # Stub
       payment-generator/page.tsx # Stub
       settings/
         api-keys/page.tsx   # Stub
         webhooks/page.tsx   # Stub
   components/
     ui/                     # shadcn components
   lib/
     api/                    # Stub (API client)
     auth.ts                 # Stub (auth helpers)
   types/
     api.ts                  # Stub (API types)
   ```
4. **TanStack Query setup** (`lib/query-client.ts`):
   - Create QueryClient with default options
   - Wrap App with QueryClientProvider in layout.tsx
5. **Environment variables** (`.env.local`):
   - `NEXT_PUBLIC_API_URL=http://localhost:3000` (or backend URL)
6. **Docker** (`Dockerfile`):
   - Multi-stage: build Next.js, run in Node container (port 3000)
   - Use `node:18-alpine`
7. **Commit message**: "chore: setup Next.js project with TailwindCSS, shadcn/ui, TanStack Query"

### Validation Checklist
- [ ] `npm install` succeeds
- [ ] `npm run dev` starts server on port 3000
- [ ] Basic page renders (no 404s)
- [ ] TailwindCSS styles work (test with a styled button)
- [ ] TanStack Query initialized without errors

---

## Phase 2: Authentication & Routing

### Depends On
- Phase 1 (next.js + libraries ready)
- Backend Phase 2+ (login endpoint available)

### Deliverables
- [ ] Login page (form: email, password)
- [ ] Form validation (Zod schema)
- [ ] Authenticate with backend (POST /auth/login)
- [ ] Store JWT in httpOnly cookie (via Next.js API route)
- [ ] Middleware for route protection
- [ ] Redirect authenticated users from /login to /dashboard
- [ ] Redirect unauthenticated users from /dashboard to /login
- [ ] Logout functionality
- [ ] Role-based route guards (MERCHANT vs OPS)
- [ ] Unit tests for auth validation

### Agent Instructions
1. **Login page** (`app/(auth)/login/page.tsx`):
   - Form: email, password
   - use `react-hook-form` + `zod` for validation
   - DTO (Zod schema): `{ email: string (email), password: string (min 8) }`
   - On submit: call `POST /api/auth/login` (Next.js route handler)
   - On success: redirect to `/dashboard` (merchant) or `/admin` (ops)
   - On error: show error message
   - Styling: shadcn form components, centered layout, card
2. **Next.js API route** (`app/api/auth/login/route.ts`):
   - Accept POST with { email, password }
   - Call backend `POST /auth/login`
   - Backend returns: { accessToken, refreshToken, user: { id, role, merchantId } }
   - Store tokens in httpOnly cookie:
     ```typescript
     const response = NextResponse.json({ success: true });
     response.cookies.set('auth_token', accessToken, { httpOnly: true });
     return response;
     ```
   - Also set a non-httpOnly cookie for role (for quick client-side checks)
3. **Auth helper** (`lib/auth.ts`):
   - `getSession()` → read auth_token from cookies (server-side)
   - `getRole()` → read role cookie (client-side)
   - `getCurrentMerchantId()` → extract from session
4. **Middleware** (`middleware.ts` at root):
   ```typescript
   export function middleware(request: NextRequest) {
     const token = request.cookies.get('auth_token')?.value;
     const role = request.cookies.get('user_role')?.value;
     
     // Redirect unauthenticated from protected routes
     if (!token && request.nextUrl.pathname.startsWith('/(merchant)')) {
       return NextResponse.redirect(new URL('/login', request.url));
     }
     
     // Redirect authenticated away from login
     if (token && request.nextUrl.pathname === '/login') {
       return NextResponse.redirect(new URL('/dashboard', request.url));
     }
     
     // Role check (ops routes only for OPS role)
     if (role !== 'OPS' && request.nextUrl.pathname.startsWith('/(ops)')) {
       return NextResponse.redirect(new URL('/dashboard', request.url));
     }
   }
   ```
5. **Logout API route** (`app/api/auth/logout/route.ts`):
   - Clear cookies
   - Redirect to `/login`
6. **Refresh token** (future: implement in Phase 3+):
   - On 401 response: try refresh
   - If refresh fails, logout
7. **Commit message**: "feat: implement login, authentication, and route protection"

### Validation Checklist
- [ ] Login form validates email/password
- [ ] Valid credentials → redirect to dashboard
- [ ] Invalid credentials → error message shown
- [ ] JWT stored in httpOnly cookie
- [ ] Unauthenticated access to /dashboard → redirect to /login
- [ ] Logout clears cookies + redirects to /login
- [ ] Middleware protects routes
- [ ] Role-based access working (test with OPS vs MERCHANT)

---

## Phase 3: Merchant Dashboard - Layout & Navigation

### Depends On
- Phase 2 (auth working)
- Backend Phase 3+ (transaction endpoints available)

### Deliverables
- [ ] Main dashboard layout (sidebar + main content area)
- [ ] Navigation menu (Dashboard, Transactions, Payment Generator, Settings)
- [ ] User profile dropdown (name, email, logout)
- [ ] Responsive sidebar (collapsible on mobile)
- [ ] Active route highlighting in nav
- [ ] Breadcrumb navigation (optional)
- [ ] Loading skeleton for main content area

### Agent Instructions
1. **Dashboard layout** (`app/(merchant)/layout.tsx`):
   - Uses middleware auth check (already protected by Phase 2 middleware)
   - Fetch merchant data on server-side (name, balance, etc.) if needed
   - Render Sidebar + Header + Main content area
   - Sidebar is sticky/fixed, main content scrollable
2. **Sidebar component** (`components/sidebar.tsx`):
   - Navigation items: Dashboard, Transactions, Payment Generator, Settings
   - Uses `next/link` for navigation
   - Active route detection: compare `usePathname()` with link href
   - Highlight active item (shadcn components: Button with active state)
   - Collapsible on mobile (state using useState, icon toggle)
3. **Header component** (`components/header.tsx`):
   - Logo/brand on left
   - User profile dropdown on right (shadcn DropdownMenu)
   - Dropdown items: Profile, Settings, Logout
   - Show merchant name + email
4. **Styling**:
   - Use TailwindCSS grid: `grid-cols-[250px_1fr]` (sidebar + content)
   - Sidebar: fixed height, scrollable if needed
   - Responsive: on mobile, sidebar hidden by default (hamburger menu)
5. **Error boundary** (optional, Phase 3):
   - Catch errors in layout, show fallback UI
6. **Commit message**: "feat: implement merchant dashboard layout and navigation"

### Validation Checklist
- [ ] Sidebar renders all navigation items
- [ ] Active route highlighted correctly
- [ ] User dropdown shows merchant name
- [ ] Logout button works
- [ ] Layout responsive on mobile
- [ ] No console errors

---

## Phase 4: Overview Page - Analytics & Summary

### Depends On
- Phase 3 (layout ready)
- Backend Phase 6+ (analytics endpoints available)

### Deliverables
- [ ] TPV (Total Processing Value) card
- [ ] Success rate card
- [ ] Merchant balance card
- [ ] Transaction trend chart (daily/monthly, Recharts line chart)
- [ ] Recent transactions preview (last 5 transactions, mini table)
- [ ] Real-time data polling (TanStack Query `refetchInterval`)
- [ ] Loading and error states
- [ ] Responsive card layout (grid on desktop, stack on mobile)

### Agent Instructions
1. **API client** (`lib/api/merchant.ts`):
   - `getAnalytics()` → fetch /v1/merchant/analytics → returns { tpv, successRate, balance }
   - `getTransactionTrend(days)` → fetch /v1/merchant/analytics/trend?days=30 → returns [{ date, amount }]
   - `getRecentTransactions(limit)` → fetch /v1/merchant/transactions?limit=5 → returns [{ id, status, amount, date }]
2. **Hooks** (`hooks/use-merchant-analytics.ts`):
   - `useMerchantAnalytics()` → useQuery for analytics, refresh every 5 minutes
   - `useTransactionTrend()` → useQuery for trend chart
   - `useRecentTransactions()` → useQuery for recent transactions, refresh every 2 minutes
3. **Dashboard page** (`app/(merchant)/dashboard/page.tsx`):
   - Fetch analytics, trend, recent transactions
   - Layout: 3 cards in top row (TPV, Success Rate, Balance)
   - Chart below cards (full width)
   - Recent transactions table below chart
4. **Components**:
   - `AnalyticsCard` (shadcn Card) — shows number + label + loading skeleton
   - `TransactionTrendChart` (Recharts LineChart) — x-axis: date, y-axis: amount
   - `RecentTransactionsTable` (shadcn Table) — columns: transaction ID, status (badge), amount, date
5. **Error handling**:
   - If analytics fails, show error message + retry button
   - Skeleton loaders while fetching
6. **Commit message**: "feat: implement merchant overview page with analytics and charts"

### Validation Checklist
- [ ] Analytics cards display data correctly
- [ ] Chart renders transaction trend
- [ ] Recent transactions table shows data
- [ ] Loading skeletons appear while fetching
- [ ] Error state shown on API failure
- [ ] Data refreshes periodically (not every second, too often)
- [ ] Responsive on mobile

---

## Phase 5: Transaction Management Page

### Depends On
- Phase 3 (layout ready)
- Backend Phase 3+ (transaction list endpoint available)

### Deliverables
- [ ] Transactions table (sortable columns, paginated)
- [ ] Filter panel (status, date range, amount range)
- [ ] Transaction detail view (modal or separate page)
- [ ] Export to CSV button
- [ ] Search by transaction ID (optional)
- [ ] Real-time status indicator (Recharts badge, color-coded)
- [ ] Loading and error states
- [ ] Pagination controls

### Agent Instructions
1. **API client** (`lib/api/transactions.ts`):
   - `getTransactions(filters, page, limit)` → POST /v1/merchant/transactions/search
     - Filters: { status?, dateFrom?, dateTo?, amountFrom?, amountTo?, search? }
     - Returns: { data: [{id, amount, status, date, reference}], total, page, limit }
   - `getTransactionDetail(id)` → GET /v1/merchant/transactions/{id}
     - Returns full transaction details + history
   - `exportTransactions(filters)` → GET /v1/merchant/transactions/export (returns CSV blob)
2. **Hooks**:
   - `useTransactions(filters, page)` → useQuery for list with refetch on filter/page change
   - `useTransactionDetail(id)` → useQuery for single transaction
3. **Page component** (`app/(merchant)/transactions/page.tsx`):
   - Render: FilterPanel + Table + Pagination
4. **Filter panel** (`components/transaction-filter.tsx`):
   - Inputs: status dropdown, date range picker, amount range
   - Use Zod for schema validation
   - Submit button triggers refetch with new filters
5. **Transaction table** (`components/transaction-table.tsx`):
   - Columns: ID, Amount, Status (badge), Date, Actions (view detail button)
   - Sortable: click column header to sort (add sort param to query)
   - Click row to show detail modal
6. **Transaction detail modal** (`components/transaction-detail-modal.tsx`):
   - Show: full transaction data, status history, webhook delivery attempts
   - Format dates/currency nicely (use `Intl.DateTimeFormat`, `Intl.NumberFormat`)
7. **Export** (`lib/csv-export.ts`):
   - Helper function to convert transaction data to CSV
   - Trigger download via `<a href={blob}>` or fetch
8. **Commit message**: "feat: implement transaction management page with filtering and export"

### Validation Checklist
- [ ] Table displays transactions
- [ ] Filter panel filters correctly
- [ ] Pagination works
- [ ] Click transaction shows detail modal
- [ ] Export CSV downloads correctly
- [ ] Status badges show correct colors
- [ ] Loading/error states handled

---

## Phase 6: Payment Generator Page

### Depends On
- Phase 3 (layout ready)
- Backend Phase 3+ (create payment endpoint available)

### Deliverables
- [ ] Payment form (amount, description, optional expiry)
- [ ] Form validation (amount > 0, description required/optional)
- [ ] Submit to backend
- [ ] Display payment result (QRIS string, payment link, expiry time)
- [ ] Copy QRIS to clipboard (toast notification)
- [ ] QR code image display (optional, use qrcode.react library)
- [ ] Loading state (disable form while submitting)
- [ ] Error message on failure

### Agent Instructions
1. **API client** (`lib/api/payments.ts`):
   - `createPayment(payload)` → POST /v1/payments
     - Payload: { amount: number, description?: string, expiryMinutes?: number }
     - Returns: { transactionId, qrisString, paymentLink, expiresAt }
2. **Form page** (`app/(merchant)/payment-generator/page.tsx`):
   - Use react-hook-form + Zod schema:
     ```typescript
     const schema = z.object({
       amount: z.number().min(1, 'Amount must be > 0'),
       description: z.string().optional(),
       expiryMinutes: z.number().min(5).max(1440).optional()
     });
     ```
3. **Form component** (`components/payment-form.tsx`):
   - Uses shadcn Form, Input, Button, Textarea
   - On submit: call `createPayment()`, show loading state
   - On success: clear form, show success message, display result
   - On error: show error toast
4. **Payment result display** (`components/payment-result.tsx`):
   - Show QRIS string (can be text or QR code image)
   - Show transaction ID
   - Show expiry time (formatted nicely)
   - Copy button for QRIS string (uses `navigator.clipboard`)
   - Success toast on copy
5. **Optional QR code**:
   - Install `qrcode.react` library
   - Display QR code from QRIS string
6. **Commit message**: "feat: implement payment generator page with QRIS generation"

### Validation Checklist
- [ ] Form renders with amount + description inputs
- [ ] Form validation works (rejects invalid amounts)
- [ ] Submit calls backend API
- [ ] Result displays after success
- [ ] Copy button works + shows toast
- [ ] Loading state shown during submit
- [ ] Error message shown on failure

---

## Phase 7: Settings Pages

### Depends On
- Phase 3 (layout ready)
- Backend Phase 2+ (API key endpoints available)

### Deliverables
- [ ] API Keys page (display, mask, reveal, regenerate)
- [ ] Webhook URL settings (display, edit, test)
- [ ] Merchant profile view (read-only, name, email, status)
- [ ] Confirmation dialogs for regenerate/update actions
- [ ] Success/error toasts for actions
- [ ] Tab navigation (Profile, API Keys, Webhooks)

### Agent Instructions
1. **Settings layout** (`app/(merchant)/settings/layout.tsx`):
   - Tab navigation: Profile, API Keys, Webhooks
   - Use shadcn Tabs component
2. **API client** (`lib/api/settings.ts`):
   - `getMerchantProfile()` → GET /v1/merchant/profile
   - `getApiKeys()` → GET /v1/merchant/api-keys → returns [{ key, createdAt, lastUsedAt }]
   - `regenerateApiKey(id)` → POST /v1/merchant/api-keys/{id}/regenerate → returns new key
   - `getWebhookUrl()` → GET /v1/merchant/webhook-url
   - `updateWebhookUrl(url)` → PUT /v1/merchant/webhook-url
   - `testWebhook()` → POST /v1/merchant/webhook/test → returns { success, statusCode, response }
3. **Profile page** (`app/(merchant)/settings/profile/page.tsx`):
   - Display merchant name, email, status, created date
   - Read-only (no edit for Phase 7, can be added later)
   - Show balance as well
4. **API Keys page** (`app/(merchant)/settings/api-keys/page.tsx`):
   - Fetch and display API key
   - Key is masked (show first 4 + last 4 chars, hide middle)
   - Reveal button (show full key, toggle)
   - Regenerate button (confirm dialog, then regenerate)
   - Copy key button
   - Last used date
5. **Webhooks page** (`app/(merchant)/settings/webhooks/page.tsx`):
   - Form to update webhook URL
   - Current URL displayed
   - Test button (makes POST request to backend `/test` endpoint, shows result)
   - Success/error notification after update
   - Test result modal (show HTTP status + response)
6. **Confirmation dialog** (shadcn AlertDialog):
   - Used for regenerate, update webhook
   - Warn user about consequences (e.g., "Old key will stop working")
7. **Commit message**: "feat: implement settings pages for API keys and webhooks"

### Validation Checklist
- [ ] Profile page displays merchant data
- [ ] API key masked correctly
- [ ] Reveal/hide key works
- [ ] Regenerate API key shows confirmation + works
- [ ] Webhook URL can be updated
- [ ] Test webhook button makes request
- [ ] Success/error toasts shown
- [ ] Responsive layout

---

## Phase 8: Testing & Documentation

### Depends On
- Phase 7 (all pages implemented)

### Deliverables
- [ ] Unit tests for utilities (currency format, date format, validation)
- [ ] Component tests (form validation, button clicks, state changes)
- [ ] Integration tests (login flow, create payment flow)
- [ ] E2E tests (Playwright, optional: full merchant journey)
- [ ] Storybook (component library documentation)
- [ ] README.md (setup, env vars, how to run tests)
- [ ] TypeScript strict mode: zero errors

### Agent Instructions
1. **Unit tests** (Jest + React Testing Library):
   - Test files: `*.test.tsx` next to components
   - Examples:
     - Currency formatting: `formatCurrency(100000, 'IDR')` → "Rp 100,000"
     - Date formatting: `formatDate(new Date())` → "2024-01-15"
     - Zod schema validation: valid/invalid payloads
2. **Component tests** (React Testing Library):
   - Test interactive elements: buttons, form inputs, dropdowns
   - Example: LoginForm
     - Render form
     - Type email + password
     - Click submit
     - Verify API call made
     - Verify redirect on success
3. **Integration tests**:
   - Full page flows (mocked API)
   - Example: create payment flow
     - Render PaymentGeneratorPage
     - Fill form
     - Submit
     - Verify result displayed
4. **E2E tests** (Playwright, optional for PoC):
   - Real browser automation
   - Flow: login → dashboard → create payment → transaction list → logout
5. **Storybook** (optional):
   - Document reusable components: Button variants, Card, Form inputs
   - Useful for future developers or design review
6. **README.md**:
   - Setup: `npm install`, environment variables
   - Development: `npm run dev`
   - Testing: `npm test`, `npm run test:e2e` (if added)
   - Build: `npm run build`, `npm start` (production)
   - Environment variables: NEXT_PUBLIC_API_URL, etc.
7. **TypeScript strict mode**:
   - Run `npm run build` — must have zero TS errors
   - No `@ts-ignore` comments
   - No implicit `any` types
8. **Commit message**: "test: add comprehensive test suite and documentation"

### Validation Checklist
- [ ] `npm test` runs all unit + component tests
- [ ] `npm run build` succeeds with zero TS errors
- [ ] All critical flows tested (login, create payment, settings)
- [ ] README clear + complete
- [ ] Storybook (if added) runs: `npm run storybook`
- [ ] No unused imports or variables
- [ ] ESLint passes: `npm run lint`

---

## API Contract (Merchant Endpoints)

Ensure these endpoints exist in backend before implementing each phase:

### Auth
- `POST /auth/login` → { email, password } → { accessToken, refreshToken, user }
- `POST /auth/refresh` → { } → { accessToken }
- `POST /auth/logout` → { } → { success }

### Merchant Data
- `GET /v1/merchant/profile` → { id, name, email, webhookUrl, balance, status, createdAt }
- `GET /v1/merchant/api-keys` → [{ key, createdAt, lastUsedAt }]
- `POST /v1/merchant/api-keys/{id}/regenerate` → { key }
- `GET /v1/merchant/webhook-url` → { url }
- `PUT /v1/merchant/webhook-url` → { url } → { success }
- `POST /v1/merchant/webhook/test` → { } → { success, statusCode, response }

### Analytics
- `GET /v1/merchant/analytics` → { tpv, successRate, balance }
- `GET /v1/merchant/analytics/trend?days=30` → [{ date, amount }]

### Transactions
- `GET /v1/merchant/transactions?page=1&limit=10&status=PAID` → { data: [...], total, page, limit }
- `POST /v1/merchant/transactions/search` → { filters, page, limit } → { data, total }
- `GET /v1/merchant/transactions/{id}` → { ...transaction details, history }
- `GET /v1/merchant/transactions/export?format=csv` → CSV blob

### Payments (Create)
- `POST /v1/payments` → { amount, description?, expiryMinutes? } → { transactionId, qrisString, expiresAt }

---

## Environment Variables (`.env.local`)

```
# Backend API
NEXT_PUBLIC_API_URL=http://localhost:3000

# Optional: for backend server-side requests (if using Route Handlers as proxy)
# BACKEND_API_URL=http://backend:3000 (from docker-compose, internal)
```

---

## Component Architecture

### Atomic Structure
```
components/
  ui/                              # shadcn base components
    button.tsx, card.tsx, input.tsx, form.tsx, table.tsx, dialog.tsx, etc.
  
  common/                          # Reusable across pages
    header.tsx                     # Top bar with user profile
    sidebar.tsx                    # Main navigation
    loading-skeleton.tsx           # Loading state placeholder
    error-alert.tsx                # Error message display
  
  merchant/                        # Merchant-specific features
    analytics-card.tsx             # Dashboard card
    transaction-trend-chart.tsx    # Dashboard chart
    recent-transactions-table.tsx  # Dashboard preview table
    transaction-filter.tsx         # Filter panel
    transaction-table.tsx          # Main transactions table
    transaction-detail-modal.tsx   # Transaction detail view
    payment-form.tsx               # Create payment form
    payment-result.tsx             # QRIS display
    api-key-display.tsx            # Masked API key
    webhook-url-form.tsx           # Webhook URL editor
```

---

## Testing Strategy

### Unit Tests
- Utility functions: formatters, validators
- Zod schemas: valid/invalid payloads
- Hook logic: data transformation, error handling
- Location: `lib/**/*.test.ts`, `components/**/*.test.tsx`

### Component Tests
- Form interactions: input change, submit, validation errors
- Button clicks: href, onClick handler
- State management: local state updates, prop changes
- Location: `components/**/*.test.tsx`

### Integration Tests
- Page flows: login → dashboard → create payment
- API mocking: MSW (Mock Service Worker) recommended
- User interactions: complete user journey
- Location: `test/integration/**/*.test.tsx`

### E2E Tests (Optional)
- Real browser: Playwright
- Test against real/staging backend
- Example flow: login → complete payment journey → verify result
- Location: `test/e2e/**/*.spec.ts`

---

## Deployment Considerations

- Build: `npm run build` must succeed
- Env: NEXT_PUBLIC_API_URL must point to backend
- Docker: multi-stage build (build Next.js, run in Node container)
- Edge optimization: consider Vercel or Netlify for Next.js hosting
- Analytics: optional GA4 or similar

---

## Success Criteria (Final Checklist)

### Code Quality
- [ ] Zero TypeScript strict mode errors
- [ ] Zero ESLint violations
- [ ] No `console.log()` (use logging library if needed)
- [ ] Components reusable and small (single responsibility)
- [ ] SOLID principles followed

### Features
- [ ] All 8 phases completed
- [ ] All pages responsive (mobile + desktop)
- [ ] Auth working (login → dashboard → logout)
- [ ] All forms validating + submitting correctly
- [ ] Charts displaying data correctly
- [ ] Tables sortable/filterable + paginated
- [ ] Settings pages functional

### Testing
- [ ] Unit tests: >80% coverage for utilities
- [ ] Component tests: critical flows covered
- [ ] Integration tests: login + create payment flows
- [ ] All tests passing (`npm test`)

### Documentation
- [ ] README.md clear + complete
- [ ] Environment variables documented
- [ ] Setup instructions work (npm install, npm run dev)
- [ ] Storybook (if added) running
- [ ] API contract synced with backend

### Performance
- [ ] Lighthouse score >80 (desktop)
- [ ] Images optimized (Next.js Image component)
- [ ] No unnecessary re-renders (React DevTools Profiler)
- [ ] TanStack Query caching working (no duplicate requests)

### Accessibility
- [ ] Keyboard navigation (tab order, focus states)
- [ ] ARIA labels on interactive elements
- [ ] Color contrast sufficient
- [ ] Form labels associated with inputs

---

**Next Step**: Begin Phase 1 after Backend Phase 6+ is complete and stable. Read Phase 1 requirements fully before starting.
