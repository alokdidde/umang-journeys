import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { isSandboxServiceKey } from "@/domain/service-workflows";
import { journeyRepository } from "@/server/repositories/journey-repository";
import { getDemoSession } from "@/server/session";

function safeName(value: string) {
  return value.toLocaleLowerCase("en-IN").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "service-record";
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string; key: string }> }) {
  const sessionId = await getDemoSession();
  if (!sessionId) return Response.json({ code: "UNAUTHENTICATED" }, { status: 401 });
  const { id, key } = await params;
  if (!isSandboxServiceKey(key)) return Response.json({ code: "SERVICE_NOT_FOUND" }, { status: 404 });
  const journey = await journeyRepository.get(sessionId, id);
  const run = journey?.serviceRuns[key];
  if (!journey || run?.status !== "completed" || !run.artifact) return Response.json({ code: "OUTPUT_NOT_READY", message: "Complete this service before downloading its record." }, { status: 409 });

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  page.drawRectangle({ x: 36, y: 52, width: 523, height: 738, borderColor: rgb(0.16, 0.38, 0.78), borderWidth: 1.2 });
  page.drawText("UMANG JOURNEYS · SYNTHETIC SERVICE RECORD", { x: 58, y: 752, size: 9, font: bold, color: rgb(0.72, 0.17, 0.2) });
  page.drawText(run.artifact.title, { x: 58, y: 716, size: 19, font: bold, color: rgb(0.06, 0.13, 0.27) });
  page.drawText(run.artifact.subtitle.slice(0, 86), { x: 58, y: 692, size: 9, font: regular, color: rgb(0.34, 0.4, 0.5) });
  page.drawText(`${run.artifact.referenceLabel}: ${run.artifact.referenceValue}`, { x: 58, y: 655, size: 11, font: bold, color: rgb(0.1, 0.28, 0.57) });
  let y = 612;
  for (const fact of run.artifact.facts) {
    page.drawText(fact.label, { x: 58, y, size: 8, font: regular, color: rgb(0.4, 0.45, 0.53) });
    page.drawText(fact.value.slice(0, 76), { x: 58, y: y - 17, size: 11, font: bold, color: rgb(0.06, 0.13, 0.27) });
    y -= 46;
  }
  for (const group of run.artifact.groups) {
    if (y < 165) break;
    page.drawText(group.title, { x: 58, y, size: 11, font: bold, color: rgb(0.06, 0.13, 0.27) });
    y -= 22;
    for (const item of group.items.slice(0, 5)) {
      page.drawText(`• ${item.title} — ${item.meta}`.slice(0, 92), { x: 66, y, size: 8.5, font: regular, color: rgb(0.18, 0.23, 0.32) });
      y -= 18;
    }
    y -= 10;
  }
  page.drawText(run.artifact.notice.slice(0, 106), { x: 58, y: 102, size: 8, font: regular, color: rgb(0.48, 0.25, 0.25) });
  page.drawText(`Provider receipt ${run.receipt} · Case approved ${run.completedAt ?? run.updatedAt}`, { x: 58, y: 77, size: 7.5, font: regular, color: rgb(0.42, 0.46, 0.52) });
  const bytes = await pdf.save();
  return new Response(Buffer.from(bytes), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${safeName(run.artifact.title)}.pdf"`,
      "cache-control": "private, no-store",
    },
  });
}
