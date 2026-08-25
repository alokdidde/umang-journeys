import { describe, expect, it } from "vitest";
import { createPasswordHash, verifyEvaluationCredentials } from "./credentials";

describe("evaluation account credentials", () => {
  it("accepts only the configured email and password", () => {
    const account = { email: "demo@umang.com", passwordHash: createPasswordHash("correct horse", "fixed-test-salt") };

    expect(verifyEvaluationCredentials("Demo@UMANG.com", "correct horse", account)).toBe(true);
    expect(verifyEvaluationCredentials("demo@umang.com", "wrong password", account)).toBe(false);
    expect(verifyEvaluationCredentials("someone@umang.local", "correct horse", account)).toBe(false);
  });
});
