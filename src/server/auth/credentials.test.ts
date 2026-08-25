import { describe, expect, it } from "vitest";
import { createPasswordHash, verifyEvaluationCredentials } from "./credentials";

describe("evaluation account credentials", () => {
  it("accepts only the configured email and password", () => {
    const account = { email: "ananya@umang.local", passwordHash: createPasswordHash("correct horse", "fixed-test-salt") };

    expect(verifyEvaluationCredentials("Ananya@UMANG.local", "correct horse", account)).toBe(true);
    expect(verifyEvaluationCredentials("ananya@umang.local", "wrong password", account)).toBe(false);
    expect(verifyEvaluationCredentials("someone@umang.local", "correct horse", account)).toBe(false);
  });
});
