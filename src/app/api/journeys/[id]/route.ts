import { NextResponse } from "next/server";
import { getDemoSession } from "@/server/session";
import { journeyRepository } from "@/server/repositories/journey-repository";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sessionId = await getDemoSession();
  if (!sessionId) return NextResponse.json({ code: "UNAUTHENTICATED", message: "Sign in to continue." }, { status: 401 });
  const journey = await journeyRepository.get(sessionId, id);
  return journey ? NextResponse.json(journey) : NextResponse.json({ code: "JOURNEY_NOT_FOUND", message: "This journey does not belong to the current account." }, { status: 404 });
}
