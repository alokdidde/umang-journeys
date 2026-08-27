import { describe, expect, it } from "vitest";
import { prepareLifeRequest, type EntityAssociation } from "@/domain/life-request";
import { applyLifeRequest } from "./apply-life-request";
import { MemoryJourneyRepository } from "./repositories/journey-repository";
import type { LifeEntityKind } from "@/domain/life-entity";

type Subject = [ref: string, type: "child" | "person" | "vehicle" | "residence" | "business", name: string, relationship?: string];
type Need = [id: string, subjectRef: string, event: "having_a_baby" | "buying_a_vehicle" | "managing_health_cover" | "moving_home" | "starting_a_business" | "retirement"];
type Scenario = {
  name: string;
  subjects: Subject[];
  needs: Need[];
  associations?: EntityAssociation[];
  family?: Array<[subjectRef: string, role: string]>;
  connected?: Array<[subjectRef: string, people: string[]]>;
};

const scenarios: Scenario[] = [
  { name: "new daughter: birth records and health cover", subjects: [["child", "child", "Aarohi", "daughter"]], needs: [["birth", "child", "having_a_baby"], ["cover", "child", "managing_health_cover"]], family: [["child", "daughter"]] },
  { name: "new son: birth records and health cover", subjects: [["child", "child", "Kabir", "son"]], needs: [["birth", "child", "having_a_baby"], ["cover", "child", "managing_health_cover"]], family: [["child", "son"]] },
  { name: "mother: health cover and retirement", subjects: [["mother", "person", "Meera", "mother"]], needs: [["cover", "mother", "managing_health_cover"], ["retire", "mother", "retirement"]], family: [["mother", "mother"]] },
  { name: "father: health cover and retirement", subjects: [["father", "person", "Ramesh", "father"]], needs: [["cover", "father", "managing_health_cover"], ["retire", "father", "retirement"]], family: [["father", "father"]] },
  { name: "spouse: health cover and retirement", subjects: [["spouse", "person", "Naina", "spouse"]], needs: [["cover", "spouse", "managing_health_cover"], ["retire", "spouse", "retirement"]], family: [["spouse", "spouse"]] },
  { name: "both parents need separate health records", subjects: [["mother", "person", "Meera", "mother"], ["father", "person", "Ramesh", "father"]], needs: [["mother-cover", "mother", "managing_health_cover"], ["father-cover", "father", "managing_health_cover"]], family: [["mother", "mother"], ["father", "father"]] },
  { name: "two children need separate health records", subjects: [["daughter", "child", "Aarohi", "daughter"], ["son", "child", "Kabir", "son"]], needs: [["daughter-cover", "daughter", "managing_health_cover"], ["son-cover", "son", "managing_health_cover"]], family: [["daughter", "daughter"], ["son", "son"]] },
  { name: "new child and mother's health cover", subjects: [["child", "child", "Aarohi", "daughter"], ["mother", "person", "Meera", "mother"]], needs: [["birth", "child", "having_a_baby"], ["cover", "mother", "managing_health_cover"]], family: [["child", "daughter"], ["mother", "mother"]] },
  { name: "child health cover and father's retirement", subjects: [["child", "child", "Aarohi", "daughter"], ["father", "person", "Ramesh", "father"]], needs: [["cover", "child", "managing_health_cover"], ["retire", "father", "retirement"]], family: [["child", "daughter"], ["father", "father"]] },
  { name: "new home and vehicle", subjects: [["home", "residence", "Home in Pune"], ["car", "vehicle", "Honda City"]], needs: [["move", "home", "moving_home"], ["vehicle", "car", "buying_a_vehicle"]] },
  { name: "new home and mother's health cover", subjects: [["home", "residence", "Home in Pune"], ["mother", "person", "Meera", "mother"]], needs: [["move", "home", "moving_home"], ["cover", "mother", "managing_health_cover"]], family: [["mother", "mother"]] },
  { name: "vehicle and father's health cover", subjects: [["car", "vehicle", "Tata Nexon"], ["father", "person", "Ramesh", "father"]], needs: [["vehicle", "car", "buying_a_vehicle"], ["cover", "father", "managing_health_cover"]], family: [["father", "father"]] },
  { name: "business and delivery vehicle", subjects: [["business", "business", "Sharma Foods"], ["van", "vehicle", "Tata Ace"]], needs: [["setup", "business", "starting_a_business"], ["vehicle", "van", "buying_a_vehicle"]], associations: [{ id: "owner", fromSubjectRef: "account_holder", toSubjectRef: "business", kind: "owner", role: "Owner", canAct: true }], connected: [["business", ["You"]]] },
  { name: "business and new premises", subjects: [["business", "business", "North Star Studio"], ["home", "residence", "Studio in Bengaluru"]], needs: [["setup", "business", "starting_a_business"], ["move", "home", "moving_home"]], associations: [{ id: "owner", fromSubjectRef: "account_holder", toSubjectRef: "business", kind: "owner", role: "Owner", canAct: true }], connected: [["business", ["You"]]] },
  { name: "business and mother's health cover", subjects: [["business", "business", "Mango Works"], ["mother", "person", "Meera", "mother"]], needs: [["setup", "business", "starting_a_business"], ["cover", "mother", "managing_health_cover"]], associations: [{ id: "owner", fromSubjectRef: "account_holder", toSubjectRef: "business", kind: "owner", role: "Owner", canAct: true }], family: [["mother", "mother"]], connected: [["business", ["You"]]] },
  { name: "equal business co-owners and a company vehicle", subjects: [["business", "business", "Sharma Foods"], ["partner", "person", "Rohan Mehta"], ["van", "vehicle", "Tata Ace"]], needs: [["setup", "business", "starting_a_business"], ["vehicle", "van", "buying_a_vehicle"]], associations: [{ id: "self", fromSubjectRef: "account_holder", toSubjectRef: "business", kind: "owner", role: "Co-owner", ownershipShare: 50, canAct: true }, { id: "partner", fromSubjectRef: "partner", toSubjectRef: "business", kind: "owner", role: "Co-owner", ownershipShare: 50, canAct: true }], connected: [["business", ["You", "Rohan Mehta"]]] },
  { name: "business partner also needs personal health cover", subjects: [["business", "business", "Blue Kite LLP"], ["partner", "person", "Rohan Mehta"]], needs: [["setup", "business", "starting_a_business"], ["cover", "partner", "managing_health_cover"]], associations: [{ id: "partner", fromSubjectRef: "partner", toSubjectRef: "business", kind: "partner", role: "Partner", ownershipShare: 50, canAct: true }], connected: [["business", ["Rohan Mehta"]]] },
  { name: "company director and new office", subjects: [["business", "business", "Blue Kite Private Limited"], ["director", "person", "Leena Rao"], ["office", "residence", "Office in Mumbai"]], needs: [["setup", "business", "starting_a_business"], ["move", "office", "moving_home"]], associations: [{ id: "director", fromSubjectRef: "director", toSubjectRef: "business", kind: "director", role: "Director", canAct: true }], connected: [["business", ["Leena Rao"]]] },
  { name: "authorised signatory and company vehicle", subjects: [["business", "business", "Cedar Labs"], ["signatory", "person", "Farah Khan"], ["car", "vehicle", "Mahindra XUV"]], needs: [["setup", "business", "starting_a_business"], ["vehicle", "car", "buying_a_vehicle"]], associations: [{ id: "signatory", fromSubjectRef: "signatory", toSubjectRef: "business", kind: "authorised_signatory", role: "Authorised signatory", canAct: true }], connected: [["business", ["Farah Khan"]]] },
  { name: "business manager and mother's health cover", subjects: [["business", "business", "Mango Works"], ["manager", "person", "Dev Patel"], ["mother", "person", "Meera", "mother"]], needs: [["setup", "business", "starting_a_business"], ["cover", "mother", "managing_health_cover"]], associations: [{ id: "manager", fromSubjectRef: "manager", toSubjectRef: "business", kind: "manager", role: "Manager", canAct: false }], family: [["mother", "mother"]], connected: [["business", ["Dev Patel"]]] },
  { name: "business adviser and father's retirement", subjects: [["business", "business", "Cedar Labs"], ["adviser", "person", "Sara Jain"], ["father", "person", "Ramesh", "father"]], needs: [["setup", "business", "starting_a_business"], ["retire", "father", "retirement"]], associations: [{ id: "adviser", fromSubjectRef: "adviser", toSubjectRef: "business", kind: "adviser", role: "Accountant", canAct: false }], family: [["father", "father"]], connected: [["business", ["Sara Jain"]]] },
  { name: "spouse is also a business co-owner", subjects: [["business", "business", "Sharma Foods"], ["spouse", "person", "Naina", "spouse"]], needs: [["setup", "business", "starting_a_business"], ["cover", "spouse", "managing_health_cover"]], associations: [{ id: "spouse-owner", fromSubjectRef: "spouse", toSubjectRef: "business", kind: "owner", role: "Co-owner", ownershipShare: 50, canAct: true }], family: [["spouse", "spouse"]], connected: [["business", ["Naina"]]] },
  { name: "three business owners and a delivery vehicle", subjects: [["business", "business", "Three Rivers LLP"], ["owner2", "person", "Rohan"], ["owner3", "person", "Leena"], ["van", "vehicle", "Ashok Leyland Dost"]], needs: [["setup", "business", "starting_a_business"], ["vehicle", "van", "buying_a_vehicle"]], associations: [{ id: "self", fromSubjectRef: "account_holder", toSubjectRef: "business", kind: "partner", role: "Partner", ownershipShare: 34, canAct: true }, { id: "owner2", fromSubjectRef: "owner2", toSubjectRef: "business", kind: "partner", role: "Partner", ownershipShare: 33, canAct: true }, { id: "owner3", fromSubjectRef: "owner3", toSubjectRef: "business", kind: "partner", role: "Partner", ownershipShare: 33, canAct: false }], connected: [["business", ["You", "Rohan", "Leena"]]] },
  { name: "tenant needs health cover while moving", subjects: [["home", "residence", "Flat in Chennai"], ["tenant", "person", "Arjun Sen"]], needs: [["move", "home", "moving_home"], ["cover", "tenant", "managing_health_cover"]], associations: [{ id: "tenant", fromSubjectRef: "tenant", toSubjectRef: "home", kind: "tenant", role: "Tenant" }], connected: [["home", ["Arjun Sen"]]] },
  { name: "spouse is an occupant of the new home", subjects: [["home", "residence", "Home in Pune"], ["spouse", "person", "Naina", "spouse"]], needs: [["move", "home", "moving_home"], ["cover", "spouse", "managing_health_cover"]], associations: [{ id: "occupant", fromSubjectRef: "spouse", toSubjectRef: "home", kind: "occupant", role: "Occupant" }], family: [["spouse", "spouse"]], connected: [["home", ["Naina"]]] },
  { name: "vehicle co-owner is not family", subjects: [["car", "vehicle", "Hyundai Creta"], ["coowner", "person", "Rohan Mehta"]], needs: [["vehicle", "car", "buying_a_vehicle"], ["cover", "coowner", "managing_health_cover"]], associations: [{ id: "coowner", fromSubjectRef: "coowner", toSubjectRef: "car", kind: "owner", role: "Co-owner", ownershipShare: 50 }], connected: [["car", ["Rohan Mehta"]]] },
  { name: "sibling is also an authorised driver", subjects: [["car", "vehicle", "Maruti Brezza"], ["sibling", "person", "Karan", "brother"]], needs: [["vehicle", "car", "buying_a_vehicle"], ["cover", "sibling", "managing_health_cover"]], associations: [{ id: "driver", fromSubjectRef: "sibling", toSubjectRef: "car", kind: "driver", role: "Authorised driver" }], family: [["sibling", "brother"]], connected: [["car", ["Karan"]]] },
  { name: "guardian helps a child with birth and health services", subjects: [["child", "child", "Tara", "ward"], ["guardian", "person", "Maya Rao"]], needs: [["birth", "child", "having_a_baby"], ["cover", "child", "managing_health_cover"]], associations: [{ id: "guardian", fromSubjectRef: "guardian", toSubjectRef: "child", kind: "guardian", role: "Guardian", canAct: true }], family: [["child", "ward"]], connected: [["child", ["Maya Rao"]]] },
  { name: "two guardians help one child", subjects: [["child", "child", "Tara", "ward"], ["guardian1", "person", "Maya Rao"], ["guardian2", "person", "Dev Rao"]], needs: [["birth", "child", "having_a_baby"], ["cover", "child", "managing_health_cover"]], associations: [{ id: "guardian1", fromSubjectRef: "guardian1", toSubjectRef: "child", kind: "guardian", role: "Guardian", canAct: true }, { id: "guardian2", fromSubjectRef: "guardian2", toSubjectRef: "child", kind: "guardian", role: "Guardian", canAct: true }], family: [["child", "ward"]], connected: [["child", ["Maya Rao", "Dev Rao"]]] },
  { name: "parents retire while the household moves", subjects: [["mother", "person", "Meera", "mother"], ["father", "person", "Ramesh", "father"], ["home", "residence", "Home in Jaipur"]], needs: [["mother-retire", "mother", "retirement"], ["father-retire", "father", "retirement"], ["move", "home", "moving_home"]], family: [["mother", "mother"], ["father", "father"]] },
];

