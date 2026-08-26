import { describe, expect, it } from "vitest";
import { buildAgencyCaseInput, MemoryJourneyRepository } from "./journey-repository";
import { approvedTestAgencyAgent } from "@/test/agency-agent";

describe("journey repository", () => {
  it("gives the agency the exact evidence contract and review plan for a service", async () => {
    const repository = new MemoryJourneyRepository();
    const journey = await repository.create("session-contract", {}, "vehicle-purchase.india.v1");

    const input = buildAgencyCaseInput(journey, "ownership_transfer") as unknown as {
      requiredEvidence: Array<{ type: string; title: string }>;
      servicePlan: Array<{ stageKey: string }>;
    };

    expect(input.requiredEvidence).toEqual([
      expect.objectContaining({ type: "vehicle_rc", title: "Registration certificate (RC)" }),
      expect.objectContaining({ type: "sale_agreement", title: "Sale agreement or delivery note" }),
    ]);
    expect(input.servicePlan.map((stage) => stage.stageKey)).toEqual([
      "validate_rc",
      "prepare_forms",
      "check_dues",
      "acknowledge_transfer",
    ]);
  });

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

  it("persists an optional branch choice and makes its first eligible step actionable", async () => {
    const repository = new MemoryJourneyRepository();
    const created = await repository.create("session-branches", {}, "business-setup.india.v1");
    await repository.completeStep("session-branches", created.id, "business_profile", "profile-1");
    await repository.completeStep("session-branches", created.id, "business_premises", "premises-1");

    const activated = await repository.activateBranch("session-branches", created.id, "formal_registrations");
    const reloaded = await repository.get("session-branches", created.id);

    expect(activated?.projection.branches.find((branch) => branch.key === "formal_registrations")).toMatchObject({ active: true, status: "available" });
    expect(reloaded?.projection.nodes.find((node) => node.key === "udyam_readiness")?.status).toBe("available");
    expect(reloaded?.status).toBe("active");
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

  it("re-evaluates conditional branches whenever confirmed facts change", async () => {
    const repository = new MemoryJourneyRepository();
    const created = await repository.create("session-driver", {}, "vehicle-purchase.india.v1");

    expect(created.projection.branches.find((branch) => branch.key === "used_vehicle")).toMatchObject({
      applicability: "pending",
      status: "awaiting_context",
    });

    const updated = await repository.updateFacts("session-driver", created.id, {
      "vehicle.acquisitionRoute": "sale",
      "vehicle.transferScope": "interstate",
    });

    expect(updated?.projection.branches.find((branch) => branch.key === "used_vehicle")).toMatchObject({
      active: true,
      applicability: "applicable",
    });
    expect(updated?.projection.branches.find((branch) => branch.key === "interstate")).toMatchObject({
      active: true,
      applicability: "applicable",
    });
    expect(updated?.projection.branches.find((branch) => branch.key === "new_vehicle")).toMatchObject({
      active: false,
      applicability: "not_applicable",
      status: "not_applicable",
    });
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
    const repository = new MemoryJourneyRepository(approvedTestAgencyAgent);
    const created = await repository.create("session-a");
    const first = await repository.completeRegistration("session-a", created.id, "idem-12345678");
    const replay = await repository.completeRegistration("session-a", created.id, "idem-12345678");
    expect(first?.registrationId).toBe("SYN-TEST-BIRTH-REGISTRATION");
    expect(replay?.registrationId).toBe(first?.registrationId);
  });

  it("persists an under-review decision returned by the synthetic agency", async () => {
    const repository = new MemoryJourneyRepository(async (input) => input.nodeKey === "birth_registration"
      ? approvedTestAgencyAgent(input)
      : ({
          outcome: "under_review",
          progress: 48,
          summary: `The synthetic ${input.title} case remains under review.`,
          reasonCode: null,
          actionMessage: null,
          reference: "SYN-TEST-UNDER-REVIEW",
          events: [{ stageKey: "record_review", title: "Record review started", detail: "The supplied record is being reviewed by the synthetic agency." }],
          artifact: null,
        }));
    const created = await repository.create("session-progress");
    await repository.completeRegistration("session-progress", created.id, "registration-progress");
    const journey = await repository.advanceService(
      "session-progress",
      created.id,
      "birth_certificate",
      "certificate-review",
    );

    expect(journey?.projection.nodes.find((node) => node.key === "birth_certificate")?.status).toBe("waiting_external");
    expect(journey?.serviceRuns.birth_certificate).toMatchObject({
      status: "waiting_external",
      progress: 48,
      currentStage: 1,
    });
    expect(journey?.serviceRuns.birth_certificate?.events).toHaveLength(1);
    expect(Date.parse(journey?.serviceRuns.birth_certificate?.events[0]?.occurredAt ?? "")).not.toBeNaN();
  });

  it("persists each AI agency decision and completes only approved journey nodes", async () => {
    const repository = new MemoryJourneyRepository(approvedTestAgencyAgent);
    const created = await repository.create("session-services");
    await repository.completeRegistration("session-services", created.id, "registration-1234");

    for (const nodeKey of ([
      "birth_certificate",
      "child_health_record",
      "vaccination_timeline",
      "child_identity",
      "eligible_benefits",
    ] as const)) {
      if (nodeKey === "child_identity") await repository.activateBranch("session-services", created.id, "child_identity");
      if (nodeKey === "eligible_benefits") await repository.activateBranch("session-services", created.id, "family_support");
      const journey = await repository.advanceService("session-services", created.id, nodeKey, `service-${nodeKey}`);
      expect(journey?.projection.nodes.find((node) => node.key === nodeKey)?.status).toBe("completed");
      expect(journey?.serviceRuns[nodeKey]?.progress).toBe(100);
      expect(journey?.serviceRuns[nodeKey]?.events).toHaveLength(1);
      expect(journey?.serviceRuns[nodeKey]?.artifact?.groups[0]?.items.length).toBeGreaterThan(0);
    }
    expect((await repository.get("session-services", created.id))?.status).toBe("completed");
  });
});
