import { describe, expect, it } from "vitest";
import type { IntakeResult } from "./intake-analysis";
import { initialIntakeResolutionState, intakeResolutionReducer } from "./intake-resolution-state";

describe("intake language-analysis state", () => {
  it("shows the AI result only after structured language analysis succeeds", () => {
    const resolution: IntakeResult = {
      supported: true,
      resolver: "ai_gateway" as const,
      lifeEvent: { value: "managing_health_cover" as const, confidence: 0.97 },
      facts: [{ key: "health.coverageFor", value: "dependent", confidence: 0.96, source: "user_statement" as const }],
      clarification: { key: "health.subjects", question: "Who needs health cover?", choices: ["both", "mother", "father"] },
    };

    expect(intakeResolutionReducer(initialIntakeResolutionState, { type: "resolution_succeeded", resolution, statement: "Insurance for my parents" })).toEqual({
      phase: "ready",
      resolution,
      analysedStatement: "Insurance for my parents",
      error: null,
    });
  });

  it("keeps a failed AI analysis visible without a guessed resolution", () => {
    expect(intakeResolutionReducer(initialIntakeResolutionState, {
      type: "resolution_failed",
      message: "AI could not analyse that request. Please try again.",
    })).toEqual({
      phase: "error",
      resolution: null,
      analysedStatement: null,
      error: "AI could not analyse that request. Please try again.",
    });
  });
});
