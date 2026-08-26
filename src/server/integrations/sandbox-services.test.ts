import { describe, expect, it } from "vitest";
import { advanceSimulatedService } from "./sandbox-services";

describe("provider case simulator", () => {
  it("pauses for clarification and resumes only after a response", () => {
    const facts = { "simulation.scenario.child_health_record": "clarification" };
    const first = advanceSimulatedService("journey-1", "child_health_record", undefined, facts, new Date("2026-08-26T00:00:00Z"));
    const clarification = advanceSimulatedService("journey-1", "child_health_record", first, facts, new Date("2026-08-26T00:00:01Z"));
    const stillPaused = advanceSimulatedService("journey-1", "child_health_record", clarification, facts, new Date("2026-08-26T00:00:02Z"));
    const resumed = advanceSimulatedService("journey-1", "child_health_record", clarification, { ...facts, "simulation.response.child_health_record": "received" }, new Date("2026-08-26T00:00:03Z"));

    expect(clarification).toMatchObject({ status: "failed", caseStatus: "action_required", reasonCode: "MORE_INFORMATION_REQUIRED" });
    expect(stillPaused).toEqual(clarification);
    expect(resumed).toMatchObject({ currentStage: 3, caseStatus: "under_review" });
  });

  it("supports a rejected decision and an appeal path", () => {
    const facts = { "simulation.scenario.ownership_transfer": "rejected" };
    const first = advanceSimulatedService("journey-2", "ownership_transfer", undefined, facts);
    const second = advanceSimulatedService("journey-2", "ownership_transfer", first, facts);
    const rejected = advanceSimulatedService("journey-2", "ownership_transfer", second, facts);
    const appealed = advanceSimulatedService("journey-2", "ownership_transfer", rejected, { ...facts, "simulation.appeal.ownership_transfer": "received" });

    expect(rejected).toMatchObject({ status: "failed", caseStatus: "rejected", reasonCode: "RECORD_MISMATCH" });
    expect(appealed).toMatchObject({ status: "completed", caseStatus: "appealed", progress: 100 });
  });

  it("uses a longer callback delay for delayed cases", () => {
    const startedAt = new Date("2026-08-26T00:00:00Z");
    const run = advanceSimulatedService("journey-3", "coverage_review", undefined, { "simulation.scenario.coverage_review": "delayed" }, startedAt);
    expect(Date.parse(run.nextTransitionAt ?? "") - startedAt.valueOf()).toBe(4_000);
  });
});
