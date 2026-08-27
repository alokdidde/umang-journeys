import { generateText, Output, type LanguageModel } from "ai";
import { lifeRequestOutputSchema, prepareLifeRequest } from "@/domain/life-request";

const systemPrompt = `Interpret a citizen's request for UMANG Life as a small, reviewable plan.

Supported needs are: having a baby, buying a vehicle, managing health cover, moving home, starting a business, and retirement.

Rules:
- A statement may contain several needs and several subjects. Do not reduce it to one category.
- Resolve pronouns and relationships. If two needs concern the same person or thing, they must use the same subject ref.
- A child who needs health cover remains a child subject; never turn them into the account holder.
- When a need concerns the citizen personally, use one person subject with isAccountHolder true. Do not create a second identity for them.
- People are not globally "dependants". Record a family relationship only when the citizen states one.
- Use associations for contextual roles: family and household relationships; owners, partners, shareholders, directors, signatories and operators of businesses; owners, occupants and tenants of homes; owners, drivers and authorised users of vehicles; and guardians of children.
- Use the reserved ref account_holder when the citizen is one side of an association. A business partner is connected to the business and is not a family member unless the citizen separately states a family relationship.
- A business, home or vehicle may have several connected people. Preserve each person's distinct role, ownership share and authority to act when stated.
- Keep labels plain and human. Never use the words journey, workflow, engine, orchestration, or data-driven.
- Ask only for details needed to identify the subject or safely prepare the services. Ask no more than three questions.
- Extract only stated facts. Never infer identity, eligibility, official status, approval, medical facts, or legal conclusions.
- Use stable subject refs and need ids made from short lowercase words.
- Set supported to false if none of the supported needs apply.`;

function plannerError(code: "AI_GATEWAY_NOT_CONFIGURED" | "AI_GATEWAY_AUTH_FAILED" | "AI_LIFE_REQUEST_FAILED", message: string, cause?: unknown) {
  return Object.assign(new Error(message), { code, cause });
}

export async function planLifeRequest(statement: string, options: { model?: LanguageModel; requestId?: string } = {}) {
  if (!options.model && !process.env.AI_GATEWAY_API_KEY && !process.env.VERCEL_OIDC_TOKEN) {
    throw plannerError("AI_GATEWAY_NOT_CONFIGURED", "AI request planning is unavailable because Vercel AI Gateway is not configured.");
  }

  let lastCause: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const { output } = await generateText({
        model: options.model ?? process.env.AI_INTAKE_MODEL ?? "openai/gpt-5.5",
        output: Output.object({
          name: "umang_life_request",
          description: "A subject-centred plan of supported needs and missing details.",
          schema: lifeRequestOutputSchema,
        }),
        system: systemPrompt,
        prompt: statement,
        maxRetries: 0,
        timeout: { totalMs: 30_000 },
      });
      return prepareLifeRequest(output, options.requestId);
    } catch (cause) {
      if (cause instanceof Error && "code" in cause && cause.code === "UNSUPPORTED_LIFE_REQUEST") throw cause;
      if (cause instanceof Error && cause.name === "GatewayAuthenticationError") {
        throw plannerError("AI_GATEWAY_AUTH_FAILED", "The AI assistant could not sign in to Vercel AI Gateway.", cause);
      }
      lastCause = cause;
    }
  }
  throw plannerError("AI_LIFE_REQUEST_FAILED", "We could not organise that request. Please try again.", lastCause);
}
