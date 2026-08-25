import { NextResponse } from "next/server";
import { z } from "zod";
import { getDemoSession } from "@/server/session";
import { journeyRepository } from "@/server/repositories/journey-repository";
import { isSandboxServiceKey } from "@/server/integrations/sandbox-services";
import { missingEvidence } from "@/domain/evidence";

const registrationSchema = z.object({ childName: z.string().trim().min(2), localWard: z.string().trim().min(2), idempotencyKey: z.string().min(8) });
const serviceSchema = z.object({ idempotencyKey: z.string().min(8) });
const vehicleDetailsSchema = z.object({
  "vehicle.registrationNumber": z.string().trim().regex(/^[A-Z]{2}\d{2}[A-Z0-9]{1,3}\d{4}$/, "Enter a valid Indian registration number"),
  "vehicle.makeModel": z.string().trim().min(2),
  "vehicle.purchaseDate": z.iso.date(),
  "vehicle.sellerName": z.string().trim().min(2),
  "vehicle.chassisLast5": z.string().trim().regex(/^[A-Z0-9]{5}$/),
  "vehicle.transferScope": z.enum(["same_state", "interstate"]),
  idempotencyKey: z.string().min(8),
});
const healthProfileSchema = z.object({
  "person.name": z.string().trim().min(2),
  "person.dateOfBirth": z.iso.date(),
  "person.state": z.string().trim().min(2),
  "household.size": z.string().regex(/^\d{1,2}$/),
  "health.currentCover": z.enum(["yes", "not_sure", "no"]),
  "health.abhaStatus": z.enum(["yes", "not_sure", "no"]),
  idempotencyKey: z.string().min(8),
});
const moveProfileSchema = z.object({
  "person.name": z.string().trim().min(2),
  "move.newAddress": z.string().trim().min(8),
  "move.newCity": z.string().trim().min(2),
  "move.newState": z.string().trim().min(2),
  "move.pinCode": z.string().regex(/^\d{6}$/),
  "move.date": z.iso.date(),
  "move.occupancy": z.enum(["rented", "owned", "family", "not_sure"]),
  "household.size": z.string().regex(/^\d{1,2}$/),
  "move.hasEpic": z.enum(["yes", "not_sure", "no"]),
  idempotencyKey: z.string().min(8),
});
const businessProfileSchema = z.object({
  "business.name": z.string().trim().min(2),
  "business.activity": z.string().trim().min(2),
  "business.structure": z.enum(["sole_proprietorship", "partnership", "llp", "company", "not_sure"]),
  "business.address": z.string().trim().min(8),
  "business.city": z.string().trim().min(2),
  "business.state": z.string().trim().min(2),
  "business.startDate": z.iso.date(),
  "business.occupancy": z.enum(["rented", "owned", "consent", "shared"]),
  "business.expectedTurnover": z.string().regex(/^\d{1,12}$/),
  "business.interstateSupplies": z.enum(["yes", "not_sure", "no"]),
  idempotencyKey: z.string().min(8),
});
const retirementProfileSchema = z.object({
  "person.name": z.string().trim().min(2),
  "person.dateOfBirth": z.iso.date(),
  "retirement.date": z.iso.date(),
  "retirement.employmentSector": z.enum(["private", "central_government", "state_government", "self_employed", "not_sure"]),
  "retirement.accountType": z.enum(["epfo", "nps", "employer_pension", "multiple", "not_sure"]),
  "retirement.serviceYears": z.string().regex(/^\d{1,2}$/),
  "retirement.pensionStarted": z.enum(["yes", "not_sure", "no"]),
  idempotencyKey: z.string().min(8),
});
export async function POST(request: Request, { params }: { params: Promise<{ id: string; key: string }> }) {
  const { id, key } = await params;
  const sessionId = await getDemoSession();
  if (!sessionId) return NextResponse.json({ code: "UNAUTHENTICATED", message: "Sign in to continue." }, { status: 401 });
  const payload: unknown = await request.json().catch(() => ({}));
  if (key === "birth_registration") {
    const parsed = registrationSchema.safeParse(payload);
    if (!parsed.success) return NextResponse.json({ code: "MISSING_REQUIREMENTS", message: "Child name and local ward are required." }, { status: 400 });
    await journeyRepository.updateFacts(sessionId, id, { "child.name": parsed.data.childName, "birth.place.ward": parsed.data.localWard });
    const journey = await journeyRepository.completeRegistration(sessionId, id, parsed.data.idempotencyKey);
    return journey ? NextResponse.json({ ...journey, synthetic: true }) : NextResponse.json({ code: "JOURNEY_NOT_FOUND" }, { status: 404 });
  }
  if (key === "vehicle_details") {
    const parsed = vehicleDetailsSchema.safeParse(payload);
    if (!parsed.success) return NextResponse.json({ code: "MISSING_REQUIREMENTS", message: "Complete all vehicle and purchase details using the requested format." }, { status: 400 });
    const { idempotencyKey, ...facts } = parsed.data;
    await journeyRepository.updateFacts(sessionId, id, facts);
    const journey = await journeyRepository.completeStep(sessionId, id, key, idempotencyKey);
    return journey ? NextResponse.json({ ...journey, synthetic: true }) : NextResponse.json({ code: "JOURNEY_NOT_FOUND" }, { status: 404 });
  }
  if (key === "health_profile") {
    const parsed = healthProfileSchema.safeParse(payload);
    if (!parsed.success) return NextResponse.json({ code: "MISSING_REQUIREMENTS", message: "Complete the person and coverage details using the requested format." }, { status: 400 });
    const { idempotencyKey, ...facts } = parsed.data;
    await journeyRepository.updateFacts(sessionId, id, facts);
    const journey = await journeyRepository.completeStep(sessionId, id, key, idempotencyKey);
    return journey ? NextResponse.json({ ...journey, synthetic: true }) : NextResponse.json({ code: "JOURNEY_NOT_FOUND" }, { status: 404 });
  }
  const profileSchema = key === "move_profile" ? moveProfileSchema : key === "business_profile" ? businessProfileSchema : key === "retirement_profile" ? retirementProfileSchema : null;
  if (profileSchema) {
    const parsed = profileSchema.safeParse(payload);
    if (!parsed.success) return NextResponse.json({ code: "MISSING_REQUIREMENTS", message: "Complete each required journey detail using the requested format." }, { status: 400 });
    const { idempotencyKey, ...facts } = parsed.data;
    await journeyRepository.updateFacts(sessionId, id, facts);
    const journey = await journeyRepository.completeStep(sessionId, id, key, idempotencyKey);
    return journey ? NextResponse.json({ ...journey, synthetic: true }) : NextResponse.json({ code: "JOURNEY_NOT_FOUND" }, { status: 404 });
  }
  if (!isSandboxServiceKey(key)) return NextResponse.json({ code: "NODE_NOT_FOUND", message: "This service does not exist." }, { status: 404 });
  const parsed = serviceSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ code: "INVALID_REQUEST", message: "A valid idempotency key is required." }, { status: 400 });
  const current = await journeyRepository.get(sessionId, id);
  if (!current) return NextResponse.json({ code: "JOURNEY_NOT_FOUND" }, { status: 404 });
  if (current.projection.nodes.find((node) => node.key === key)?.status === "locked") {
    return NextResponse.json({ code: "NODE_LOCKED", message: "Complete the prerequisite journey steps before using this service." }, { status: 409 });
  }
  const missing = missingEvidence(key, current.evidence);
  if (missing.length > 0) return NextResponse.json({ code: "MISSING_EVIDENCE", message: "Add and verify the required evidence before starting this service.", missing }, { status: 409 });
  if (key === "fastag_setup" && (!current.facts["fastag.mobileLast4"] || !current.facts["fastag.issuer"])) {
    return NextResponse.json({ code: "MISSING_REQUIREMENTS", message: "Choose an issuer and verify a mobile number before activating FASTag." }, { status: 409 });
  }
  const journey = await journeyRepository.advanceService(sessionId, id, key, parsed.data.idempotencyKey);
  return journey ? NextResponse.json({ ...journey, synthetic: true }) : NextResponse.json({ code: "JOURNEY_NOT_FOUND" }, { status: 404 });
}
