# Architecture

Next.js App Router renders Header → HeroSection (FeatureBadges, ProductShowcase, ConsultationForm) → Footer and ContactRail. Server Components are default; ConsultationForm and Turnstile are Client Components. not-found.tsx provides a Vietnamese fallback.

## Form and submission
Native inputs use RHF/zodResolver with shared consultationSchema. Types distinguish input/output; schema trims text, checks lengths/enums/consent and conditionally requires other category. Location requires exactly one comma and two non-empty single-line parts in province-first order; whitespace is normalized. It validates on blur/submit. Changing category unregisters other text.

Form calls POST /api/consultation with data, submissionId, turnstileToken and empty honeypot. Ref plus isSubmitting prevents concurrent handlers; inputs lock during requests. Same data retains UUID for uncertain retries in the current tab; changed data creates a new ID. Matching receipt is required for success/reset. Errors retain entries and reset single-use CAPTCHA. Nothing is persisted in browser storage or logged.

## API
app/api/consultation/route.ts uses Node runtime, delegates to lib/server/consultation.ts. Handler validates environment, exact Origin, JSON type, streamed body limit (16KiB), shared Zod and Turnstile hostname/action. It normalizes +84 to 0, strips unused other text, HMAC-signs an envelope and POSTs to allowlisted script.google.com /exec. Google ContentService redirects are followed. Only saved/duplicate receipt with matching requestId is success. No raw upstream errors/PII are returned/logged.

Dependency injection permits network-free tests of real handler logic. Node crypto stays server-side. NEXT_PUBLIC_TURNSTILE_SITE_KEY alone is public and embedded at build time. All other integration values are server-only; missing config fails closed.

## Apps Script
google-apps-script/Code.gs executes under customer account. Script Properties hold Sheet ID/tab/secret. Script validates signature/freshness/data, independently derives phone rate key, and acquires Script Lock. It verifies headers, checks ID/hash, consumes shared counters, sets text format and writes one row. No doGet/public read API.

Business columns A–O match the customer template, including separate province/district in D/E and empty staff-managed M–O. Hidden technical columns P–S store ID, hash, consent and version in the same atomic row write; duplicate lookup uses P/Q. Existing headers tolerate case, line wrapping and whitespace differences without rewriting customer headers. Occupied/unrecognized metadata columns or wrong business headers are rejected. Optional Script Properties LEAD_SOURCE/SOURCE_PAGE set J/K. Script Properties also hold expiring fixed-window counters under the same lock (3 new requests per phone/10min, 60 globally/minute). No per-process memory limiter. High volume requires CDN/hosting limits and quota reassessment.

## Conventions
Strict TypeScript, @/* aliases, kebab-case files, PascalCase components. Constants own labels/content. Shared modules tested by Node use explicit .ts imports where necessary. No new package dependencies for Phase 2. Configuration/retry/ownership details: GOOGLE_SHEETS_INTEGRATION.md and .env.example.
