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
});
