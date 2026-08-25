import { getDemoSession } from "@/server/session";
import { documentIntakeRepository } from "@/server/repositories/document-intake-repository";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const sessionId = await getDemoSession();
  if (!sessionId) return Response.json({ code: "UNAUTHENTICATED" }, { status: 401 });
  const { id } = await params;
  const document = await documentIntakeRepository.get(sessionId, id);
  if (!document) return Response.json({ code: "DOCUMENT_NOT_FOUND" }, { status: 404 });
  return new Response(Buffer.from(document.contentBase64, "base64"), {
    headers: {
      "content-type": document.mimeType,
      "content-disposition": `inline; filename="${document.fileName.replaceAll('"', "")}"`,
      "cache-control": "private, no-store",
    },
  });
}
