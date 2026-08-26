import { NextResponse } from "next/server";
import { getDemoSession } from "@/server/session";
import { journeyRepository } from "@/server/repositories/journey-repository";

export async function POST(_: Request, { params }: { params: Promise<{ id: string; key: string }> }) {
  const sessionId = await getDemoSession();
  if (!sessionId) return NextResponse.json({ code: "UNAUTHENTICATED", message: "Sign in to continue." }, { status: 401 });
  const { id, key } = await params;
  const journey = await journeyRepository.activateBranch(sessionId, id, key);
  return journey
    ? NextResponse.json(journey)
    : NextResponse.json({ code: "BRANCH_NOT_AVAILABLE", message: "This optional branch is not available for this journey." }, { status: 404 });
}
