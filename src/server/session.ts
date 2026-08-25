import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "umang_demo_session";
const secret = process.env.SESSION_SECRET ?? "local-demo-secret-change-before-public-deployment";

function sign(value: string) { return createHmac("sha256", secret).update(value).digest("base64url"); }

function verify(raw?: string) {
  if (!raw) return null;
  const [value, signature] = raw.split(".");
  if (!value || !signature) return null;
  const expected = sign(value);
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  return value;
}

export async function getDemoSession() {
  const jar = await cookies();
  const current = verify(jar.get(COOKIE_NAME)?.value);
  if (current) return current;
  const sessionId = randomUUID();
  jar.set(COOKIE_NAME, `${sessionId}.${sign(sessionId)}`, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24, path: "/" });
  return sessionId;
}
