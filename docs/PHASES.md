# Delivery phases

## Phase 1 — completed baseline
Scope: responsive landing UI, header/footer/hero, accessible RHF + Zod form, conditional product input, SEO, documentation. No submission or backend.

Acceptance checklist (update after verification):
- [x] UI and responsive browser review complete
- [x] All required and conditional validation verified
- [x] No network submission or false success
- [x] Project context, design, architecture and integration plan documented
- [x] Lint, typecheck, production build and schema tests pass

Verification on 2026-10-20: Next.js 16.4.2, React 19.3.1, Node 24.8.0. `npm run lint` passed without warnings; `npm run typecheck` passed; `npm test` passed all five tests; `npm run build` generated static / and /_not-found successfully. Sandbox Turbopack could not start its CSS worker; the same production build passed with normal host process access. An upstream optional-peer conflict in resolvers 6 was avoided by using compatible @hookform/resolvers 5.2.2. Exact versions and package-lock.json are included in the project.

Browser checks: production HTTP 200, two-column desktop at 1440px, stacked tablet at 768px, mobile at 390px and 320px; no horizontal overflow at these widths. Verified empty errors, phone normalization via schema tests, native radio selection, consent, conditional other description error/visibility/cleanup, valid production not-sent notice and empty production info/warn/error console. Development valid input displayed the explicit development-only notice and emitted the sanitized preview log. Tests verify redaction of every free-text/personal value. Captured previews: qa/desktop.png and qa/mobile.png (local QA artifacts, ignored by Git).

## Phase 2 — approved 2026-10-20, source implemented

- [x] POST /api/consultation, server Zod, origin/type/body limits
- [x] Turnstile client widget and server verification; honeypot
- [x] HMAC-signed Apps Script envelope with freshness checks
- [x] Customer-owned Apps Script source and manifest
- [x] Script Lock + durable Sheet requestId/hash deduplication
- [x] Shared Script Properties fixed-window phone/global rate limits
- [x] Safe text-cell writes, loading/errors, confirmed-success behavior
- [x] .env.example and Vietnamese customer setup/handover instructions
- [x] 23 local tests pass: schema, API boundary, Apps Script VM, customer A–O mapping, comma validation, existing template preservation and API-to-script retry deduplication
- [x] Final lint/typecheck/build after integration changes
- [ ] Live Turnstile + Google Sheet test (awaiting customer env/accounts)
- [ ] Production hosting/env/HTTPS and customer handover

No real Google Sheet save or deployed integration is claimed. Customer inputs: Apps Script /exec URL, shared secret, Turnstile site/secret keys, APP_URL and consent version; Sheet ID/tab are configured only in Script Properties. Additional launch decisions: privacy policy URL, retention, hosting/CDN-level throttling for higher traffic and quota monitoring.

Final local verification: lint/typecheck/build pass; production build includes dynamic /api/consultation. HTTP smoke test without env returns 503 with ok:false. Browser shows the configuration notice and disabled submit, no warn/error console messages and no horizontal overflow at 320px. No external test submission was made. Configured Turnstile and Google account behavior still require a customer-owned live test. Preview: qa/phase2-unconfigured.png.

Customer template update: business columns A–O match the supplied Sheet image; province/district are split into D/E only after format validation. Hidden P–S preserve atomic audit/dedup writes. Browser blur test confirmed missing comma produces an inline error and “Quảng Ninh, Hạ Long” clears it. SOURCE_PAGE/LEAD_SOURCE are optional Script Properties; existing required env values are unchanged. Deploy the updated Code.gs version before using the new layout. Live customer Sheet remains untested.
