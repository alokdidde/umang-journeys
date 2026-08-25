import { NextResponse } from "next/server";
import { getDemoSession } from "@/server/session";

export async function GET() {
  const sessionId = await getDemoSession();
  return NextResponse.json(
    { authenticated: Boolean(sessionId) },
    { status: sessionId ? 200 : 401, headers: { "Cache-Control": "private, no-store" } },
  );
}
