import { createHash } from "node:crypto";
import {
  serviceWorkflowDefinitions,
  type SandboxServiceKey,
  type SandboxServiceRun,
  type ServiceArtifact,
} from "@/domain/service-workflows";

export { isSandboxServiceKey } from "@/domain/service-workflows";

export type SandboxServiceResult = {
  adapterKey: string;
  actionType: string;
  receipt: string;
  summary: string;
};

const services: Record<SandboxServiceKey, Omit<SandboxServiceResult, "receipt">> = {
  birth_certificate: {
    adapterKey: "sandbox-civil-registry",
    actionType: "issue_birth_certificate",
    summary: "A watermarked birth certificate is ready to download.",
  },
  child_health_record: {
    adapterKey: "sandbox-abdm",
    actionType: "create_child_health_record",
    summary: "A synthetic child health record was created with a private health ID.",
  },
  vaccination_timeline: {
    adapterKey: "sandbox-uwin",
    actionType: "build_vaccination_timeline",
    summary: "An age-based vaccination timeline was generated with upcoming reminders.",
  },
  child_identity: {
    adapterKey: "sandbox-identity-guidance",
    actionType: "prepare_identity_checklist",
    summary: "An identity-document checklist was prepared; no identity application was filed.",
  },
  eligible_benefits: {
    adapterKey: "sandbox-benefit-exchange",
    actionType: "match_family_benefits",
    summary: "Potential family benefits were matched for review; eligibility is not guaranteed.",
  },
  ownership_transfer: {
    adapterKey: "sandbox-vahan",
    actionType: "transfer_vehicle_ownership",
    summary: "A synthetic VAHAN ownership-transfer acknowledgement was created.",
  },
  insurance_cover: {
    adapterKey: "sandbox-insurance-exchange",
    actionType: "verify_motor_policy",
    summary: "The uploaded policy was matched and an ownership endorsement action was prepared.",
  },
  fastag_setup: {
    adapterKey: "sandbox-ihmcl",
    actionType: "activate_fastag",
    summary: "A synthetic FASTag was activated after VAHAN and mobile verification.",
  },
  compliance_calendar: {
    adapterKey: "sandbox-parivahan-compliance",
    actionType: "build_vehicle_compliance_calendar",
    summary: "A dated vehicle compliance calendar was generated from the available records.",
  },
  coverage_review: {
    adapterKey: "sandbox-health-insurer",
    actionType: "review_health_cover",
    summary: "A synthetic policy summary was prepared with limits and terms still requiring insurer confirmation.",
  },
  public_scheme_check: {
    adapterKey: "sandbox-nha-eligibility",
    actionType: "screen_public_health_scheme",
    summary: "A possible public-scheme pathway was identified for official verification; no eligibility decision was made.",
  },
  abha_records: {
    adapterKey: "sandbox-abdm-personal-records",
    actionType: "prepare_abha_records",
    summary: "An ABHA and consent-aware health-record checklist was prepared without creating a real identity.",
  },
  cashless_readiness: {
    adapterKey: "sandbox-health-claims-exchange",
    actionType: "prepare_cashless_care_pack",
    summary: "A synthetic cashless-care pack was prepared; no hospital or insurer authorization was requested.",
  },
  residence_evidence: { adapterKey: "sandbox-address-evidence", actionType: "verify_residence_evidence", summary: "A synthetic residence-evidence summary was prepared for authority-specific use." },
  aadhaar_address: { adapterKey: "sandbox-uidai-address", actionType: "prepare_aadhaar_address_update", summary: "A synthetic Aadhaar address-update checklist was prepared; no request was submitted." },
  voter_address: { adapterKey: "sandbox-eci-form8", actionType: "prepare_voter_address_update", summary: "A synthetic Form 8 checklist was prepared; the electoral roll was not changed." },
  move_completion_pack: { adapterKey: "sandbox-move-coordination", actionType: "build_move_completion_pack", summary: "A synthetic multi-provider move checklist was prepared." },
  business_premises: { adapterKey: "sandbox-business-premises", actionType: "verify_business_premises", summary: "A synthetic principal-place evidence summary was prepared." },
  udyam_readiness: { adapterKey: "sandbox-udyam", actionType: "prepare_udyam_registration", summary: "A synthetic Udyam readiness checklist was prepared; no registration was filed." },
  gst_readiness: { adapterKey: "sandbox-gst-readiness", actionType: "screen_gst_registration", summary: "A synthetic GST readiness result was prepared without deciding tax liability." },
  business_launch_pack: { adapterKey: "sandbox-business-launch", actionType: "build_business_launch_pack", summary: "A synthetic first-90-days business launch pack was prepared." },
  retirement_record_review: { adapterKey: "sandbox-retirement-records", actionType: "review_retirement_records", summary: "A synthetic retirement-record reconciliation was prepared." },
  pension_pathway: { adapterKey: "sandbox-pension-pathway", actionType: "prepare_pension_pathways", summary: "Potential pension pathways were prepared for official verification." },
  life_certificate_readiness: { adapterKey: "sandbox-jeevan-pramaan", actionType: "prepare_life_certificate_plan", summary: "A synthetic future life-certificate checklist was prepared." },
  retirement_pack: { adapterKey: "sandbox-retirement-pack", actionType: "build_retirement_pack", summary: "A synthetic retirement transition pack was prepared without financial advice." },
};

