import { getDemoSession } from "@/server/session";
import { journeyRepository } from "@/server/repositories/journey-repository";
import { z } from "zod";

export async function GET(_: Request, { params }: { params: Promise<{ id: string; evidenceId: string }> }) {
  const sessionId = await getDemoSession();
  if (!sessionId) return Response.json({ code: "UNAUTHENTICATED" }, { status: 401 });
  const { id, evidenceId } = await params;
  const evidence = await journeyRepository.getEvidence(sessionId, id, evidenceId);
  if (!evidence) return Response.json({ code: "EVIDENCE_NOT_FOUND" }, { status: 404 });
  return new Response(Buffer.from(evidence.contentBase64, "base64"), {
    headers: {
      "content-type": evidence.mimeType,
      "content-disposition": `inline; filename="${evidence.fileName.replaceAll('"', "")}"`,
      "cache-control": "private, no-store",
    },
  });
}

const reviewSchema = z.object({
  approved: z.boolean(),
  fields: z.record(z.string(), z.string().trim().max(300)).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; evidenceId: string }> }) {
  const sessionId = await getDemoSession();
  if (!sessionId) return Response.json({ code: "UNAUTHENTICATED", message: "Sign in to continue." }, { status: 401 });
  const parsed = reviewSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ code: "INVALID_REVIEW", message: "Review the extracted values before continuing." }, { status: 400 });
  const { id, evidenceId } = await params;
  const journey = await journeyRepository.reviewEvidence(sessionId, id, evidenceId, parsed.data.approved, parsed.data.fields);
  if (!journey) return Response.json({ code: "EVIDENCE_NOT_FOUND", message: "This evidence could not be reviewed." }, { status: 404 });
  const reviewed = journey.evidence.find((item) => item.id === evidenceId);
  if (parsed.data.approved && reviewed?.verificationStatus !== "verified") {
    return Response.json({ code: "EVIDENCE_MISMATCH", message: "Resolve the failed document checks or upload a clearer matching document." }, { status: 409 });
  }
  return Response.json({ ...journey, synthetic: true });
}
