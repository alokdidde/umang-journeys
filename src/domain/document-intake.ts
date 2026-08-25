export type DocumentKind = "vehicle_rc" | "vaccination_receipt" | "unknown";

export type DocumentAnalysis = {
  kind: DocumentKind;
  confidence: number;
  fields: Record<string, string>;
};

export type JourneyMatchCandidate = {
  id: string;
  subject: { type: "child" | "vehicle"; displayName: string };
  facts: Record<string, string>;
};

export type DocumentProposal = {
  action: "create_vehicle_journey" | "update_vehicle_journey" | "record_vaccination" | "needs_review";
  canApply: boolean;
  targetJourneyId: string | null;
  title: string;
  description: string;
  toolName: "createVehicleJourneyFromRC" | "updateVehicleFromRC" | "recordVaccination" | null;
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
