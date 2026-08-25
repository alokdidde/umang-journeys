import { NextResponse } from "next/server";
import { getDemoSession } from "@/server/session";
import { journeyRepository } from "@/server/repositories/journey-repository";
import { z } from "zod";
import { buildJourneySummary } from "@/domain/journey-summary";

const bodySchema = z.object({ facts: z.record(z.string(), z.string().max(500)).default({}) });

export async function GET() {
  const sessionId = await getDemoSession();
  if (!sessionId) return NextResponse.json({ code: "UNAUTHENTICATED", message: "Sign in to continue." }, { status: 401 });
  const journeys = await journeyRepository.list(sessionId);
  return NextResponse.json({ journeys: journeys.map(buildJourneySummary) });
}

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ code: "INVALID_FACTS", message: "The journey facts are invalid." }, { status: 400 });
  const sessionId = await getDemoSession();
  if (!sessionId) return NextResponse.json({ code: "UNAUTHENTICATED", message: "Sign in to continue." }, { status: 401 });
  const journey = await journeyRepository.create(sessionId, parsed.data.facts);
  return NextResponse.json(journey, { status: 201 });
}
