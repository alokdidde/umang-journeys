# UMANG Journeys

UMANG Journeys organises public services around a person’s life event and preserves their progress across the services involved.

## Language

**Life Event**:
A meaningful change in a person’s life, such as having a baby or moving home, around which relevant services are organised.
_Avoid_: Service category, application type

**Journey Template**:
The reusable dependency graph of Journey Branches, Journey Steps, and guidance associated with one kind of Life Event.
_Avoid_: Journey, workflow instance

**Journey**:
One person’s ongoing or completed pursuit of a Life Event, created from a Journey Template.
_Avoid_: Form, application, template

**Journey Subject**:
The one person or thing the Journey is about. A newborn or dependent parent remains distinct from the account holder. A request concerning two people creates one Journey for each person so their identity, evidence, eligibility, and progress cannot be mixed.
_Avoid_: User, account, applicant

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
