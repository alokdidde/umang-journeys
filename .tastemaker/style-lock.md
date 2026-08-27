# Style lock — UMANG Life

Established: 2026-08-26. Updated: 2026-08-27 for lifecycle-aware records and relationships.

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
- Text-safe: ink/text/muted on Background or Surface; white on Primary; white and muted-light text on the dark closing surface; white surfaces against Accent, Rose, Amber, Danger, and Primary.
- UI-safe only: Green on white; Primary, Accent, Rose, and Amber against the strong line token; state colors may be used for borders, icons, and large labels.
- Decorative pairings must never be the only carrier of state.
- Verified with `scripts/check_contrast.py --matrix` on 2026-08-26; Primary/white is 6.17:1, muted/Surface is 4.90:1, and ink/Surface is 17.57:1.

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
- Signed-out marketing sections use fixed generous whitespace: 112px on mobile and 160–168px on desktop. Authenticated screens keep the tighter guided-screen scale above.

## Reference intelligence
- Design read: guided public-service app for a broad, occasional-use audience, mode Operate; signed-out public front door for citizens and evaluators, mode Persuade.
- Dials: authenticated variance 3/10, motion 2/10, density 3/10, art direction 6/10; signed-out variance 7/10, motion 5/10, density 3/10, art direction 8/10.
- Foundation: existing React 19, Next.js 16, Tailwind 4 stack; existing primitives are sufficient.
- Direction contract: a familiar top navigation, a public promise demonstrated by real workflow fragments, one next action on authenticated Home, readable single-column forms, and full journey dependency maps revealed only on request; preserve the existing UMANG identity.
- Anti-references: power-user SaaS dashboard, permanent dark rail, KPI strip, two-column workbench, full-screen chatbot, giant upload card, or raw provider internals.

## Taste memory
- User-resolved rule: visual polish must not increase cognitive load.
- Decision log: `.tastemaker/decisions.log`.
- Pending review: familiar desktop top navigation and collapsed document/provider disclosures.
- Profile promotion: none.

## Navigation chrome
- Desktop uses a familiar 76px top bar with Home, My life, Documents, and Activity.
- Mobile uses a compact brand bar and four labeled bottom-navigation targets.
- Demo controls stay visually secondary to citizen tasks.
- Language, read-aloud, demo reset, and external help stay inside one “Options” menu; only demo status and sign-out remain visible beside navigation.

## Screen structure
- The signed-out front door uses a short Long-Scroll Narrative: promise and branching journey preview; the agency-fragmentation problem; a sticky 3-step guided-intake story; document-to-journey matching; implemented-scope proof; and the pre-filled demo sign-in close. It stays low-density, avoids generic feature grids, and never applies this marketing rhythm inside the authenticated product.
- Home begins with one persistent request workspace. Current work, saved records, shortcuts, and life-event starts remain below it as dashboard context.
- Home ignores caught-up work when choosing the next action; when all work is done, it shows one “all caught up” state linked to My life.
- The returning-citizen request workspace stays open at the top. Unsupported, unclear, and failed requests explain the issue in place and leave dashboard recovery routes available.
- My life visibly separates “Needs attention,” “Saved without guided steps,” and “All caught up.” A request without verified guidance is never presented as completed or placed under a green success state.
- Within each state, My life separates My family, Other people, Homes & property, Vehicles & assets, Work & organisations, and Other records. Family labels come only from a stated family relationship; business partners, tenants, drivers, advisers, and signatories retain the contextual role that connects them.
- A citizen may save a broader record before a researched guided service exists. The record shows the requested need as “Guided steps not available yet”; it never fabricates a checklist or hides the limitation.
- A person-or-thing page names its saved services directly and shows connected people with their roles, known ownership shares, and authority. It never summarises them as an abstract count of “areas.”
- Guided plan pages use one vertical reading flow: an event-and-subject hero, work already happening, all actions that are ready now, then a plain-language timeline projected from the dependency graph. Parallel ready actions use two columns on desktop and one on mobile; the full technical dependency map remains a secondary wide drawer.
- Journey progress is written as a plain sentence beside the full plan, never as a top-level percentage, ring, KPI, or abstract section count.
- “About {person or thing}” opens a fixed contextual drawer containing identity, dates, connections, and documents. It overlays the viewport and never widens or reflows the plan.
- Documents expose “Add a document” as a disclosure above a plain library.
- Service provider and data-sharing metadata are available under “Provider and data details.”
- Intake is one narrow column with a short progress label; extracted facts are optional detail.
- A request may describe several related needs and several people or things. AI proposes the subjects, relationships, facts, and service needs it understood; the citizen reviews this proposal before anything is saved or performed. Confirmed service graphs remain authoritative after creation.
- Before proposing a change, AI receives the citizen’s current active records so it can distinguish a new person or thing from one already in My life. It may target only a supplied record identifier; uncertain matches must remain new proposals rather than silent merges.
- Every proposal names its lifecycle effect in plain language: Add new record, Update saved record, Keep saved record, or Remove this record. Relationship changes likewise say whether a connection will be added or removed.
- Removing a record is visually and verbally destructive, requires the same explicit confirmation boundary, archives its guided services, and removes its active connections. It is never inferred from an ambiguous request.
- Documents may belong directly to a person-or-thing record even when no guided service exists. Record pages and the document library expose that attachment without inventing a service workflow.
- Activity stays chronological, readable, and filterable without summary tiles.
- Health & Insurance keeps its required cover-readiness path distinct from optional public-scheme and digital-record branches; none of these outputs may look like approval or guaranteed cover.
- Moving Home, Starting a Business, and Retirement distinguish a short required path from optional authority-specific branches. Synthetic readiness, registration, pension, and entitlement outputs must never look like official approval.
- First-visit Home asks one plain-language question through a single wide text-or-document composer, then offers compact life-event choices; document suggestions require approval and explanatory process content stays out of the primary path.
- Active and completed Journey Maps stay collapsed behind “View journey map.” Required branches are visually primary; dormant optional branches are quieter and become completion obligations only after the citizen adds them.
- Journey Maps open on “Relevant now,” with search and an explicit “Entire journey” scope for dormant branches and later duties. Desktop and mobile render only their own graph representation.
- Dated and recurring obligations stay in one collapsed “Dates to keep in mind” disclosure; overdue or near-term duties may also surface as a plain Home task.
- Forms with more than one conceptual group use two short parts with Back/Continue controls and a visible “Part 1 of 2” label.
- Evidence details, provider checks, generated-result groups, and less-used sample documents are progressively disclosed.
- Evidence stays pending until the citizen reviews analysed values; confidence, checks, and conflicts appear inside the evidence card rather than as a separate technical workspace.
- Provider failures, evidence review, deadlines, and journey exceptions surface as plain tasks in Activity; the audit ledger remains a separate History tab.
- Completion screens offer exactly one recommended next action, with the full journey available as a secondary link.
- Synthetic external services are reviewed by input-driven Vercel AI agents. Citizens provide evidence, consent, clarifications, and appeals; the interface must never expose a predetermined outcome picker or silently fall back to rules.
- Every synthetic decision states that no real authority was contacted, preserves an inspectable reference and findings, and shows an explicit failure when the AI gateway is unavailable.
- Authentication keeps the pre-filled gateway visually stable: password visibility is user-controlled, errors stay beside the fields, pending actions show progress, and sign-out is an explicit desktop label rather than an ambiguous account avatar. Mobile keeps the same sign-out action as a 44px icon control with an accessible name.

