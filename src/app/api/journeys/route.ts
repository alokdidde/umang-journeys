import { NextResponse } from "next/server";
import { getDemoSession } from "@/server/session";
import { journeyRepository } from "@/server/repositories/journey-repository";

export async function POST() {
  const sessionId = await getDemoSession();
  return NextResponse.json(await journeyRepository.create(sessionId), { status: 201 });
}
