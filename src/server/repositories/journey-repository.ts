import { activateBranch as activateJourneyBranch, completeNode, compileJourney, getJourneyTemplate, isJourneyComplete, newBabyTemplate, reevaluateJourney, type JourneyProjection } from "@/domain/journey-engine";
import { PrismaJourneyRepository } from "@/server/repositories/prisma-journey-repository";
import { agencyDecisionToServiceRun, evaluateSyntheticAgency, type AgencyCaseInput, type ExternalAgencyAgent } from "@/server/integrations/external-agency-agent";
import { e2eAgencyAgent } from "@/server/integrations/e2e-agency-agent";
import { serviceDefinitionFor, type SandboxServiceRun } from "@/domain/service-workflows";
import type { JourneyLifecycleStatus, JourneySubject } from "@/domain/journey-summary";
import type { EntityAssociation } from "@/domain/life-request";
import { evidenceLabels, serviceEvidenceRequirements, type EvidenceRecord, type JourneyEvidence } from "@/domain/evidence";
import { entityKindFromLegacySubject, lifeEntityIdentityKey, type LifeEntityKind } from "@/domain/life-entity";

export type StoredJourney = {
  id: string;
  sessionId: string;
  status: JourneyLifecycleStatus;
  subject: JourneySubject;
  projection: JourneyProjection;
  facts: Record<string, string>;
  factHistory: Array<{ id: string; key: string; value: string; source: "user_statement" | "document" | "provider" | "demo"; sourceRef?: string; status: "active" | "corrected" | "retracted"; recordedAt: string }>;
  auditLog: Array<{ id: string; actor: "citizen" | "document_agent" | "provider" | "system"; event: string; detail: Record<string, string>; occurredAt: string }>;
  serviceRuns: Record<string, SandboxServiceRun | undefined>;
  evidence: JourneyEvidence[];
  registrationId?: string;
  createdAt: string;
  updatedAt: string;
};

export type JourneySubjectSeed = Pick<JourneySubject, "type" | "entityKind" | "displayName" | "role"> & {
  canonicalEntityId?: string;
};

export type EntityGraphSeed = {
  ref: string;
  type: JourneySubject["type"];
  entityKind: LifeEntityKind;
  displayName: string;
  facts: Record<string, string>;
  isAccountHolder?: boolean;
  canonicalEntityId?: string;
};

export type EntityAssociationSeed = EntityAssociation;

export type LifeEntityRecord = {
  id: string;
  kind: LifeEntityKind;
  displayName: string;
  context?: JourneySubject["context"];
  unavailableNeeds: Array<{ label: string; description: string; reason: string }>;
  updatedAt: string;
};

function identitySlug(value: string) {
  return value.trim().toLocaleLowerCase("en-IN").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "unknown";
}

export function canonicalEntityKey(subject: JourneySubjectSeed, facts: Record<string, string>) {
  if (subject.entityKind) return lifeEntityIdentityKey(subject.entityKind, subject.displayName, facts);
  if (subject.type === "child") return `child:${identitySlug(facts["child.dateOfBirth"] || facts["child.name"] || subject.displayName)}`;
  if (subject.type === "vehicle") return `vehicle:${identitySlug(facts["vehicle.registrationNumber"] || subject.displayName)}`;
  if (subject.type === "residence") return `address:${identitySlug(facts["move.postalCode"] || facts["move.newCity"] || subject.displayName)}`;
  if (subject.type === "business") return `business:${identitySlug(facts["business.gstin"] || facts["business.pan"] || subject.displayName)}`;
  if (subject.role === "account_holder") return `person:${identitySlug(facts["person.name"] || subject.displayName)}`;
  const relationship = facts["person.relationship"] || facts["health.dependentRelationship"];
  const namedIdentity = [facts["person.name"], facts["person.dateOfBirth"]].filter(Boolean).join(":");
  const requestIdentity = [facts["intake.requestId"], facts["intake.subjectRef"]].filter(Boolean).join(":");
  return `person:${identitySlug(namedIdentity || relationship || requestIdentity || subject.displayName)}`;
}

