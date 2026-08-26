import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib";
import { getDemoSession } from "@/server/session";
import { journeyRepository } from "@/server/repositories/journey-repository";

export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sessionId = await getDemoSession();
  if (!sessionId) return NextResponse.json({ code: "UNAUTHENTICATED" }, { status: 401 });
  const journey = await journeyRepository.get(sessionId, id);
  if (!journey) return NextResponse.json({ code: "JOURNEY_NOT_FOUND" }, { status: 404 });
  if (!journey.registrationId) return NextResponse.json({ code: "REGISTRATION_INCOMPLETE" }, { status: 409 });
  if (journey.projection.nodes.find((node) => node.key === "birth_certificate")?.status !== "completed") {
    return NextResponse.json({ code: "CERTIFICATE_NOT_GENERATED" }, { status: 409 });
  }
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([842, 595]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const navy = rgb(0.04, 0.1, 0.22);
  const blue = rgb(0.08, 0.31, 0.76);
  const pale = rgb(0.93, 0.96, 1);
  page.drawRectangle({ x: 28, y: 28, width: 786, height: 539, borderColor: blue, borderWidth: 2, color: rgb(1, 1, 1) });
  page.drawRectangle({ x: 45, y: 445, width: 752, height: 92, color: pale });
  page.drawText("UMANG LIFE", { x: 68, y: 505, size: 13, font: bold, color: blue });
  page.drawText("SYNTHETIC BIRTH RECORD", { x: 68, y: 470, size: 26, font: bold, color: navy });
  page.drawText("DEMO / NOT OFFICIAL", { x: 185, y: 225, size: 55, font: bold, color: rgb(0.87, 0.9, 0.96), rotate: degrees(22) });
  const fields = [
    ["Child's name", journey.facts["child.name"] ?? "Not provided"], ["Registration number", journey.registrationId],
    ["Date of birth", journey.facts["child.dateOfBirth"] ?? "24 August 2026"], ["Place of birth", `${journey.facts["birth.city"] ?? "Hyderabad"}, ${journey.facts["birth.state"] ?? "Telangana"}`],
    ["Hospital", `${journey.facts["birth.hospital"] ?? "Apollo Hospital"} (synthetic)`], ["Environment", "Evaluation sandbox"],
  ];
  fields.forEach(([label, value], index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const x = 90 + column * 370;
    const y = 392 - row * 88;
    page.drawText(label.toUpperCase(), { x, y, size: 9, font: bold, color: rgb(0.42, 0.47, 0.57) });
    page.drawText(value, { x, y: y - 24, size: 15, font: regular, color: navy });
  });
  page.drawText("This document was generated for a prototype demonstration. No government system was contacted.", { x: 90, y: 68, size: 10, font: regular, color: rgb(0.44, 0.49, 0.58) });
  const bytes = await pdf.save();
  return new NextResponse(Buffer.from(bytes), {
    headers: { "content-type": "application/pdf", "content-disposition": "attachment; filename=UMANG-SANDBOX-birth-certificate.pdf", "cache-control": "no-store" },
  });
}
