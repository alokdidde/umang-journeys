import { describe, expect, it } from "vitest";
import { MemoryJourneyRepository } from "./repositories/journey-repository";
import { MemoryDocumentIntakeRepository } from "./repositories/document-intake-repository";
import { DocumentAssistantService } from "./document-assistant";

describe("document assistant", () => {
  it("applies an approved RC proposal exactly once", async () => {
    const journeys = new MemoryJourneyRepository();
    const documents = new MemoryDocumentIntakeRepository();
    const service = new DocumentAssistantService(journeys, documents);
    const intake = await service.propose("session-driver", {
      fileName: "sample-rc.pdf",
      mimeType: "application/pdf",
      bytes: new Uint8Array(Buffer.from("%PDF synthetic RC")),
      source: "sample",
      analysis: {
        kind: "vehicle_rc",
        confidence: 0.98,
        fields: { registrationNumber: "TS09EV4321", makeModel: "Tata Nexon EV", chassisLast5: "7K2P9", registeredOwner: "Vikram Rao" },
      },
    });

    const first = await service.apply("session-driver", intake.id, true);
    const replay = await service.apply("session-driver", intake.id, true);
    const saved = await journeys.list("session-driver");

    expect(first).toMatchObject({ status: "applied", journeyId: saved[0]?.id });
    expect(replay.journeyId).toBe(first.journeyId);
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({
      subject: { type: "vehicle", displayName: "Tata Nexon EV" },
      facts: { "vehicle.registrationNumber": "TS09EV4321" },
      evidence: [expect.objectContaining({ type: "vehicle_rc", verificationStatus: "verified" })],
    });
  });

  it("records a vaccination receipt on the matching child and completes the timeline", async () => {
    const journeys = new MemoryJourneyRepository();
    const documents = new MemoryDocumentIntakeRepository();
    const service = new DocumentAssistantService(journeys, documents);
    const child = await journeys.create("session-family", {
      "child.name": "Aarav Sharma",
      "child.dateOfBirth": "2026-08-24",
      "birth.hospital": "Apollo Hospital",
    });
    await journeys.completeRegistration("session-family", child.id, "registration-for-vaccine");
    const intake = await service.propose("session-family", {
      fileName: "sample-vaccination-receipt.pdf",
      mimeType: "application/pdf",
      bytes: new Uint8Array(Buffer.from("%PDF synthetic vaccination receipt")),
      source: "sample",
      analysis: {
        kind: "vaccination_receipt",
        confidence: 0.97,
        fields: { childName: "Aarav Sharma", dateOfBirth: "2026-08-24", vaccine: "BCG", administeredOn: "2026-08-24", provider: "Apollo Hospital" },
      },
    });

    await service.apply("session-family", intake.id, true);
    const saved = await journeys.get("session-family", child.id);

    expect(saved?.facts).toMatchObject({
      "vaccination.last.vaccine": "BCG",
      "vaccination.status": "provider_receipt_recorded",
    });
    expect(saved?.evidence).toEqual([expect.objectContaining({ type: "vaccination_receipt" })]);
    expect(saved?.projection.nodes.find((node) => node.key === "vaccination_timeline")?.status).toBe("completed");
    expect(saved?.serviceRuns.vaccination_timeline?.progress).toBe(100);
    expect(saved?.serviceRuns.vaccination_timeline?.artifact?.facts).toContainEqual(
      expect.objectContaining({ label: "Recorded dose", value: "BCG · 24 Aug 2026", status: "verified" }),
    );
  });

  it("never applies a proposal after it has been rejected", async () => {
    const journeys = new MemoryJourneyRepository();
    const documents = new MemoryDocumentIntakeRepository();
    const service = new DocumentAssistantService(journeys, documents);
    const intake = await service.propose("session-rejected", {
      fileName: "sample-rc.pdf",
      mimeType: "application/pdf",
      bytes: new Uint8Array(Buffer.from("%PDF synthetic RC")),
      source: "sample",
      analysis: {
        kind: "vehicle_rc",
        confidence: 0.98,
        fields: { registrationNumber: "TS09EV4321", makeModel: "Tata Nexon EV" },
      },
    });

    const rejected = await service.apply("session-rejected", intake.id, false);
    const replay = await service.apply("session-rejected", intake.id, true);

    expect(rejected.status).toBe("rejected");
    expect(replay.status).toBe("rejected");
    expect(await journeys.list("session-rejected")).toHaveLength(0);
  });

  it("attaches an approved insurance policy to its matching vehicle", async () => {
    const journeys = new MemoryJourneyRepository();
    const documents = new MemoryDocumentIntakeRepository();
    const service = new DocumentAssistantService(journeys, documents);
    const vehicle = await journeys.create("session-policy", {
      "vehicle.registrationNumber": "TS09EV4321",
      "vehicle.makeModel": "Tata Nexon EV",
    }, "vehicle-purchase.india.v1");
    const intake = await service.propose("session-policy", {
      fileName: "motor-policy.pdf",
      mimeType: "application/pdf",
      bytes: new Uint8Array(Buffer.from("%PDF synthetic policy")),
      source: "sample",
      analysis: {
        kind: "insurance_policy",
        confidence: 0.94,
        fields: { registrationNumber: "TS09EV4321", policyNumber: "MTR-SBX-884210", insurer: "New India Assurance", validUntil: "2027-07-31" },
      },
    });

    const result = await service.apply("session-policy", intake.id, true);
    const saved = await journeys.get("session-policy", vehicle.id);

    expect(result.journeyId).toBe(vehicle.id);
    expect(saved?.facts).toMatchObject({
      "insurance.policyNumber": "MTR-SBX-884210",
      "insurance.validUntil": "2027-07-31",
    });
    expect(saved?.evidence).toContainEqual(expect.objectContaining({ type: "insurance_policy" }));
  });

  it("creates a health journey from an approved health policy", async () => {
    const journeys = new MemoryJourneyRepository();
    const documents = new MemoryDocumentIntakeRepository();
    const service = new DocumentAssistantService(journeys, documents);
    const intake = await service.propose("session-health-policy", {
      fileName: "health-policy.pdf",
      mimeType: "application/pdf",
      bytes: new Uint8Array(Buffer.from("%PDF synthetic health policy")),
      source: "sample",
      analysis: {
        kind: "health_insurance_policy",
        confidence: 0.97,
        fields: { insuredName: "Ananya Sharma", dateOfBirth: "1992-04-18", policyNumber: "HLT-SBX-502781", insurer: "National Health Insurance Sandbox", sumInsured: "INR 500000", validUntil: "2027-03-31" },
      },
    });

    const result = await service.apply("session-health-policy", intake.id, true);
    const saved = result.journeyId ? await journeys.get("session-health-policy", result.journeyId) : null;

    expect(saved).toMatchObject({
      subject: { type: "person", displayName: "Ananya Sharma" },
      facts: { "health.policyNumber": "HLT-SBX-502781", "health.currentCover": "yes" },
      evidence: [expect.objectContaining({ type: "health_insurance_policy" })],
    });
  });

  it("creates a pre-filled child journey from an approved discharge summary", async () => {
    const journeys = new MemoryJourneyRepository();
    const documents = new MemoryDocumentIntakeRepository();
    const service = new DocumentAssistantService(journeys, documents);
    const intake = await service.propose("session-discharge", {
      fileName: "hospital-discharge-summary.pdf",
      mimeType: "application/pdf",
      bytes: new Uint8Array(Buffer.from("%PDF synthetic discharge summary")),
      source: "sample",
      analysis: {
        kind: "hospital_discharge_summary",
        confidence: 0.95,
        fields: { childName: "Mira Sharma", dateOfBirth: "2026-08-25", provider: "Apollo Hospital", city: "Hyderabad", state: "Telangana", dischargeReference: "DS-SBX-2048" },
      },
    });

    const result = await service.apply("session-discharge", intake.id, true);
    const saved = result.journeyId ? await journeys.get("session-discharge", result.journeyId) : null;

    expect(saved).toMatchObject({
      subject: { type: "child", displayName: "Mira Sharma" },
      facts: { "birth.hospital": "Apollo Hospital", "birth.city": "Hyderabad" },
      evidence: [expect.objectContaining({ type: "hospital_discharge_summary" })],
    });
  });

  it.each([
    {
      sessionId: "session-partial-rc",
      kind: "vehicle_rc" as const,
      fields: { registrationNumber: "TS09EV4321", makeModel: "Tata Nexon EV" },
      absentFacts: ["vehicle.purchaseType", "vehicle.city", "vehicle.state"],
    },
    {
      sessionId: "session-partial-health",
      kind: "health_insurance_policy" as const,
      fields: { insuredName: "Ananya Sharma", policyNumber: "HLT-42", validUntil: "2027-03-31" },
      absentFacts: ["person.state"],
    },
    {
      sessionId: "session-partial-move",
      kind: "residence_proof" as const,
      fields: { residentName: "Ananya Sharma", address: "12 Lake View Road", documentType: "Utility bill" },
      absentFacts: ["move.occupancy"],
    },
    {
      sessionId: "session-partial-business",
      kind: "business_premises_proof" as const,
      fields: { businessName: "Ananya Design Studio", address: "4 Creative Lane", occupancy: "Licensed use" },
      absentFacts: ["business.occupancy"],
    },
    {
      sessionId: "session-partial-retirement",
      kind: "retirement_account_statement" as const,
      fields: { memberName: "Ananya Sharma", accountType: "Unknown account" },
      absentFacts: ["retirement.accountType"],
    },
  ])("does not invent missing journey facts for $kind AI output", async ({ sessionId, kind, fields, absentFacts }) => {
    const journeys = new MemoryJourneyRepository();
    const documents = new MemoryDocumentIntakeRepository();
    const service = new DocumentAssistantService(journeys, documents);
    const intake = await service.propose(sessionId, {
      fileName: "partial-document.pdf",
      mimeType: "application/pdf",
      bytes: new Uint8Array(Buffer.from("%PDF partial document")),
      source: "user_upload",
      analysis: {
        kind,
        confidence: 0.95,
        fields: Object.fromEntries(Object.entries(fields).filter((entry): entry is [string, string] => Boolean(entry[1]))),
      },
    });

    const result = await service.apply(sessionId, intake.id, true);
    const saved = result.journeyId ? await journeys.get(sessionId, result.journeyId) : null;

    expect(saved).not.toBeNull();
    for (const fact of absentFacts) expect(saved?.facts).not.toHaveProperty(fact);
  });

  it.each([
    {
      sessionId: "session-move-document",
      fileName: "residence-proof.pdf",
      kind: "residence_proof" as const,
      fields: { residentName: "Ananya Sharma", address: "12 Lake View Road, Hyderabad 500081", city: "Hyderabad", state: "Telangana", documentType: "Registered rent agreement" },
      subject: { type: "residence", displayName: "New home in Hyderabad" },
      factKey: "move.newAddress",
      factValue: "12 Lake View Road, Hyderabad 500081",
      evidenceType: "residence_proof",
    },
    {
      sessionId: "session-business-document",
      fileName: "business-premises.pdf",
      kind: "business_premises_proof" as const,
      fields: { businessName: "Ananya Design Studio", address: "4 Creative Lane, Hyderabad 500033", city: "Hyderabad", state: "Telangana", occupancy: "Rented premises" },
      subject: { type: "business", displayName: "Ananya Design Studio" },
      factKey: "business.address",
      factValue: "4 Creative Lane, Hyderabad 500033",
      evidenceType: "business_premises_proof",
    },
    {
      sessionId: "session-retirement-document",
      fileName: "retirement-statement.pdf",
      kind: "retirement_account_statement" as const,
      fields: { memberName: "Ananya Sharma", accountType: "EPFO / EPS", accountReference: "Synthetic UAN ending 4821", eligibleService: "14 years" },
      subject: { type: "person", displayName: "Ananya Sharma" },
      factKey: "retirement.accountType",
      factValue: "epfo",
      evidenceType: "retirement_account_statement",
    },
  ])("creates a pre-filled $kind journey from approved evidence", async ({ sessionId, fileName, kind, fields, subject, factKey, factValue, evidenceType }) => {
    const journeys = new MemoryJourneyRepository();
    const documents = new MemoryDocumentIntakeRepository();
    const service = new DocumentAssistantService(journeys, documents);
    const intake = await service.propose(sessionId, {
      fileName,
      mimeType: "application/pdf",
      bytes: new Uint8Array(Buffer.from(`%PDF synthetic ${kind}`)),
      source: "sample",
      analysis: { kind, confidence: 0.97, fields: Object.fromEntries(Object.entries(fields).filter((entry): entry is [string, string] => Boolean(entry[1]))) },
    });

    const result = await service.apply(sessionId, intake.id, true);
    const saved = result.journeyId ? await journeys.get(sessionId, result.journeyId) : null;

    expect(saved?.subject).toEqual(expect.objectContaining(subject));
    expect(saved?.facts[factKey]).toBe(factValue);
    expect(saved?.evidence).toContainEqual(expect.objectContaining({ type: evidenceType }));
  });
});
