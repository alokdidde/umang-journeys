import { NextResponse } from "next/server";
import { z } from "zod";
import { getEvaluationAccount, verifyEvaluationCredentials } from "@/server/auth/credentials";
import { createEvaluationSession } from "@/server/session";

const credentialsSchema = z.object({ email: z.string().email(), password: z.string().min(8).max(200) });

export async function POST(request: Request) {
  const parsed = credentialsSchema.safeParse(await request.json().catch(() => null));
  const account = getEvaluationAccount();
  if (!parsed.success || !verifyEvaluationCredentials(parsed.data.email, parsed.data.password, account)) {
    return NextResponse.json({ code: "INVALID_CREDENTIALS", message: "The email or password is incorrect." }, { status: 401 });
  }
  await createEvaluationSession();
  return NextResponse.json({ authenticated: true, user: { name: "Ananya Sharma", email: account.email } });
}