export function simulateExternalService(
  journeyId: string,
  nodeKey: SandboxServiceKey,
): SandboxServiceResult {
  const suffix = createHash("sha256").update(`${journeyId}:${nodeKey}`).digest("hex").slice(0, 10).toUpperCase();
  return { ...services[nodeKey], receipt: `SBX-${suffix}` };
}

function numericReference(journeyId: string, nodeKey: SandboxServiceKey) {
  const hex = createHash("sha256").update(`${journeyId}:${nodeKey}:number`).digest("hex").slice(0, 14);
  return (BigInt(`0x${hex}`) % 100_000_000_000_000n).toString().padStart(14, "0");
}

function formatShortDate(value: string | undefined) {
  if (!value) return "Date not recorded";
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.valueOf())) return value;
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(date);
}

function addDays(value: string | undefined, days: number) {
  if (!value) return "Date not recorded";
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.valueOf())) return "Date not recorded";
  date.setUTCDate(date.getUTCDate() + days);
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(date);
}

function recorded(value: string | undefined) {
  return value?.trim() || "Not recorded";
}

function createArtifact(journeyId: string, nodeKey: SandboxServiceKey, receipt: string, facts: Record<string, string> = {}): ServiceArtifact {
  const reference = numericReference(journeyId, nodeKey);
  switch (nodeKey) {
    case "birth_certificate":
      return {
        title: "Sandbox birth certificate",
        subtitle: "Issued and digitally signed in the civil registry simulation",
        referenceLabel: "Certificate reference",
        referenceValue: `CRS-${reference.slice(0, 4)}-${reference.slice(4, 10)}`,
        facts: [
          { label: "Registration match", value: "Verified", status: "verified" },
          { label: "Authority", value: facts["birth.place.ward"] ? `${facts["birth.place.ward"]} sandbox` : `${recorded(facts["birth.city"])} civil-registry sandbox`, status: "information" },
          { label: "Document integrity", value: "Sandbox signature valid", status: "verified" },
        ],
        groups: [{ title: "Available document", items: [{ title: "Birth certificate PDF", meta: "Watermarked · Not official", detail: `Receipt ${receipt}`, status: "ready" }] }],
        notice: "This certificate is generated only for evaluation and cannot be used as proof of identity.",
      };
    case "child_health_record":
      return {
        title: "Child health profile",
        subtitle: "A consent-aware sandbox record prepared for future care documents",
        referenceLabel: "Sandbox ABHA number",
        referenceValue: `${reference.slice(0, 2)}-${reference.slice(2, 6)}-${reference.slice(6, 10)}-${reference.slice(10)}`,
        facts: [
          { label: "Guardian relationship", value: "Recorded for simulation", status: "verified" },
          { label: "Birth summary", value: "Linked from hospital record", status: "verified" },
          { label: "Consent", value: "Evaluation-only consent", status: "information" },
        ],
        groups: [{
          title: "Record sections",
          description: "No clinical finding or immunisation is inferred from the birth registration.",
          items: [
            { title: "Newborn profile", meta: "Name, birth date, guardian", status: "ready" },
            { title: "Birth summary", meta: `${recorded(facts["birth.hospital"])} · synthetic`, status: "ready" },
            { title: "Immunisation records", meta: "Waiting for a provider record", status: "review" },
          ],
        }],
        notice: "ABDM facilitates consent-based record exchange; this simulation does not create an ABHA or store a real medical record.",
      };
    case "vaccination_timeline":
      const recordedVaccine = facts["vaccination.last.vaccine"];
      const administeredOn = facts["vaccination.last.administeredOn"];
      return {
        title: "Vaccination timeline",
        subtitle: `Calculated from the recorded birth date of ${formatShortDate(facts["child.dateOfBirth"])}`,
        referenceLabel: "Schedule reference",
        referenceValue: `UWIN-SBX-${reference.slice(-8)}`,
        facts: [
          { label: "Schedule anchor", value: formatShortDate(facts["child.dateOfBirth"]), status: facts["child.dateOfBirth"] ? "verified" : "review" },
          recordedVaccine
            ? { label: "Recorded dose", value: `${recordedVaccine} · ${formatShortDate(administeredOn)}`, status: "verified" }
            : { label: "Birth doses", value: "Administration not confirmed", status: "review" },
          { label: "Reminder channel", value: "Not configured", status: "information" },
        ],
        groups: [{
          title: "Upcoming milestones",
          description: "Confirm the exact vaccine and dose with a qualified health provider.",
          items: [
            recordedVaccine
              ? { title: `${recordedVaccine} recorded`, meta: `${formatShortDate(administeredOn)} · ${facts["vaccination.last.provider"] || "Provider receipt"}`, detail: "Verified from the attached synthetic provider receipt.", status: "verified" }
              : { title: "Birth-dose review", meta: "BCG · OPV-0 · Hepatitis B birth dose", detail: "Ask the birth facility to confirm what was administered.", status: "due" },
            { title: "6-week visit", meta: `Due ${addDays(facts["child.dateOfBirth"], 42)}`, detail: "First primary-series milestone", status: "upcoming" },
            { title: "10-week visit", meta: `Due ${addDays(facts["child.dateOfBirth"], 70)}`, detail: "Second primary-series milestone", status: "upcoming" },
            { title: "14-week visit", meta: `Due ${addDays(facts["child.dateOfBirth"], 98)}`, detail: "Third primary-series milestone", status: "upcoming" },
          ],
        }],
        notice: "This is planning guidance, not a clinical record. Only a vaccination provider can confirm doses and medical suitability.",
      };
    case "child_identity":
      return {
        title: "Newborn identity checklist",
        subtitle: "Prepared for an under-five Aadhaar enrolment centre visit",
        referenceLabel: "Checklist reference",
        referenceValue: `UIDAI-GUIDE-${reference.slice(-7)}`,
        facts: [
          { label: "Child age band", value: "Below 5 years", status: "verified" },
          { label: "Birth certificate", value: "Sandbox copy available", status: "ready" },
          { label: "Submission", value: "No application filed", status: "information" },
        ],
        groups: [{
          title: "Centre-visit checklist",
          items: [
            { title: "Child’s official birth certificate", meta: "Bring the government-issued original", status: "review" },
            { title: "Parent or guardian Aadhaar", meta: "Required for authentication and relationship", status: "review" },
            { title: "Child photograph", meta: "Captured at the enrolment centre", status: "information" },
            { title: "Biometric update reminder", meta: "Fingerprint and iris update after age 5", status: "upcoming" },
          ],
        }],
        notice: "For children below five, UIDAI requires a centre visit and guardian authentication. This checklist does not reserve an appointment.",
      };
    case "eligible_benefits":
      return {
        title: "Family benefit matches",
        subtitle: "Explainable suggestions based on Telangana and the facts currently available",
        referenceLabel: "Screening reference",
        referenceValue: `BEN-SBX-${reference.slice(-8)}`,
        facts: [
          { label: "State", value: recorded(facts["birth.state"]), status: facts["birth.state"] ? "verified" : "review" },
          { label: "Hospital type", value: "Needs confirmation", status: "review" },
          { label: "Eligibility decision", value: "Not made", status: "information" },
        ],
        groups: [{
          title: "Potential programmes",
          description: "Matches are ordered by relevance, not guaranteed eligibility.",
          items: [
            { title: "Arogya Lakshmi", meta: "Potential nutrition-support match", detail: "Confirm lactating-mother enrolment with the local Anganwadi centre.", status: "ready" },
            { title: "KCR Kit / Amma Odi", meta: "Hospital-type evidence needed", detail: "The programme is associated with qualifying government-facility deliveries; confirm the recorded facility type.", status: "review" },
            { title: "PMMVY", meta: "Not currently shown for Telangana", detail: "The central programme’s official FAQ says Telangana implements its own maternity benefit scheme.", status: "information" },
          ],
        }],
        notice: "A department or authorised field worker must confirm eligibility and required documents before any application.",
      };
    case "ownership_transfer":
      const acquisitionRoute = facts["vehicle.acquisitionRoute"] ?? "sale";
      const interstate = facts["vehicle.transferScope"] === "interstate";
      return {
        title: "Ownership transfer acknowledgement",
        subtitle: acquisitionRoute === "inheritance" ? "Synthetic succession transfer prepared for authority review" : acquisitionRoute === "auction" ? "Synthetic auction transfer prepared for authority review" : "Synthetic sale transfer accepted by the VAHAN sandbox",
        referenceLabel: "Application reference",
        referenceValue: `VAHAN-SBX-${reference.slice(-8)}`,
        facts: [
          { label: "RC match", value: "Verified from evidence", status: "verified" },
          { label: "Transfer route", value: `${acquisitionRoute === "inheritance" ? "Owner death / succession" : acquisitionRoute === "auction" ? "Public auction" : "Normal sale"}${interstate ? " · interstate" : " · same state"}`, status: "information" },
          { label: "Application status", value: "Sandbox acknowledged", status: "ready" },
        ],
        groups: [{
          title: "Prepared application",
          description: "The real service may require originals, state-specific documents, fees, or an RTO visit.",
          items: [
            acquisitionRoute === "inheritance" ? { title: "Form 31 pathway", meta: "Succession documents and legal-heir declarations required", status: "review" } : acquisitionRoute === "auction" ? { title: "Form 32 pathway", meta: "Auction order and authorised sale certificate required", status: "review" } : { title: "Form 29 notice", meta: "Seller transfer notice · synthetic", status: "ready" },
            acquisitionRoute === "sale" ? { title: "Form 30 application", meta: "Buyer ownership application · synthetic", status: "ready" } : { title: "Authority evidence", meta: "The responsible RTO must verify the special transfer basis", status: "review" },
            ...(interstate ? [{ title: "Interstate NOC and tax review", meta: "Check both registering authorities before submission", status: "due" as const }] : []),
            ...(facts["vehicle.hypothecation"] === "yes" ? [{ title: "Financier / hypothecation action", meta: "Resolve the recorded financier interest before transfer", status: "due" as const }] : []),
            { title: "RTO document review", meta: "Not performed in this sandbox", detail: `Receipt ${receipt}`, status: "review" },
          ],
        }],
        notice: "This acknowledgement is for evaluation only and does not change the registered owner in VAHAN.",
      };
    case "insurance_cover":
      return {
        title: "Motor insurance review",
        subtitle: "Policy evidence matched to the purchased vehicle",
        referenceLabel: "Verification reference",
        referenceValue: `POL-SBX-${reference.slice(-8)}`,
        facts: [
          { label: "Vehicle match", value: "Verified", status: "verified" },
          { label: "Cover valid until", value: formatShortDate(facts["insurance.validUntil"]), status: facts["insurance.validUntil"] ? "ready" : "review" },
          { label: "Owner endorsement", value: "Contact insurer within 14 days", status: "due" },
        ],
        groups: [{ title: "Next insurance actions", items: [
          { title: "Request ownership endorsement", meta: "Share the completed RC transfer acknowledgement", status: "due" },
          { title: "Preserve continuous cover", meta: "Do not drive until the insurer confirms the endorsement", status: "review" },
          { title: "Renewal reminder", meta: facts["insurance.validUntil"] ? `Set before ${formatShortDate(facts["insurance.validUntil"])}` : "Add the policy end date before setting a reminder", status: "upcoming" },
        ] }],
        notice: "Only the issuing insurer can confirm cover or endorse the new owner; this result is a simulation.",
      };
    case "fastag_setup":
      return {
        title: "FASTag activation",
        subtitle: "A synthetic tag linked after VAHAN pre-activation validation",
        referenceLabel: "Tag reference",
        referenceValue: `NETC-SBX-${reference.slice(-8)}`,
        facts: [
          { label: "VAHAN validation", value: "Matched", status: "verified" },
          { label: "Vehicle class", value: "Car / Jeep / Van", status: "verified" },
          { label: "Activation", value: "Sandbox active", status: "ready" },
        ],
        groups: [{ title: "Before your first trip", items: [
          { title: "Affix tag to windscreen", meta: "Follow the selected issuer’s delivery instructions", status: "due" },
          { title: "Add opening balance", meta: "No money was moved by this simulation", status: "review" },
          { title: "Save helpline 1033", meta: "National Highway assistance", status: "information" },
        ] }],
        notice: "No bank account, wallet, or real FASTag was created or charged.",
      };
    case "compliance_calendar":
      return {
        title: "Vehicle compliance calendar",
        subtitle: "Registration, insurance and PUC actions in one plan",
        referenceLabel: "Calendar reference",
        referenceValue: `CAL-SBX-${reference.slice(-8)}`,
        facts: [
          { label: "Ownership transfer", value: "Sandbox application prepared", status: "ready" },
          { label: "Insurance", value: "Endorsement action due", status: "due" },
          { label: "PUC status", value: "Evidence not provided", status: "review" },
        ],
        groups: [{ title: "Upcoming actions", items: [
          { title: "Confirm RC transfer", meta: "Check the real VAHAN status after filing", status: "due" },
          { title: "Complete insurer endorsement", meta: "Within the insurer’s stated transfer period", status: "due" },
          { title: "Verify PUC validity", meta: "Use the official Parivahan PUC service or a testing centre", status: "review" },
          { title: "Insurance renewal", meta: "Due 31 July 2027", status: "upcoming" },
        ] }],
        notice: "Dates are planning aids derived from synthetic records; verify every obligation with the issuing authority.",
      };
    case "coverage_review":
      return {
        title: "Health coverage summary",
        subtitle: "Plain-language review of the supplied synthetic policy",
        referenceLabel: "Policy review reference",
        referenceValue: `HLT-POL-${reference.slice(-8)}`,
        facts: [
          { label: "Insured person", value: recorded(facts["person.name"]), status: facts["person.name"] ? "verified" : "review" },
          { label: "Sum insured", value: "₹5,00,000 · sample policy", status: "information" },
          { label: "Valid until", value: "31 March 2027", status: "ready" },
        ],
        groups: [{ title: "Terms to know before care", description: "These values come from synthetic evidence and demonstrate the questions a real policy review should answer.", items: [
          { title: "Room entitlement", meta: "Single private room · sample term", status: "information" },
          { title: "Waiting period", meta: "Two-year condition-specific clause · review with insurer", status: "review" },
          { title: "Co-payment", meta: "None shown on the sample schedule", status: "information" },
          { title: "Cashless network", meta: "Hospital must be checked with the insurer before admission", status: "due" },
        ] }],
        notice: "This summary does not alter, renew, or guarantee coverage. The policy wording and insurer’s current network determine actual benefits.",
      };
    case "public_scheme_check":
      return {
        title: "Public-scheme eligibility indication",
        subtitle: "A possible PM-JAY verification path—not an eligibility decision",
        referenceLabel: "Screening reference",
        referenceValue: `NHA-SBX-${reference.slice(-8)}`,
        facts: [
          { label: "State", value: facts["person.state"] ?? "Telangana", status: "verified" },
          { label: "Household size", value: facts["household.size"] ?? "3", status: "verified" },
          { label: "Result", value: "Official beneficiary check required", status: "review" },
        ],
        groups: [{ title: "How to verify", items: [
          { title: "Use the official beneficiary service", meta: "Search using the accepted identity and household details", status: "due" },
          { title: "Visit a CSC or empanelled hospital", meta: "Ask for an official beneficiary verification if online matching is unclear", status: "information" },
          { title: "Keep alternate valid ID available", meta: "The authorized service confirms accepted evidence", status: "information" },
        ] }],
        notice: "Only the authorized scheme service can confirm beneficiary status, issue a card, or approve treatment. This sandbox did none of those things.",
      };
    case "abha_records":
      return {
        title: "ABHA & health-record checklist",
        subtitle: "A consent-aware plan for digital health identity and records",
        referenceLabel: "Checklist reference",
        referenceValue: `ABDM-GUIDE-${reference.slice(-7)}`,
        facts: [
          { label: "ABHA status", value: facts["health.abhaStatus"] === "yes" ? "User says an ABHA exists" : "Official check or creation needed", status: "review" },
          { label: "Sandbox identifier", value: `${reference.slice(0, 2)}-${reference.slice(2, 6)}-${reference.slice(6, 10)}-${reference.slice(10)}`, status: "information" },
          { label: "Real record sharing", value: "Not performed", status: "verified" },
        ],
        groups: [{ title: "Your record controls", items: [
          { title: "Create or retrieve ABHA", meta: "Use an official ABDM-enabled citizen service", status: "due" },
          { title: "Discover and link records", meta: "Review each provider record before linking", status: "information" },
          { title: "Share with time-bound consent", meta: "Choose purpose, recipient, record types, and expiry", status: "information" },
          { title: "Revoke access when needed", meta: "Manage consent from the chosen PHR application", status: "information" },
        ] }],
        notice: "The displayed number is synthetic. No ABHA was created, retrieved, or linked, and no medical record left this evaluation environment.",
      };
    case "cashless_readiness":
      return {
        title: "Cashless care readiness pack",
        subtitle: "Documents, contacts, and decisions to prepare before admission",
        referenceLabel: "Coverage pack reference",
        referenceValue: `CARE-SBX-${reference.slice(-8)}`,
        facts: [
          { label: "Preferred care city", value: recorded(facts["health.careCity"]), status: facts["health.careCity"] ? "verified" : "review" },
          { label: "Network hospital", value: "Must be confirmed before admission", status: "due" },
          { label: "Cashless authorization", value: "Not requested", status: "information" },
        ],
        groups: [{ title: "Keep these ready", items: [
          { title: "Policy or scheme card", meta: "Use the current, official document—not this summary", status: "ready" },
          { title: "Government photo ID", meta: "Carry the accepted original or digital credential", status: "ready" },
          { title: "Doctor and hospital documents", meta: "Admission advice, diagnosis, estimates, and clinical records come from the provider", status: "due" },
          { title: "Pre-authorisation request", meta: "The network hospital sends this to the insurer or TPA", status: "due" },
          { title: "Insurer or scheme escalation", meta: "Use the official helpline if authorization is delayed or denied", status: "information" },
        ] }],
        notice: "Cashless readiness is not cashless approval. A network provider and the insurer or scheme must complete pre-authorisation for the actual admission.",
      };
    case "residence_evidence":
      return {
        title: "Residence evidence summary",
        subtitle: "The new-address document was matched for authority-specific review",
        referenceLabel: "Evidence review reference",
        referenceValue: `ADDR-EVD-${reference.slice(-8)}`,
        facts: [
          { label: "New address", value: recorded(facts["move.newAddress"]), status: facts["move.newAddress"] ? "verified" : "review" },
          { label: "Document", value: "Synthetic rent agreement", status: "verified" },
          { label: "Universal acceptance", value: "Not assumed", status: "information" },
        ],
        groups: [{ title: "Authority fit", items: [
          { title: "UIDAI address route", meta: "Compare with the current supporting-document list", status: "review" },
          { title: "Election Commission Form 8", meta: "Registered rent deed is listed as one evidence option", status: "ready" },
          { title: "Vehicle registration record", meta: "Form 33 has its own evidence and timing requirements", status: "information" },
        ] }],
        notice: "A document accepted by one authority may be rejected by another. This result is an evaluation summary, not official verification.",
      };
    case "aadhaar_address":
      return {
        title: "Aadhaar address-update checklist",
        subtitle: "Request details prepared for review on the official UIDAI service",
        referenceLabel: "Draft reference",
        referenceValue: `UIDAI-DRAFT-${reference.slice(-7)}`,
        facts: [
          { label: "Address", value: recorded(facts["move.newAddress"]), status: facts["move.newAddress"] ? "verified" : "review" },
          { label: "Authentication", value: "OTP, face, or centre step still required", status: "due" },
          { label: "Submission", value: "Not submitted", status: "information" },
        ],
        groups: [{ title: "Official steps left", items: [
          { title: "Review the proof-of-address image", meta: "Clear colour scan and matching address", status: "review" },
          { title: "Confirm English and local-language address", meta: "Check transliteration before submission", status: "due" },
          { title: "Save the official SRN", meta: "Generated only after a real request is submitted", status: "upcoming" },
        ] }],
        notice: "No Aadhaar number was authenticated and no UIDAI update request was made. Only UIDAI can issue an SRN or approve the change.",
      };
    case "voter_address":
      return {
        title: "Voter Form 8 preparation",
        subtitle: "Shifting-of-residence fields and evidence organised for official submission",
        referenceLabel: "Preparation reference",
        referenceValue: `ECI-F8-${reference.slice(-8)}`,
        facts: [
          { label: "Present residence", value: recorded(facts["move.newAddress"]), status: facts["move.newAddress"] ? "verified" : "review" },
          { label: "EPIC", value: facts["move.hasEpic"] === "yes" ? "User says available" : "Confirm before submission", status: "review" },
          { label: "Electoral-roll change", value: "Not performed", status: "information" },
        ],
        groups: [{ title: "Form 8 checklist", items: [
          { title: "Submit to the ERO for the new residence", meta: "Online, app, or offline channel", status: "due" },
          { title: "Attach self-attested address evidence", meta: "Use an accepted document or name another supporting document", status: "ready" },
          { title: "Track the official application", meta: "Use the Voter Service Portal after submission", status: "upcoming" },
        ] }],
        notice: "This preparation does not delete, shift, correct, or replace an electoral-roll entry or EPIC.",
      };
    case "move_completion_pack":
      return {
        title: "Move completion pack",
        subtitle: "A provider-by-provider address checklist for the new home",
        referenceLabel: "Move pack reference",
        referenceValue: `MOVE-SBX-${reference.slice(-8)}`,
        facts: [
          { label: "Move date", value: formatShortDate(facts["move.date"]), status: "verified" },
          { label: "Identity requests", value: "Prepared, not submitted", status: "review" },
          { label: "Global address status", value: "No such single update", status: "information" },
        ],
        groups: [{ title: "Remaining address actions", items: [
          { title: "India Post redirection", meta: "Written intimation may remain valid for up to 3 months", status: "due" },
          { title: "Vehicle RC address", meta: "Form 33 may be due within 14 days for a registered owner", status: "review" },
          { title: "Bank, insurer, employer, and utilities", meta: "Update each provider and keep acknowledgements", status: "due" },
          { title: "Review saved records", meta: "Confirm that official services show the new address", status: "upcoming" },
        ] }],
        notice: "This pack tracks separate requests. It does not prove that any authority or provider has changed its record.",
      };
    case "business_premises":
      return {
        title: "Business premises evidence summary",
        subtitle: "Principal-place documents matched to the confirmed business address",
        referenceLabel: "Premises review reference",
        referenceValue: `BIZ-ADDR-${reference.slice(-8)}`,
        facts: [
          { label: "Business", value: recorded(facts["business.name"]), status: facts["business.name"] ? "verified" : "review" },
          { label: "Principal place", value: recorded(facts["business.address"]), status: facts["business.address"] ? "verified" : "review" },
          { label: "Possession", value: facts["business.occupancy"] ?? "Rented", status: "review" },
        ],
        groups: [{ title: "Evidence combinations", items: [
          { title: "Rent or lease agreement", meta: "Synthetic sample attached", status: "verified" },
          { title: "Owner evidence or utility record", meta: "May be required with rented or consent premises", status: "review" },
          { title: "Local registration evidence", meta: "Check Telangana and municipal requirements separately", status: "information" },
        ] }],
        notice: "This result does not establish title, tenancy, possession, or acceptance by GST or any local authority.",
      };
    case "udyam_readiness":
      return {
        title: "Udyam registration readiness",
        subtitle: "Free official self-declaration fields organised for review",
        referenceLabel: "Readiness reference",
        referenceValue: `UDYAM-GUIDE-${reference.slice(-7)}`,
        facts: [
          { label: "Enterprise", value: recorded(facts["business.name"]), status: facts["business.name"] ? "verified" : "review" },
          { label: "Structure", value: recorded(facts["business.structure"]?.replaceAll("_", " ")), status: facts["business.structure"] ? "verified" : "review" },
          { label: "Official registration", value: "Not filed", status: "information" },
        ],
        groups: [{ title: "Official flow", items: [
          { title: "Use only the official free portal", meta: "Udyam registration charges no filing fee", status: "information" },
          { title: "Authenticate the correct Aadhaar holder", meta: "The required person depends on the organisation type", status: "due" },
          { title: "Review PAN and applicable GST-linked details", meta: "Official databases perform these checks", status: "review" },
          { title: "Save the official certificate and QR", meta: "Available only after successful registration", status: "upcoming" },
        ] }],
        notice: "No Aadhaar OTP, PAN validation, government database lookup, registration number, or certificate was generated.",
      };
    case "gst_readiness":
      return {
        title: "GST registration readiness result",
        subtitle: "Known facts screened without making a tax-liability decision",
        referenceLabel: "GST screening reference",
        referenceValue: `GST-GUIDE-${reference.slice(-8)}`,
        facts: [
          { label: "Expected annual turnover", value: facts["business.expectedTurnover"] ? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(facts["business.expectedTurnover"])) : "Not recorded", status: facts["business.expectedTurnover"] ? "verified" : "review" },
          { label: "Interstate supplies", value: facts["business.interstateSupplies"] === "yes" ? "Planned" : "Not currently planned", status: "review" },
          { label: "Registration decision", value: "Professional or official check required", status: "review" },
        ],
        groups: [{ title: "What to verify", items: [
          { title: "Aggregate PAN-based turnover", meta: "Thresholds and exceptions can change", status: "due" },
          { title: "Compulsory-registration cases", meta: "Supply type and channel can matter even below a threshold", status: "due" },
          { title: "Principal-place evidence", meta: "Premises pack prepared", status: "ready" },
          { title: "Tax professional or GST helpdesk", meta: "Confirm the current path before applying", status: "information" },
        ] }],
        notice: "This is not tax advice and does not decide whether registration, tax, composition, invoicing, or filing is required.",
      };
    case "business_launch_pack":
      return {
        title: "Business launch pack",
        subtitle: "A first-90-days checklist built from the confirmed setup",
        referenceLabel: "Launch pack reference",
        referenceValue: `BIZ-LAUNCH-${reference.slice(-7)}`,
        facts: [
          { label: "Business", value: recorded(facts["business.name"]), status: facts["business.name"] ? "verified" : "review" },
          { label: "Start date", value: formatShortDate(facts["business.startDate"]), status: "verified" },
          { label: "Compliance status", value: "Not declared", status: "information" },
        ],
        groups: [{ title: "Before the first invoice", items: [
          { title: "Confirm registrations and invoice fields", meta: "Use official outcomes, not readiness drafts", status: "due" },
          { title: "Open the appropriate business banking route", meta: "Bank decides account evidence and approval", status: "review" },
          { title: "Check Telangana and municipal requirements", meta: "Shop, establishment, trade, or professional rules may apply", status: "due" },
          { title: "Create a recurring compliance calendar", meta: "Tax, payroll, licence, and record dates", status: "upcoming" },
        ] }],
        notice: "This planning pack is not incorporation, registration, a licence, tax advice, or a finding that the business may legally operate.",
      };
    case "retirement_record_review":
      return {
        title: "Retirement record review",
        subtitle: "Member and service records reconciled from synthetic evidence",
        referenceLabel: "Record review reference",
        referenceValue: `RET-REC-${reference.slice(-8)}`,
        facts: [
          { label: "Member", value: recorded(facts["person.name"]), status: facts["person.name"] ? "verified" : "review" },
          { label: "Primary record", value: facts["retirement.accountType"] === "nps" ? "NPS" : "EPFO / EPS", status: "verified" },
          { label: "Official balance", value: "Not queried", status: "information" },
        ],
        groups: [{ title: "Record gaps to check", items: [
          { title: "Name, birth date, and bank details", meta: "Must match the responsible authority’s record", status: "review" },
          { title: "Employment and eligible service", meta: facts["retirement.serviceYears"] ? `${facts["retirement.serviceYears"]} years stated in this evaluation` : "Years of service not recorded", status: "review" },
          { title: "Nominee and family details", meta: "Verify before a claim is needed", status: "due" },
          { title: "Tax and contact details", meta: "Confirm with the appropriate provider", status: "information" },
        ] }],
        notice: "No EPFO, NPS, employer, bank, or pension-authority record was accessed or changed.",
      };
    case "pension_pathway":
      return {
        title: "Pension pathway indications",
        subtitle: "Possible claim routes separated for official verification",
        referenceLabel: "Pathway reference",
        referenceValue: `PENSION-GUIDE-${reference.slice(-7)}`,
        facts: [
          { label: "Retirement date", value: formatShortDate(facts["retirement.date"]), status: "verified" },
          { label: "Employment route", value: facts["retirement.employmentSector"] ?? "Private employment", status: "verified" },
          { label: "Entitlement", value: "Not decided", status: "information" },
        ],
        groups: [{ title: "Potential routes", items: [
          { title: "EPF final settlement", meta: "Check the current composite-claim route and service record", status: "review" },
          { title: "EPS monthly pension or withdrawal benefit", meta: "Age and eligible service affect the official route", status: "due" },
          { title: "NPS exit options", meta: "Use current PFRDA rules for the subscriber category and corpus", status: "review" },
          { title: "Employer retirement dues", meta: "Gratuity, leave, tax, and certificates remain separate", status: "information" },
        ] }],
        notice: "These are Benefit Indications, not pension entitlement, financial advice, a claim, or a sanction order.",
      };
    case "life_certificate_readiness":
      return {
        title: "Life-certificate readiness plan",
        subtitle: "A future Jeevan Pramaan checklist for when a pension authority requires it",
        referenceLabel: "Readiness reference",
        referenceValue: `JP-GUIDE-${reference.slice(-8)}`,
        facts: [
          { label: "Pension started", value: facts["retirement.pensionStarted"] === "yes" ? "User says yes" : "Not yet or not confirmed", status: "review" },
          { label: "Biometric authentication", value: "Not performed", status: "information" },
          { label: "Validity", value: "Set by the pension authority", status: "information" },
        ],
        groups: [{ title: "When it applies", items: [
          { title: "Confirm the authority is onboarded", meta: "Jeevan Pramaan availability depends on the pension authority", status: "due" },
          { title: "Keep Aadhaar, mobile, PPO, and bank details ready", meta: "Use the accepted official records", status: "review" },
          { title: "Choose face, biometric, CSC, bank, or post-office route", meta: "Available channels depend on device and authority", status: "information" },
          { title: "Renew when the authority requires", meta: "A Pramaan ID is not valid for life", status: "upcoming" },
        ] }],
        notice: "No Digital Life Certificate or Pramaan ID was generated. Authentication and validity come only from the official service and pension authority.",
      };
    case "retirement_pack":
      return {
        title: "Retirement transition pack",
        subtitle: "Records, potential claim paths, contacts, and future dates in one place",
        referenceLabel: "Retirement pack reference",
        referenceValue: `RET-PACK-${reference.slice(-8)}`,
        facts: [
          { label: "Person", value: recorded(facts["person.name"]), status: facts["person.name"] ? "verified" : "review" },
          { label: "Retirement date", value: formatShortDate(facts["retirement.date"]), status: "verified" },
          { label: "Pension sanction", value: "Not issued", status: "information" },
        ],
        groups: [{ title: "Keep this pack current", items: [
          { title: "Official claim acknowledgements", meta: "Replace sandbox references after real submission", status: "due" },
          { title: "Bank, nominee, and contact details", meta: "Review after every material change", status: "review" },
          { title: "Pension and life-certificate dates", meta: "Use authority-issued dates", status: "upcoming" },
          { title: "Independent tax and financial advice", meta: "Use a qualified professional for personal decisions", status: "information" },
        ] }],
        notice: "The Retirement Pack is synthetic planning material, not financial advice, pension approval, a payment order, or an official record.",
      };
  }
}