## AI-native interaction
- Use official AI Elements source components selectively and restyle them to this lock; the product must not become a generic chat transcript.
- Keep `PromptInput`, `Attachments`, and `Confirmation` as the core request-and-approval primitives. Add `Plan`, `Suggestion`, and compact `Message` primitives only where they clarify what UMANG understood, what it needs next, or what it proposes to do.
- The request composer may stream a short interpretation and proposed update, then collapse into the persistent person-or-thing record after approval.
- Render authoritative tasks from the journey engine with the existing citizen task UI. Do not present model reasoning, raw tool calls, JSON, model selectors, or generated task guesses as citizen-facing service guidance.
- Every mutating AI action states what will be added or changed and requires explicit approval. External submission, data sharing, declarations, and payments require a separate explicit approval at the point of action.
- “My life” changes use one review surface for adds, updates, relationship connections/disconnections, and archives; the interface never exposes internal entity IDs or implementation terminology.
- Compound-request approval shows every citizen-supplied answer under the person or thing it belongs to. After approval, one subject may open directly; several subjects first resolve into a complete saved-result receipt with every affected record and one recommended next action.
- Standalone guided task surfaces—including request details, approval, and every profile form—stay centred within their shared reading lane. Their copy remains left-aligned for scanning, and the compact request composer remains aligned with its entry point.
- On mobile, request details and approval are focused transactional states: the bottom navigation and alternative life-event grid recede until the request is applied, changed, or abandoned.
- AI states include analysing, asking for information, proposal ready, applying, applied, declined, recoverable failure, and unavailable. Each state must remain understandable without animation or colour alone.

## Mood descriptors
Calm, trustworthy, guided, humane.

## Assets
- Anchor asset: `public/assets/journey-landscape.png`, used at low opacity.
- Signed-out use: the landscape frames the opening and demo-access close; constructed product fragments carry the sections between them.
- Icons: Lucide, consistent outline stroke.
- Existing UMANG CSS mark is preserved.

## Motion
- Feel: quick and restrained.
- Curves: cubic-bezier(0.23, 1, 0.32, 1).
- Durations: press 120ms, hover 140ms, panel/state 180–240ms.
- Authenticated screens animate only state changes and active progress. The public page uses GSAP/ScrollTrigger for one 4-beat hero entrance, restrained section reveals, a journey-progress draw, and subtle scenery parallax.
- Reduced motion: spatial motion and spinners are disabled while state feedback remains visible.
- Verified by `scripts/audit_motion.py` and desktop/mobile browser review on 2026-08-26.

## Do not
- Do not turn the homepage into a dashboard, workbench, full-screen chatbot, or permanent chat transcript.
- Do not expose internal positioning or team mantras as page titles; headings must tell citizens what they can do or what state their work is in.
- Do not use a permanent desktop sidebar for four destinations.
- Do not show account totals, provider internals, or all journey facts by default.
- Do not expose chain-of-thought.
- Do not apply a document-derived mutation without explicit approval.
- Do not place document intake before the saved journey’s next action.
- Do not make polish dependent on smaller type or denser cards.