export interface JourneyRepository {
  create(sessionId: string, facts?: Record<string, string>, templateId?: string, subject?: JourneySubjectSeed): Promise<StoredJourney>;
  list(sessionId: string): Promise<StoredJourney[]>;
  get(sessionId: string, id: string): Promise<StoredJourney | null>;
  updateFacts(sessionId: string, id: string, facts: Record<string, string>, provenance?: { source: "user_statement" | "document" | "provider" | "demo"; sourceRef?: string }): Promise<StoredJourney | null>;
  activateBranch(sessionId: string, id: string, branchKey: string): Promise<StoredJourney | null>;
  completeStep(sessionId: string, id: string, nodeKey: string, idempotencyKey: string): Promise<StoredJourney | null>;
  addEvidence(sessionId: string, id: string, evidence: Omit<EvidenceRecord, "id" | "createdAt">): Promise<StoredJourney | null>;
  reviewEvidence(sessionId: string, id: string, evidenceId: string, approved: boolean, fields?: Record<string, string>): Promise<StoredJourney | null>;
  getEvidence(sessionId: string, id: string, evidenceId: string): Promise<EvidenceRecord | null>;
  completeRegistration(sessionId: string, id: string, idempotencyKey: string): Promise<StoredJourney | null>;
  advanceService(sessionId: string, id: string, nodeKey: string, idempotencyKey: string): Promise<StoredJourney | null>;
  syncEntityGraph(sessionId: string, entities: EntityGraphSeed[], associations: EntityAssociationSeed[]): Promise<Record<string, string>>;
  listEntityRecords(sessionId: string): Promise<LifeEntityRecord[]>;
  reset(sessionId: string): Promise<void>;
}

function now() { return new Date().toISOString(); }

function rehydrateProjection(journey: Pick<StoredJourney, "projection" | "facts">, facts = journey.facts) {
  return reevaluateJourney(journey.projection, facts);
}

export function evidenceFacts(evidence: Pick<EvidenceRecord, "type" | "extractedFields" | "verificationStatus">) {
  if (evidence.verificationStatus !== "verified") return {};
  const fields = evidence.extractedFields;
  if (evidence.type === "insurance_policy") return Object.fromEntries([["insurance.policyNumber", fields.policyNumber], ["insurance.insurer", fields.insurer], ["insurance.validUntil", fields.validUntil]].filter((entry): entry is [string, string] => Boolean(entry[1])));
  if (evidence.type === "health_insurance_policy") return Object.fromEntries([["health.policyNumber", fields.policyNumber], ["health.insurer", fields.insurer], ["health.sumInsured", fields.sumInsured], ["health.validUntil", fields.validUntil]].filter((entry): entry is [string, string] => Boolean(entry[1])));
  if (evidence.type === "vaccination_receipt") return Object.fromEntries([["vaccination.last.vaccine", fields.vaccine], ["vaccination.last.administeredOn", fields.administeredOn], ["vaccination.last.provider", fields.provider], ["vaccination.last.batchNumber", fields.batchNumber]].filter((entry): entry is [string, string] => Boolean(entry[1])));
  return {};
}

export function canAdvanceFromVerifiedEvidence(journey: Pick<StoredJourney, "facts">, nodeKey: string) {
  return nodeKey === "vaccination_timeline" && Boolean(journey.facts["vaccination.last.vaccine"]);
}

