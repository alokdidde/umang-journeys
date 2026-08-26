import { z } from "zod";

const supportedIntakeSchema = z.object({
  supported: z.literal(true),
  lifeEvent: z.object({
    value: z.enum(["having_a_baby", "buying_a_vehicle", "managing_health_cover", "moving_home", "starting_a_business", "retirement"]),
    confidence: z.number().min(0).max(1),
  }),
  facts: z.array(z.object({
    key: z.string(),
    value: z.string(),
    confidence: z.number().min(0).max(1),
    source: z.enum(["user_statement", "derived_from_city", "relative_date_parse"]),
  })),
  clarification: z.discriminatedUnion("key", [
    z.object({
      key: z.enum(["birth.registeredByHospital", "vehicle.ownershipTransferred", "health.currentCover", "move.hasAddressEvidence", "business.hasPremisesProof", "retirement.hasAccountStatement"]),
      question: z.string().min(1),
      choices: z.tuple([z.literal("yes"), z.literal("not_sure"), z.literal("no")]),
    }),
    z.object({
      key: z.literal("health.subjects"),
      question: z.string().min(1),
      choices: z.tuple([z.literal("both"), z.literal("mother"), z.literal("father")]),
    }),
  ]),
});

const unsupportedIntakeSchema = z.object({
  supported: z.literal(false),
  reason: z.string().min(1),
});

export const intakeSchema = z.discriminatedUnion("supported", [supportedIntakeSchema, unsupportedIntakeSchema]);

export const intakeResultSchema = supportedIntakeSchema.extend({ resolver: z.literal("ai_gateway") });

export type IntakeResult = z.infer<typeof intakeResultSchema>;
