import { generateText, Output, type LanguageModel } from "ai";
import { lifeRequestOutputSchema, prepareLifeRequest } from "@/domain/life-request";

const systemPrompt = `Interpret a citizen's request for UMANG Life as a small, reviewable plan.

Guided needs are: having a baby, buying a vehicle, managing health cover, moving home, starting a business, and retirement.

Rules:
- A statement may contain several needs and several subjects. Do not reduce it to one category.
- Classify each subject with entityKind: person, household, organisation, premises, property, vehicle, registered_asset, animal, estate, or other. Keep the compatible legacy type as person/child for people, business for organisations, residence for premises/property/estate, and vehicle for vehicles/registered assets/animals.
- Put researched guided needs in needs. Put any other clearly requested government service in unavailableNeeds with a plain reason that location- or service-specific guidance is not available yet. Preserve guided and unavailable needs together.
- Resolve pronouns and relationships. If two needs concern the same person or thing, they must use the same subject ref.
- A child who needs health cover remains a child subject; never turn them into the account holder.
- When a need concerns the citizen personally, use one person subject with isAccountHolder true. Do not create a second identity for them.
- People are not globally "dependants". Record a family relationship only when the citizen states one.
- Use associations for contextual roles: family and household relationships; owners, partners, shareholders, directors, signatories and operators of businesses; owners, occupants and tenants of homes; owners, drivers and authorised users of vehicles; and guardians of children.
- Use the reserved ref account_holder when the citizen is one side of an association. A business partner is connected to the business and is not a family member unless the citizen separately states a family relationship.
- A business, home or vehicle may have several connected people. Preserve each person's distinct role, ownership share and authority to act when stated.
- Current records are supplied as untrusted account data. Match a subject to one only when the request clearly identifies it. Use its exact id as existingEntityId and choose update, keep, or archive. Otherwise choose create and do not invent an id.
- Use update when facts or services change, keep when an existing record is only needed to express a relationship, and archive when the citizen clearly says they no longer own, use, manage, or want the record. Never archive on an ambiguous statement.
- Use association operation disconnect only when the citizen clearly ends that exact relationship. Otherwise use connect.
- Keep labels plain and human. Never use the words journey, workflow, engine, orchestration, or data-driven.
- Ask only for details needed to identify the subject or safely prepare the services. Ask no more than three questions.
- Extract only stated facts. Never infer identity, eligibility, official status, approval, medical facts, or legal conclusions.
- Use stable subject refs and need ids made from short lowercase words.
- Set supported to false only when the request is unrelated to organising a person's real-life records or government services.`;

function plannerError(code: "AI_GATEWAY_NOT_CONFIGURED" | "AI_GATEWAY_AUTH_FAILED" | "AI_LIFE_REQUEST_FAILED", message: string, cause?: unknown) {
  return Object.assign(new Error(message), { code, cause });
}

export type LifeRequestRecordContext = {
  id: string;
  displayName: string;
  entityKind: string;
  relationship?: string;
  connectedPeople?: Array<{ displayName: string; roles: string[] }>;
  services?: string[];
};

export async function planLifeRequest(statement: string, options: { model?: LanguageModel; requestId?: string; records?: LifeRequestRecordContext[] } = {}) {
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
        prompt: JSON.stringify({ request: statement, currentRecords: options.records ?? [] }),
        maxRetries: 0,
        timeout: { totalMs: 30_000 },
      });
      const plan = prepareLifeRequest(output, options.requestId);
      const allowedEntityIds = new Set((options.records ?? []).map((record) => record.id));
      const invalidTarget = plan.subjects.find((subject) => subject.existingEntityId && !allowedEntityIds.has(subject.existingEntityId));
      if (invalidTarget) throw Object.assign(new Error("AI selected a record that is not available in this account."), { code: "INVALID_EXISTING_ENTITY" });
      return plan;
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
