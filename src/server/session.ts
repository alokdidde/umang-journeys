import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE_NAME = "umang_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 8;
const EVALUATION_USER_ID = "evaluation-user";

function sessionSecret() {
  const value = process.env.SESSION_SECRET;
  if (value && (process.env.NODE_ENV !== "production" || value.length >= 32)) return value;
  if (value && process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET must be at least 32 characters in production.");
  if (process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET is required in production.");
  return "local-only-umang-session-secret-change-me";
}

function sign(value: string) {
  return createHmac("sha256", sessionSecret()).update(value).digest("base64url");
}

export function createSessionToken(now = Date.now()) {
  const expiresAt = Math.floor(now / 1000) + SESSION_TTL_SECONDS;
  const value = `${EVALUATION_USER_ID}:${expiresAt}`;
  return `${value}.${sign(value)}`;
}

export function verifySessionToken(raw?: string, now = Date.now()) {
  if (!raw) return null;
  const parts = raw.split(".");
  if (parts.length !== 2) return null;
  const [value, signature] = parts;
  if (!value || !signature) return null;
  const expected = sign(value);
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  const [userId, expiresAtRaw] = value.split(":");
  const expiresAt = Number(expiresAtRaw);
  if (userId !== EVALUATION_USER_ID || !Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(now / 1000)) return null;
  return userId;
}

export async function createEvaluationSession() {
  const jar = await cookies();
  jar.set(SESSION_COOKIE_NAME, createSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL_SECONDS,
    path: "/",
    priority: "high",
  });
}

export async function clearEvaluationSession() {
  const jar = await cookies();
  jar.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/",
    priority: "high",
  });
}

export async function getDemoSession() {
  const jar = await cookies();
  return verifySessionToken(jar.get(SESSION_COOKIE_NAME)?.value);
}
