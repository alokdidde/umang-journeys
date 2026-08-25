import { completeNode, compileJourney, newBabyTemplate, type JourneyProjection } from "@/domain/journey-engine";
import { PrismaJourneyRepository } from "@/server/repositories/prisma-journey-repository";
import { advanceSimulatedService, isSandboxServiceKey } from "@/server/integrations/sandbox-services";
import type { SandboxServiceKey, SandboxServiceRun } from "@/domain/service-workflows";

export type StoredJourney = { id: string; sessionId: string; projection: JourneyProjection; facts: Record<string, string>; serviceRuns: Partial<Record<SandboxServiceKey, SandboxServiceRun>>; registrationId?: string };

export interface JourneyRepository {
  create(sessionId: string): Promise<StoredJourney>;
  get(sessionId: string, id: string): Promise<StoredJourney | null>;
  updateFacts(sessionId: string, id: string, facts: Record<string, string>): Promise<StoredJourney | null>;
  completeRegistration(sessionId: string, id: string, idempotencyKey: string): Promise<StoredJourney | null>;
  advanceService(sessionId: string, id: string, nodeKey: string, idempotencyKey: string): Promise<StoredJourney | null>;
  reset(sessionId: string): Promise<void>;
}

const journeys = new Map<string, StoredJourney>();
const idempotency = new Map<string, string>();

export class MemoryJourneyRepository implements JourneyRepository {
  async create(sessionId: string) {
    const journey: StoredJourney = { id: "demo-new-baby", sessionId, projection: compileJourney(newBabyTemplate), facts: {}, serviceRuns: {} };
    journeys.set(`${sessionId}:${journey.id}`, journey);
    return journey;
  }
  async get(sessionId: string, id: string) { return journeys.get(`${sessionId}:${id}`) ?? null; }
  async updateFacts(sessionId: string, id: string, facts: Record<string, string>) {
    const journey = await this.get(sessionId, id);
    if (!journey) return null;
    const updated = { ...journey, facts: { ...journey.facts, ...facts } };
    journeys.set(`${sessionId}:${id}`, updated);
    return updated;
  }
  async completeRegistration(sessionId: string, id: string, idempotencyKey: string) {
    const journey = await this.get(sessionId, id);
    if (!journey) return null;
    const scopedKey = `${sessionId}:${id}:${idempotencyKey}`;
    const registrationId = idempotency.get(scopedKey) ?? "BR-DEMO-2026-7429";
    idempotency.set(scopedKey, registrationId);
    const updated = { ...journey, registrationId, projection: completeNode(journey.projection, "birth_registration") };
    journeys.set(`${sessionId}:${id}`, updated);
    return updated;
  }
  async advanceService(sessionId: string, id: string, nodeKey: string, idempotencyKey: string) {
    const journey = await this.get(sessionId, id);
    const node = journey?.projection.nodes.find((candidate) => candidate.key === nodeKey);
    if (!journey || !node || node.status === "locked" || !isSandboxServiceKey(nodeKey)) return null;
    const scopedKey = `${sessionId}:${id}:${nodeKey}:${idempotencyKey}`;
    if (idempotency.has(scopedKey)) return journey;
    idempotency.set(scopedKey, idempotencyKey);
    const run = advanceSimulatedService(id, nodeKey, journey.serviceRuns[nodeKey]);
    const projection = run.status === "completed"
      ? completeNode(journey.projection, nodeKey)
      : { ...journey.projection, nodes: journey.projection.nodes.map((candidate) => candidate.key === nodeKey ? { ...candidate, status: run.status === "waiting_external" ? "waiting_external" as const : "in_progress" as const } : candidate) };
    const updated = { ...journey, projection, serviceRuns: { ...journey.serviceRuns, [nodeKey]: run } };
    journeys.set(`${sessionId}:${id}`, updated);
    return updated;
  }
  async reset(sessionId: string) { for (const [key] of journeys) if (key.startsWith(`${sessionId}:`)) journeys.delete(key); }
}

export const journeyRepository: JourneyRepository =
  process.env.PERSISTENCE_MODE === "postgres"
    ? new PrismaJourneyRepository()
    : new MemoryJourneyRepository();
