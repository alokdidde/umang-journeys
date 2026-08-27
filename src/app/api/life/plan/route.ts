import { NextResponse } from "next/server";
import { z } from "zod";
import { getDemoSession } from "@/server/session";
import { planLifeRequest, type LifeRequestRecordContext } from "@/server/life-request-planner";
import { journeyRepository } from "@/server/repositories/journey-repository";
import { getJourneyTemplate } from "@/domain/journey-engine";

const requestSchema = z.object({ statement: z.string().trim().min(3).max(1_000) });

export async function POST(request: Request) {
  const sessionId = await getDemoSession();
  if (!sessionId) return NextResponse.json({ code: "UNAUTHENTICATED", message: "Sign in to continue." }, { status: 401 });
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ code: "INVALID_STATEMENT", message: "Tell us a little more about what changed." }, { status: 400 });
  try {
    const [journeys, entities] = await Promise.all([journeyRepository.list(sessionId), journeyRepository.listEntityCandidates(sessionId)]);
    const records = new Map<string, LifeRequestRecordContext>();
    for (const journey of journeys) {
      const id = journey.subject.canonicalEntityId;
      if (!id) continue;
      const existing = records.get(id);
      records.set(id, {
        id,
        displayName: journey.subject.displayName,
        entityKind: journey.subject.entityKind ?? journey.subject.type,
        relationship: journey.subject.context?.relationshipToAccountHolder,
        connectedPeople: journey.subject.context?.connectedPeople?.map((person) => ({ displayName: person.displayName, roles: person.roles })),
        services: [...new Set([...(existing?.services ?? []), getJourneyTemplate(journey.projection.templateId)?.title ?? journey.projection.templateId])],
      });
    }
    for (const entity of entities) if (!records.has(entity.id)) records.set(entity.id, {
      id: entity.id,
      displayName: entity.displayName,
      entityKind: entity.kind,
      relationship: entity.context?.relationshipToAccountHolder,
      connectedPeople: entity.context?.connectedPeople?.map((person) => ({ displayName: person.displayName, roles: person.roles })),
      services: [],
    });
    return NextResponse.json({ plan: await planLifeRequest(parsed.data.statement, { records: [...records.values()] }) });
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String(error.code) : "LIFE_REQUEST_UNAVAILABLE";
    return NextResponse.json({ code, message: error instanceof Error ? error.message : "We could not organise that request." }, { status: code.startsWith("AI_") ? 503 : 422 });
  }
}
