import { NextResponse } from "next/server";
import { createSampleEvidence } from "@/server/evidence-ingestion";
import { analyzeUploadedDocument } from "@/server/document-analysis";
import { documentAssistant } from "@/server/document-assistant-instance";
import { getDemoSession } from "@/server/session";
import { journeyRepository } from "@/server/repositories/journey-repository";

function publicRecord(record: Awaited<ReturnType<typeof documentAssistant.propose>>) {
  return {
    id: record.id,
    status: record.status,
    fileName: record.fileName,
    mimeType: record.mimeType,
    size: record.size,
    source: record.source,
    analysis: record.analysis,
    proposal: record.proposal,
    appliedJourneyId: record.appliedJourneyId,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export async function POST(request: Request) {
  const sessionId = await getDemoSession();
  if (!sessionId) return NextResponse.json({ code: "UNAUTHENTICATED", message: "Sign in to continue." }, { status: 401 });

  try {
    const form = await request.formData();
    const sampleType = String(form.get("sampleType") ?? "");
    const context = String(form.get("context") ?? "").trim().slice(0, 300);
    let fileName: string;
    let mimeType: string;
    let bytes: Uint8Array;
    let source: "sample" | "user_upload";
    let analysis;

    if (sampleType === "vehicle_rc" || sampleType === "vaccination_receipt" || sampleType === "insurance_policy" || sampleType === "health_insurance_policy" || sampleType === "hospital_discharge_summary" || sampleType === "residence_proof" || sampleType === "business_premises_proof" || sampleType === "retirement_account_statement") {
      const journeys = await journeyRepository.list(sessionId);
      const child = journeys.find((journey) => journey.subject.type === "child");
      const vehicle = journeys.find((journey) => journey.subject.type === "vehicle");
      const person = journeys.find((journey) => journey.subject.type === "person");
      const residence = journeys.find((journey) => journey.subject.type === "residence");
      const business = journeys.find((journey) => journey.subject.type === "business");
      const sampleFacts: Record<string, string> = sampleType === "health_insurance_policy" ? {
        "person.name": person?.subject.displayName ?? "Ananya Sharma",
        "person.dateOfBirth": person?.facts["person.dateOfBirth"] ?? "1992-04-18",
        "person.state": person?.facts["person.state"] ?? "Telangana",
      } : sampleType === "residence_proof" ? {
        "person.name": residence?.facts["person.name"] ?? "Ananya Sharma",
        "move.newAddress": residence?.facts["move.newAddress"] ?? "12 Lake View Road, Madhapur, Hyderabad 500081",
        "move.occupancy": residence?.facts["move.occupancy"] ?? "rented",
      } : sampleType === "business_premises_proof" ? {
        "business.name": business?.facts["business.name"] ?? "Ananya Design Studio",
        "business.address": business?.facts["business.address"] ?? "4 Creative Lane, Jubilee Hills, Hyderabad 500033",
        "business.occupancy": business?.facts["business.occupancy"] ?? "Rented premises",
      } : sampleType === "retirement_account_statement" ? {
        "person.name": person?.subject.displayName ?? "Ananya Sharma",
        "retirement.accountType": person?.facts["retirement.accountType"] ?? "epfo_eps",
        "retirement.serviceYears": person?.facts["retirement.serviceYears"] ?? "14 years",
      } : sampleType === "vehicle_rc" || sampleType === "insurance_policy" ? {
        "vehicle.registrationNumber": vehicle?.facts["vehicle.registrationNumber"] ?? "TS09EV4321",
        "vehicle.makeModel": vehicle?.facts["vehicle.makeModel"] ?? "Tata Nexon EV",
        "vehicle.chassisLast5": "7K2P9",
      } : {
        "child.name": child?.subject.displayName ?? (sampleType === "hospital_discharge_summary" ? "Mira Sharma" : "Aarav Sharma"),
        "child.dateOfBirth": child?.facts["child.dateOfBirth"] ?? (sampleType === "hospital_discharge_summary" ? "2026-08-25" : "2026-08-24"),
        "birth.hospital": child?.facts["birth.hospital"] ?? child?.facts["hospital.name"] ?? "Apollo Hospital",
        "birth.city": child?.facts["birth.city"] ?? "Hyderabad",
        "birth.state": child?.facts["birth.state"] ?? "Telangana",
      };
      const sample = await createSampleEvidence(sampleType, sampleFacts);
      fileName = sample.fileName;
      mimeType = sample.mimeType;
      bytes = new Uint8Array(Buffer.from(sample.contentBase64, "base64"));
      source = "sample";
      analysis = { kind: sampleType, confidence: 0.98, fields: sample.extractedFields } as const;
    } else {
      const file = form.get("file");
      if (!(file instanceof File)) return NextResponse.json({ code: "MISSING_DOCUMENT", message: "Choose a document to analyse." }, { status: 400 });
      fileName = file.name.slice(0, 120);
      mimeType = file.type;
      bytes = new Uint8Array(await file.arrayBuffer());
      source = "user_upload";
      analysis = await analyzeUploadedDocument({ fileName, mimeType, bytes, context });
    }

    const record = await documentAssistant.propose(sessionId, { fileName, mimeType, bytes, source, analysis });
    return NextResponse.json({ document: publicRecord(record), resolver: source === "sample" ? "synthetic_fixture" : "ai_gateway" }, { status: 201 });
  } catch (error) {
    const unavailable = error instanceof Error && "code" in error && ["AI_GATEWAY_NOT_CONFIGURED", "AI_DOCUMENT_ANALYSIS_FAILED"].includes(String(error.code));
    return NextResponse.json({ code: "DOCUMENT_ANALYSIS_FAILED", message: error instanceof Error ? error.message : "The document could not be analysed." }, { status: unavailable ? 503 : 400 });
  }
}
