import { NextResponse } from "next/server";
import { buildCitizenHubSnapshot } from "@/domain/citizen-hub";
import { buildJourneySummary } from "@/domain/journey-summary";
import { getDemoSession } from "@/server/session";
import { documentIntakeRepository } from "@/server/repositories/document-intake-repository";
import { journeyRepository } from "@/server/repositories/journey-repository";

export async function GET() {
  const sessionId = await getDemoSession();
  if (!sessionId) return NextResponse.json({ code: "UNAUTHENTICATED", message: "Sign in to continue." }, { status: 401 });
  const [journeys, documents, entities] = await Promise.all([
    journeyRepository.list(sessionId),
    documentIntakeRepository.list(sessionId),
    journeyRepository.listEntityRecords(sessionId),
  ]);
  return NextResponse.json(buildCitizenHubSnapshot({
    journeys: journeys.map((journey) => ({ ...journey, title: buildJourneySummary(journey).title })),
    documents,
    entities: entities.map((entity) => ({ id: entity.id, displayName: entity.displayName })),
  }));
}
