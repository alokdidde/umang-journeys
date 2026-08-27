import { NextResponse } from "next/server";
import { buildJourneySummary } from "@/domain/journey-summary";
import { journeyRepository } from "@/server/repositories/journey-repository";
import { getDemoSession } from "@/server/session";

export async function GET() {
  const sessionId = await getDemoSession();
  if (!sessionId) return NextResponse.json({ code: "UNAUTHENTICATED", message: "Sign in to continue." }, { status: 401 });
  const [journeys, entities] = await Promise.all([
    journeyRepository.list(sessionId),
    journeyRepository.listEntityRecords(sessionId),
  ]);
  return NextResponse.json({ journeys: journeys.map(buildJourneySummary), entities });
}
