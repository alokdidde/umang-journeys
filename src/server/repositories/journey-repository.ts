import { completeNode, compileJourney, newBabyTemplate, type JourneyProjection } from "@/domain/journey-engine";
import { PrismaJourneyRepository } from "@/server/repositories/prisma-journey-repository";

export type StoredJourney = { id: string; sessionId: string; projection: JourneyProjection; facts: Record<string, string>; registrationId?: string };

export interface JourneyRepository {
  create(sessionId: string): Promise<StoredJourney>;
  get(sessionId: string, id: string): Promise<StoredJourney | null>;
  updateFacts(sessionId: string, id: string, facts: Record<string, string>): Promise<StoredJourney | null>;
  completeRegistration(sessionId: string, id: string, idempotencyKey: string): Promise<StoredJourney | null>;
  reset(sessionId: string): Promise<void>;
}

const journeys = new Map<string, StoredJourney>();
const idempotency = new Map<string, string>();

export class MemoryJourneyRepository implements JourneyRepository {
  async create(sessionId: string) {
    const journey: StoredJourney = { id: "demo-new-baby", sessionId, projection: compileJourney(newBabyTemplate), facts: {} };
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
  async reset(sessionId: string) { for (const [key] of journeys) if (key.startsWith(`${sessionId}:`)) journeys.delete(key); }
}

export const journeyRepository: JourneyRepository =
  process.env.PERSISTENCE_MODE === "postgres"
    ? new PrismaJourneyRepository()
    : new MemoryJourneyRepository();
