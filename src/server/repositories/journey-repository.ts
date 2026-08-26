import { activateBranch as activateJourneyBranch, completeNode, compileJourney, getJourneyTemplate, isJourneyComplete, newBabyTemplate, reevaluateJourney, type JourneyProjection } from "@/domain/journey-engine";
import { PrismaJourneyRepository } from "@/server/repositories/prisma-journey-repository";
import { advanceSimulatedService, isSandboxServiceKey } from "@/server/integrations/sandbox-services";
import type { SandboxServiceKey, SandboxServiceRun } from "@/domain/service-workflows";
import type { JourneyLifecycleStatus, JourneySubject } from "@/domain/journey-summary";
import type { EvidenceRecord, JourneyEvidence } from "@/domain/evidence";

export type StoredJourney = {
  id: string;
  sessionId: string;
  status: JourneyLifecycleStatus;
  subject: JourneySubject;
  projection: JourneyProjection;
  facts: Record<string, string>;
  factHistory: Array<{ id: string; key: string; value: string; source: "user_statement" | "document" | "provider" | "demo"; sourceRef?: string; status: "active" | "corrected" | "retracted"; recordedAt: string }>;
  auditLog: Array<{ id: string; actor: "citizen" | "document_agent" | "provider" | "system"; event: string; detail: Record<string, string>; occurredAt: string }>;
  serviceRuns: Partial<Record<SandboxServiceKey, SandboxServiceRun>>;
  evidence: JourneyEvidence[];
  registrationId?: string;
  createdAt: string;
  updatedAt: string;
};

export interface JourneyRepository {
  create(sessionId: string, facts?: Record<string, string>, templateId?: string): Promise<StoredJourney>;
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
  private entities = new Map<string, { id: string; type: JourneySubject["type"]; displayName: string }>();

  async create(sessionId: string, facts: Record<string, string> = {}, templateId = newBabyTemplate.id) {
    const template = getJourneyTemplate(templateId);
    if (!template) throw new Error(`Unknown journey template: ${templateId}`);
    const timestamp = now();
    const subject = subjectForJourney(template.lifeEvent, facts);
    const entityKey = `${sessionId}:${subject.type}:${subject.displayName.trim().toLocaleLowerCase("en-IN")}`;
    const entity = this.entities.get(entityKey) ?? { id: `entity-${crypto.randomUUID()}`, type: subject.type, displayName: subject.displayName };
    this.entities.set(entityKey, entity);
    const subjectId = `${subject.type}-${crypto.randomUUID()}`;
    const journey: StoredJourney = {
      id: `journey-${crypto.randomUUID()}`,
      sessionId,
      status: "active",
      subject: { id: subjectId, ...subject, canonicalEntityId: entity.id },
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
    const journey = await this.get(sessionId, id);
    if (!journey) return null;
    const scopedKey = `${sessionId}:${id}:${idempotencyKey}`;
    const registrationId = this.idempotency.get(scopedKey) ?? "BR-DEMO-2026-7429";
    this.idempotency.set(scopedKey, registrationId);
    const projection = completeNode(journey.projection, "birth_registration", journey.facts);
    const updated = { ...journey, registrationId, projection, auditLog: [...journey.auditLog, { id: `audit-${crypto.randomUUID()}`, actor: "provider" as const, event: "birth_registration_approved", detail: { registrationId }, occurredAt: now() }], status: isJourneyComplete(projection) ? "completed" as const : "active" as const, updatedAt: now() };
    this.journeys.set(`${sessionId}:${id}`, updated);
    return updated;
  }
  async advanceService(sessionId: string, id: string, nodeKey: string, idempotencyKey: string) {
    const journey = await this.get(sessionId, id);
    const node = journey?.projection.nodes.find((candidate) => candidate.key === nodeKey);
    if (!journey || !node || (node.status === "locked" && !canAdvanceFromVerifiedEvidence(journey, nodeKey)) || !isSandboxServiceKey(nodeKey)) return null;
    const scopedKey = `${sessionId}:${id}:${nodeKey}:${idempotencyKey}`;
    if (this.idempotency.has(scopedKey)) return journey;
    this.idempotency.set(scopedKey, idempotencyKey);
    const run = advanceSimulatedService(id, nodeKey, journey.serviceRuns[nodeKey], journey.facts);
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
  async reset(sessionId: string) { for (const [key] of this.journeys) if (key.startsWith(`${sessionId}:`)) this.journeys.delete(key); }
}

export const journeyRepository: JourneyRepository =
  process.env.PERSISTENCE_MODE === "postgres"
    ? new PrismaJourneyRepository()
    : new MemoryJourneyRepository();
