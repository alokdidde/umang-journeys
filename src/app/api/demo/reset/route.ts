import { NextResponse } from "next/server";
import { getDemoSession } from "@/server/session";
import { journeyRepository } from "@/server/repositories/journey-repository";

export async function POST() {
  const sessionId = await getDemoSession();
  await journeyRepository.reset(sessionId);
  return NextResponse.json({ scenarioId: "NEW_BABY_01", reset: true, synthetic: true });
}
