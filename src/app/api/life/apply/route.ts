import { NextResponse } from "next/server";
import { z } from "zod";
import { lifeRequestOutputSchema, prepareLifeRequest } from "@/domain/life-request";
import { applyLifeRequest } from "@/server/apply-life-request";
import { journeyRepository } from "@/server/repositories/journey-repository";
import { getDemoSession } from "@/server/session";

const answersSchema = z.record(z.string().max(40), z.string().max(500));

export async function POST(request: Request) {
  const sessionId = await getDemoSession();
  if (!sessionId) return NextResponse.json({ code: "UNAUTHENTICATED", message: "Sign in to continue." }, { status: 401 });
  const body = await request.json().catch(() => null) as { plan?: unknown; answers?: unknown } | null;
  const requestId = body?.plan && typeof body.plan === "object" && "requestId" in body.plan ? String(body.plan.requestId) : "";
  const output = lifeRequestOutputSchema.safeParse(body?.plan);
  const answers = answersSchema.safeParse(body?.answers ?? {});
  if (!requestId || requestId.length > 100 || !output.success || !output.data.supported || !answers.success) {
    return NextResponse.json({ code: "INVALID_LIFE_REQUEST", message: "Review the proposed update and try again." }, { status: 400 });
  }
  try {
    const result = await applyLifeRequest(sessionId, prepareLifeRequest(output.data, requestId), answers.data, journeyRepository);
    const archivedEntityIds = new Set(result.archivedEntityIds);
    const subjectEntityIds = output.data.subjects
      .map((subject) => result.subjectEntityIds[subject.ref])
      .filter((id): id is string => Boolean(id) && !archivedEntityIds.has(id!));
    return NextResponse.json({
      subjectEntityId: subjectEntityIds[0] ?? null,
      subjectEntityIds,
      archivedEntityIds: result.archivedEntityIds,
      journeyIds: result.journeys.map((journey) => journey.id),
    });
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String(error.code) : "LIFE_REQUEST_APPLY_FAILED";
    return NextResponse.json({ code, message: error instanceof Error ? error.message : "The update could not be added." }, { status: code === "MISSING_REQUIRED_ANSWERS" ? 400 : 422 });
  }
}
