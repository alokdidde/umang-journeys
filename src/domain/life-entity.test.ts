import { describe, expect, it } from "vitest";
import {
  allLifeEntityDefinitions,
  entityDefinitionFor,
  entityKindFromLegacySubject,
  entityKindSchema,
  lifeEntityIdentityKey,
  type LifeEntityKind,
} from "./life-entity";

const expectedKinds: LifeEntityKind[] = [
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
];

describe("life entity catalog", () => {
  it("defines the complete supported taxonomy once", () => {
    expect(allLifeEntityDefinitions.map((definition) => definition.kind)).toEqual(expectedKinds);
    for (const definition of allLifeEntityDefinitions) {
      expect(definition.label.length).toBeGreaterThan(0);
      expect(definition.pluralLabel.length).toBeGreaterThan(0);
      expect(definition.icon).toMatch(/^[a-z0-9_]+$/);
      expect(entityKindSchema.parse(definition.kind)).toBe(definition.kind);
    }
  });

  it.each([
    ["child", "person"],
    ["person", "person"],
    ["residence", "premises"],
    ["vehicle", "vehicle"],
    ["business", "organisation"],
  ] as const)("normalizes legacy %s subjects to %s", (legacy, kind) => {
    expect(entityKindFromLegacySubject(legacy)).toBe(kind);
  });

  it("uses plain-language My Life collections", () => {
    expect(entityDefinitionFor("person").collection).toBe("people");
    expect(entityDefinitionFor("premises").collection).toBe("homes_property");
    expect(entityDefinitionFor("property").collection).toBe("homes_property");
    expect(entityDefinitionFor("vehicle").collection).toBe("vehicles_assets");
    expect(entityDefinitionFor("registered_asset").collection).toBe("vehicles_assets");
    expect(entityDefinitionFor("organisation").collection).toBe("work_organisations");
    expect(entityDefinitionFor("animal").collection).toBe("other");
    expect(entityDefinitionFor("estate").collection).toBe("other");
  });

  it("prefers stable identifiers when building identity keys", () => {
    expect(lifeEntityIdentityKey("property", "Family plot", { "property.registrationNumber": "TS-44-0091" })).toBe("property:ts-44-0091");
    expect(lifeEntityIdentityKey("animal", "Gauri", { "animal.tagNumber": "IN-TG-701" })).toBe("animal:in-tg-701");
    expect(lifeEntityIdentityKey("organisation", "Blue Kite LLP", { "organisation.registrationNumber": "AAZ-9912" })).toBe("organisation:aaz-9912");
  });

  it("falls back safely for an unknown persisted kind", () => {
    expect(entityDefinitionFor("future_kind").kind).toBe("other");
  });
});
