import { getDemoSession } from "@/server/session";
import { journeyRepository } from "@/server/repositories/journey-repository";

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