export function advanceSimulatedService(
  journeyId: string,
  nodeKey: SandboxServiceKey,
  current: SandboxServiceRun | undefined,
  facts: Record<string, string> = {},
  now = new Date(),
): SandboxServiceRun {
  if (current?.status === "completed") return current;
  const definition = serviceWorkflowDefinitions[nodeKey];
  const scenarioValue = facts[`simulation.scenario.${nodeKey}`];
  const scenario = current?.scenario ?? (scenarioValue === "delayed" || scenarioValue === "clarification" || scenarioValue === "rejected" ? scenarioValue : "success");
  const responseReceived = Boolean(facts[`simulation.response.${nodeKey}`]);
  const appealReceived = Boolean(facts[`simulation.appeal.${nodeKey}`]);
  if (current?.caseStatus === "action_required" && !responseReceived) return current;
  if (current?.caseStatus === "rejected" && !appealReceived) return current;
  const nextStageNumber = Math.min((current?.currentStage ?? 0) + 1, definition.stages.length);
  const stage = definition.stages[nextStageNumber - 1];
  const occurredAt = now.toISOString();
  const receipt = current?.receipt ?? simulateExternalService(journeyId, nodeKey).receipt;
  const needsClarification = scenario === "clarification" && nextStageNumber === 2 && !responseReceived;
  const rejected = scenario === "rejected" && nextStageNumber === 3 && !appealReceived;
  const completed = stage.state === "completed";
  const caseStatus = needsClarification ? "action_required" as const
    : rejected ? "rejected" as const
    : current?.caseStatus === "rejected" && appealReceived ? "appealed" as const
    : completed ? "approved" as const
    : nextStageNumber === 1 ? "submitted" as const
    : nextStageNumber === 2 ? "acknowledged" as const
    : "under_review" as const;
  const run: SandboxServiceRun = {
    runId: current?.runId ?? `RUN-${receipt.slice(4)}`,
    nodeKey,
    provider: definition.agency,
    status: needsClarification || rejected ? "failed" : stage.state,
    progress: stage.progress,
    currentStage: nextStageNumber,
    startedAt: current?.startedAt ?? occurredAt,
    updatedAt: occurredAt,
    completedAt: stage.state === "completed" ? occurredAt : undefined,
    receipt,
    caseStatus,
    scenario,
    nextTransitionAt: needsClarification || rejected || completed ? undefined : new Date(now.getTime() + (scenario === "delayed" ? 4_000 : 700)).toISOString(),
    reasonCode: needsClarification ? "MORE_INFORMATION_REQUIRED" : rejected ? "RECORD_MISMATCH" : undefined,
    actionMessage: needsClarification ? "The provider needs one clarification before it can continue." : rejected ? "The provider found a record mismatch. You can correct the details and appeal this synthetic decision." : undefined,
    events: [...(current?.events ?? []), { stageKey: stage.key, title: stage.title, detail: stage.detail, occurredAt }],
  };
  if (completed) run.artifact = createArtifact(journeyId, nodeKey, receipt, facts);
  return run;
}
