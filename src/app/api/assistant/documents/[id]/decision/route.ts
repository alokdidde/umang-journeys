import { NextResponse } from "next/server";
import { z } from "zod";
import { buildJourneySummary } from "@/domain/journey-summary";
import { documentAssistant } from "@/server/document-assistant-instance";
import { getDemoSession } from "@/server/session";
import { journeyRepository } from "@/server/repositories/journey-repository";

const bodySchema = z.object({ approved: z.boolean(), targetJourneyId: z.string().optional(), fields: z.record(z.string(), z.string().max(300)).optional() });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sessionId = await getDemoSession();
  if (!sessionId) return NextResponse.json({ code: "UNAUTHENTICATED", message: "Sign in to continue." }, { status: 401 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ code: "INVALID_DECISION", message: "Approve or dismiss the proposed update." }, { status: 400 });
  const { id } = await params;
  try {
    const result = await documentAssistant.apply(sessionId, id, parsed.data.approved, { targetJourneyId: parsed.data.targetJourneyId, fields: parsed.data.fields });
    const journey = result.journeyId ? await journeyRepository.get(sessionId, result.journeyId) : null;
    return NextResponse.json({ ...result, journey: journey ? buildJourneySummary(journey) : null });
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String(error.code) : "DOCUMENT_APPLY_FAILED";
    return NextResponse.json({ code, message: error instanceof Error ? error.message : "The proposed update could not be applied." }, { status: code === "DOCUMENT_NOT_FOUND" ? 404 : 409 });
  }
}
