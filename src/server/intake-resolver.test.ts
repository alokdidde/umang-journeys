import { describe, expect, it } from "vitest";
import { createIntakeClientConfig, deterministicResolve } from "./intake-resolver";

describe("deterministic intake fallback", () => {
  it("extracts the golden Hyderabad newborn fixture", () => {
    const result = deterministicResolve("We had a baby yesterday at Apollo Hospital in Hyderabad.");
    expect(result.lifeEvent.value).toBe("having_a_baby");
    expect(result.facts).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "birth.city", value: "Hyderabad" }),
      expect.objectContaining({ key: "birth.state", value: "Telangana" }),
    ]));
    expect(result.clarification.choices).toEqual(["yes", "not_sure", "no"]);
  });

  it("rejects unsupported life events clearly", () => {
    expect(() => deterministicResolve("I bought a car.")).toThrow("currently supports Having a Baby");
  });

  it("prefers Vercel AI Gateway configuration when its key is available", () => {
    expect(createIntakeClientConfig({ AI_GATEWAY_API_KEY: "gateway-key", OPENAI_API_KEY: "direct-key" })).toEqual({
      apiKey: "gateway-key",
      baseURL: "https://ai-gateway.vercel.sh/v1",
      model: "openai/gpt-5.5",
      resolver: "ai_gateway",
    });
  });
});
