# Reference board

Created: 2026-08-26
Mode: Operate
Design read: Citizen-account app shell for returning residents, using a warm institutional document-vault and task-led journey language.
Dials: variance 4, motion 3, density 8, art direction 6

## Quality bar
- UMANG official portal: one citizen-facing service identity with direct access to services, schemes, dashboard, and DigiLocker.
- DigiLocker official FAQ and technology pages: distinct Home, Issued documents, Uploaded documents, and Activity destinations; every access and file action is timestamped.
- GOV.UK Design System: persistent service navigation for repeated multi-task use, with task lists inside ordered citizen journeys.
- Vercel AI Elements: accessible prompt input, attachments, and confirmation as source-owned React components.

## Viewed sources
- https://web.umang.gov.in/landing/scheme/dashboard — viewed 2026-08-26.
- https://web.umang.gov.in/landing/flipbook/index.html — viewed 2026-08-26.
- https://www.digilocker.gov.in/web/about/faq — viewed 2026-08-26.
- https://www.digilocker.gov.in/web/technology — viewed 2026-08-26.
- https://design-system.service.gov.uk/patterns/navigate-a-service/ — viewed 2026-08-26.
- https://design-system.service.gov.uk/components/task-list/ — viewed 2026-08-26.

## Borrow
- Palette/material: preserve the locked UMANG blue, warm white canvas, and restrained purple AI accent.
- Type/hierarchy: calm service headings, compact operational labels, and readable row-level metadata.
- Layout/composition: persistent primary destinations; compact overview at Home; dense collection views for Documents and Activity.
- Motion/interaction: short state transitions and loading feedback only; no scroll storytelling in the authenticated shell.
- Asset language: real document previews, status icons, journey glyphs, and timeline marks rather than decorative illustration.

## Avoid
- A dashboard made only of equal-sized statistic cards.
- A full-screen chatbot or an assistant that hides the document library.
- Duplicating the same uploaded file as unrelated records without provenance.
- A card grid for activity history, where chronological scanning is the actual task.
- Navigation that competes with the ordered task list inside a journey.

## Direction contract
- Thesis: everything the citizen has done, uploaded, received, or must do next is visible from one account shell.
- First viewport: navigation, one next action, compact document intake, and direct links to Documents and Activity.
- System: existing UMANG tokens and AI Elements, dense rows, task-led journey cards, restrained state motion.
- Risk: adding destinations without reducing homepage repetition would create more chrome but not more clarity.
