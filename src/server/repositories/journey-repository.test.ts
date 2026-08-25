import { describe, expect, it } from "vitest";
import { MemoryJourneyRepository } from "./journey-repository";

describe("journey repository", () => {
  it("keeps separate baby journeys and lists the most recently changed first", async () => {
    const repository = new MemoryJourneyRepository();
    const first = await repository.create("session-family", { "child.name": "Aarav Sharma" });
    const second = await repository.create("session-family", { "child.name": "Mira Sharma" });

    expect(second.id).not.toBe(first.id);
    expect((await repository.list("session-family")).map((journey) => journey.subject.displayName)).toEqual([
      "Mira Sharma",
      "Aarav Sharma",
    ]);

    await repository.updateFacts("session-family", first.id, { "birth.place.ward": "Ward 72" });
    expect((await repository.list("session-family"))[0]?.subject.displayName).toBe("Aarav Sharma");
  });

  it("creates a vehicle journey with a vehicle subject and its own template", async () => {
    const repository = new MemoryJourneyRepository();
    const journey = await repository.create(
      "session-driver",
      { "vehicle.registrationNumber": "TS09EV4321", "vehicle.makeModel": "Tata Nexon EV" },
      "vehicle-purchase.india.v1",
    );

    expect(journey.projection.templateId).toBe("vehicle-purchase.india.v1");
    expect(journey.subject).toMatchObject({ type: "vehicle", displayName: "Tata Nexon EV" });
    expect(journey.projection.nodes[0]?.key).toBe("vehicle_details");
  });

  it("creates a health journey for the person without treating them as a permanent patient", async () => {
    const repository = new MemoryJourneyRepository();
    const journey = await repository.create("session-health", { "person.name": "Ananya Sharma" }, "health-insurance.india.v1");

    expect(journey.subject).toMatchObject({ type: "person", displayName: "Ananya Sharma" });
    expect(journey.projection.nodes[0]?.key).toBe("health_profile");
  });

  it.each([
    ["moving-home.india.v1", { "move.newCity": "Hyderabad" }, "residence", "New home in Hyderabad"],
    ["business-setup.india.v1", { "business.name": "Ananya Design Studio" }, "business", "Ananya Design Studio"],
    ["retirement.india.v1", { "person.name": "Ananya Sharma" }, "person", "Ananya Sharma"],
  ])("creates a distinct subject for another journey", async (templateId, facts, type, displayName) => {
    const repository = new MemoryJourneyRepository();
    const journey = await repository.create("session-more", facts, templateId);

    expect(journey.subject).toMatchObject({ type, displayName });
  });

  it("completes vehicle details without changing the vehicle template", async () => {
    const repository = new MemoryJourneyRepository();
    const created = await repository.create("session-driver", {}, "vehicle-purchase.india.v1");
    await repository.updateFacts("session-driver", created.id, {
      "vehicle.registrationNumber": "TS09EV4321",
      "vehicle.makeModel": "Tata Nexon EV",
    });

    const journey = await repository.completeStep("session-driver", created.id, "vehicle_details", "vehicle-details-1");

    expect(journey?.subject.displayName).toBe("Tata Nexon EV");
    expect(journey?.projection.nodes.find((node) => node.key === "vehicle_details")?.status).toBe("completed");
    expect(journey?.projection.nodes.find((node) => node.key === "ownership_transfer")?.status).toBe("available");
  });

  it("persists verified evidence independently for each journey", async () => {
    const repository = new MemoryJourneyRepository();
    const created = await repository.create("session-driver", {}, "vehicle-purchase.india.v1");

    const journey = await repository.addEvidence("session-driver", created.id, {
      type: "vehicle_rc",
      fileName: "sample-rc.pdf",
      mimeType: "application/pdf",
      size: 842,
      source: "sample",
      verificationStatus: "verified",
      extractedFields: { registrationNumber: "TS09EV4321" },
      contentBase64: "JVBERi0xLjQ=",
    });

    expect(journey?.evidence).toEqual([
      expect.objectContaining({ type: "vehicle_rc", source: "sample", verificationStatus: "verified" }),
    ]);
    expect((await repository.getEvidence("session-driver", created.id, journey!.evidence[0]!.id))?.contentBase64).toBe("JVBERi0xLjQ=");
  });

  it("isolates anonymous sessions", async () => {
    const repository = new MemoryJourneyRepository();
    const created = await repository.create("session-a");
    expect(await repository.get("session-b", created.id)).toBeNull();
  });

  it("replays an idempotent registration without changing its identifier", async () => {
    const repository = new MemoryJourneyRepository();
    const created = await repository.create("session-a");
    const first = await repository.completeRegistration("session-a", created.id, "idem-12345678");
    const replay = await repository.completeRegistration("session-a", created.id, "idem-12345678");
    expect(first?.registrationId).toBe("BR-DEMO-2026-7429");
    expect(replay?.registrationId).toBe(first?.registrationId);
  });

  it("starts a simulated service as persisted work in progress", async () => {
    const repository = new MemoryJourneyRepository();
    const created = await repository.create("session-progress");
    await repository.completeRegistration("session-progress", created.id, "registration-progress");

    const journey = await repository.advanceService(
      "session-progress",
      created.id,
      "child_health_record",
      "health-stage-1",
    );

    expect(journey?.projection.nodes.find((node) => node.key === "child_health_record")?.status).toBe("in_progress");
    expect(journey?.serviceRuns.child_health_record).toMatchObject({
      status: "running",
      progress: 24,
      currentStage: 1,
    });
    expect(journey?.serviceRuns.child_health_record?.events).toHaveLength(1);
    expect(Date.parse(journey?.serviceRuns.child_health_record?.events[0]?.occurredAt ?? "")).not.toBeNaN();
  });

  it("persists each simulated external service result and completes its journey node", async () => {
    const repository = new MemoryJourneyRepository();
    const created = await repository.create("session-services");
    await repository.completeRegistration("session-services", created.id, "registration-1234");

    for (const nodeKey of ([
      "birth_certificate",
      "child_health_record",
      "vaccination_timeline",
      "child_identity",
      "eligible_benefits",
    ] as const)) {
      let journey = null;
      for (let stage = 1; stage <= 4; stage += 1) {
        journey = await repository.advanceService(
          "session-services",
          created.id,
          nodeKey,
          `service-${nodeKey}-${stage}`,
        );
      }
      expect(journey?.projection.nodes.find((node) => node.key === nodeKey)?.status).toBe("completed");
      expect(journey?.serviceRuns[nodeKey]?.progress).toBe(100);
      expect(journey?.serviceRuns[nodeKey]?.events).toHaveLength(4);
      expect(journey?.serviceRuns[nodeKey]?.artifact?.groups[0]?.items.length).toBeGreaterThan(0);
    }
    expect((await repository.get("session-services", created.id))?.status).toBe("completed");
  });
});
