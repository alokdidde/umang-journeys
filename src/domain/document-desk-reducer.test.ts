import { describe, expect, it } from "vitest";
import { documentDeskReducer, initialDocumentDeskState } from "./document-desk-reducer";

describe("document desk reducer", () => {
  it("moves from analysis to an approval proposal", () => {
    const analysing = documentDeskReducer(initialDocumentDeskState, { type: "analysis_started" });
    const proposed = documentDeskReducer(analysing, {
      type: "proposal_received",
      document: {
        id: "document-1",
        status: "proposed",
        fileName: "sample-rc.pdf",
        mimeType: "application/pdf",
        size: 640,
        source: "sample",
        analysis: { kind: "vehicle_rc", confidence: 0.98, fields: { registrationNumber: "TS09EV4321" } },
        proposal: {
          action: "create_vehicle_journey",
          canApply: true,
          targetJourneyId: null,
          title: "Start a journey for Tata Nexon EV",
          description: "Create the vehicle journey.",
          toolName: "createVehicleJourneyFromRC",
          changes: [{ label: "Registration number", value: "TS09EV4321" }],
        },
        appliedJourneyId: null,
        createdAt: "2026-08-26T00:00:00.000Z",
        updatedAt: "2026-08-26T00:00:00.000Z",
      },
    });

    expect(analysing.phase).toBe("analysing");
    expect(proposed).toMatchObject({ phase: "proposal", document: { id: "document-1" }, error: null });
  });

  it("keeps the proposal visible while applying and exposes the resulting journey", () => {
    const state = {
      ...initialDocumentDeskState,
      phase: "proposal" as const,
      document: {
        id: "document-1",
        status: "proposed" as const,
        fileName: "sample-rc.pdf",
        mimeType: "application/pdf",
        size: 640,
        source: "sample" as const,
        analysis: { kind: "vehicle_rc" as const, confidence: 0.98, fields: { registrationNumber: "TS09EV4321" } },
        proposal: {
          action: "create_vehicle_journey" as const,
          canApply: true,
          targetJourneyId: null,
          title: "Start a journey for Tata Nexon EV",
          description: "Create the vehicle journey.",
          toolName: "createVehicleJourneyFromRC" as const,
          changes: [],
        },
        appliedJourneyId: null,
        createdAt: "2026-08-26T00:00:00.000Z",
        updatedAt: "2026-08-26T00:00:00.000Z",
      },
    };

    const applying = documentDeskReducer(state, { type: "application_started" });
    const applied = documentDeskReducer(applying, { type: "application_finished", journeyId: "journey-vehicle", message: "Journey ready." });

    expect(applying).toMatchObject({ phase: "applying", document: { id: "document-1" } });
    expect(applied).toMatchObject({ phase: "success", journeyId: "journey-vehicle", message: "Journey ready." });
  });
});
