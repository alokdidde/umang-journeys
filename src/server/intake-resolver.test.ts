import { afterEach, describe, expect, it, vi } from "vitest";
import { MockLanguageModelV3 } from "ai/test";
import { resolveIntake } from "./intake-resolver";

afterEach(() => vi.unstubAllEnvs());

describe("AI intake boundary", () => {
  it("fails explicitly when Vercel AI Gateway authentication is unavailable", async () => {
    vi.stubEnv("AI_GATEWAY_API_KEY", "");
    vi.stubEnv("VERCEL_OIDC_TOKEN", "");

    await expect(resolveIntake("I need health insurance for my parents")).rejects.toMatchObject({
      code: "AI_GATEWAY_NOT_CONFIGURED",
      message: "AI language analysis is unavailable because Vercel AI Gateway is not configured.",
    });
  });

  it("returns schema-validated language analysis from the AI model", async () => {
    const model = new MockLanguageModelV3({
      doGenerate: {
        content: [{ type: "text", text: JSON.stringify({
          supported: true,
          lifeEvent: { value: "managing_health_cover", confidence: 0.97 },
          facts: [
            { key: "health.coverageFor", value: "dependent", confidence: 0.96, source: "user_statement" },
            { key: "health.dependentRelationship", value: "parent", confidence: 0.96, source: "user_statement" },
          ],
          clarification: { key: "health.subjects", question: "Who needs health cover?", choices: ["both", "mother", "father"] },
        }) }],
        finishReason: { unified: "stop", raw: "stop" },
        usage: {
          inputTokens: { total: 42, noCache: 42, cacheRead: 0, cacheWrite: 0 },
          outputTokens: { total: 64, text: 64, reasoning: 0 },
        },
        warnings: [],
      },
    });

    const result = await resolveIntake("I need health insurance for my parents", {
      model,
      now: new Date("2027-01-02T20:30:00.000Z"),
    });

    expect(result).toMatchObject({
      resolver: "ai_gateway",
      lifeEvent: { value: "managing_health_cover" },
      clarification: { key: "health.subjects" },
    });
    expect(JSON.stringify(model.doGenerateCalls[0]?.prompt)).toContain("2027-01-03");
  });

  it("surfaces provider failures instead of returning a guessed journey", async () => {
    const model = new MockLanguageModelV3({
      doGenerate: async () => { throw new Error("gateway unavailable"); },
    });

    await expect(resolveIntake("I bought a car", { model })).rejects.toMatchObject({
      code: "AI_INTAKE_FAILED",
      message: "AI could not analyse that request. Please try again.",
    });
  });

  it("distinguishes rejected AI Gateway credentials from a transient provider failure", async () => {
    const authenticationError = new Error("Unauthenticated request to AI Gateway.");
    authenticationError.name = "GatewayAuthenticationError";
    const model = new MockLanguageModelV3({ doGenerate: async () => { throw authenticationError; } });

    await expect(resolveIntake("I bought a car", { model })).rejects.toMatchObject({
      code: "AI_GATEWAY_AUTH_FAILED",
      message: "The AI assistant could not sign in to Vercel AI Gateway. Ask the demo owner to replace its AI Gateway key.",
    });
  });

  it("rejects invalid structured output instead of using phrase matching", async () => {
    const model = new MockLanguageModelV3({
      doGenerate: {
        content: [{ type: "text", text: "this is not a structured result" }],
        finishReason: { unified: "stop", raw: "stop" },
        usage: {
          inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
          outputTokens: { total: 8, text: 8, reasoning: 0 },
        },
        warnings: [],
      },
    });

    await expect(resolveIntake("We moved home", { model })).rejects.toMatchObject({
      code: "AI_INTAKE_FAILED",
    });
  });

  it("rejects a clarification whose choices do not match its question", async () => {
    const model = new MockLanguageModelV3({
      doGenerate: {
        content: [{ type: "text", text: JSON.stringify({
          supported: true,
          lifeEvent: { value: "managing_health_cover", confidence: 0.94 },
          facts: [],
          clarification: { key: "health.subjects", question: "Who needs health cover?", choices: ["yes", "no"] },
        }) }],
        finishReason: { unified: "stop", raw: "stop" },
        usage: {
          inputTokens: { total: 20, noCache: 20, cacheRead: 0, cacheWrite: 0 },
          outputTokens: { total: 20, text: 20, reasoning: 0 },
        },
        warnings: [],
      },
    });

    await expect(resolveIntake("I need health insurance for my parents", { model })).rejects.toMatchObject({
      code: "AI_INTAKE_FAILED",
    });
  });

  it("does not force an unrelated statement into a supported journey", async () => {
    const model = new MockLanguageModelV3({
      doGenerate: {
        content: [{ type: "text", text: JSON.stringify({ supported: false, reason: "No supported Life Event matches this request." }) }],
        finishReason: { unified: "stop", raw: "stop" },
        usage: {
          inputTokens: { total: 16, noCache: 16, cacheRead: 0, cacheWrite: 0 },
          outputTokens: { total: 12, text: 12, reasoning: 0 },
        },
        warnings: [],
      },
    });

    await expect(resolveIntake("Write a poem about rain", { model })).rejects.toMatchObject({
      code: "UNSUPPORTED_LIFE_EVENT",
      message: "AI could not match that request to a supported Life Event.",
    });
  });

  it("rejects AI output that contradicts the Life Event the citizen selected", async () => {
    const model = new MockLanguageModelV3({
      doGenerate: {
        content: [{ type: "text", text: JSON.stringify({
          supported: true,
          lifeEvent: { value: "managing_health_cover", confidence: 0.93 },
          facts: [],
          clarification: { key: "health.currentCover", question: "Do you have health cover?", choices: ["yes", "not_sure", "no"] },
        }) }],
        finishReason: { unified: "stop", raw: "stop" },
        usage: {
          inputTokens: { total: 16, noCache: 16, cacheRead: 0, cacheWrite: 0 },
          outputTokens: { total: 18, text: 18, reasoning: 0 },
        },
        warnings: [],
      },
    });

    await expect(resolveIntake("I bought a used car", {
      model,
      expectedLifeEvent: "buying_a_vehicle",
    })).rejects.toMatchObject({
      code: "AI_LIFE_EVENT_MISMATCH",
    });
  });
});
