import { completeNode, compileJourney, getJourneyTemplate, newBabyTemplate, type JourneyProjection } from "@/domain/journey-engine";
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
  updateFacts(sessionId: string, id: string, facts: Record<string, string>): Promise<StoredJourney | null>;
  completeStep(sessionId: string, id: string, nodeKey: string, idempotencyKey: string): Promise<StoredJourney | null>;
  addEvidence(sessionId: string, id: string, evidence: Omit<EvidenceRecord, "id" | "createdAt">): Promise<StoredJourney | null>;
  getEvidence(sessionId: string, id: string, evidenceId: string): Promise<EvidenceRecord | null>;
  completeRegistration(sessionId: string, id: string, idempotencyKey: string): Promise<StoredJourney | null>;
  advanceService(sessionId: string, id: string, nodeKey: string, idempotencyKey: string): Promise<StoredJourney | null>;
  reset(sessionId: string): Promise<void>;
}

function now() { return new Date().toISOString(); }

function isComplete(projection: JourneyProjection) {
  return projection.nodes.every((node) => node.status === "completed" || node.status === "skipped");
}

export class MemoryJourneyRepository implements JourneyRepository {
  private journeys = new Map<string, StoredJourney>();
  private idempotency = new Map<string, string>();
  private evidenceContents = new Map<string, EvidenceRecord>();

  async create(sessionId: string, facts: Record<string, string> = {}, templateId = newBabyTemplate.id) {
    const template = getJourneyTemplate(templateId);
    if (!template) throw new Error(`Unknown journey template: ${templateId}`);
    const timestamp = now();
    const isVehicle = template.lifeEvent === "buying_a_vehicle";
    const subjectId = `${isVehicle ? "vehicle" : "child"}-${crypto.randomUUID()}`;
    const journey: StoredJourney = {
      id: `journey-${crypto.randomUUID()}`,
      sessionId,
      status: "active",
      subject: isVehicle
        ? { id: subjectId, type: "vehicle", displayName: facts["vehicle.makeModel"]?.trim() || facts["vehicle.registrationNumber"]?.trim() || "Your vehicle" }
        : { id: subjectId, type: "child", displayName: facts["child.name"]?.trim() || "Your baby" },
      projection: compileJourney(template),
      facts,
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
  async updateFacts(sessionId: string, id: string, facts: Record<string, string>) {
    const journey = await this.get(sessionId, id);
    if (!journey) return null;
    const childName = facts["child.name"]?.trim();
    const vehicleName = facts["vehicle.makeModel"]?.trim() || facts["vehicle.registrationNumber"]?.trim();
    const updated = {
      ...journey,
      subject: childName || vehicleName ? { ...journey.subject, displayName: childName || vehicleName || journey.subject.displayName } : journey.subject,
      facts: { ...journey.facts, ...facts },
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
    const projection = completeNode(journey.projection, nodeKey);
    const updated = { ...journey, projection, status: isComplete(projection) ? "completed" as const : journey.status, updatedAt: now() };
    this.journeys.set(`${sessionId}:${id}`, updated);
    return updated;
  }
  async addEvidence(sessionId: string, id: string, input: Omit<EvidenceRecord, "id" | "createdAt">) {
    const journey = await this.get(sessionId, id);
    if (!journey) return null;
    const record: EvidenceRecord = { ...input, id: `evidence-${crypto.randomUUID()}`, createdAt: now() };
    this.evidenceContents.set(`${sessionId}:${id}:${record.id}`, record);
    const summary: JourneyEvidence = {
      id: record.id,
      type: record.type,
      fileName: record.fileName,
      mimeType: record.mimeType,
      size: record.size,
      source: record.source,
      verificationStatus: record.verificationStatus,
      extractedFields: record.extractedFields,
      createdAt: record.createdAt,
    };
    const updated = { ...journey, evidence: [...journey.evidence.filter((item) => item.type !== record.type), summary], updatedAt: now() };
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
    const projection = completeNode(journey.projection, "birth_registration");
    const updated = { ...journey, registrationId, projection, status: isComplete(projection) ? "completed" as const : journey.status, updatedAt: now() };
    this.journeys.set(`${sessionId}:${id}`, updated);
    return updated;
  }
  async advanceService(sessionId: string, id: string, nodeKey: string, idempotencyKey: string) {
    const journey = await this.get(sessionId, id);
    const node = journey?.projection.nodes.find((candidate) => candidate.key === nodeKey);
    if (!journey || !node || node.status === "locked" || !isSandboxServiceKey(nodeKey)) return null;
    const scopedKey = `${sessionId}:${id}:${nodeKey}:${idempotencyKey}`;
    if (this.idempotency.has(scopedKey)) return journey;
    this.idempotency.set(scopedKey, idempotencyKey);
    const run = advanceSimulatedService(id, nodeKey, journey.serviceRuns[nodeKey]);
    const projection = run.status === "completed"
      ? completeNode(journey.projection, nodeKey)
      : { ...journey.projection, nodes: journey.projection.nodes.map((candidate) => candidate.key === nodeKey ? { ...candidate, status: run.status === "waiting_external" ? "waiting_external" as const : "in_progress" as const } : candidate) };
    const updated = {
      ...journey,
      projection,
      status: isComplete(projection) ? "completed" as const : journey.status,
      serviceRuns: { ...journey.serviceRuns, [nodeKey]: run },
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
