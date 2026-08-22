# AGENT.md — SinarPay Backend (NestJS)

Kamu adalah AI agent yang bertugas mengimplementasikan backend Payment Engine bernama **SinarPay** menggunakan NestJS. Dokumen ini adalah sumber kebenaran untuk scope, arsitektur, dan standar kualitas kode. Baca seluruhnya sebelum menulis kode apapun.

## 1. Konteks proyek

SinarPay adalah PoC Payment Gateway yang menerima notifikasi pembayaran QRIS dari Acquiring Bank/Switching (disimulasikan), meneruskan hasilnya ke merchant via webhook, dan mendukung reconciliation harian. Backend ini menjadi single source of truth untuk seluruh state transaksi.

Referensi desain: file `ARCHITECTURE.md` di root repo (buat file ini sebagai bagian dari deliverable — lihat section 8) harus konsisten dengan apa yang benar-benar kamu implementasikan. Jangan mendokumentasikan sesuatu yang tidak diimplementasikan, dan jangan implementasikan sesuatu tanpa mendokumentasikannya.

## 2. Tech stack (wajib)

- **Framework:** NestJS (TypeScript, strict mode)
- **Database:** PostgreSQL, akses via Prisma ORM (pilihan default — boleh TypeORM jika ada alasan kuat, tapi konsisten di seluruh project)
- **Cache & Idempotency store:** Redis
- **Queue:** BullMQ (berbasis Redis) untuk outbound webhook & retry — ini pilihan paling praktis untuk PoC dibanding RabbitMQ/Kafka
- **Auth:** JWT (access + refresh token) untuk Internal Ops, API Key + HMAC signature untuk komunikasi merchant
- **Validation:** class-validator + class-transformer pada semua DTO
- **API Docs:** Swagger (`@nestjs/swagger`), expose di `/api/docs`
- **Testing:** Jest untuk unit test, Supertest untuk integration/e2e test
- **Containerization:** Docker + docker-compose (services: `backend`, `postgres`, `redis`, minimal 1 worker container untuk BullMQ processor jika dipisah)

Jangan mengganti stack ini tanpa alasan eksplisit dari user.

## 3. Struktur folder (module-based, ikuti pola NestJS)

```
src/
  main.ts
  app.module.ts
  common/
    guards/          # RolesGuard, ApiKeyGuard, JwtAuthGuard
    interceptors/     # LoggingInterceptor, AuditInterceptor
    decorators/        # @Roles(), @CurrentMerchant()
    filters/            # HttpExceptionFilter (format error konsisten)
    pipes/
  config/               # ConfigModule, validasi env via Joi/zod
  modules/
    auth/                # login ops, issue JWT, API key validation
    merchants/            # CRUD merchant, API key & webhook URL management
    transactions/          # core payment engine, state machine
    webhooks/                # outbound webhook engine + signature
    callbacks/                # inbound endpoint dari bank/switching simulator
    reconciliation/            # job harian pencocokan data
    audit-log/                  # audit trail read/write
    users/                       # internal ops users, RBAC
  database/
    prisma/ (schema.prisma, migrations/)
test/
  unit/
  e2e/
```

Setiap module wajib punya: `*.module.ts`, `*.controller.ts`, `*.service.ts`, `dto/`, dan `*.spec.ts` untuk service-nya minimal.

## 4. Domain model inti

Implementasikan entity berikut di Prisma schema (sesuaikan nama field, tapi konsep ini wajib ada):

- **Merchant**: id, name, apiKeyHash, apiSecretHash (encrypted), webhookUrl, balance, status, createdAt
- **User** (internal ops): id, email, passwordHash, role (`ADMIN` | `OPS`), createdAt
- **Transaction**: id, merchantId, amount, currency, status, qrisPayload, idempotencyKey (unique), externalRef (dari bank), createdAt, updatedAt, expiredAt
- **TransactionHistory**: id, transactionId, fromStatus, toStatus, reason, createdAt — audit trail perubahan status
- **WebhookDelivery**: id, transactionId, merchantId, payload, status (`PENDING`|`DELIVERED`|`FAILED`), attemptCount, lastAttemptAt, nextRetryAt
- **AuditLog**: id, actorId, actorType (`MERCHANT`|`OPS`|`SYSTEM`), action, resourceType, resourceId, metadata (JSON), createdAt

Field sensitif (apiSecretHash, dan data pribadi jika ada) harus dienkripsi at-rest (gunakan `crypto` AES-256-GCM dengan key dari env, bukan hanya hashing untuk yang perlu di-decrypt saat verifikasi).

## 5. State machine transaksi (wajib strict)

Status: `ISSUED` → `PAID` | `EXPIRED` | `CANCELLED`. (Brief menyebut dua varian penamaan — `ISSUED/PAID/EXPIRED/CANCELLED` di deliverable teknis dan `PENDING/SUCCESS/FAILED/EXPIRED/REFUNDED` di dokumen arsitektur. **Pakai `ISSUED/PAID/EXPIRED/CANCELLED` sebagai status implementasi teknis**, tapi jelaskan pemetaan konsep ini secara eksplisit di `ARCHITECTURE.md` supaya tidak ambigu — misal `ISSUED`≈`PENDING`, `PAID`≈`SUCCESS`.)

