import { NextResponse } from "next/server";
import { z } from "zod";
import { getDemoSession } from "@/server/session";
import { journeyRepository } from "@/server/repositories/journey-repository";
import { isSandboxServiceKey } from "@/server/integrations/sandbox-services";

const registrationSchema = z.object({ childName: z.string().trim().min(2), localWard: z.string().trim().min(2), idempotencyKey: z.string().min(8) });
const serviceSchema = z.object({ idempotencyKey: z.string().min(8) });
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
  if (!isSandboxServiceKey(key)) return NextResponse.json({ code: "NODE_NOT_FOUND", message: "This service does not exist." }, { status: 404 });
  const parsed = serviceSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ code: "INVALID_REQUEST", message: "A valid idempotency key is required." }, { status: 400 });
  const current = await journeyRepository.get(sessionId, id);
  if (!current) return NextResponse.json({ code: "JOURNEY_NOT_FOUND" }, { status: 404 });
  if (current.projection.nodes.find((node) => node.key === key)?.status === "locked") {
    return NextResponse.json({ code: "NODE_LOCKED", message: "Complete birth registration before using this service." }, { status: 409 });
  }
  const journey = await journeyRepository.advanceService(sessionId, id, key, parsed.data.idempotencyKey);
  return journey ? NextResponse.json({ ...journey, synthetic: true }) : NextResponse.json({ code: "JOURNEY_NOT_FOUND" }, { status: 404 });
}
