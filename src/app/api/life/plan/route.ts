import { NextResponse } from "next/server";
import { z } from "zod";
import { getDemoSession } from "@/server/session";
import { planLifeRequest } from "@/server/life-request-planner";

const requestSchema = z.object({ statement: z.string().trim().min(3).max(1_000) });

export async function POST(request: Request) {
  if (!await getDemoSession()) return NextResponse.json({ code: "UNAUTHENTICATED", message: "Sign in to continue." }, { status: 401 });
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ code: "INVALID_STATEMENT", message: "Tell us a little more about what changed." }, { status: 400 });
  try {
    return NextResponse.json({ plan: await planLifeRequest(parsed.data.statement) });
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String(error.code) : "LIFE_REQUEST_UNAVAILABLE";
    return NextResponse.json({ code, message: error instanceof Error ? error.message : "We could not organise that request." }, { status: code.startsWith("AI_") ? 503 : 422 });
  }
}
