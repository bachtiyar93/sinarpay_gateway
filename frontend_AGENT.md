# AGENT.md — SinarPay Frontend (Next.js)

Kamu adalah AI agent yang bertugas mengimplementasikan **Merchant Dashboard** (wajib) dan **Back-Office Dashboard** (opsional, kerjakan setelah merchant dashboard selesai & stabil) untuk SinarPay menggunakan Next.js. Backend (NestJS) adalah sumber data — jangan hardcode data dummy permanen, gunakan mock hanya sementara saat backend endpoint belum siap, lalu ganti ke API asli begitu tersedia.

## 1. Konteks proyek

SinarPay Payment Engine (backend NestJS) menyediakan API untuk: manajemen transaksi, merchant, webhook, dan audit log. Frontend ini adalah client yang mengonsumsi API tersebut untuk dua jenis pengguna:
- **Merchant** — login sebagai pemilik toko, melihat transaksi & analitik miliknya sendiri saja
- **Internal Ops** (opsional) — melihat seluruh sistem lintas merchant

Cek `API_CONTRACT.md` atau Swagger dari backend (`/api/docs`) sebagai kontrak data sebelum membangun UI — jangan menebak bentuk response.

## 2. Tech stack (wajib)

- **Framework:** Next.js (App Router, TypeScript, strict mode)
- **Styling:** TailwindCSS + shadcn/ui untuk komponen dasar (table, dialog, form, card)
- **Data fetching & cache:** TanStack Query (React Query) — jangan fetch manual dengan `useEffect` untuk data server
- **Forms:** react-hook-form + zod untuk validasi schema
- **Charts:** Recharts (untuk TPV, success rate, grafik ringkasan)
- **Auth:** JWT disimpan di httpOnly cookie (bukan localStorage) — implementasikan lewat Next.js middleware untuk proteksi route
- **Testing:** Jest + React Testing Library
- **Containerization:** Docker (Dockerfile multi-stage untuk build production Next.js)

## 3. Struktur folder (App Router)

```
app/
  (auth)/
    login/page.tsx
  (merchant)/
    layout.tsx              # guard: role MERCHANT only
    dashboard/page.tsx        # overview & analytics
    transactions/page.tsx      # transaction management + filter + export
    payment-generator/page.tsx  # form buat payment link/checkout session
    settings/
      api-keys/page.tsx
      webhooks/page.tsx
  (ops)/                          # opsional — kerjakan setelah merchant dashboard selesai
    layout.tsx                     # guard: role OPS only
    dashboard/page.tsx               # system-wide monitoring
    audit-logs/page.tsx
  api/                                # route handlers jika perlu proxy/BFF-lite (lihat section 6)
  layout.tsx
  middleware.ts                        # route protection berdasarkan JWT cookie + role
components/
  ui/                # shadcn components
  charts/             # TPVChart, SuccessRateChart, dll
  transactions/         # TransactionTable, TransactionFilter, ExportButton
  forms/                  # PaymentLinkForm, WebhookSettingsForm
lib/
  api/                       # typed API client functions (per resource)
  auth.ts                      # helper baca session/role dari cookie
  utils.ts
hooks/
  use-transactions.ts
  use-merchant-analytics.ts
types/
  api.ts                        # types hasil generate dari OpenAPI backend, atau manual sinkron dengan API_CONTRACT.md
```

## 4. Halaman & fitur wajib (Merchant Dashboard)

Implementasikan dalam urutan ini:

1. **Login page** — form login, simpan JWT di cookie via server action/route handler, redirect sesuai role
2. **Overview & Analytics** — card ringkasan TPV (total processing value), success rate, saldo merchant; chart tren transaksi harian (Recharts line/bar chart)
3. **Transaction Management** — table transaksi milik merchant tsb saja (data di-scope otomatis dari JWT/session, jangan expose merchantId sebagai parameter yang bisa diubah user), filter by status/tanggal, tombol export (CSV minimal)
4. **Payment Generator** — form input amount + deskripsi, submit ke endpoint create-payment backend, tampilkan hasil (QRIS string/payment link) dengan opsi copy
5. **API Keys & Webhook Settings** — tampilkan API key (masked, dengan tombol reveal/regenerate), form update webhook URL dengan validasi format URL

