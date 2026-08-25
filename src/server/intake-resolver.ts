import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

export const intakeSchema = z.object({
  lifeEvent: z.object({ value: z.enum(["having_a_baby", "buying_a_vehicle"]), confidence: z.number().min(0).max(1) }),
  facts: z.array(z.object({
    key: z.string(),
    value: z.string(),
    confidence: z.number().min(0).max(1),
    source: z.enum(["user_statement", "derived_from_city", "relative_date_parse"]),
  })),
  clarification: z.object({
    key: z.enum(["birth.registeredByHospital", "vehicle.ownershipTransferred"]),
    question: z.string(),
    choices: z.array(z.enum(["yes", "not_sure", "no"])),
  }),
});

export type IntakeResult = z.infer<typeof intakeSchema> & { resolver: "ai_gateway" | "openai" | "deterministic" };

type IntakeEnvironment = Partial<Record<"AI_GATEWAY_API_KEY" | "VERCEL_OIDC_TOKEN" | "OPENAI_API_KEY" | "AI_INTAKE_MODEL", string>>;

export function createIntakeClientConfig(environment: IntakeEnvironment) {
  const gatewayKey = environment.AI_GATEWAY_API_KEY ?? environment.VERCEL_OIDC_TOKEN;
  if (gatewayKey) return {
    apiKey: gatewayKey,
    baseURL: "https://ai-gateway.vercel.sh/v1",
    model: environment.AI_INTAKE_MODEL ?? "openai/gpt-5.5",
    resolver: "ai_gateway" as const,
  };
  if (environment.OPENAI_API_KEY) return {
    apiKey: environment.OPENAI_API_KEY,
    model: environment.AI_INTAKE_MODEL ?? "gpt-5.5",
    resolver: "openai" as const,
  };
  return null;
}

export function deterministicResolve(statement: string): IntakeResult {
  const normalized = statement.toLowerCase();
  const isBaby = /baby|born|birth|daughter|son/.test(normalized);
  const isVehicle = /vehicle|car|bike|scooter|motorcycle|nexon|creta/.test(normalized);
  if (!isBaby && !isVehicle) throw Object.assign(new Error("This prototype currently supports Having a Baby and Buying a Vehicle."), { code: "UNSUPPORTED_LIFE_EVENT" });
  const city = /vizag|visakhapatnam/.test(normalized) ? "Visakhapatnam" : "Hyderabad";
  const state = city === "Hyderabad" ? "Telangana" : "Andhra Pradesh";
  if (isVehicle) {
    const makeModel = /nexon/.test(normalized) ? "Tata Nexon" : /creta/.test(normalized) ? "Hyundai Creta" : "Purchased vehicle";
    return {
      resolver: "deterministic",
      lifeEvent: { value: "buying_a_vehicle", confidence: 0.96 },
      facts: [
        { key: "vehicle.purchaseType", value: /used|pre.?owned|second.?hand/.test(normalized) ? "used" : "new", confidence: 0.92, source: "user_statement" },
        { key: "vehicle.city", value: city, confidence: 0.96, source: "user_statement" },
        { key: "vehicle.state", value: state, confidence: 0.95, source: "derived_from_city" },
        { key: "vehicle.makeModel", value: makeModel, confidence: 0.75, source: "user_statement" },
        { key: "vehicle.purchaseDate", value: "2026-08-25", confidence: 0.72, source: "relative_date_parse" },
      ],
      clarification: { key: "vehicle.ownershipTransferred", question: "Is the registration certificate already in your name?", choices: ["yes", "not_sure", "no"] },
    };
  }
  return {
    resolver: "deterministic",
    lifeEvent: { value: "having_a_baby", confidence: 0.96 },
    facts: [
      { key: "birth.setting", value: /home/.test(normalized) ? "home" : "hospital", confidence: 0.94, source: "user_statement" },
      { key: "birth.city", value: city, confidence: 0.98, source: "user_statement" },
      { key: "birth.state", value: state, confidence: 0.95, source: "derived_from_city" },
      { key: "child.dateOfBirth", value: "2026-08-24", confidence: 0.9, source: "relative_date_parse" },
    ],
    clarification: { key: "birth.registeredByHospital", question: "Has the hospital already registered the birth?", choices: ["yes", "not_sure", "no"] },
  };
}

export async function resolveIntake(statement: string): Promise<IntakeResult> {
  const config = createIntakeClientConfig({
    AI_GATEWAY_API_KEY: process.env.AI_GATEWAY_API_KEY,
    VERCEL_OIDC_TOKEN: process.env.VERCEL_OIDC_TOKEN,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    AI_INTAKE_MODEL: process.env.AI_INTAKE_MODEL,
  });
  if (!config) return deterministicResolve(statement);
  const client = new OpenAI({ apiKey: config.apiKey, baseURL: config.baseURL, timeout: 5_000, maxRetries: 1 });
  try {
    const response = await client.responses.parse({
      model: config.model,
      input: [
        { role: "developer", content: "Extract only facts explicitly stated or safely normalized. This prototype supports Having a Baby and Buying a Vehicle. For a vehicle, identify whether it is new or used when stated and ask whether ownership has transferred. Never infer official status, eligibility, approval, or identity data. Resolve relative dates against 2026-08-25." },
        { role: "user", content: statement },
      ],
      text: { format: zodTextFormat(intakeSchema, "umang_intake") },
    });
    if (!response.output_parsed) return deterministicResolve(statement);
    return { ...response.output_parsed, resolver: config.resolver };
  } catch {
    return deterministicResolve(statement);
  }
}
