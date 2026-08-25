import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

export const intakeSchema = z.object({
  lifeEvent: z.object({ value: z.enum(["having_a_baby", "buying_a_vehicle", "managing_health_cover", "moving_home", "starting_a_business", "retirement"]), confidence: z.number().min(0).max(1) }),
  facts: z.array(z.object({
    key: z.string(),
    value: z.string(),
    confidence: z.number().min(0).max(1),
    source: z.enum(["user_statement", "derived_from_city", "relative_date_parse"]),
  })),
  clarification: z.object({
    key: z.enum(["birth.registeredByHospital", "vehicle.ownershipTransferred", "health.currentCover", "move.hasAddressEvidence", "business.hasPremisesProof", "retirement.hasAccountStatement"]),
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
  const isVehicle = /\b(vehicle|car|bike|scooter|motorcycle|nexon|creta)\b/.test(normalized);
  const isHealth = /health|medical|hospital cover|cashless|abha|ayushman|pm-?jay|health insurance/.test(normalized);
  const isMoving = /\b(move|moving|moved|shift|shifting|new home|new address|relocat)/.test(normalized);
  const isBusiness = /\b(starting|start|launch|opening|open)\b.*\b(business|shop|enterprise|company|firm|studio)\b|\b(business|shop|enterprise|company|firm|studio)\b.*\b(starting|start|launch|opening|open)\b/.test(normalized);
  const isRetirement = /\b(retire|retiring|retirement|pension|epfo|provident fund|nps)\b/.test(normalized);
  if (!isBaby && !isVehicle && !isHealth && !isMoving && !isBusiness && !isRetirement) throw Object.assign(new Error("This prototype supports baby, vehicle, health, moving home, business, and retirement journeys."), { code: "UNSUPPORTED_LIFE_EVENT" });
  const city = /vizag|visakhapatnam/.test(normalized) ? "Visakhapatnam" : "Hyderabad";
  const state = city === "Hyderabad" ? "Telangana" : "Andhra Pradesh";
  if (isMoving) {
    return {
      resolver: "deterministic",
      lifeEvent: { value: "moving_home", confidence: 0.96 },
      facts: [
        { key: "move.newCity", value: city, confidence: 0.94, source: "user_statement" },
        { key: "move.newState", value: state, confidence: 0.95, source: "derived_from_city" },
        { key: "move.occupancy", value: /rent|tenant|lease/.test(normalized) ? "rented" : "not_sure", confidence: 0.9, source: "user_statement" },
        { key: "move.date", value: "2026-09-25", confidence: 0.72, source: "relative_date_parse" },
      ],
      clarification: { key: "move.hasAddressEvidence", question: "Do you have a rent agreement, utility bill, or another new-address document?", choices: ["yes", "not_sure", "no"] },
    };
  }
  if (isBusiness) {
    return {
      resolver: "deterministic",
      lifeEvent: { value: "starting_a_business", confidence: 0.96 },
      facts: [
        { key: "business.activity", value: /design/.test(normalized) ? "Design services" : "Business activity to confirm", confidence: 0.84, source: "user_statement" },
        { key: "business.structure", value: "not_sure", confidence: 0.55, source: "user_statement" },
        { key: "business.city", value: city, confidence: 0.94, source: "user_statement" },
        { key: "business.state", value: state, confidence: 0.95, source: "derived_from_city" },
        { key: "business.startDate", value: "2026-09-01", confidence: 0.7, source: "relative_date_parse" },
      ],
      clarification: { key: "business.hasPremisesProof", question: "Do you have a document for the principal place of business?", choices: ["yes", "not_sure", "no"] },
    };
  }
  if (isRetirement) {
    return {
      resolver: "deterministic",
      lifeEvent: { value: "retirement", confidence: 0.96 },
      facts: [
        { key: "retirement.employmentSector", value: /private/.test(normalized) ? "private" : "not_sure", confidence: 0.9, source: "user_statement" },
        { key: "retirement.accountType", value: /epfo|provident fund/.test(normalized) ? "epfo" : /nps/.test(normalized) ? "nps" : "not_sure", confidence: 0.9, source: "user_statement" },
        { key: "retirement.date", value: "2026-09-30", confidence: 0.72, source: "relative_date_parse" },
      ],
      clarification: { key: "retirement.hasAccountStatement", question: "Do you have a provident-fund, NPS, or pension statement?", choices: ["yes", "not_sure", "no"] },
    };
  }
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
  if (isHealth) {
    return {
      resolver: "deterministic",
      lifeEvent: { value: "managing_health_cover", confidence: 0.96 },
      facts: [
        { key: "person.city", value: city, confidence: 0.9, source: "user_statement" },
        { key: "person.state", value: state, confidence: 0.9, source: "derived_from_city" },
      ],
      clarification: { key: "health.currentCover", question: "Do you have a health policy or government scheme card?", choices: ["yes", "not_sure", "no"] },
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
        { role: "developer", content: "Extract only facts explicitly stated or safely normalized. This prototype supports Having a Baby, Buying a Vehicle, Managing Health Cover, Moving Home, Starting a Business, and Retirement. Ask the matching evidence question for the selected event. Never infer official status, eligibility, approval, diagnosis, tax liability, legal compliance, pension entitlement, or identity data. Resolve relative dates against 2026-08-25." },
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
