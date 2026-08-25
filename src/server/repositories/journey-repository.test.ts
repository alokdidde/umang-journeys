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

  it("persists each simulated external service result and completes its journey node", async () => {
    const repository = new MemoryJourneyRepository();
    await repository.create("session-services");
    await repository.completeRegistration("session-services", "demo-new-baby", "registration-1234");

    for (const nodeKey of [
      "birth_certificate",
      "child_health_record",
      "vaccination_timeline",
      "child_identity",
      "eligible_benefits",
    ]) {
      const journey = await repository.completeService(
        "session-services",
        "demo-new-baby",
        nodeKey,
        `service-${nodeKey}`,
      );
      expect(journey?.projection.nodes.find((node) => node.key === nodeKey)?.status).toBe("completed");
      expect(journey?.facts[`service.${nodeKey}.receipt`]).toMatch(/^SBX-/);
      expect(journey?.facts[`service.${nodeKey}.summary`]).toBeTruthy();
    }
  });
});
