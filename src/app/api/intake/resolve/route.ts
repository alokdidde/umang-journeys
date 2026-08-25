import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveIntake } from "@/server/intake-resolver";
import { getDemoSession } from "@/server/session";

const requestSchema = z.object({ statement: z.string().trim().min(3).max(1_000) });

export async function POST(request: Request) {
  if (!await getDemoSession()) return NextResponse.json({ code: "UNAUTHENTICATED", message: "Sign in to continue." }, { status: 401 });
  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ code: "INVALID_STATEMENT", message: "Describe the life event in a little more detail." }, { status: 400 });
  try {
    const result = await resolveIntake(parsed.data.statement);
    return NextResponse.json(result);
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String(error.code) : "INTAKE_UNAVAILABLE";
    return NextResponse.json({ code, message: error instanceof Error ? error.message : "Intake could not be resolved." }, { status: 422 });
  }
}
