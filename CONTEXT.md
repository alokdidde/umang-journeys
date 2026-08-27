# UMANG Life

UMANG Life organises public services around the people, things and responsibilities in a person’s life, and preserves progress across the services involved. `Journey` remains the internal domain term for one persisted service-coordination record; citizen-facing copy names the concrete person or thing instead.

## Language

**Life Event**:
A meaningful change in a person’s life, such as having a baby or moving home, around which relevant services are organised.
_Avoid_: Service category, application type

**Journey Template**:
The reusable dependency graph of Journey Branches, Journey Steps, and guidance associated with one kind of Life Event.
_Avoid_: Journey, workflow instance

**Journey**:
A persisted service plan for one person or thing, created from a Journey Template. Several Journeys may concern the same person or thing without creating another identity for it.
_Avoid_: Form, application, template

**Journey Subject**:
The one person or thing a Journey is about. A newborn or parent remains distinct from the account holder. A request concerning two people creates one Journey for each person so their identity, evidence, eligibility, and progress cannot be mixed.
_Avoid_: User, account, applicant

**Canonical Entity**:
The enduring identity of one person or thing in My Life. It may be linked to several Journeys and several contextual relationships without being duplicated.
_Avoid_: Journey Subject, card, profile row

**Life Entity Kind**:
The extensible kind of enduring record kept in My Life: Person, Household, Organisation, Premises, Property, Vehicle, Registered Asset, Animal, Estate, or Other. It is independent of the older Journey Subject type used by existing guided templates.
_Avoid_: Journey type, service category, database enum

**Organisation**:
A business, company, partnership, cooperative, society, association, or other organised body. Several People may own, direct, operate, advise, or act for it without becoming family members.
_Avoid_: Business owner, employer account, household

**Premises**:
A home, office, shop, warehouse, or other place occupied or used by a Person or Organisation. Premises is distinct from legal ownership of the underlying Property.
_Avoid_: Property, address string, household

**Property**:
Land or an immovable property interest that may be owned, leased, inherited, transferred, or otherwise recorded. A Property may contain one or more Premises.
_Avoid_: Home, address, move

**Registered Asset**:
A durable asset other than a Vehicle that has its own official registration, certification, serial identity, or compliance record.
_Avoid_: Document, service output, generic possession

**Animal**:
An individually identified animal or managed group for which registration, tagging, health, movement, ownership, or benefit services may apply.
_Avoid_: Pet profile, household member

**Estate**:
A legal arrangement or body of property administered after death or through a trust-like arrangement. The Estate is distinct from its beneficiaries, administrators, and individual assets.
_Avoid_: Family, inherited property, organisation

**Unavailable Need**:
A government-service need the citizen asked UMANG Life to remember but for which the product has no researched guided workflow for the relevant service or location. It must remain visibly unavailable and must not create authoritative-looking steps.
_Avoid_: Unsupported user, generic journey, suggested checklist

**Person**:
One human being represented by a Canonical Entity. Being a Person does not imply family membership, dependency, ownership, household membership, or authority.
_Avoid_: Dependent, family member, applicant

**Family Relationship**:
A stated personal relationship between two People, such as daughter, parent, spouse, sibling, or ward. It determines whether someone appears in My Family; it does not determine eligibility or authority for a service.
_Avoid_: Dependent, household member, business partner

**Household Membership**:
A time-bounded relationship showing that a Person belongs to a Household. It is independent of Family Relationship: relatives may live elsewhere, and non-relatives may share a household.
_Avoid_: Family, dependant, address

**Contextual Role**:
A Person’s role in relation to another person or thing, such as guardian of a child, co-owner of a business, tenant of a home, or driver of a vehicle. The same Person may have different Contextual Roles in different contexts.
_Avoid_: Global role, user type, dependent

**Ownership Association**:
A Contextual Role connecting a Person to a Business, Home, or Vehicle they own. Several People may own the same thing, and an ownership share may be recorded when known.
_Avoid_: Operator, family member, applicant

**Authority to Act**:
The explicit scope in which a Person may sign, apply, manage, or otherwise act for another person or thing. Ownership and Family Relationship do not automatically grant Authority to Act.
_Avoid_: Owner access, family access, assumed consent

**My Family**:
The citizen-facing collection of People who have a Family Relationship to the account holder. Other People remain available in the context that connects them, such as a Business, Home, Vehicle, or service.
_Avoid_: All people, dependants, household

**Multi-person Request**:
A single request concerning more than one Journey Subject, such as arranging health cover for both parents. It is split into separate Journeys while retaining the same account holder as the person helping them.
_Avoid_: Shared patient, family health journey

**Vehicle Journey**:
A Journey whose subject is one identified vehicle and whose steps coordinate ownership, coverage, tolling, and compliance outcomes after purchase.
_Avoid_: Car form, transport application

**Health & Insurance Journey**:
A Journey for one person that coordinates health-cover understanding, public-scheme screening, digital health records, and preparation for cashless care.
_Avoid_: Patient application, insurance claim

**Residence Move**:
A Journey for one household’s change of primary residence. Each authority still receives its own Address Update Request.
_Avoid_: Global address change, home registration

