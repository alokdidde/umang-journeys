import { z } from "zod";
import { lifeEventValueSchema, type LifeEventValue } from "./intake-analysis";
import { entityKindFromLegacySubject, entityKindSchema } from "./life-entity";

const factSchema = z.object({
  key: z.string().min(1).max(80),
  value: z.string().min(1).max(500),
  confidence: z.number().min(0).max(1),
});

export const entityAssociationKindSchema = z.enum([
  "family",
  "household_member",
  "guardian",
  "owner",
  "partner",
  "shareholder",
  "director",
  "authorised_signatory",
  "operator",
  "manager",
  "employee",
  "adviser",
  "occupant",
  "tenant",
  "driver",
  "authorised_user",
]);

const entityAssociationSchema = z.object({
  id: z.string().min(1).max(40),
  fromSubjectRef: z.string().min(1).max(40),
  toSubjectRef: z.string().min(1).max(40),
  kind: entityAssociationKindSchema,
  role: z.string().min(1).max(60),
  ownershipShare: z.number().min(0).max(100).optional(),
  canAct: z.boolean().optional(),
});

export type EntityAssociation = z.infer<typeof entityAssociationSchema>;

const supportedLifeRequestSchema = z.object({
  supported: z.literal(true),
  summary: z.string().min(1).max(180),
  subjects: z.array(z.object({
    ref: z.string().min(1).max(40),
    type: z.enum(["child", "person", "vehicle", "residence", "business"]),
    entityKind: entityKindSchema.optional(),
    displayName: z.string().min(1).max(80),
    isAccountHolder: z.boolean().optional(),
    relationship: z.string().max(40).optional(),
    householdMember: z.boolean().optional(),
    facts: z.array(factSchema).max(12),
  })).min(1).max(8),
  needs: z.array(z.object({
    id: z.string().min(1).max(40),
    subjectRef: z.string().min(1).max(40),
    lifeEvent: lifeEventValueSchema,
    label: z.string().min(1).max(80),
    description: z.string().min(1).max(180),
    confidence: z.number().min(0).max(1),
    facts: z.array(factSchema).max(12),
  })).max(6),
  unavailableNeeds: z.array(z.object({
    id: z.string().min(1).max(40),
    subjectRef: z.string().min(1).max(40),
    label: z.string().min(1).max(80),
    description: z.string().min(1).max(180),
    reason: z.string().min(1).max(180),
  })).max(6).default([]),
  questions: z.array(z.object({
    id: z.string().min(1).max(40),
    subjectRef: z.string().min(1).max(40),
    factKey: z.string().min(1).max(80),
    label: z.string().min(1).max(100),
    input: z.enum(["text", "date", "choice"]),
    choices: z.array(z.object({ value: z.string().min(1).max(60), label: z.string().min(1).max(80) })).max(5).optional(),
    required: z.boolean(),
  })).max(8),
  associations: z.array(entityAssociationSchema).max(16).default([]),
}).superRefine((plan, context) => {
  const subjectRefs = new Set(plan.subjects.map((subject) => subject.ref));
  const associationRefs = new Set(["account_holder", ...subjectRefs]);
  if (plan.needs.length + plan.unavailableNeeds.length === 0) context.addIssue({ code: "custom", path: ["needs"], message: "A supported request needs at least one guided or unavailable service need." });
  if (plan.subjects.filter((subject) => subject.isAccountHolder).length > 1) context.addIssue({ code: "custom", path: ["subjects"], message: "Only one subject can be the account holder." });
  for (const need of plan.needs) {
    if (!subjectRefs.has(need.subjectRef)) context.addIssue({ code: "custom", path: ["needs"], message: `Unknown subject reference: ${need.subjectRef}` });
  }
  for (const question of plan.questions) {
    if (!subjectRefs.has(question.subjectRef)) context.addIssue({ code: "custom", path: ["questions"], message: `Unknown subject reference: ${question.subjectRef}` });
    if (question.input === "choice" && !question.choices?.length) context.addIssue({ code: "custom", path: ["questions"], message: "Choice questions require choices." });
  }
  for (const need of plan.unavailableNeeds) {
    if (!subjectRefs.has(need.subjectRef)) context.addIssue({ code: "custom", path: ["unavailableNeeds"], message: `Unknown subject reference: ${need.subjectRef}` });
  }
  for (const association of plan.associations) {
    if (!associationRefs.has(association.fromSubjectRef)) context.addIssue({ code: "custom", path: ["associations"], message: `Unknown association reference: ${association.fromSubjectRef}` });
    if (!associationRefs.has(association.toSubjectRef)) context.addIssue({ code: "custom", path: ["associations"], message: `Unknown association reference: ${association.toSubjectRef}` });
    if (association.fromSubjectRef === association.toSubjectRef) context.addIssue({ code: "custom", path: ["associations"], message: "An association must connect two different people or things." });
    if (association.ownershipShare !== undefined && !["owner", "partner", "shareholder"].includes(association.kind)) context.addIssue({ code: "custom", path: ["associations"], message: "Ownership share is only valid for an owner, partner, or shareholder." });
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

function canonicalQuestionFactKey(question: z.infer<typeof supportedLifeRequestSchema>["questions"][number], subject: z.infer<typeof supportedLifeRequestSchema>["subjects"][number] | undefined) {
  if (!subject || question.factKey.includes(".")) return question.factKey;
  const key = question.factKey.toLocaleLowerCase("en-IN").replace(/[^a-z0-9]+/g, "_");
  const label = question.label.toLocaleLowerCase("en-IN");
  const asksForName = /(^|_)(full_)?name($|_)/.test(key) || label.includes("name");
  const asksForBirthDate = ["date_of_birth", "birth_date", "dob"].includes(key) || label.includes("date of birth") || label.includes("when was") && label.includes("born");
  if (subject.type === "child" && asksForName) return "child.name";
  if (subject.type === "child" && asksForBirthDate) return "child.dateOfBirth";
  if (subject.type === "person" && asksForName) return "person.name";
  if (subject.type === "person" && asksForBirthDate) return "person.dateOfBirth";
  if (subject.type === "vehicle" && (key.includes("make_model") || label.includes("make and model"))) return "vehicle.makeModel";
  if (subject.type === "vehicle" && (key.includes("registration") || label.includes("registration number"))) return "vehicle.registrationNumber";
  if (subject.type === "residence" && (key.includes("address") || label.includes("address"))) return "move.newAddress";
  if (subject.type === "residence" && (key.includes("city") || label.includes("city"))) return "move.newCity";
  if (subject.type === "business" && asksForName) return "business.name";
  if (question.factKey === "retirement_date" || question.factKey === "expected_retirement_date") return "retirement.expectedDate";
  return question.factKey;
}

export function prepareLifeRequest(input: z.input<typeof lifeRequestOutputSchema>, requestId = crypto.randomUUID()) {
  const output = lifeRequestOutputSchema.parse(input);
  if (!output.supported) throw Object.assign(new Error("That request does not yet match a service UMANG Life can organise."), { code: "UNSUPPORTED_LIFE_REQUEST", detail: output.reason });
  const associations = output.associations;
  const explicitFamilyRefs = new Set(associations
    .filter((association) => association.fromSubjectRef === "account_holder" && association.kind === "family")
    .map((association) => association.toSubjectRef));
  const explicitHouseholdRefs = new Set(associations
    .filter((association) => association.fromSubjectRef === "account_holder" && association.kind === "household_member")
    .map((association) => association.toSubjectRef));
  const inferredAssociations: EntityAssociation[] = output.subjects.flatMap((subject) => {
    if (subject.isAccountHolder || !(subject.type === "person" || subject.type === "child") || !subject.relationship || explicitFamilyRefs.has(subject.ref)) return [];
    return [{
      id: `family-${subject.ref}`,
      fromSubjectRef: "account_holder",
      toSubjectRef: subject.ref,
      kind: "family" as const,
      role: subject.relationship,
    }];
  });
  const inferredHouseholdAssociations: EntityAssociation[] = output.subjects.flatMap((subject) => subject.householdMember && !explicitHouseholdRefs.has(subject.ref) ? [{
    id: `household-${subject.ref}`,
    fromSubjectRef: "account_holder",
    toSubjectRef: subject.ref,
    kind: "household_member" as const,
    role: "Household member",
  }] : []);
  return {
    ...output,
    requestId,
    resolver: "ai_gateway" as const,
    subjects: output.subjects.map((subject) => ({ ...subject, entityKind: subject.entityKind ?? entityKindFromLegacySubject(subject.type) })),
    associations: [...associations, ...inferredAssociations, ...inferredHouseholdAssociations] as EntityAssociation[],
    needs: output.needs.map((need) => ({ ...need, templateId: templateIdByLifeEvent[need.lifeEvent] })),
    questions: output.questions.map((question) => ({
      ...question,
      factKey: canonicalQuestionFactKey(question, output.subjects.find((subject) => subject.ref === question.subjectRef)),
    })),
  };
}

export type LifeRequestPlan = ReturnType<typeof prepareLifeRequest>;
