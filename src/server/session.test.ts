import { afterEach, describe, expect, it, vi } from "vitest";
import { createSessionToken, SESSION_TTL_SECONDS, verifySessionToken } from "./session";

describe("evaluation sessions", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("accepts a signed token only until its server-enforced expiry", () => {
    vi.stubEnv("SESSION_SECRET", "test-session-secret-with-at-least-32-characters");
    const now = Date.UTC(2026, 7, 26, 4, 0, 0);
    const token = createSessionToken(now);

    expect(verifySessionToken(token, now)).toBe("evaluation-user");
    expect(verifySessionToken(token, now + SESSION_TTL_SECONDS * 1000 - 1)).toBe("evaluation-user");
    expect(verifySessionToken(token, now + SESSION_TTL_SECONDS * 1000)).toBeNull();
  });

  it("rejects missing, malformed, and tampered tokens", () => {
    vi.stubEnv("SESSION_SECRET", "test-session-secret-with-at-least-32-characters");
    const token = createSessionToken();

    expect(verifySessionToken()).toBeNull();
    expect(verifySessionToken("malformed-token")).toBeNull();
    expect(verifySessionToken(`${token}extra`)).toBeNull();
    expect(verifySessionToken(token.replace("evaluation-user", "another-user"))).toBeNull();
  });
});