export function buildAgencyCaseInput(journey: StoredJourney, nodeKey: string): AgencyCaseInput {
  const node = journey.projection.nodes.find((candidate) => candidate.key === nodeKey);
  if (!node) throw new Error(`Unknown journey node: ${nodeKey}`);
  const definition = serviceDefinitionFor(node);
  const current = journey.serviceRuns[nodeKey];
  const intentValue = journey.facts[`agency.intent.${nodeKey}`];
  const intent = intentValue === "clarify" || intentValue === "appeal" || intentValue === "check_status" ? intentValue : "submit";
  return {
    journeyId: journey.id,
    nodeKey,
    title: node?.title ?? nodeKey,
    description: node.description,
    agency: definition.agency,
    officialSource: node.source,
    requiredEvidence: (serviceEvidenceRequirements[nodeKey] ?? []).map((type) => ({ type, ...evidenceLabels[type] })),
    servicePlan: definition.stages.map((stage) => ({
      stageKey: stage.key,
      title: stage.title,
      detail: stage.detail,
      expectedProgress: stage.progress,
    })),
    facts: Object.fromEntries(Object.entries(journey.facts).filter(([key]) => !key.startsWith("service."))),
    evidence: journey.evidence.map((item) => ({ type: item.type, verificationStatus: item.verificationStatus, extractedFields: item.extractedFields })),
    previousDecision: current ? { outcome: current.caseStatus, summary: current.actionMessage, reasonCode: current.reasonCode, actionMessage: current.actionMessage } : undefined,
    citizenMessage: journey.facts[`agency.message.${nodeKey}`],
    intent,
  };
}

function subjectForJourney(lifeEvent: string, facts: Record<string, string>): Omit<JourneySubject, "id"> {
  if (lifeEvent === "buying_a_vehicle") return { type: "vehicle", displayName: facts["vehicle.makeModel"]?.trim() || facts["vehicle.registrationNumber"]?.trim() || "Your vehicle" };
  if (lifeEvent === "moving_home") return { type: "residence", displayName: facts["move.label"]?.trim() || `New home in ${facts["move.newCity"]?.trim() || "your new area"}` };
  if (lifeEvent === "starting_a_business") return { type: "business", displayName: facts["business.name"]?.trim() || "Your new business" };
  if (lifeEvent === "managing_health_cover" || lifeEvent === "retirement") return { type: "person", displayName: facts["person.name"]?.trim() || "Ananya Sharma" };
  return { type: "child", displayName: facts["child.name"]?.trim() || "Your baby" };
}

export class MemoryJourneyRepository implements JourneyRepository {
  private journeys = new Map<string, StoredJourney>();
  private idempotency = new Map<string, string>();
  private evidenceContents = new Map<string, EvidenceRecord>();
  private entities = new Map<string, { id: string; sessionId: string; type: JourneySubject["type"] | "household"; entityKind: LifeEntityKind; displayName: string; facts: Record<string, string>; isAccountHolder?: boolean }>();
  private relationships = new Map<string, { fromId: string; toId: string; kind: EntityAssociationSeed["kind"]; role: string; ownershipShare?: number; canAct?: boolean }>();

  constructor(private readonly agencyAgent: ExternalAgencyAgent = evaluateSyntheticAgency) {}

