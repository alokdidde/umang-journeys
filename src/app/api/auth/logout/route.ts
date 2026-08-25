import { NextResponse } from "next/server";
import { clearEvaluationSession } from "@/server/session";

export async function POST() {
  await clearEvaluationSession();
  return NextResponse.json({ authenticated: false });
}
