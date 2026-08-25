import { NextResponse } from "next/server";
import { z } from "zod";
import { getDemoSession } from "@/server/session";
import { journeyRepository } from "@/server/repositories/journey-repository";

const bodySchema = z.object({ childName: z.string().trim().min(2), localWard: z.string().trim().min(2), idempotencyKey: z.string().min(8) });
export async function POST(request: Request, { params }: { params: Promise<{ id: string; key: string }> }) {
  const { id, key } = await params;
  if (key !== "birth_registration") return NextResponse.json({ code: "NODE_LOCKED", message: "This service is not available in the prototype." }, { status: 409 });
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ code: "MISSING_REQUIREMENTS", message: "Child name and local ward are required." }, { status: 400 });
  const sessionId = await getDemoSession();
  await journeyRepository.updateFacts(sessionId, id, { "child.name": parsed.data.childName, "birth.place.ward": parsed.data.localWard });
  const journey = await journeyRepository.completeRegistration(sessionId, id, parsed.data.idempotencyKey);
  return journey ? NextResponse.json({ ...journey, synthetic: true }) : NextResponse.json({ code: "JOURNEY_NOT_FOUND" }, { status: 404 });
}
