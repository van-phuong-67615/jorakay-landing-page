# Design system

## Identity and references
JORAKAY Vietnam, professional and calm, focused on construction consultation. Image 1 controls composition: compact header, softly lit green background, large white rounded main card, marketing left/form right, restrained footer. Image 2 controls fields. Avoid additional marketing sections or invented claims.

## Tokens
Colors: dark #064E3B; primary #008A45; bright #10A34A; lime #B8E232; background #F5F9F4; surface #FFFFFF; muted #64746B; border #DCE8DF; error #B42318. Form surface #F7FAF6. Dark body text #243D32. Muted small text uses #56695E for readable contrast.

Typography: Inter variable font via next/font/google, with latin and vietnamese subsets, display swap, and Arial/Helvetica/sans-serif fallbacks. The root layout exposes --font-inter; body text and inherited form controls use it throughout the site. Next.js downloads the font at build time and serves it locally at runtime. Weights: 400 body, 600 labels, 700 headings, 800 hero. Body 16px/1.7; hero clamp(40px, 4.2vw, 62px)/1.08; form heading 28px/1.2; labels 13px/1.4; small copy 12–14px/1.6. Uppercase eyebrow uses 1.8px tracking.

Spacing scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64px. Main container max 1180px with 24px outer gutters (16px on small mobile). Header height about 96px. Main padding 34px, gap 40px. Desktop grid 0.9fr/1.1fr, vertically aligned. Footer max 1180px.

Radii: input 12px, pill 999px, form 24px, main 32px, product visual 24px. Main shadow 0 24px 70px rgba(6,78,59,.13). Button shadow 0 10px 24px rgba(0,138,69,.18). Borders 1px solid border token.

## Controls and states
Inputs minimum height 48px, padding 12–14px. Labels above controls, required asterisk colored red; concise inline red errors below. Radio choices are native inputs inside bordered option cards. Native select keeps keyboard behavior. Textarea min-height 92px. Checkbox at least 18px with a generous clickable label. Consent text wraps naturally.

Focus: visible 3px green outline with 3px offset, input focus border primary. Error: red border and aria-invalid, error id connected with aria-describedby. Buttons: primary green full-width 52px submit; hover darkens, active moves 1px, disabled muted; secondary text links are underlined on hover. No decorative controls that appear functional.

Form card: pale green surface, subtle border, 6px green-to-lime top accent, 28px padding. Name/phone share a row on larger screens. Radio group sits in a two-column row when space permits. Submission status is visually separate from the form controls.

Phase 2 replaces the development preview with real submission status: compact Turnstile widget before submit; missing configuration shows an honest unavailable notice. Hide the widget and its spacing after receiving a valid token, keeping it mounted so expiry/error callbacks can show it again. CAPTCHA resets also restore visibility. Submit/input controls disable during requests, with a loading spinner respecting reduced motion. Confirmed saves use the green status panel; errors use pale red background/border and retain form entries. CAPTCHA resets for retries. No success is displayed before a matching save receipt.

Location label and placeholder follow the Sheet order: “Khu vực (Tỉnh/Thành phố, Quận/Huyện)” and “Ví dụ: Quảng Ninh, Hạ Long”. A 12px helper explains province first, district second, separated by a comma. Validate on blur as well as submit; require exactly one ASCII comma and two non-empty single-line parts. Associate the hint and inline error with aria-describedby. The same rule runs in API Zod and Apps Script before splitting D/E.

At the bottom of the form card, after the form and its status, show “Tìm cửa hàng gần tôi” as a centered dark-green 14px/700 external link with map-pin and outgoing-arrow icons. Separate it with a subtle top border; keep a 48px minimum target height and visible keyboard focus. Open the supplied store-locator URL in a new tab so the visitor retains their form entries. Preserve all UTM parameters; configure the URL in site.ts.

## Responsive behavior

Footer follows the supplied footer reference: 14px base text on desktop and mobile, 18px bold bilingual company/social headings, and a 14px OFFICE heading. Left column contains company, tax number, both addresses and OFFICE contact links. Right column contains “THEO DÕI CHÚNG TÔI”, four colored social badges and a 164×160px QR cropped directly from the supplied screenshot. Desktop columns use a 2:1 ratio with a 64px gap and 48px top padding; mobile stacks the columns. Copyright contains only © year Jorakay Việt Nam at 12px. The QR is a temporary reference asset, replaceable through site.footerQrImagePath. Social badges always render as Next.js Link elements. Their URLs come from NEXT_PUBLIC_SOCIAL_YOUTUBE_URL, NEXT_PUBLIC_SOCIAL_ZALO_URL, NEXT_PUBLIC_SOCIAL_TIKTOK_URL and NEXT_PUBLIC_SOCIAL_FACEBOOK_URL through site.socialLinks, with href="#" when empty. Restart dev or rebuild after env changes.
Below 960px: marketing and form stack. Below 560px: name/phone and radios stack, main padding 20px, form padding 20px, footer stacks. The header uses JORAKAY LOGO Color-01.png as the primary home-linked logo on the left and only logo ca sau-01.png (red crocodile) on the right. Keep both ends aligned in one flex row. Desktop widths are 210px and 44px; mobile widths are 160px and 32px. Images retain their intrinsic aspect ratios with object-fit contain. Max content width is fluid. No fixed input widths. Long Vietnamese text wraps. Reduced motion disables transitions; no required animation.

Quick-contact rail: fixed to right:0, top:50%, translateY(-50%), z-index 30. Bright green #48B000 background, rounded left corners and soft shadow. Three 44px targets: circular white-outline phone/email icons and a white rounded Zalo tile. No third crossed-out icon from the reference. Width is 60px desktop and 52px mobile. Phone and email reuse the footer constants. Zalo uses a configured Zalo social URL when present, otherwise the footer phone's zalo.me URL. It opens in a new tab. Include descriptive accessible labels, titles and visible white keyboard focus outlines.

## Accessibility
One h1; h2 form and company footer headings; skip link to main; native controls, fieldsets and legends; error alerts; polite validation status; text contrast at least 4.5:1; visible keyboard focus; no color-only information. The supplied product poster has descriptive Vietnamese alt text. Touch controls at least 44px high.

## Deliberate differences

Poster overlay: a semantic figcaption at the bottom left reads “CÁ SẤU CHÍNH HÃNG” and “LÀ JORAKAY” on two lines, white Inter 800, 18–24px desktop and 15–20px mobile. A subtle dark bottom gradient and text shadow support readability. Position it over the poster without modifying the source image or changing its aspect ratio.
The product area now displays the supplied public/Jorakay Poster (26.10.13).jpg via next/image; width 100%, height auto, object-fit contain, intrinsic ratio 4961:3544. The poster replaces the earlier architectural placeholder and its caption. Keep the rounded container (24px desktop, 18px mobile) without a fixed height or crop. The left primary brand and right red crocodile both use the supplied logo assets; the earlier typographic brand is removed. Social URLs remain unconfigured; the footer QR is cropped from the supplied reference. Footer retains readable reference contact details. The form is taller to accommodate exact longer option labels and accessible consent. Inter is self-hosted by Next.js; visitors make no third-party font, tracking or external image requests.
