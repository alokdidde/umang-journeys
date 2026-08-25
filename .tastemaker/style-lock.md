# Style lock — UMANG Journeys

Established: 2026-08-26. Updated after the user explicitly requested a Tastemaker-led full-site redesign.

## Palette
- Background: #f3f6fa
- Surface: #ffffff
- Primary: #1858d6
- Accent: #7450b8, used sparingly for AI context and emphasis
- Text primary: #31405f — 10.35:1 against Background
- Text muted: #59677d
- Navigation: #0c1b3a with #b9c9e2 labels — 10.15:1
- Button label: #ffffff — 6.17:1 against Primary
- Dark mode: not needed; this evaluation app ships in light mode.

## Color contract
- Text-safe: surface/navigation, background/navigation, navigation/sidebar-label, text/surface, text/background, text/border, primary/on-primary, surface/primary, surface/accent, surface/muted, background/primary, background/accent, background/muted, and primary/border.
- UI-safe only: accent/border, border/muted, primary/sidebar-label, accent/sidebar-label, and sidebar-label/muted.
- Decorative only: navigation/muted, text/muted, text/accent, text/primary, background/border, surface/border, primary/muted, accent/muted, primary/accent, and background/surface.
- Decorative pairings must not be the only carrier of state.

## Typography
- Display and body: Inter.
- App-shell headings use compact negative tracking; identifiers and progress values use tabular numerals.

## Shape language
- Primary panels: 14px radius with restrained blue-grey shadow.
- Controls and nested cards: 8–14px radius.
- Hairline blue-grey borders establish regions; state always adds icon or copy.

## Density & spacing
- Base unit: 4px.
- App-shell content uses 12–18px compact padding; pivotal forms and service panels use 24–28px.
- Overall density: compact and operational, with no oversized dashboard cards.
- Section separation: fixed spacing plus one consistent hairline boundary.

## Reference intelligence
- Design read: citizen service workspace for a guided evaluation, mode Operate, calm civic-ledger visual lane.
- Dials: variance 5/10, motion 3/10, density 8/10, art direction 7/10.
- Foundation: existing React 19, Next.js 16, Tailwind 4 stack; AI Elements source components adopted selectively.
- Direction contract: a returning-user workspace with a persistent dark desktop service rail, compact mobile bottom navigation, contextual top bar, dense collection rows, and one document desk that expands only while work or approval is active; preserve the existing UMANG identity.
- Anti-references: full-screen chatbot, giant empty upload card, model picker, raw reasoning transcript, or purple-gradient SaaS dashboard.

## Taste memory
- Profile priors used: none.
- Decision log: `.tastemaker/decisions.log`.
- Pending review: dark desktop service rail, next-action-first mobile home, editorial split login, compact expandable document desk, and ledger-style document/activity collections.
- Profile promotion: none.

## Navigation chrome
- Desktop uses a persistent 218px service rail plus a contextual 64px top bar.
- Mobile collapses to a compact brand bar and four equal, labeled bottom-navigation targets.
- Shell density: compact cards and 9–13px operational labels; large type is reserved for page-level headings.

## Collection structure
- Home is a task-first workbench: compact account totals, next-action journey cards, a narrower document-intelligence rail on desktop, then new life events. Mobile always keeps the next action above document intake.
- Journeys, Documents, and Activity are dedicated account surfaces rather than oversized homepage sections.
- Document rows always expose provenance, journey link, state, and an original-file or service-record action.
- Activity is an append-only derived ledger grouped by local calendar day and filterable by journeys, documents, and service events.

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
- Verified by: static motion scan and 390px/1280px browser passes. The only audit findings are intentional 1.1–1.2s continuously rotating progress indicators; both inherit the global reduced-motion branch in `globals.css`.

## Do not
- Do not turn the homepage into a chat transcript.
- Do not expose chain-of-thought or provider internals.
- Do not apply a document-derived mutation without explicit approval.
- Do not let the assistant consume more vertical space than the journey summaries while idle.
- Do not return desktop navigation to a floating link pill or large marketing-style top bar.
- Do not place document intake before the saved journey’s next action on mobile.
