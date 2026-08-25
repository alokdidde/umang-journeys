import { NextResponse } from "next/server";
import { getDemoSession } from "@/server/session";
import { journeyRepository } from "@/server/repositories/journey-repository";
import { documentIntakeRepository } from "@/server/repositories/document-intake-repository";

export async function POST() {
  const sessionId = await getDemoSession();
  if (!sessionId) return NextResponse.json({ code: "UNAUTHENTICATED", message: "Sign in to continue." }, { status: 401 });
  await documentIntakeRepository.reset(sessionId);
  await journeyRepository.reset(sessionId);
  return NextResponse.json({ scenarioId: "NEW_BABY_01", reset: true, synthetic: true });
}
