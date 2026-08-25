# Style lock — UMANG Journeys

Established: 2026-08-26. Source: existing application UI and user-approved compact dashboard direction.

## Palette
- Background: #ffffff
- Surface: #f8faff
- Primary: #1858d6
- Accent: #7450b8, used sparingly for AI context and emphasis
- Text primary: #31405f — 10.35:1 against Background
- Text muted: #65718a
- Button label: #ffffff — 6.17:1 against Primary
- Dark mode: not needed; this evaluation app ships in light mode.

## Color contract
- Text-safe: text/bg, text/on-primary, text/surface, text/border, bg/primary, primary/on-primary, surface/primary, bg/accent, accent/on-primary, surface/accent, primary/border, accent/border.
- UI-safe only: none in the core 7-role matrix.
- Decorative only: text/accent, text/primary, bg/border, border/on-primary, surface/border, primary/accent, bg/surface, surface/on-primary, bg/on-primary.
- Decorative pairings must not be the only carrier of state.

## Typography
- Display and body: Inter.
- App-shell headings use compact negative tracking; identifiers and progress values use tabular numerals.

## Shape language
- Primary panels: 18px radius with soft blue-grey shadow.
- Controls and nested cards: 8–14px radius.
- Hairline blue-grey borders establish regions; state always adds icon or copy.

## Density & spacing
- Base unit: 4px.
- App-shell content uses 12–18px compact padding; pivotal forms and service panels use 24–28px.
- Overall density: compact and operational, with no oversized dashboard cards.
- Section separation: fixed spacing plus one consistent hairline boundary.

## Reference intelligence
- Design read: citizen-services app shell for a guided evaluation, mode Operate, warm institutional visual lane.
- Dials: variance 3/10, motion 3/10, density 7/10, art direction 5/10.
- Foundation: existing React 19, Next.js 16, Tailwind 4 stack; AI Elements source components adopted selectively.
- Direction contract: one compact document desk above journey summaries; expand only while work or approval is active; preserve the existing UMANG identity.
- Anti-references: full-screen chatbot, giant empty upload card, model picker, raw reasoning transcript, or purple-gradient SaaS dashboard.

## Taste memory
- Profile priors used: none.
- Decision log: `.tastemaker/decisions.log`.
- Pending review: compact expandable document desk above journeys.
- Profile promotion: none.

## Navigation chrome
- Existing UMANG top bar is preserved.
- Shell density: compact cards and 9–13px operational labels; large type is reserved for page-level headings.

## Mood descriptors
Warm, trustworthy, operational.

## Assets
- Anchor asset: `public/assets/journey-landscape.png`.
- Icons: Lucide, consistent outline stroke.
- Existing UMANG CSS mark is preserved.

## Motion
- Feel: quick and restrained.
- Curves: cubic-bezier(0.23, 1, 0.32, 1).
- Durations: press 120ms, hover 140ms, panel/state 180–240ms.
- App-shell track: animate only the state that changed; progress spinners communicate active work.
- Reduced motion: spatial motion and spinners are disabled while state feedback remains visible.
- Verified by: pending final static motion scan and browser feel pass.

## Do not
- Do not turn the homepage into a chat transcript.
- Do not expose chain-of-thought or provider internals.
- Do not apply a document-derived mutation without explicit approval.
- Do not let the assistant consume more vertical space than the journey summaries while idle.
