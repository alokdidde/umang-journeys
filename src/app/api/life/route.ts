import { NextResponse } from "next/server";
import { buildJourneySummary } from "@/domain/journey-summary";
import { journeyRepository } from "@/server/repositories/journey-repository";
import { getDemoSession } from "@/server/session";
import { documentIntakeRepository } from "@/server/repositories/document-intake-repository";

export async function GET() {
  const sessionId = await getDemoSession();
  if (!sessionId) return NextResponse.json({ code: "UNAUTHENTICATED", message: "Sign in to continue." }, { status: 401 });
  const [journeys, entities, documents] = await Promise.all([
    journeyRepository.list(sessionId),
    journeyRepository.listEntityRecords(sessionId),
    documentIntakeRepository.list(sessionId),
  ]);
  return NextResponse.json({
    journeys: journeys.map(buildJourneySummary),
    entities,
    documents: documents.filter((document) => document.appliedEntityId).map((document) => ({ id: document.id, entityId: document.appliedEntityId, fileName: document.fileName, kind: document.analysis.kind, createdAt: document.createdAt })),
  });
}
