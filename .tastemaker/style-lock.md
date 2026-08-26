# Style lock — UMANG Journeys

Established: 2026-08-26. Updated after the user rejected the dense power-user workspace direction.

## Palette
- Background: #f7f9fc
- Surface: #ffffff
- Primary: #1858d6
- Accent: #7450b8, used sparingly for AI context and emphasis
- Text primary: #31405f
- Text muted: #5b667b
- Button label: #ffffff — 6.17:1 against Primary
- Dark mode: not needed; this evaluation app ships in light mode.

## Color contract
- Text-safe: primary text and muted text on Background or Surface; white on Primary.
- UI-safe only: accent and state colors may be used for borders, icons, and large labels.
- Decorative pairings must never be the only carrier of state.

## Typography
- Display and body: Inter.
- Body copy defaults to 15–17px on guided screens.
- Large type is reserved for the current screen title, never for multiple competing cards.

## Shape language
- Primary panels: 14–16px radius with restrained blue-grey shadow.
- Controls and disclosures: 9–14px radius.
- Hairline blue-grey borders establish regions; state always adds icon or copy.

## Density & spacing
- Base unit: 4px.
- Overall density: calm and low, with a narrow 760–960px reading lane.
- One primary action per first viewport; at most three clearly secondary shortcuts.
- Supporting facts and technical metadata use native disclosures and are closed by default.
- Pivotal cards and forms use 18–30px padding; 44px minimum interactive targets.

## Reference intelligence
- Design read: guided public-service app for a broad, occasional-use audience, mode Operate.
- Dials: variance 3/10, motion 2/10, density 3/10, art direction 6/10.
- Foundation: existing React 19, Next.js 16, Tailwind 4 stack; existing primitives are sufficient.
- Direction contract: a familiar top navigation, one next action on Home, readable single-column forms, and full journey dependency maps revealed only on request; preserve the existing UMANG identity.
- Anti-references: power-user SaaS dashboard, permanent dark rail, KPI strip, two-column workbench, full-screen chatbot, giant upload card, or raw provider internals.

## Taste memory
- User-resolved rule: visual polish must not increase cognitive load.
- Decision log: `.tastemaker/decisions.log`.
- Pending review: familiar desktop top navigation and collapsed document/provider disclosures.
- Profile promotion: none.

## Navigation chrome
- Desktop uses a familiar 76px top bar with Home, Journeys, Documents, and Activity.
- Mobile uses a compact brand bar and four labeled bottom-navigation targets.
- Demo controls stay visually secondary to citizen tasks.
- Language, read-aloud, demo reset, and external help stay inside one “Options” menu; only demo status and sign-out remain visible beside navigation.

## Screen structure
- The signed-out front door is one illustrated Poster Fold: one promise, one short explanation, and one pre-filled demo sign-in form on a shared foreground axis. The background scenery may stay asymmetric, but the headline and form share a left edge and width. It must not become an editorial split, feature grid, or long marketing page.
- Home shows one saved journey and its next action before anything else.
- Home ignores completed journeys when choosing the next action; when all work is done, it shows one “all caught up” state linked to the archive.
- Starting another journey is collapsed by default.
- My Journeys visibly separates “In progress” from “Completed journeys”; completion changes placement, never availability.
- Journey pages remain next-action-first. The full dependency graph appears only in a wide slide-in Journey Map opened by the citizen.
- Documents expose “Add a document” as a disclosure above a plain library.
- Service provider and data-sharing metadata are available under “Provider and data details.”
- Intake is one narrow column with a short progress label; extracted facts are optional detail.
- Activity stays chronological, readable, and filterable without summary tiles.
- Health & Insurance keeps its required cover-readiness path distinct from optional public-scheme and digital-record branches; none of these outputs may look like approval or guaranteed cover.
- Moving Home, Starting a Business, and Retirement distinguish a short required path from optional authority-specific branches. Synthetic readiness, registration, pension, and entitlement outputs must never look like official approval.
- First-visit Home asks one plain-language question through a single wide text-or-document composer, then offers compact life-event choices; document suggestions require approval and explanatory process content stays out of the primary path.
- Active and completed Journey Maps stay collapsed behind “View journey map.” Required branches are visually primary; dormant optional branches are quieter and become completion obligations only after the citizen adds them.
- Forms with more than one conceptual group use two short parts with Back/Continue controls and a visible “Part 1 of 2” label.
- Evidence details, provider checks, generated-result groups, and less-used sample documents are progressively disclosed.
- Evidence stays pending until the citizen reviews analysed values; confidence, checks, and conflicts appear inside the evidence card rather than as a separate technical workspace.
- Provider failures, evidence review, deadlines, and journey exceptions surface as plain tasks in Activity; the audit ledger remains a separate History tab.
- Completion screens offer exactly one recommended next action, with the full journey available as a secondary link.
- Authentication keeps the pre-filled gateway visually stable: password visibility is user-controlled, errors stay beside the fields, pending actions show progress, and sign-out is an explicit desktop label rather than an ambiguous account avatar. Mobile keeps the same sign-out action as a 44px icon control with an accessible name.

## Mood descriptors
Calm, trustworthy, guided, humane.

## Assets
- Anchor asset: `public/assets/journey-landscape.png`, used at low opacity.
- Signed-out use: the same landscape may bleed at both viewport edges to frame life stages while the centre remains quiet enough for the gateway.
- Icons: Lucide, consistent outline stroke.
- Existing UMANG CSS mark is preserved.

## Motion
- Feel: quick and restrained.
- Curves: cubic-bezier(0.23, 1, 0.32, 1).
- Durations: press 120ms, hover 140ms, panel/state 180–240ms.
- Animate only state changes and active progress; do not animate reading content for decoration.
- Reduced motion: spatial motion and spinners are disabled while state feedback remains visible.

## Do not
- Do not turn the homepage into a dashboard, workbench, or chat transcript.
- Do not expose internal positioning or team mantras as page titles; headings must tell citizens what they can do or what state their work is in.
- Do not use a permanent desktop sidebar for four destinations.
- Do not show account totals, provider internals, or all journey facts by default.
- Do not expose chain-of-thought.
- Do not apply a document-derived mutation without explicit approval.
- Do not place document intake before the saved journey’s next action.
- Do not make polish dependent on smaller type or denser cards.
