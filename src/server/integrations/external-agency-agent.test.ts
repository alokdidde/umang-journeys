import { afterEach, describe, expect, it, vi } from "vitest";
import { MockLanguageModelV3 } from "ai/test";
import { evaluateSyntheticAgency } from "./external-agency-agent";

afterEach(() => vi.unstubAllEnvs());

const usage = {
  inputTokens: { total: 40, noCache: 40, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 60, text: 60, reasoning: 0 },
};

describe("synthetic external agency", () => {
  it("fails explicitly when Vercel AI Gateway is unavailable", async () => {
    vi.stubEnv("AI_GATEWAY_API_KEY", "");
    vi.stubEnv("VERCEL_OIDC_TOKEN", "");

    await expect(evaluateSyntheticAgency({
      journeyId: "journey-1",
      nodeKey: "ownership_transfer",
      title: "Register ownership",
      description: "Review a vehicle transfer case.",
      agency: "VAHAN evaluation agency",
      facts: {},
      evidence: [],
    })).rejects.toMatchObject({
      code: "AI_GATEWAY_NOT_CONFIGURED",
      message: "The synthetic agency is unavailable because Vercel AI Gateway is not configured.",
    });
  });

  it("returns an input-grounded clarification from the model", async () => {
    const model = new MockLanguageModelV3({
      doGenerate: {
        content: [{ type: "text", text: JSON.stringify({
          outcome: "action_required",
          progress: 55,
          summary: "The registration certificate is verified, but financier consent is missing.",
          reasonCode: "FINANCIER_CONSENT_REQUIRED",
          actionMessage: "Upload the financier consent or confirm that hypothecation has ended.",
          reference: "SYN-VAHAN-82A91C",
          events: [
            { stageKey: "rc_review", title: "Registration reviewed", detail: "The RC matches TS09EV4321." },
            { stageKey: "finance_review", title: "Finance record needs evidence", detail: "The case says hypothecation is active but contains no financier consent." },
          ],
          artifact: null,
        }) }],
        finishReason: { unified: "stop", raw: "stop" },
        usage,
        warnings: [],
      },
    });

    const decision = await evaluateSyntheticAgency({
      journeyId: "journey-1",
      nodeKey: "ownership_transfer",
      title: "Register ownership",
      description: "Review a vehicle transfer case.",
      agency: "VAHAN evaluation agency",
      facts: { "vehicle.registrationNumber": "TS09EV4321", "vehicle.hypothecation": "yes" },
      evidence: [{ type: "vehicle_rc", verificationStatus: "verified", extractedFields: { registrationNumber: "TS09EV4321" } }],
    }, { model });

    expect(decision).toMatchObject({ outcome: "action_required", reasonCode: "FINANCIER_CONSENT_REQUIRED" });
    expect(JSON.stringify(model.doGenerateCalls[0]?.prompt)).toContain("vehicle.hypothecation");
    expect(JSON.stringify(model.doGenerateCalls[0]?.prompt)).toContain("untrusted case data");
  });

  it("rejects a model approval without a synthetic artifact", async () => {
    const model = new MockLanguageModelV3({
      doGenerate: {
        content: [{ type: "text", text: JSON.stringify({
          outcome: "approved",
          progress: 100,
          summary: "The submitted record passed the synthetic review.",
          reasonCode: null,
          actionMessage: null,
          reference: "SYN-CRS-ABC123",
          events: [{ stageKey: "review", title: "Reviewed", detail: "The record was reviewed." }],
          artifact: null,
        }) }],
        finishReason: { unified: "stop", raw: "stop" },
        usage,
        warnings: [],
      },
    });

    await expect(evaluateSyntheticAgency({
      journeyId: "journey-1",
      nodeKey: "birth_certificate",
      title: "Birth certificate",
      description: "Review certificate issuance.",
      agency: "Civil Registration evaluation agency",
      facts: {},
      evidence: [],
    }, { model })).rejects.toMatchObject({ code: "AI_AGENCY_RESPONSE_INVALID" });
  });

  it("surfaces model failures without choosing a scripted outcome", async () => {
    const model = new MockLanguageModelV3({ doGenerate: async () => { throw new Error("gateway down"); } });

    await expect(evaluateSyntheticAgency({
      journeyId: "journey-1",
      nodeKey: "birth_certificate",
      title: "Birth certificate",
      description: "Review certificate issuance.",
      agency: "Civil Registration evaluation agency",
      facts: {},
      evidence: [],
    }, { model })).rejects.toMatchObject({
      code: "AI_AGENCY_FAILED",
      message: "The synthetic agency could not review this case. Please try again.",
    });
  });
});