## 5. Halaman & fitur (Back-Office Dashboard, opsional)

Kerjakan hanya setelah Merchant Dashboard selesai dan berjalan baik:

1. **System-Wide Monitoring** — table/list seluruh transaksi lintas merchant, real-time-ish (polling interval via React Query `refetchInterval`, tidak perlu WebSocket untuk PoC ini kecuali ada waktu lebih)
2. **Audit & Log Viewer** — table audit log dengan filter by actor/action/tanggal, detail view per entry (metadata JSON ditampilkan readable)

## 6. Integrasi dengan backend

- Semua panggilan ke backend NestJS lewat layer `lib/api/` yang typed — jangan fetch langsung di komponen.
- Gunakan environment variable `NEXT_PUBLIC_API_URL` (untuk client-side yang aman diekspos) dan variable server-only untuk hal sensitif jika ada Route Handler yang proxy request.
- Kalau butuh menyembunyikan token backend dari client atau menggabungkan beberapa call jadi satu response untuk halaman tertentu, boleh buat Route Handler tipis di `app/api/` sebagai proxy — **ini bukan BFF penuh**, cukup untuk kebutuhan spesifik (mis. inject Authorization header dari cookie httpOnly sebelum forward ke backend). Jangan over-engineer jadi layer agregasi kompleks; scope PoC ini tidak membutuhkan BFF terpisah.
- Tangani error response backend secara konsisten — buat satu wrapper (mis. `apiClient`) yang menstandarkan error handling & menampilkan toast/error state di UI.

## 7. Auth & role handling

- Middleware Next.js (`middleware.ts`) memeriksa JWT dari cookie di setiap request ke route `(merchant)/*` dan `(ops)/*`, redirect ke `/login` jika tidak valid.
- Role dari JWT payload menentukan akses: merchant tidak boleh bisa mengakses route `(ops)/*` sama sekali (redirect/403), bukan hanya disembunyikan di UI.
- Jangan simpan token di localStorage/sessionStorage — httpOnly cookie only, supaya tidak rentan XSS.

## 8. Code quality

- Komponen kecil dan reusable — jangan taruh semua logic di satu page component. Pisahkan data-fetching hook, presentational component, dan form logic.
- Semua form pakai schema validasi zod yang sinkron dengan constraint backend (mis. amount harus positif, webhook URL harus valid URL).
- Loading state & error state wajib ditangani di setiap halaman yang fetch data (skeleton/spinner untuk loading, pesan jelas untuk error — jangan biarkan blank page).
- Tulis test untuk logic non-trivial: format currency/date, validasi form, dan minimal satu integration test untuk flow "buat payment link" end-to-end dengan mocked API.
- Jalankan `npm run lint` dan `npm run test` sebelum commit besar.

## 9. Dokumentasi terkait frontend

- Tambahkan section khusus di `README.md` root repo (atau `apps/frontend/README.md` jika monorepo): cara run frontend lokal, environment variable yang dibutuhkan, dan akun dummy untuk login (merchant & ops) jika pakai seed data.
- Jika backend menyediakan Swagger, cantumkan link/cara akses di README supaya kontrak API mudah dicek saat frontend development.

## 10. Larangan / batasan

- Jangan hardcode credential atau API key di kode — semua lewat environment variable.
- Jangan tampilkan data merchant lain di dashboard merchant manapun (cek ulang setiap query di-scope oleh identitas merchant dari session, bukan dari input user).
- Jangan bangun fitur checkout pembayaran end-user sungguhan (bukan scope brief) — Payment Generator cukup men-generate link/QRIS simulasi yang mengarah ke backend PoC.
