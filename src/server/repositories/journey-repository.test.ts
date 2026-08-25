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