function outputFor(scenario: Scenario) {
  return {
    supported: true as const,
    summary: scenario.name,
    subjects: scenario.subjects.map(([ref, type, displayName, relationship]) => ({ ref, type, displayName, relationship, facts: [] })),
    needs: scenario.needs.map(([id, subjectRef, lifeEvent]) => ({ id, subjectRef, lifeEvent, label: id.replaceAll("-", " "), description: `Prepare ${id.replaceAll("-", " ")}.`, confidence: 1, facts: [] })),
    questions: [],
    associations: scenario.associations ?? [],
  };
}

describe("compound life workflows", () => {
  it.each(scenarios)("keeps contexts correct for $name", async (scenario) => {
    expect(scenario.needs.length).toBeGreaterThanOrEqual(2);
    const repository = new MemoryJourneyRepository();
    const plan = prepareLifeRequest(outputFor(scenario), `request-${scenario.name}`);
    const result = await applyLifeRequest(`session-${scenario.name}`, plan, {}, repository);

    expect(result.journeys).toHaveLength(scenario.needs.length);
    expect(Object.keys(result.subjectEntityIds)).toHaveLength(scenario.subjects.length);
    expect(result.journeys.every((journey) => journey.subject.role !== "dependent")).toBe(true);
    for (const [subjectRef, role] of scenario.family ?? []) {
      const entityId = result.subjectEntityIds[subjectRef];
      const subjects = result.journeys.filter((journey) => journey.subject.canonicalEntityId === entityId);
      expect(subjects.length).toBeGreaterThan(0);
      expect(subjects.every((journey) => journey.subject.context?.relationshipToAccountHolder === role)).toBe(true);
    }
    for (const [subjectRef, expectedPeople] of scenario.connected ?? []) {
      const entityId = result.subjectEntityIds[subjectRef];
      const subject = result.journeys.find((journey) => journey.subject.canonicalEntityId === entityId)?.subject;
      expect(subject?.context?.connectedPeople?.map((person) => person.displayName)).toEqual(expectedPeople);
    }
  });

  const broaderCases: Array<{ name: string; records: Array<[ref: string, type: Subject[1], kind: LifeEntityKind, label: string]> }> = [
    { name: "inherited farm and tagged livestock", records: [["farm", "residence", "property", "Inherited farm"], ["cattle", "vehicle", "animal", "Tagged cattle herd"]] },
    { name: "estate administration and inherited flat", records: [["estate", "residence", "estate", "Ramesh Sharma estate"], ["flat", "residence", "property", "Inherited flat"]] },
    { name: "housing society and common premises", records: [["society", "business", "organisation", "Lake View Housing Society"], ["clubhouse", "residence", "premises", "Society clubhouse"]] },
    { name: "family trust and agricultural land", records: [["trust", "business", "estate", "Sharma Family Trust"], ["land", "residence", "property", "Agricultural land"]] },
    { name: "registered boat and its storage premises", records: [["boat", "vehicle", "registered_asset", "Fishing boat TG-17"], ["shed", "residence", "premises", "Boat storage shed"]] },
    { name: "factory equipment and operating company", records: [["machine", "vehicle", "registered_asset", "Industrial boiler"], ["company", "business", "organisation", "Deccan Works Private Limited"]] },
    { name: "rented shop and tenant business", records: [["shop", "residence", "premises", "Khan Market shop"], ["firm", "business", "organisation", "North Star Retail"]] },
    { name: "household and jointly owned home", records: [["household", "person", "household", "Sharma household"], ["home", "residence", "property", "Jointly owned home"]] },
    { name: "dairy cooperative and tagged buffalo", records: [["cooperative", "business", "organisation", "Nandi Dairy Cooperative"], ["buffalo", "vehicle", "animal", "Gauri"]] },
    { name: "warehouse and registered weighing equipment", records: [["warehouse", "residence", "premises", "Balanagar warehouse"], ["scale", "vehicle", "registered_asset", "Certified weighbridge"]] },
    { name: "charitable trust and community hall", records: [["charity", "business", "estate", "Seva Charitable Trust"], ["hall", "residence", "premises", "Community hall"]] },
    { name: "orchard land and irrigation asset", records: [["orchard", "residence", "property", "Mango orchard"], ["pump", "vehicle", "registered_asset", "Registered irrigation pump"]] },
  ];

  it.each(broaderCases)("keeps broader records without inventing service steps: $name", async ({ name, records }) => {
    const repository = new MemoryJourneyRepository();
    const plan = prepareLifeRequest({
      supported: true,
      summary: name,
      subjects: records.map(([ref, type, entityKind, displayName]) => ({ ref, type, entityKind, displayName, facts: [] })),
      needs: [],
      unavailableNeeds: records.map(([ref, , , displayName]) => ({ id: `need-${ref}`, subjectRef: ref, label: `Review services for ${displayName}`, description: "This needs service- and location-specific guidance.", reason: "A researched guided workflow is not available yet." })),
      questions: [],
      associations: records.map(([ref]) => ({ id: `owner-${ref}`, fromSubjectRef: "account_holder" as const, toSubjectRef: ref, kind: "owner" as const, role: "Owner or responsible person", canAct: true })),
    }, `request-${name}`);

    const result = await applyLifeRequest(`session-${name}`, plan, {}, repository);
    const saved = await repository.listEntityRecords(`session-${name}`);

    expect(plan.unavailableNeeds).toHaveLength(2);
    expect(result.journeys).toHaveLength(0);
    expect(saved.map((record) => record.kind)).toEqual(records.map(([, , kind]) => kind));
  });
});