Aturan:
- Transisi status HANYA boleh terjadi lewat satu method terpusat di `TransactionService` (mis. `transitionStatus()`), jangan update `status` langsung di banyak tempat.
- Validasi transisi legal dengan lookup table eksplisit — tolak transisi ilegal dengan exception jelas.
- Setiap transisi wajib menulis row baru ke `TransactionHistory`.
- Gunakan Postgres row-level locking (`SELECT ... FOR UPDATE`) atau optimistic locking (version column) saat update status untuk mencegah race condition antara callback bank dan expiry job.

## 6. Core features — urutan implementasi yang disarankan

Implementasikan bertahap, commit per fitur, jangan big-bang:

1. **Setup dasar**: NestJS project, Prisma schema, docker-compose (postgres+redis), ConfigModule dengan validasi env
2. **Auth module**: JWT untuk ops login, API Key guard untuk endpoint merchant
3. **Merchant module**: CRUD, generate API key/secret, endpoint update webhook URL
4. **Transaction module — inbound**: endpoint create payment (generate QRIS simulasi + idempotency check via Redis)
5. **Callback module — inbound dari bank**: endpoint terima notifikasi bank, validasi signature, transisi status transaksi
6. **Webhook module — outbound**: setelah status berubah, publish job ke BullMQ, worker kirim webhook ke merchant dengan HMAC signature di header
7. **Retry & circuit breaker**: BullMQ retry dengan exponential backoff (`attempts`, `backoff: { type: 'exponential', delay }`); circuit breaker untuk panggilan keluar (gunakan library `opossum` atau implementasi state sederhana di service)
8. **RBAC & multi-tenancy**: guard yang memastikan merchant hanya bisa akses data miliknya sendiri (`merchantId` dari API key context), ops role bisa akses semua
9. **Audit log**: interceptor yang mencatat semua aksi sensitif (create payment, update webhook url, ops override status)
10. **Reconciliation module**: scheduled job (cron via `@nestjs/schedule`) yang membandingkan transaksi internal vs "settlement file" simulasi, hasilkan report mismatch
11. **Swagger docs + `API_CONTRACT.md`**
12. **Testing**: unit test untuk state machine transitions, idempotency logic, signature verification; e2e test untuk flow create-payment → callback → webhook delivered

## 7. Security checklist (wajib dicek sebelum menganggap fitur selesai)

- [ ] Semua endpoint merchant-facing pakai API Key guard, validasi HMAC signature pada request masuk dari bank/switching simulator
- [ ] Outbound webhook ke merchant ditandatangani HMAC-SHA256 dengan secret milik merchant, dikirim di header (mis. `X-SinarPay-Signature`)
- [ ] Idempotency key disimpan di Redis dengan TTL wajar (mis. 24 jam), request duplikat mengembalikan response tersimpan, bukan proses ulang
- [ ] Tidak ada data sensitif (secret, password) tersimpan plaintext di DB atau ter-log di console/log file
- [ ] Rate limiting dasar di API Gateway level (gunakan `@nestjs/throttler`)
- [ ] Error response format konsisten (jangan expose stack trace/internal detail ke client)

## 8. Dokumentasi wajib (deliverable, buat di akhir setiap module utama selesai — jangan tunda ke akhir semua)

- `ARCHITECTURE.md` di root repo — high-level diagram (boleh pakai Mermaid), sync vs async flow, state machine, resiliency strategy (queue/retry/circuit breaker), security & idempotency. Update setiap kali ada keputusan desain besar berubah saat implementasi.
- `API_CONTRACT.md` atau Swagger — setiap endpoint: method, path, request/response schema, HTTP status codes, error format, contoh payload webhook + cara verifikasi signature-nya.
- `README.md` di root repo — instruksi install & run lokal (termasuk `docker-compose up`), cara generate/migrate Prisma, environment variables yang dibutuhkan (`.env.example` wajib ada).

## 9. Code quality

- Ikuti SOLID — service jangan mengurus lebih dari satu tanggung jawab (mis. jangan campur logic webhook delivery ke dalam TransactionService, buat WebhookService terpisah yang di-inject).
- Gunakan dependency injection NestJS secara konsisten, hindari `new` manual untuk service.
- Semua DTO wajib divalidasi (`class-validator`), jangan percaya input mentah.
- Tulis unit test untuk logic kritis (state transition, idempotency, HMAC verification) sebelum lanjut ke fitur berikutnya — jangan tunda testing ke akhir.
- Jalankan `npm run lint` dan `npm run test` sebelum setiap commit besar; jangan commit kode yang gagal lint/test.

## 10. Larangan / batasan

- Jangan gunakan payment gateway/bank asli — semua interaksi bank/switching harus berupa simulator internal (endpoint sendiri yang bisa dipanggil manual/via script untuk simulasi "bank confirm payment").
- Jangan simpan credential asli di repo — gunakan `.env` (di-gitignore) + `.env.example`.
- Jangan bikin fitur di luar scope brief tanpa konfirmasi (fokus pada payment engine, bukan fitur e-commerce lengkap).
