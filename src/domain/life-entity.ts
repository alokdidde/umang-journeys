import { z } from "zod";

export const entityKindSchema = z.enum([
  "person",
  "household",
  "organisation",
  "premises",
  "property",
  "vehicle",
  "registered_asset",
  "animal",
  "estate",
  "other",
]);

export type LifeEntityKind = z.infer<typeof entityKindSchema>;
export type LifeEntityClass = "party" | "place" | "asset" | "legal_arrangement" | "other";
export type LifeCollection = "people" | "homes_property" | "vehicles_assets" | "work_organisations" | "other";
export type LegacyJourneySubjectType = "child" | "person" | "vehicle" | "residence" | "business";

export type LifeEntityDefinition = {
  kind: LifeEntityKind;
  entityClass: LifeEntityClass;
  label: string;
  pluralLabel: string;
  collection: LifeCollection;
  icon: string;
  identityFacts: readonly string[];
};

export const allLifeEntityDefinitions = [
  { kind: "person", entityClass: "party", label: "Person", pluralLabel: "People", collection: "people", icon: "user_round", identityFacts: ["person.aadhaarReference", "person.dateOfBirth", "person.name"] },
  { kind: "household", entityClass: "party", label: "Household", pluralLabel: "Households", collection: "people", icon: "users_round", identityFacts: ["household.id", "household.name"] },
  { kind: "organisation", entityClass: "party", label: "Organisation", pluralLabel: "Organisations", collection: "work_organisations", icon: "building_2", identityFacts: ["organisation.registrationNumber", "business.gstin", "business.pan", "business.name"] },
  { kind: "premises", entityClass: "place", label: "Home or premises", pluralLabel: "Homes and premises", collection: "homes_property", icon: "house", identityFacts: ["premises.propertyId", "move.postalCode", "move.newAddress", "move.newCity"] },
  { kind: "property", entityClass: "asset", label: "Property or land", pluralLabel: "Property and land", collection: "homes_property", icon: "land_plot", identityFacts: ["property.registrationNumber", "property.surveyNumber", "property.address"] },
  { kind: "vehicle", entityClass: "asset", label: "Vehicle", pluralLabel: "Vehicles", collection: "vehicles_assets", icon: "car_front", identityFacts: ["vehicle.registrationNumber", "vehicle.chassisNumber", "vehicle.makeModel"] },
  { kind: "registered_asset", entityClass: "asset", label: "Registered asset", pluralLabel: "Registered assets", collection: "vehicles_assets", icon: "badge_check", identityFacts: ["asset.registrationNumber", "asset.serialNumber", "asset.name"] },
  { kind: "animal", entityClass: "asset", label: "Animal", pluralLabel: "Animals", collection: "other", icon: "paw_print", identityFacts: ["animal.tagNumber", "animal.registrationNumber", "animal.name"] },
  { kind: "estate", entityClass: "legal_arrangement", label: "Estate or trust", pluralLabel: "Estates and trusts", collection: "other", icon: "landmark", identityFacts: ["estate.registrationNumber", "estate.caseNumber", "estate.name"] },
  { kind: "other", entityClass: "other", label: "Other record", pluralLabel: "Other records", collection: "other", icon: "folder", identityFacts: ["record.reference", "record.name"] },
] as const satisfies readonly LifeEntityDefinition[];

const definitionByKind = new Map<string, LifeEntityDefinition>(allLifeEntityDefinitions.map((definition) => [definition.kind, definition]));

export function entityDefinitionFor(kind: string): LifeEntityDefinition {
  return definitionByKind.get(kind) ?? definitionByKind.get("other")!;
}

export function entityKindFromLegacySubject(type: LegacyJourneySubjectType): LifeEntityKind {
  if (type === "child" || type === "person") return "person";
  if (type === "residence") return "premises";
  if (type === "business") return "organisation";
  return "vehicle";
}

function identitySlug(value: string) {
  return value.trim().toLocaleLowerCase("en-IN").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "unknown";
}

export function lifeEntityIdentityKey(kind: LifeEntityKind, displayName: string, facts: Record<string, string>) {
  if (kind === "person") {
    const namedIdentity = [facts["person.name"], facts["person.dateOfBirth"]].filter(Boolean).join(":");
    const relationship = facts["person.relationship"] || facts["health.dependentRelationship"];
    const requestIdentity = [facts["intake.requestId"], facts["intake.subjectRef"]].filter(Boolean).join(":");
    return `person:${identitySlug(namedIdentity || relationship || requestIdentity || displayName)}`;
  }
  const definition = entityDefinitionFor(kind);
  const value = definition.identityFacts.map((key) => facts[key]?.trim()).find(Boolean) || displayName;
  return `${kind}:${identitySlug(value)}`;
}
