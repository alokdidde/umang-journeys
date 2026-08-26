import { generateText, Output, type LanguageModel } from "ai";
import { intakeSchema, type IntakeResult, type LifeEventValue } from "@/domain/intake-analysis";

export { intakeSchema } from "@/domain/intake-analysis";
export type { IntakeResult } from "@/domain/intake-analysis";

function indiaLocalDate(now: Date) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now).map(({ type, value }) => [type, value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

const lifeEventLabels: Record<LifeEventValue, string> = {
  having_a_baby: "Having a Baby",
  buying_a_vehicle: "Buying a Vehicle",
  managing_health_cover: "Managing Health Cover",
  moving_home: "Moving Home",
  starting_a_business: "Starting a Business",
  retirement: "Retirement",
};

function intakeSystemPrompt(now: Date, expectedLifeEvent?: LifeEventValue) {
  return `Interpret one citizen statement for UMANG Journeys.

Supported Life Events are Having a Baby, Buying a Vehicle, Managing Health Cover, Moving Home, Starting a Business, and Retirement.
${expectedLifeEvent ? `The citizen has already selected ${lifeEventLabels[expectedLifeEvent]}. Interpret the statement only within that Life Event. If it clearly describes a different Life Event, set supported to false rather than changing their selection.` : "The citizen has not selected a Life Event yet, so identify it from the statement."}

Rules:
- Set supported to false when the statement does not clearly match one supported Life Event; never force the closest category.
- Extract only facts explicitly stated or safely normalized.
- Ask the matching clarification for the selected Life Event.
- When a health request mentions parents, ask health.subjects with both, mother, and father choices before asking about existing cover.
- Never treat a dependant as the account holder.
- Never infer official status, eligibility, approval, diagnosis, tax liability, legal compliance, pension entitlement, or identity data.
- Resolve relative dates against ${indiaLocalDate(now)} in India Standard Time.
- Use only keys and choices allowed by the response schema.`;
}

function intakeError(code: "AI_GATEWAY_NOT_CONFIGURED" | "AI_GATEWAY_AUTH_FAILED" | "AI_INTAKE_FAILED", message: string, cause?: unknown) {
  return Object.assign(new Error(message), { code, cause });
}

function isGatewayAuthenticationError(error: unknown) {
  return error instanceof Error && error.name === "GatewayAuthenticationError";
}

export async function resolveIntake(statement: string, options: { model?: LanguageModel; now?: Date; expectedLifeEvent?: LifeEventValue } = {}): Promise<IntakeResult> {
  if (!options.model && !process.env.AI_GATEWAY_API_KEY && !process.env.VERCEL_OIDC_TOKEN) {
    throw intakeError(
      "AI_GATEWAY_NOT_CONFIGURED",
      "AI language analysis is unavailable because Vercel AI Gateway is not configured.",
    );
  }

  let output;
  try {
    ({ output } = await generateText({
      model: options.model ?? process.env.AI_INTAKE_MODEL ?? "openai/gpt-5.5",
      output: Output.object({
        name: "umang_intake",
        description: "A schema-validated interpretation of one citizen Life Event statement.",
        schema: intakeSchema,
      }),
      system: intakeSystemPrompt(options.now ?? new Date(), options.expectedLifeEvent),
      prompt: statement,
      maxRetries: 1,
      timeout: { totalMs: 15_000 },
    }));
  } catch (cause) {
    if (isGatewayAuthenticationError(cause)) {
      throw intakeError("AI_GATEWAY_AUTH_FAILED", "The AI assistant could not sign in to Vercel AI Gateway. Ask the demo owner to replace its AI Gateway key.", cause);
    }
    throw intakeError("AI_INTAKE_FAILED", "AI could not analyse that request. Please try again.", cause);
  }

  if (!output.supported) {
    throw Object.assign(
      new Error("AI could not match that request to a supported Life Event."),
      { code: "UNSUPPORTED_LIFE_EVENT", detail: output.reason },
    );
  }

  if (options.expectedLifeEvent && output.lifeEvent.value !== options.expectedLifeEvent) {
    throw Object.assign(
      new Error("AI interpreted a different Life Event from the one selected. Review the description and try again."),
      { code: "AI_LIFE_EVENT_MISMATCH" },
    );
  }

  return { ...output, resolver: "ai_gateway" };
}
