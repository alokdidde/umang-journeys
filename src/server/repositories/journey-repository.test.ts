import { describe, expect, it } from "vitest";
import { MemoryJourneyRepository } from "./journey-repository";

describe("journey repository", () => {
  it("isolates anonymous sessions", async () => {
    const repository = new MemoryJourneyRepository();
    await repository.create("session-a");
    expect(await repository.get("session-b", "demo-new-baby")).toBeNull();
  });

  it("replays an idempotent registration without changing its identifier", async () => {
    const repository = new MemoryJourneyRepository();
    await repository.create("session-a");
    const first = await repository.completeRegistration("session-a", "demo-new-baby", "idem-12345678");
    const replay = await repository.completeRegistration("session-a", "demo-new-baby", "idem-12345678");
    expect(first?.registrationId).toBe("BR-DEMO-2026-7429");
    expect(replay?.registrationId).toBe(first?.registrationId);
  });

  it("starts a simulated service as persisted work in progress", async () => {
    const repository = new MemoryJourneyRepository();
    await repository.create("session-progress");
    await repository.completeRegistration("session-progress", "demo-new-baby", "registration-progress");

    const journey = await repository.advanceService(
      "session-progress",
      "demo-new-baby",
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
    await repository.create("session-services");
    await repository.completeRegistration("session-services", "demo-new-baby", "registration-1234");

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
          "demo-new-baby",
          nodeKey,
          `service-${nodeKey}-${stage}`,
        );
      }
      expect(journey?.projection.nodes.find((node) => node.key === nodeKey)?.status).toBe("completed");
      expect(journey?.serviceRuns[nodeKey]?.progress).toBe(100);
      expect(journey?.serviceRuns[nodeKey]?.events).toHaveLength(4);
      expect(journey?.serviceRuns[nodeKey]?.artifact?.groups[0]?.items.length).toBeGreaterThan(0);
    }
  });
});
