import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE_NAME = "umang_session";
const EVALUATION_USER_ID = "evaluation-user";

function sessionSecret() {
  const value = process.env.SESSION_SECRET;
  if (value) return value;
  if (process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET is required in production.");
  return "local-only-umang-session-secret-change-me";
}

function sign(value: string) {
  return createHmac("sha256", sessionSecret()).update(value).digest("base64url");
}

export function verifySessionToken(raw?: string) {
  if (!raw) return null;
  const [value, signature] = raw.split(".");
  if (!value || !signature) return null;
  const expected = sign(value);
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  return value === EVALUATION_USER_ID ? value : null;
}

export async function createEvaluationSession() {
  const jar = await cookies();
  jar.set(SESSION_COOKIE_NAME, `${EVALUATION_USER_ID}.${sign(EVALUATION_USER_ID)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 8,
    path: "/",
  });
}

export async function clearEvaluationSession() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE_NAME);
}

export async function getDemoSession() {
  const jar = await cookies();
  return verifySessionToken(jar.get(SESSION_COOKIE_NAME)?.value);
}