  async create(sessionId: string, facts: Record<string, string> = {}, templateId = newBabyTemplate.id, subjectSeed?: JourneySubjectSeed) {
    const template = getJourneyTemplate(templateId);
    if (!template) throw new Error(`Unknown journey template: ${templateId}`);
    const timestamp = now();
    const subject = subjectSeed ?? subjectForJourney(template.lifeEvent, facts);
    const entityKey = `${sessionId}:${canonicalEntityKey(subject, facts)}`;
    const seededEntity = subjectSeed?.canonicalEntityId
      ? [...this.entities.values()].find((candidate) => candidate.id === subjectSeed.canonicalEntityId)
      : undefined;
    const entityKind = subject.entityKind ?? entityKindFromLegacySubject(subject.type);
    const entity = seededEntity ?? this.entities.get(entityKey) ?? { id: `entity-${crypto.randomUUID()}`, sessionId, type: subject.type, entityKind, displayName: subject.displayName, facts };
    entity.facts = { ...entity.facts, ...facts };
    this.entities.set(entityKey, entity);
    const subjectId = `${subject.type}-${crypto.randomUUID()}`;
    const journey: StoredJourney = {
      id: `journey-${crypto.randomUUID()}`,
      sessionId,
      status: "active",
      subject: { id: subjectId, ...subject, entityKind, canonicalEntityId: entity.id, householdId: `household:${sessionId}`, role: subject.role ?? (subject.type === "person" && !facts["health.dependentRelationship"] ? "account_holder" : subject.type === "person" || subject.type === "child" ? "person" : "asset") },
      projection: compileJourney(template, facts),
      facts,
      factHistory: Object.entries(facts).map(([key, value]) => ({ id: `fact-${crypto.randomUUID()}`, key, value, source: "user_statement" as const, status: "active" as const, recordedAt: timestamp })),
      auditLog: [{ id: `audit-${crypto.randomUUID()}`, actor: "citizen", event: "journey_created", detail: { templateId: template.id }, occurredAt: timestamp }],
      serviceRuns: {},
      evidence: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.journeys.set(`${sessionId}:${journey.id}`, journey);
    return journey;
  }
  async list(sessionId: string) {
    return [...this.journeys.values()]
      .reverse()
      .filter((journey) => journey.sessionId === sessionId && journey.status !== "abandoned")
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }
  async get(sessionId: string, id: string) { return this.journeys.get(`${sessionId}:${id}`) ?? null; }
  async updateFacts(sessionId: string, id: string, facts: Record<string, string>, provenance: { source: "user_statement" | "document" | "provider" | "demo"; sourceRef?: string } = { source: "user_statement" }) {
    const journey = await this.get(sessionId, id);
    if (!journey) return null;
    const childName = facts["child.name"]?.trim();
    const vehicleName = facts["vehicle.makeModel"]?.trim() || facts["vehicle.registrationNumber"]?.trim();
    const personName = facts["person.name"]?.trim();
    const residenceName = facts["move.label"]?.trim() || (facts["move.newCity"]?.trim() ? `New home in ${facts["move.newCity"].trim()}` : undefined);
    const businessName = facts["business.name"]?.trim();
    const displayName = childName || vehicleName || residenceName || businessName || personName;
    const nextFacts = { ...journey.facts, ...facts };
    const updated = {
      ...journey,
      subject: displayName ? { ...journey.subject, displayName } : journey.subject,
      facts: nextFacts,
      projection: rehydrateProjection(journey, nextFacts),
      factHistory: [
        ...journey.factHistory.map((version) => Object.prototype.hasOwnProperty.call(facts, version.key) && version.status === "active" ? { ...version, status: "corrected" as const } : version),
        ...Object.entries(facts).map(([key, value]) => ({ id: `fact-${crypto.randomUUID()}`, key, value, source: provenance.source, sourceRef: provenance.sourceRef, status: "active" as const, recordedAt: now() })),
      ],
      auditLog: [...journey.auditLog, { id: `audit-${crypto.randomUUID()}`, actor: provenance.source === "document" ? "document_agent" as const : provenance.source === "provider" ? "provider" as const : "citizen" as const, event: "facts_versioned", detail: { keys: Object.keys(facts).join(","), source: provenance.source }, occurredAt: now() }],
      updatedAt: now(),
    };
    this.journeys.set(`${sessionId}:${id}`, updated);
    return updated;
  }
  async completeStep(sessionId: string, id: string, nodeKey: string, idempotencyKey: string) {
    const journey = await this.get(sessionId, id);
    const node = journey?.projection.nodes.find((candidate) => candidate.key === nodeKey);
    if (!journey || !node || node.status === "locked") return null;
    const scopedKey = `${sessionId}:${id}:${nodeKey}:${idempotencyKey}`;
    if (this.idempotency.has(scopedKey)) return journey;
    this.idempotency.set(scopedKey, idempotencyKey);
    const projection = completeNode(journey.projection, nodeKey, journey.facts);
    const updated = { ...journey, projection, auditLog: [...journey.auditLog, { id: `audit-${crypto.randomUUID()}`, actor: "citizen" as const, event: "journey_step_completed", detail: { nodeKey }, occurredAt: now() }], status: isJourneyComplete(projection) ? "completed" as const : "active" as const, updatedAt: now() };
    this.journeys.set(`${sessionId}:${id}`, updated);
    return updated;
  }
  async activateBranch(sessionId: string, id: string, branchKey: string) {
    const journey = await this.get(sessionId, id);
    const branch = journey?.projection.branches.find((candidate) => candidate.key === branchKey);
    if (!journey || !branch || branch.requirement !== "optional") return null;
    if (branch.active) return journey;
    const activationFact = `journey.branch.${branchKey}.active`;
    const nextFacts = { ...journey.facts, [activationFact]: "true" };
    const projection = activateJourneyBranch(journey.projection, branchKey, nextFacts);
    const updated: StoredJourney = {
      ...journey,
      status: "active",
      projection,
      facts: nextFacts,
      factHistory: [...journey.factHistory, { id: `fact-${crypto.randomUUID()}`, key: activationFact, value: "true", source: "user_statement", status: "active", recordedAt: now() }],
      auditLog: [...journey.auditLog, { id: `audit-${crypto.randomUUID()}`, actor: "citizen", event: "journey_branch_activated", detail: { branchKey }, occurredAt: now() }],
      updatedAt: now(),
    };
    this.journeys.set(`${sessionId}:${id}`, updated);
    return updated;
  }
  async addEvidence(sessionId: string, id: string, input: Omit<EvidenceRecord, "id" | "createdAt">) {
    const journey = await this.get(sessionId, id);
    if (!journey) return null;
    const record: EvidenceRecord = { ...input, version: journey.evidence.filter((item) => item.type === input.type).length + 1, id: `evidence-${crypto.randomUUID()}`, createdAt: now() };
    this.evidenceContents.set(`${sessionId}:${id}:${record.id}`, record);
    const summary: JourneyEvidence = {
      ...record,
    };
    const derivedFacts = evidenceFacts(record);
    const nextFacts = { ...journey.facts, ...derivedFacts };
    const updated = { ...journey, facts: nextFacts, projection: rehydrateProjection(journey, nextFacts), factHistory: [...journey.factHistory, ...Object.entries(derivedFacts).map(([key, value]) => ({ id: `fact-${crypto.randomUUID()}`, key, value, source: "document" as const, sourceRef: record.id, status: "active" as const, recordedAt: now() }))], auditLog: [...journey.auditLog, { id: `audit-${crypto.randomUUID()}`, actor: "document_agent" as const, event: "evidence_version_added", detail: { evidenceId: record.id, type: record.type, version: String(record.version) }, occurredAt: now() }], evidence: [...journey.evidence, summary], updatedAt: now() };
    this.journeys.set(`${sessionId}:${id}`, updated);
    return updated;
  }
  async reviewEvidence(sessionId: string, id: string, evidenceId: string, approved: boolean, fields?: Record<string, string>) {
    const journey = await this.get(sessionId, id);
    const record = await this.getEvidence(sessionId, id, evidenceId);
    if (!journey || !record || record.source === "sample") return null;
    const hasFailedCheck = record.checks?.some((check) => check.status === "failed");
    const nextStatus = approved && !hasFailedCheck && Object.keys(fields ?? record.extractedFields).length > 0 ? "verified" as const : "rejected" as const;
    const updatedRecord: EvidenceRecord = { ...record, extractedFields: fields ?? record.extractedFields, verificationStatus: nextStatus, reviewedAt: now() };
    const derivedFacts = evidenceFacts(updatedRecord);
    this.evidenceContents.set(`${sessionId}:${id}:${evidenceId}`, updatedRecord);
    const nextFacts = { ...journey.facts, ...derivedFacts };
    const updated = {
      ...journey,
      facts: nextFacts,
      projection: rehydrateProjection(journey, nextFacts),
      factHistory: [...journey.factHistory, ...Object.entries(derivedFacts).map(([key, value]) => ({ id: `fact-${crypto.randomUUID()}`, key, value, source: "document" as const, sourceRef: evidenceId, status: "active" as const, recordedAt: now() }))],
      auditLog: [...journey.auditLog, { id: `audit-${crypto.randomUUID()}`, actor: "citizen" as const, event: `evidence_${nextStatus}`, detail: { evidenceId }, occurredAt: now() }],
      evidence: journey.evidence.map((item) => item.id === evidenceId ? { ...updatedRecord } : item),
      updatedAt: now(),
    };
    this.journeys.set(`${sessionId}:${id}`, updated);
    return updated;
  }
  async getEvidence(sessionId: string, id: string, evidenceId: string) {
    return this.evidenceContents.get(`${sessionId}:${id}:${evidenceId}`) ?? null;
  }
  async completeRegistration(sessionId: string, id: string, idempotencyKey: string) {
    const reviewed = await this.advanceService(sessionId, id, "birth_registration", idempotencyKey);
    if (!reviewed) return null;
    const run = reviewed.serviceRuns.birth_registration;
    if (run?.status !== "completed") return reviewed;
    const updated = { ...reviewed, registrationId: run.receipt };
    this.journeys.set(`${sessionId}:${id}`, updated);
    return updated;
  }
  async advanceService(sessionId: string, id: string, nodeKey: string, idempotencyKey: string) {
    const journey = await this.get(sessionId, id);
    const node = journey?.projection.nodes.find((candidate) => candidate.key === nodeKey);
    if (!journey || !node || node.action === "none" || (node.status === "locked" && !canAdvanceFromVerifiedEvidence(journey, nodeKey))) return null;
    if (journey.serviceRuns[nodeKey]?.status === "completed") return journey;
    const scopedKey = `${sessionId}:${id}:${nodeKey}:${idempotencyKey}`;
    if (this.idempotency.has(scopedKey)) return journey;
    const decision = await this.agencyAgent(buildAgencyCaseInput(journey, nodeKey));
    const run = agencyDecisionToServiceRun(nodeKey, serviceDefinitionFor(node).agency, decision, journey.serviceRuns[nodeKey]);
    this.idempotency.set(scopedKey, idempotencyKey);
    const projection = run.status === "completed"
      ? completeNode(journey.projection, nodeKey, journey.facts)
      : { ...journey.projection, nodes: journey.projection.nodes.map((candidate) => candidate.key === nodeKey ? { ...candidate, status: run.status === "waiting_external" ? "waiting_external" as const : run.status === "failed" ? "blocked" as const : "in_progress" as const } : candidate) };
    const updated = {
      ...journey,
      projection,
      status: isJourneyComplete(projection) ? "completed" as const : "active" as const,
      serviceRuns: { ...journey.serviceRuns, [nodeKey]: run },
      auditLog: [...journey.auditLog, { id: `audit-${crypto.randomUUID()}`, actor: "provider" as const, event: `provider_case_${run.caseStatus ?? run.status}`, detail: { nodeKey, receipt: run.receipt }, occurredAt: now() }],
      updatedAt: now(),
    };
    this.journeys.set(`${sessionId}:${id}`, updated);
    return updated;
  }
  async syncEntityGraph(sessionId: string, entities: EntityGraphSeed[], associations: EntityAssociationSeed[]) {
    const primaryKey = `${sessionId}:person:account-holder`;
    const primary = this.entities.get(primaryKey) ?? { id: `entity-${crypto.randomUUID()}`, sessionId, type: "person" as const, entityKind: "person" as const, displayName: "You", facts: {}, isAccountHolder: true };
    this.entities.set(primaryKey, primary);
    const entityIds: Record<string, string> = { account_holder: primary.id };
    for (const seed of entities) {
      if (seed.isAccountHolder) {
        primary.displayName = seed.displayName;
        primary.facts = { ...primary.facts, ...seed.facts };
        entityIds[seed.ref] = primary.id;
        continue;
      }
      const seeded = seed.canonicalEntityId ? [...this.entities.values()].find((entity) => entity.id === seed.canonicalEntityId && entity.sessionId === sessionId) : undefined;
      const key = `${sessionId}:${canonicalEntityKey({ type: seed.type, entityKind: seed.entityKind, displayName: seed.displayName, role: "person" }, seed.facts)}`;
      const birthDate = seed.facts[seed.type === "child" ? "child.dateOfBirth" : "person.dateOfBirth"];
      const relationship = seed.facts["person.relationship"] || seed.facts["health.dependentRelationship"];
      const sameNamed = [...this.entities.values()].filter((entity) => entity.sessionId === sessionId && entity.entityKind === seed.entityKind && entity.displayName.trim().toLocaleLowerCase("en-IN") === seed.displayName.trim().toLocaleLowerCase("en-IN"));
      const compatible = sameNamed.filter((entity) => {
        const existingBirthDate = entity.facts[seed.type === "child" ? "child.dateOfBirth" : "person.dateOfBirth"];
        const existingRelationship = entity.facts["person.relationship"] || entity.facts["health.dependentRelationship"];
        return (!birthDate || !existingBirthDate || birthDate === existingBirthDate)
          && (!relationship || !existingRelationship || relationship === existingRelationship);
      });
      const nameMatch = compatible.length === 1 ? compatible[0] : undefined;
      const entity = seeded ?? this.entities.get(key) ?? nameMatch ?? { id: `entity-${crypto.randomUUID()}`, sessionId, type: seed.type, entityKind: seed.entityKind, displayName: seed.displayName, facts: {} };
      entity.displayName = seed.displayName;
      entity.facts = { ...entity.facts, ...seed.facts };
      this.entities.set(key, entity);
      entityIds[seed.ref] = entity.id;
    }
    for (const association of associations) {
      const fromId = entityIds[association.fromSubjectRef];
      const toId = entityIds[association.toSubjectRef];
      if (!fromId || !toId) continue;
      this.relationships.set(`${sessionId}:${fromId}:${toId}:${association.kind}:${association.role}`, {
        fromId, toId, kind: association.kind, role: association.role,
        ownershipShare: association.ownershipShare, canAct: association.canAct,
      });
    }
    this.applyEntityContexts(sessionId);
    return Object.fromEntries(Object.entries(entityIds).filter(([ref]) => ref !== "account_holder"));
  }
  async listEntityRecords(sessionId: string) {
    const entities = [...this.entities.values()].filter((entity) => entity.sessionId === sessionId && entity.type !== "household" && !entity.isAccountHolder && entity.facts["intake.recordVisibility"] === "standalone");
    const entityById = new Map([...this.entities.values()].filter((entity) => entity.sessionId === sessionId).map((entity) => [entity.id, entity]));
    return entities.map((entity): LifeEntityRecord => {
      const related = [...this.relationships.values()].filter((relationship) => relationship.toId === entity.id);
      const family = related.find((relationship) => relationship.kind === "family" && entityById.get(relationship.fromId)?.isAccountHolder);
      const householdMember = related.some((relationship) => relationship.kind === "household_member");
      const connectedPeople = related.flatMap((relationship) => {
        if (["family", "household_member"].includes(relationship.kind)) return [];
        const person = entityById.get(relationship.fromId);
        if (!person || person.entityKind !== "person") return [];
        return [{ entityId: person.id, displayName: person.isAccountHolder ? "You" : person.displayName, isAccountHolder: Boolean(person.isAccountHolder), roles: [relationship.role], ownershipShare: relationship.ownershipShare, canAct: relationship.canAct }];
      });
      let unavailableNeeds: LifeEntityRecord["unavailableNeeds"] = [];
      try { unavailableNeeds = JSON.parse(entity.facts["intake.unavailableNeeds"] ?? "[]") as LifeEntityRecord["unavailableNeeds"]; } catch { /* Ignore invalid historical metadata. */ }
      return {
        id: entity.id,
        kind: entity.entityKind,
        displayName: entity.displayName,
        context: family || householdMember || connectedPeople.length ? { relationshipToAccountHolder: family?.role, householdMember: householdMember || undefined, connectedPeople: connectedPeople.length ? connectedPeople : undefined } : undefined,
        unavailableNeeds,
        updatedAt: now(),
      };
    });
  }
  private applyEntityContexts(sessionId: string) {
    const entities = [...this.entities.values()].filter((entity) => entity.sessionId === sessionId);
    const entityById = new Map(entities.map((entity) => [entity.id, entity]));
    for (const [key, journey] of this.journeys) {
      if (journey.sessionId !== sessionId || !journey.subject.canonicalEntityId) continue;
      const subjectId = journey.subject.canonicalEntityId;
      const related = [...this.relationships.values()].filter((relationship) => relationship.toId === subjectId);
      const family = related.find((relationship) => relationship.kind === "family" && entityById.get(relationship.fromId)?.isAccountHolder);
      const household = related.some((relationship) => relationship.kind === "household_member" && entityById.get(relationship.fromId)?.isAccountHolder);
      const connectedPeople = related
        .filter((relationship) => !["family", "household_member"].includes(relationship.kind))
        .reduce<NonNullable<JourneySubject["context"]>["connectedPeople"]>((people, relationship) => {
          const person = entityById.get(relationship.fromId);
          if (!person || person.type !== "person") return people;
          const existing = people?.find((candidate) => candidate.entityId === person.id);
          if (existing) {
            if (!existing.roles.includes(relationship.role)) existing.roles.push(relationship.role);
            existing.ownershipShare ??= relationship.ownershipShare;
            existing.canAct ||= relationship.canAct;
            return people;
          }
          return [...(people ?? []), { entityId: person.id, displayName: person.isAccountHolder ? "You" : person.displayName, isAccountHolder: Boolean(person.isAccountHolder), roles: [relationship.role], ownershipShare: relationship.ownershipShare, canAct: relationship.canAct }];
        }, []);
      const updated: StoredJourney = { ...journey, subject: { ...journey.subject, context: {
        relationshipToAccountHolder: family?.role,
        householdMember: household || undefined,
        connectedPeople: connectedPeople?.length ? connectedPeople : undefined,
      } } };
      this.journeys.set(key, updated);
    }
  }
  async reset(sessionId: string) {
    for (const [key] of this.journeys) if (key.startsWith(`${sessionId}:`)) this.journeys.delete(key);
    for (const [key, entity] of this.entities) if (entity.sessionId === sessionId) this.entities.delete(key);
    const remainingEntityIds = new Set([...this.entities.values()].map((entity) => entity.id));
    for (const [key, relationship] of this.relationships) if (key.startsWith(`${sessionId}:`) || !remainingEntityIds.has(relationship.fromId) || !remainingEntityIds.has(relationship.toId)) this.relationships.delete(key);
  }
}

const runtimeAgencyAgent = process.env.NODE_ENV !== "production" && process.env.UMANG_E2E_AGENCY === "approved" ? e2eAgencyAgent : evaluateSyntheticAgency;

export const journeyRepository: JourneyRepository =
  process.env.PERSISTENCE_MODE === "postgres"
    ? new PrismaJourneyRepository(runtimeAgencyAgent)
    : new MemoryJourneyRepository(runtimeAgencyAgent);
