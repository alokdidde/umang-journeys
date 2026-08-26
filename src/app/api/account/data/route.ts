import { documentIntakeRepository } from "@/server/repositories/document-intake-repository";
import { journeyRepository } from "@/server/repositories/journey-repository";
import { getDemoSession } from "@/server/session";

export async function GET() {
  const sessionId = await getDemoSession();
  if (!sessionId) return Response.json({ code: "UNAUTHENTICATED" }, { status: 401 });
  const [journeys, documents] = await Promise.all([journeyRepository.list(sessionId), documentIntakeRepository.list(sessionId)]);
  const payload = {
    exportedAt: new Date().toISOString(),
    environment: "synthetic-evaluation",
    profile: { displayName: "Ananya", locale: "en-IN" },
    journeys: journeys.map((journey) => Object.fromEntries(Object.entries(journey).filter(([key]) => key !== "sessionId"))),
    documents: documents.map((document) => Object.fromEntries(Object.entries(document).filter(([key]) => key !== "sessionId" && key !== "contentBase64"))),
    note: "Binary document contents are excluded. Download individual files from the document library.",
  };
  return new Response(JSON.stringify(payload, null, 2), { headers: { "content-type": "application/json", "content-disposition": `attachment; filename="umang-demo-data-${new Date().toISOString().slice(0, 10)}.json"`, "cache-control": "private, no-store" } });
}

export async function DELETE() {
  const sessionId = await getDemoSession();
  if (!sessionId) return Response.json({ code: "UNAUTHENTICATED" }, { status: 401 });
  await documentIntakeRepository.reset(sessionId);
  await journeyRepository.reset(sessionId);
  return Response.json({ deleted: true, recoverable: false, synthetic: true });
}
