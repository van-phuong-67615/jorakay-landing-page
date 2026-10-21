# JORAKAY Vietnam — Tư vấn & Báo giá

Responsive Vietnamese consultation landing page built with Next.js App Router, React, strict TypeScript, Tailwind CSS, React Hook Form, Zod and Lucide React.

## Run locally

Requires Node.js 20.9+ and npm. Install the exact locked dependencies:

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:3000. Inter is the default font, including Vietnamese characters; Next.js downloads it from Google Fonts during development/build and serves the font from the site itself to visitors. Build environments need network access for the font download. For production:

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm start
```

Tests use Node's built-in TypeScript stripping; use Node 22.18+ or the tested Node 24 runtime for `npm test`. Copy `.env.example` to `.env.local` and follow [Google Sheets setup](docs/GOOGLE_SHEETS_INTEGRATION.md). Missing integration values disable submission; they do not prevent rendering/building the page.

## Project structure

```text
src/app/                  App Router page, layout, styles, not-found
src/app/api/consultation/  Server-only POST endpoint
src/components/layout/    Header and footer
src/components/landing/   Hero, badges, supplied product poster
src/components/forms/     Interactive form and field/error primitives
src/lib/constants/        Form options and configurable business content
src/lib/validations/       Shared schema and redacted diagnostics
src/lib/server/            Environment, CAPTCHA, HMAC and upstream receipt checks
src/types/                Inferred form input/output types
google-apps-script/       Code.gs and manifest for customer deployment
tests/                    Schema, API and Apps Script regression tests
docs/                     Project context, design and future architecture
```

## Current behavior — Phase 2

Phase 1 UI is complete. Phase 2 was approved on 2026-10-20. Source now includes a real server API and deployable Apps Script receiver. See docs/PHASES.md for verification and remaining live setup tasks.

RHF + shared Zod validate fields in browser/server. Cloudflare Turnstile and a honeypot protect submission. Next.js signs the lead for the customer Apps Script receiver; the receiver validates it, uses a script-wide lock, checks durable Sheet requestId/hash records and shared throttle counters, then writes text cells safely. The form displays loading, preserves data after failure and retries uncertain requests with the same ID. Success requires an actual matching saved/duplicate receipt. No PII/secrets are logged. No database, authentication, dashboard or email is introduced. Pages retain noindex until commercial launch.

The left primary brand uses public/JORAKAY LOGO Color-01.png; only the red crocodile logo public/logo ca sau-01.png remains on the right. The product area displays public/Jorakay Poster (26.10.13).jpg at its original aspect ratio; its path is configurable in src/lib/constants/site.ts. Business contact details were transcribed from the supplied reference; verify them before release. Privacy and social URLs are configurable in src/lib/constants/site.ts and remain absent until supplied; no fabricated links are shown. The temporary footer QR is cropped from the supplied screenshot and configured through footerQrImagePath. Visitors make no external font/asset requests.

## Documentation

- [Project context](docs/PROJECT_CONTEXT.md): requirements, data model, boundaries and decisions.
- [Design system](docs/design.md): tokens, responsive behavior, accessibility and reference deviations.
- [Architecture](docs/ARCHITECTURE.md): component boundaries, validation and security.
- [Phases](docs/PHASES.md): acceptance checklist and verification status.
- [Google Sheets plan](docs/GOOGLE_SHEETS_INTEGRATION.md): customer ownership, server integration, authentication, idempotency and handover.
- [Agent instructions](AGENTS.md): persistent development rules.

Live setup is pending: fill .env.local, deploy google-apps-script/Code.gs under the customer Google account, set Script Properties, configure Turnstile, and verify a test row. No live Google save or production deployment has been performed. Hosting must support Next.js Node Route Handlers; static-only export cannot run the API. NEXT_PUBLIC_TURNSTILE_SITE_KEY is build-time public configuration; rebuild after changing it. All secrets remain server-only.
