import { completeNode, compileJourney, newBabyTemplate, type JourneyProjection } from "@/domain/journey-engine";
import { PrismaJourneyRepository } from "@/server/repositories/prisma-journey-repository";
import { advanceSimulatedService, isSandboxServiceKey } from "@/server/integrations/sandbox-services";
import type { SandboxServiceKey, SandboxServiceRun } from "@/domain/service-workflows";
import type { JourneyLifecycleStatus, JourneySubject } from "@/domain/journey-summary";

export type StoredJourney = {
  id: string;
  sessionId: string;
  status: JourneyLifecycleStatus;
  subject: JourneySubject;
  projection: JourneyProjection;
  facts: Record<string, string>;
  serviceRuns: Partial<Record<SandboxServiceKey, SandboxServiceRun>>;
  registrationId?: string;
  createdAt: string;
  updatedAt: string;
};

export interface JourneyRepository {
  create(sessionId: string, facts?: Record<string, string>): Promise<StoredJourney>;
  list(sessionId: string): Promise<StoredJourney[]>;
  get(sessionId: string, id: string): Promise<StoredJourney | null>;
  updateFacts(sessionId: string, id: string, facts: Record<string, string>): Promise<StoredJourney | null>;
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

  async create(sessionId: string, facts: Record<string, string> = {}) {
    const timestamp = now();
    const subjectId = `child-${crypto.randomUUID()}`;
    const journey: StoredJourney = {
      id: `journey-${crypto.randomUUID()}`,
      sessionId,
      status: "active",
      subject: { id: subjectId, type: "child", displayName: facts["child.name"]?.trim() || "Your baby" },
      projection: compileJourney(newBabyTemplate),
      facts,
      serviceRuns: {},
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
    const updated = {
      ...journey,
      subject: childName ? { ...journey.subject, displayName: childName } : journey.subject,
      facts: { ...journey.facts, ...facts },
      updatedAt: now(),
    };
    this.journeys.set(`${sessionId}:${id}`, updated);
    return updated;
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
