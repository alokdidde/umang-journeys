import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export type EvaluationAccount = { email: string; passwordHash: string };

export function createPasswordHash(password: string, salt = randomBytes(16).toString("hex")) {
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

export function verifyEvaluationCredentials(email: string, password: string, account: EvaluationAccount) {
  const [salt, expectedHex] = account.passwordHash.split(":");
  if (!salt || !expectedHex || email.trim().toLowerCase() !== account.email.trim().toLowerCase()) return false;
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function getEvaluationAccount(): EvaluationAccount {
  const email = process.env.EVALUATION_USER_EMAIL;
  const passwordHash = process.env.EVALUATION_USER_PASSWORD_HASH;
  if (email && passwordHash) return { email, passwordHash };
  if (process.env.NODE_ENV === "production") {
    throw new Error("EVALUATION_USER_EMAIL and EVALUATION_USER_PASSWORD_HASH are required in production.");
  }
  return {
    email: "ananya@umang.local",
    passwordHash: createPasswordHash("UmangDemo!2026", "umang-local-evaluation-account"),
  };
}
