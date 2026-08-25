import { describe, expect, it } from "vitest";
import { proposeDocumentAction } from "./document-intake";

describe("document intake proposals", () => {
  it("proposes a new vehicle journey when an RC has no existing vehicle match", () => {
    const proposal = proposeDocumentAction({
      kind: "vehicle_rc",
      confidence: 0.98,
      fields: {
        registrationNumber: "TS09EV4321",
        makeModel: "Tata Nexon EV",
        chassisLast5: "7K2P9",
        registeredOwner: "Vikram Rao",
      },
    }, []);

    expect(proposal).toMatchObject({
      action: "create_vehicle_journey",
      canApply: true,
      targetJourneyId: null,
      title: "Start a journey for Tata Nexon EV",
      toolName: "createVehicleJourneyFromRC",
    });
    expect(proposal.changes).toContainEqual({ label: "Registration number", value: "TS09EV4321" });
  });

  it("matches a vaccination receipt to the child named on the document", () => {
    const proposal = proposeDocumentAction({
      kind: "vaccination_receipt",
      confidence: 0.96,
      fields: {
        childName: "Aarav Sharma",
        vaccine: "BCG",
        administeredOn: "2026-08-24",
        provider: "Apollo Hospital",
      },
    }, [{
      id: "journey-baby",
      subject: { type: "child", displayName: "Aarav Sharma" },
      facts: { "child.dateOfBirth": "2026-08-24" },
    }]);

    expect(proposal).toMatchObject({
      action: "record_vaccination",
      canApply: true,
      targetJourneyId: "journey-baby",
      title: "Record BCG for Aarav Sharma",
      toolName: "recordVaccination",
    });
  });

  it("matches a motor insurance policy to the registered vehicle", () => {
    const proposal = proposeDocumentAction({
      kind: "insurance_policy",
      confidence: 0.94,
      fields: {
        registrationNumber: "TS09EV4321",
        policyNumber: "MTR-SBX-884210",
        insurer: "New India Assurance",
        validUntil: "2027-07-31",
      },
    }, [{
      id: "journey-vehicle",
      subject: { type: "vehicle", displayName: "Tata Nexon EV" },
      facts: { "vehicle.registrationNumber": "TS09EV4321" },
    }]);

    expect(proposal).toMatchObject({
      action: "record_vehicle_insurance",
      canApply: true,
      targetJourneyId: "journey-vehicle",
      title: "Add insurance for Tata Nexon EV",
      toolName: "recordVehicleInsurance",
    });
  });

  it("proposes a pre-filled child journey from a hospital discharge summary", () => {
    const proposal = proposeDocumentAction({
      kind: "hospital_discharge_summary",
      confidence: 0.95,
      fields: {
        childName: "Mira Sharma",
        dateOfBirth: "2026-08-25",
        provider: "Apollo Hospital",
        city: "Hyderabad",
        state: "Telangana",
      },
    }, []);

    expect(proposal).toMatchObject({
      action: "create_child_journey",
      canApply: true,
      targetJourneyId: null,
      title: "Start a journey for Mira Sharma",
      toolName: "createChildJourneyFromDischargeSummary",
    });
  });
});
