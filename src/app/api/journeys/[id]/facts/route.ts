import { NextResponse } from "next/server";
import { z } from "zod";
import { getDemoSession } from "@/server/session";
import { journeyRepository } from "@/server/repositories/journey-repository";

const bodySchema = z.object({ facts: z.record(z.string(), z.string().max(300)) });
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ code: "INVALID_FACTS", message: "One or more facts are invalid." }, { status: 400 });
  const sessionId = await getDemoSession();
  if (!sessionId) return NextResponse.json({ code: "UNAUTHENTICATED", message: "Sign in to continue." }, { status: 401 });
  const journey = await journeyRepository.updateFacts(sessionId, (await params).id, parsed.data.facts);
  return journey ? NextResponse.json(journey) : NextResponse.json({ code: "JOURNEY_NOT_FOUND" }, { status: 404 });
}
