import { NextResponse } from "next/server";
import { getDemoSession } from "@/server/session";
import { journeyRepository } from "@/server/repositories/journey-repository";
import { z } from "zod";

const bodySchema = z.object({ facts: z.record(z.string(), z.string().max(500)).default({}) });

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ code: "INVALID_FACTS", message: "The journey facts are invalid." }, { status: 400 });
  const sessionId = await getDemoSession();
  if (!sessionId) return NextResponse.json({ code: "UNAUTHENTICATED", message: "Sign in to continue." }, { status: 401 });
  const created = await journeyRepository.create(sessionId);
  const journey = Object.keys(parsed.data.facts).length
    ? await journeyRepository.updateFacts(sessionId, created.id, parsed.data.facts)
    : created;
  return NextResponse.json(journey, { status: 201 });
}
