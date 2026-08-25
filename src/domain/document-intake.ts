export type DocumentKind = "vehicle_rc" | "vaccination_receipt" | "insurance_policy" | "health_insurance_policy" | "hospital_discharge_summary" | "unknown";

export type DocumentAnalysis = {
  kind: DocumentKind;
  confidence: number;
  fields: Record<string, string>;
};

export type JourneyMatchCandidate = {
  id: string;
  subject: { type: "child" | "vehicle" | "person"; displayName: string };
  facts: Record<string, string>;
};

export type DocumentProposal = {
  action: "create_vehicle_journey" | "update_vehicle_journey" | "record_vaccination" | "record_vehicle_insurance" | "create_health_journey" | "record_health_insurance" | "create_child_journey" | "update_child_journey" | "needs_review";
  canApply: boolean;
  targetJourneyId: string | null;
  title: string;
  description: string;
  toolName: "createVehicleJourneyFromRC" | "updateVehicleFromRC" | "recordVaccination" | "recordVehicleInsurance" | "createHealthJourneyFromPolicy" | "recordHealthInsurance" | "createChildJourneyFromDischargeSummary" | "updateChildFromDischargeSummary" | null;
  changes: Array<{ label: string; value: string }>;
};

const vehicleChanges = (fields: Record<string, string>) => [
  { label: "Registration number", value: fields.registrationNumber },
  { label: "Vehicle", value: fields.makeModel },
  { label: "Chassis ending", value: fields.chassisLast5 },
].filter((item): item is { label: string; value: string } => Boolean(item.value));