**Residence Evidence**:
A document that supports occupancy or use of the new address. Acceptance remains specific to the authority receiving it.
_Avoid_: Universal address proof, verified residence

**Address Update Request**:
A prepared request to change one authority’s address record, such as Aadhaar, the electoral roll, or a vehicle registration record.
_Avoid_: Address update, global update

**Business Setup**:
A Journey for one proposed enterprise and its chosen legal structure, registrations, and launch obligations.
_Avoid_: Company registration, incorporated business

**Registration Readiness**:
A checked set of business facts, declarations, and evidence that may support an official registration. It is not a registration, licence, or finding of legal compliance.
_Avoid_: Registered, approved, compliant

**Retirement Transition**:
A Journey for one person moving from active employment into retirement, including record review, pension pathways, and recurring pensioner obligations.
_Avoid_: Retirement account, pension approval

**Benefit Indication**:
A sandbox result that identifies a retirement or pension pathway worth checking with the responsible authority. It is not financial advice or an eligibility decision.
_Avoid_: Entitlement, recommendation, approval

**Retirement Pack**:
A synthetic summary of a person’s retirement records, potential claim paths, and future verification dates. It is not a pension sanction, investment recommendation, or payment order.
_Avoid_: Pension certificate, retirement approval

**Coverage**:
The financial protection available through a commercial health policy or a public health scheme. A policy and a scheme entitlement remain distinct sources of Coverage.
_Avoid_: Approval, guaranteed payment

**Eligibility Indication**:
A sandbox screening result that suggests an official public-scheme check may be worthwhile. It is not an eligibility decision or enrolment.
_Avoid_: Eligibility, approval

**Cashless Readiness**:
A prepared set of records, contacts, and pre-authorisation steps for seeking cashless care. The insurer or scheme and network provider still decide authorization.
_Avoid_: Cashless approved, claim accepted

**Coverage Pack**:
A synthetic UMANG summary of a person’s Coverage, evidence, and care-readiness steps. It is not an insurance card, policy, or guarantee of payment.
_Avoid_: Health card, insurance certificate

**Journey Step**:
One service or outcome within a Journey whose state and dependencies are tracked independently.
_Avoid_: Screen, page, form

**Journey Branch**:
A named path of related Journey Steps inside a Journey. A branch can be required from the start or optional until the account holder adds it.
_Avoid_: Category, tab, loose group

**Required Branch**:
A Journey Branch whose required steps must be complete before the Journey is complete.
_Avoid_: Main branch, default tab

**Optional Branch**:
A dormant Journey Branch that does not affect progress or completion until the account holder explicitly adds it. Once added, its required steps follow the same completion rules as a Required Branch.
_Avoid_: Skipped branch, recommended link

**Conditional Branch**:
A dormant Journey Branch that becomes part of a Journey only when confirmed Journey Facts satisfy its Journey Gate. Once active, its required steps count toward completion like any Required Branch.
_Avoid_: Suggested branch, AI-selected branch

**Journey Gate**:
A dated, inspectable rule over confirmed Journey Facts that determines whether a Conditional Branch or Journey Step applies. An unresolved gate is distinct from a failed gate.
_Avoid_: AI guess, hidden condition

**Journey Step Kind**:
The role a Journey Step plays: citizen task, routing decision, external decision, milestone, or recurring duty. Kind does not itself determine whether the step is required.
_Avoid_: Screen type, card type

**Supporting Step**:
A real part of the Journey Map that explains a route, decision, or future milestone but does not block the Journey’s present completion.
_Avoid_: Decorative node, fake step

**Recurring Duty**:
A Journey Step that produces dated obligation instances after an authority, policy, or schedule makes it due.
_Avoid_: Reminder, one-time step

**Service Source**:
The official authority, jurisdiction, canonical resource, and verification date that support a Journey Step’s guidance.
_Avoid_: Helpful link, reference URL

**Synthetic Agency**:
An AI-backed evaluation adapter that behaves like one named external authority using the Journey’s submitted facts and evidence. It is never the real authority and every response it produces remains visibly synthetic.
_Avoid_: Mock endpoint, deterministic simulator, government integration

**Agency Decision**:
A schema-validated response from a Synthetic Agency to one case submission, clarification, or appeal. It may approve, reject, request information, or remain under review, but it must explain its decision from the supplied case record.
_Avoid_: Generated success, scripted outcome, provider stage

**Obligation**:
A dated or date-pending instance of a milestone or recurring duty derived from a Journey Step and confirmed Journey Facts.
_Avoid_: Reminder, hard-coded deadline

**Step Dependency**:
A prerequisite relationship between two Journey Steps. The later step stays locked until every prerequisite is complete, including when a step inside an added Optional Branch depends on another step in that branch.
_Avoid_: Page order, visual connector

**Journey Map**:
The on-demand visualisation of the whole Journey dependency graph. It is progressive disclosure; the primary Journey screen continues to show only the Next Action.
_Avoid_: Dashboard, workflow editor

**Next Action**:
The single Journey Step that should receive the account holder’s attention now, prioritising work already in progress or waiting on a provider.
_Avoid_: Next page, first incomplete item

**Journey Summary**:
A compact view of a Journey’s subject, overall progress, latest activity, and Next Action used outside the full Journey view.
_Avoid_: Dashboard card, preview
