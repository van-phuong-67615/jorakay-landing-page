# JORAKAY Vietnam — Tư vấn & Báo giá

## Purpose and audience
A Vietnamese consultation landing page for homeowners, contractors, and project buyers to describe their location, product needs, and construction conditions. Phase 1 delivered the interface. Phase 2 was approved on 2026-10-20 and adds secure submission to the customer's Google Sheet through Next.js and Apps Script.

## Requirements and data model
Image 1 supplied by the client defines the rounded two-column green visual design. Image 2 and the written brief define the form. All copy is Vietnamese. No existing source or independent product/logo assets were present at initialization.

| Key | Type | Rules |
| --- | --- | --- |
| fullName | string | Trim; 2–100 characters; required |
| phone | string | Remove whitespace; Vietnamese mobile prefix 03/05/07/08/09; 10 domestic digits or +84 plus 9 digits |
| location | string | Trim; max 200; exactly one ASCII comma separating non-empty province/city then district; normalize to “Province, District”; required |
| consultationType | enum | product-quote or solution; required |
| productCategory | enum | tile-adhesive, grout, waterproofing, repair, other; required |
| otherProductCategory | string | Trim; required for other; max 200; cleared when category changes |
| note | string | Optional; trim; max 1000 |
| privacyConsent | boolean | Must be true |

Contact types: “Báo giá và tư vấn về sản phẩm”, “Tư vấn giải pháp”. Categories: “Keo dán gạch”, “Keo chà ron”, “Chống thấm”, “Sửa chữa”, “Khác”. No address lookup service is used.

## Stack and architecture
Next.js App Router, React, strict TypeScript, Tailwind CSS, React Hook Form, Zod, @hookform/resolvers, Lucide React. Server Components render page composition; the interactive form and Turnstile widget are Client Components. Server Node route handles validation, CAPTCHA verification and signing. Shared constants, schema and inferred types live outside components. See ARCHITECTURE.md.

## Non-functional requirements
Responsive at mobile/tablet/desktop widths, no horizontal overflow, semantic headings, Vietnamese lang, visible focus, native keyboard controls, labeled inline errors and SEO. No PII or secrets in logs. Inter and product assets are served locally; configured Turnstile loads Cloudflare's verification script.

## Phase boundaries and decisions
Phase 2 sends only validated, consented leads through /api/consultation. Only a matching Apps Script saved/duplicate receipt permits a success notice. Missing configuration fails closed. Honeypot, Turnstile, Origin/body limits, HMAC, freshness, shared script rate counters and Sheet-backed ID/hash dedup protect the flow. Secrets stay server-side; no database, auth, dashboard or notifications are added. Product assets and contacts remain centralized in site.ts; unavailable policy/social URLs are not fabricated.

## Current status

A server-rendered ContactRail adds fixed right-center phone, email and Zalo links. Phone/email reuse the footer constants; Zalo uses a configured social URL or the same office phone. The crossed-out third icon in the reference is omitted. No new submission behavior is introduced.

Footer now uses 14px base text, OFFICE details below the addresses, a right-hand social/QR block, and a plain copyright. Social badges use Next.js Link and read the optional NEXT_PUBLIC_SOCIAL_YOUTUBE_URL, NEXT_PUBLIC_SOCIAL_ZALO_URL, NEXT_PUBLIC_SOCIAL_TIKTOK_URL and NEXT_PUBLIC_SOCIAL_FACEBOOK_URL values, falling back to href="#" when empty. Restart dev or rebuild/redeploy after changing these public values. The contact rail also uses the configured Zalo URL, retaining its office-phone fallback when empty.
Phase 1 is complete. Phase 2 source is implemented; automated checks and live setup status are recorded in PHASES.md. The primary logo on the left is public/JORAKAY LOGO Color-01.png; only public/logo ca sau-01.png remains on the right. Live Google Sheet/CAPTCHA credentials and deployment remain customer setup tasks. No live save is claimed until verified with those accounts.

## Integration configuration
See .env.example and GOOGLE_SHEETS_INTEGRATION.md for six Next.js env values and three required Apps Script properties. Optional Script Properties LEAD_SOURCE and SOURCE_PAGE control columns J/K. No Google API key/service account is required. A–O match the customer's lead template; D/E contain the two parts of location, L starts as Mới, M–O are blank for staff. Technical request ID/hash/consent/version are written atomically in hidden P–S, not prepended to the customer layout. Configure retention, policy URL, hosting HTTPS and account handover before launch.