export function proposeDocumentAction(analysis: DocumentAnalysis, journeys: JourneyMatchCandidate[]): DocumentProposal {
  if (analysis.kind === "vehicle_rc") {
    const registration = analysis.fields.registrationNumber?.toUpperCase();
    const existing = journeys.find((journey) =>
      journey.subject.type === "vehicle" && journey.facts["vehicle.registrationNumber"]?.toUpperCase() === registration,
    );
    const name = analysis.fields.makeModel || registration || "this vehicle";
    return {
      action: existing ? "update_vehicle_journey" : "create_vehicle_journey",
      canApply: analysis.confidence >= 0.8 && Boolean(registration),
      targetJourneyId: existing?.id ?? null,
      title: existing ? `Update ${existing.subject.displayName}` : `Start a journey for ${name}`,
      description: existing
        ? "Attach this RC and update the matching vehicle details."
        : "Create a vehicle journey, pre-fill the verified RC details, and keep purchase details for your review.",
      toolName: existing ? "updateVehicleFromRC" : "createVehicleJourneyFromRC",
      changes: vehicleChanges(analysis.fields),
    };
  }

  if (analysis.kind === "vaccination_receipt") {
    const childName = analysis.fields.childName?.trim().toLocaleLowerCase("en-IN");
    const childMatches = journeys.filter((journey) => journey.subject.type === "child" && (
      journey.subject.displayName.trim().toLocaleLowerCase("en-IN") === childName ||
      Boolean(analysis.fields.dateOfBirth && journey.facts["child.dateOfBirth"] === analysis.fields.dateOfBirth)
    ));
    const match = childMatches.length === 1 ? childMatches[0] : null;
    const vaccine = analysis.fields.vaccine || "vaccination";
    const complete = Boolean(match && analysis.fields.vaccine && analysis.fields.administeredOn);
    return {
      action: match ? "record_vaccination" : "needs_review",
      canApply: analysis.confidence >= 0.8 && complete,
      targetJourneyId: match?.id ?? null,
      title: match ? `Record ${vaccine} for ${match.subject.displayName}` : "Choose the child for this vaccination",
      description: match
        ? "Attach the receipt, record the administered dose, and refresh the child’s vaccination timeline."
        : "We could not match the name on this receipt to exactly one child journey.",
      toolName: match ? "recordVaccination" : null,
      changes: [
        { label: "Vaccine", value: analysis.fields.vaccine },
        { label: "Administered on", value: analysis.fields.administeredOn },
        { label: "Provider", value: analysis.fields.provider },
      ].filter((item): item is { label: string; value: string } => Boolean(item.value)),
    };
  }

  if (analysis.kind === "insurance_policy") {
    const registration = analysis.fields.registrationNumber?.toUpperCase();
    const match = journeys.find((journey) =>
      journey.subject.type === "vehicle" && journey.facts["vehicle.registrationNumber"]?.toUpperCase() === registration,
    );
    const complete = Boolean(match && registration && analysis.fields.policyNumber && analysis.fields.validUntil);
    return {
      action: match ? "record_vehicle_insurance" : "needs_review",
      canApply: analysis.confidence >= 0.8 && complete,
      targetJourneyId: match?.id ?? null,
      title: match ? `Add insurance for ${match.subject.displayName}` : "Choose the vehicle for this policy",
      description: match
        ? "Attach the policy, record its validity, and make it available to the insurance step."
        : "We could not match the registration number to exactly one vehicle journey.",
      toolName: match ? "recordVehicleInsurance" : null,
      changes: [
        { label: "Registration number", value: analysis.fields.registrationNumber },
        { label: "Policy number", value: analysis.fields.policyNumber },
        { label: "Insurer", value: analysis.fields.insurer },
        { label: "Valid until", value: analysis.fields.validUntil },
      ].filter((item): item is { label: string; value: string } => Boolean(item.value)),
    };
  }

  if (analysis.kind === "health_insurance_policy") {
    const insuredName = analysis.fields.insuredName?.trim();
    const dateOfBirth = analysis.fields.dateOfBirth;
    const matches = journeys.filter((journey) => journey.subject.type === "person" && (
      Boolean(insuredName && journey.subject.displayName.trim().toLocaleLowerCase("en-IN") === insuredName.toLocaleLowerCase("en-IN")) ||
      Boolean(dateOfBirth && journey.facts["person.dateOfBirth"] === dateOfBirth)
    ));
    const match = matches.length === 1 ? matches[0] : null;
    const complete = Boolean(insuredName && analysis.fields.policyNumber && analysis.fields.validUntil);
    return {
      action: match ? "record_health_insurance" : "create_health_journey",
      canApply: analysis.confidence >= 0.8 && complete && matches.length <= 1,
      targetJourneyId: match?.id ?? null,
      title: match ? `Add health cover for ${match.subject.displayName}` : `Start a health journey for ${insuredName || "this person"}`,
      description: match ? "Attach the policy and make it available to the coverage review." : "Create a Health & Insurance journey and pre-fill the supported policy details for review.",
      toolName: match ? "recordHealthInsurance" : "createHealthJourneyFromPolicy",
      changes: [
        { label: "Insured person", value: insuredName },
        { label: "Policy number", value: analysis.fields.policyNumber },
        { label: "Insurer", value: analysis.fields.insurer },
        { label: "Sum insured", value: analysis.fields.sumInsured },
        { label: "Valid until", value: analysis.fields.validUntil },
      ].filter((item): item is { label: string; value: string } => Boolean(item.value)),
    };
  }

  if (analysis.kind === "hospital_discharge_summary") {
    const childName = analysis.fields.childName?.trim();
    const dateOfBirth = analysis.fields.dateOfBirth;
    const matches = journeys.filter((journey) => journey.subject.type === "child" && (
      Boolean(childName && journey.subject.displayName.trim().toLocaleLowerCase("en-IN") === childName.toLocaleLowerCase("en-IN")) ||
      Boolean(dateOfBirth && journey.facts["child.dateOfBirth"] === dateOfBirth)
    ));
    const match = matches.length === 1 ? matches[0] : null;
    const complete = Boolean(childName && dateOfBirth && analysis.fields.provider);
    return {
      action: match ? "update_child_journey" : "create_child_journey",
      canApply: analysis.confidence >= 0.8 && complete && matches.length <= 1,
      targetJourneyId: match?.id ?? null,
      title: match ? `Update ${match.subject.displayName} from the hospital record` : `Start a journey for ${childName || "this child"}`,
      description: match
        ? "Attach the discharge summary and update supported birth and hospital details."
        : "Create a child journey with the supported birth and hospital details ready for review.",
      toolName: match ? "updateChildFromDischargeSummary" : "createChildJourneyFromDischargeSummary",
      changes: [
        { label: "Child", value: childName },
        { label: "Date of birth", value: dateOfBirth },
        { label: "Hospital", value: analysis.fields.provider },
        { label: "Place", value: [analysis.fields.city, analysis.fields.state].filter(Boolean).join(", ") },
      ].filter((item): item is { label: string; value: string } => Boolean(item.value)),
    };
  }

  return {
    action: "needs_review",
    canApply: false,
    targetJourneyId: null,
    title: "We need a little help with this document",
    description: "Choose the journey this document belongs to or upload a clearer copy.",
    toolName: null,
    changes: [],
  };
}
