import { NextResponse } from "next/server";
import { z } from "zod";
import { isEvidenceType } from "@/domain/evidence";
import { getDemoSession } from "@/server/session";
import { createSampleEvidence, ingestUploadedEvidence } from "@/server/evidence-ingestion";
import { journeyRepository } from "@/server/repositories/journey-repository";

const sampleSchema = z.object({ type: z.string(), sample: z.literal(true) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sessionId = await getDemoSession();
  if (!sessionId) return NextResponse.json({ code: "UNAUTHENTICATED", message: "Sign in to continue." }, { status: 401 });
  const { id } = await params;
  const journey = await journeyRepository.get(sessionId, id);
  if (!journey) return NextResponse.json({ code: "JOURNEY_NOT_FOUND" }, { status: 404 });

  try {
    let evidence;
    if (request.headers.get("content-type")?.includes("multipart/form-data")) {
      const form = await request.formData();
      const type = String(form.get("type") ?? "");
      const file = form.get("file");
      if (!isEvidenceType(type) || !(file instanceof File)) return NextResponse.json({ code: "INVALID_EVIDENCE", message: "Choose an evidence type and file." }, { status: 400 });
      evidence = await ingestUploadedEvidence(type, { name: file.name, type: file.type, bytes: new Uint8Array(await file.arrayBuffer()) }, journey.facts);
    } else {
      const parsed = sampleSchema.safeParse(await request.json().catch(() => ({})));
      if (!parsed.success || !isEvidenceType(parsed.data.type)) return NextResponse.json({ code: "INVALID_EVIDENCE", message: "Choose a supported sample document." }, { status: 400 });
      evidence = await createSampleEvidence(parsed.data.type, journey.facts);
    }
    const updated = await journeyRepository.addEvidence(sessionId, id, evidence);
    return NextResponse.json({ ...updated, synthetic: evidence.source === "sample" });
  } catch (error) {
    const unavailable = error instanceof Error && "code" in error && ["AI_GATEWAY_NOT_CONFIGURED", "AI_DOCUMENT_ANALYSIS_FAILED"].includes(String(error.code));
    return NextResponse.json({ code: unavailable ? "DOCUMENT_ANALYSIS_FAILED" : "INVALID_EVIDENCE", message: error instanceof Error ? error.message : "Evidence could not be processed." }, { status: unavailable ? 503 : 400 });
  }
}
