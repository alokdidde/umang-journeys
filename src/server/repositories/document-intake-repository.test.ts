import { describe, expect, it } from "vitest";
import { MemoryDocumentIntakeRepository } from "./document-intake-repository";

describe("document intake repository", () => {
  it("stores a proposed action for only the signed-in session", async () => {
    const repository = new MemoryDocumentIntakeRepository();
    const created = await repository.create("session-a", {
      fileName: "sample-rc.pdf",
      mimeType: "application/pdf",
      size: 640,
      source: "sample",
      contentBase64: "JVBERg==",
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
    });

    expect(created.status).toBe("proposed");
    expect(await repository.get("session-a", created.id)).toMatchObject({ id: created.id, status: "proposed" });
    expect(await repository.get("session-b", created.id)).toBeNull();
    expect(await repository.list("session-a")).toEqual([expect.objectContaining({ id: created.id })]);
    expect(await repository.list("session-b")).toEqual([]);
  });
});
