import { NextResponse } from "next/server";
import { getDemoSession } from "@/server/session";
import { journeyRepository } from "@/server/repositories/journey-repository";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sessionId = await getDemoSession();
  const journey = await journeyRepository.get(sessionId, id);
  return journey ? NextResponse.json(journey) : NextResponse.json({ code: "JOURNEY_NOT_FOUND", message: "This demo journey does not belong to the current session." }, { status: 404 });
}
