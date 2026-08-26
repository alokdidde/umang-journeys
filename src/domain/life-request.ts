import { z } from "zod";
import { lifeEventValueSchema, type LifeEventValue } from "./intake-analysis";

const factSchema = z.object({
  key: z.string().min(1).max(80),
  value: z.string().min(1).max(500),
  confidence: z.number().min(0).max(1),
});

const supportedLifeRequestSchema = z.object({
  supported: z.literal(true),
  summary: z.string().min(1).max(180),
  subjects: z.array(z.object({
    ref: z.string().min(1).max(40),
    type: z.enum(["child", "person", "vehicle", "residence", "business"]),
    displayName: z.string().min(1).max(80),
    relationship: z.string().max(40).optional(),
    facts: z.array(factSchema).max(12),
  })).min(1).max(5),
  needs: z.array(z.object({
    id: z.string().min(1).max(40),
    subjectRef: z.string().min(1).max(40),
    lifeEvent: lifeEventValueSchema,
    label: z.string().min(1).max(80),
    description: z.string().min(1).max(180),
    confidence: z.number().min(0).max(1),
    facts: z.array(factSchema).max(12),
  })).min(1).max(6),
  questions: z.array(z.object({
    id: z.string().min(1).max(40),
    subjectRef: z.string().min(1).max(40),
    factKey: z.string().min(1).max(80),
    label: z.string().min(1).max(100),
    input: z.enum(["text", "date", "choice"]),
    choices: z.array(z.object({ value: z.string().min(1).max(60), label: z.string().min(1).max(80) })).max(5).optional(),
    required: z.boolean(),
  })).max(5),
}).superRefine((plan, context) => {
  const subjectRefs = new Set(plan.subjects.map((subject) => subject.ref));
  for (const need of plan.needs) {
    if (!subjectRefs.has(need.subjectRef)) context.addIssue({ code: "custom", path: ["needs"], message: `Unknown subject reference: ${need.subjectRef}` });
  }
  for (const question of plan.questions) {
    if (!subjectRefs.has(question.subjectRef)) context.addIssue({ code: "custom", path: ["questions"], message: `Unknown subject reference: ${question.subjectRef}` });
    if (question.input === "choice" && !question.choices?.length) context.addIssue({ code: "custom", path: ["questions"], message: "Choice questions require choices." });
  }
});

export const lifeRequestOutputSchema = z.discriminatedUnion("supported", [
  supportedLifeRequestSchema,
  z.object({ supported: z.literal(false), reason: z.string().min(1).max(180) }),
]);

const templateIdByLifeEvent: Record<LifeEventValue, string> = {
  having_a_baby: "new-baby.india.v1",
  buying_a_vehicle: "vehicle-purchase.india.v1",
  managing_health_cover: "health-insurance.india.v1",
  moving_home: "moving-home.india.v1",
  starting_a_business: "business-setup.india.v1",
  retirement: "retirement.india.v1",
};

export function prepareLifeRequest(output: z.infer<typeof lifeRequestOutputSchema>, requestId = crypto.randomUUID()) {
  if (!output.supported) throw Object.assign(new Error("That request does not yet match a service UMANG Life can organise."), { code: "UNSUPPORTED_LIFE_REQUEST", detail: output.reason });
  return {
    ...output,
    requestId,
    resolver: "ai_gateway" as const,
    needs: output.needs.map((need) => ({ ...need, templateId: templateIdByLifeEvent[need.lifeEvent] })),
  };
}

export type LifeRequestPlan = ReturnType<typeof prepareLifeRequest>;
