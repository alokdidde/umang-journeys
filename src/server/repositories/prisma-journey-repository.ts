import { newBabyTemplate, type JourneyProjection, type NodeStatus } from "@/domain/journey-engine";
import { getPrisma } from "@/server/db";
import type { JourneyRepository, StoredJourney } from "@/server/repositories/journey-repository";

type DatabaseJourney = Awaited<ReturnType<ReturnType<typeof getPrisma>["journeyInstance"]["findFirst"]>>;

const toDatabaseStatus = (status: NodeStatus) => status.toUpperCase() as
  | "LOCKED"
  | "AVAILABLE"
  | "IN_PROGRESS"
  | "WAITING_EXTERNAL"
  | "COMPLETED"
  | "BLOCKED"
  | "SKIPPED";

function mapJourney(
  journey: NonNullable<DatabaseJourney> & {
    nodes: Array<{ nodeKey: string; status: string; recommended: boolean }>;
    facts: Array<{ key: string; valueJson: unknown }>;
    documents: Array<{ metadataJson: unknown }>;
  },
  sessionId: string,
): StoredJourney {
  const nodeByKey = new Map(journey.nodes.map((node) => [node.nodeKey, node]));
  const projection: JourneyProjection = {
    templateId: newBabyTemplate.id,
    nodes: newBabyTemplate.nodes.map((definition) => {
      const stored = nodeByKey.get(definition.key);
      return {
        ...definition,
        status: (stored?.status.toLowerCase() ?? "locked") as NodeStatus,
        recommended: stored?.recommended ?? false,
      };
    }),
    edges: newBabyTemplate.nodes.flatMap((node) =>
      (node.dependsOn ?? []).map((from) => ({ from, to: node.key })),
    ),
  };

  const facts = Object.fromEntries(
    journey.facts.map((fact) => [fact.key, typeof fact.valueJson === "string" ? fact.valueJson : String(fact.valueJson)]),
  );
  const registration = journey.documents
    .map((document) => document.metadataJson)
    .find((metadata): metadata is { registrationId: string } =>
      Boolean(metadata && typeof metadata === "object" && "registrationId" in metadata),
    );

  return { id: journey.id, sessionId, projection, facts, registrationId: registration?.registrationId };
}

const includeJourney = { nodes: true, facts: true, documents: true } as const;

export class PrismaJourneyRepository implements JourneyRepository {
  async create(sessionId: string) {
    const prisma = getPrisma();
    const profile = await prisma.userProfile.upsert({
      where: { sessionId },
      update: {},
      create: { sessionId, displayName: "Ananya", stateCode: "DL", demoProfile: true },
    });
    await prisma.journeyTemplate.upsert({
      where: { id: newBabyTemplate.id },
      update: { version: 1, configJson: newBabyTemplate },
      create: { id: newBabyTemplate.id, version: 1, lifeEvent: "new_baby", configJson: newBabyTemplate },
    });

    const existing = await prisma.journeyInstance.findFirst({
      where: { profileId: profile.id, templateId: newBabyTemplate.id, status: { not: "ABANDONED" } },
      include: includeJourney,
    });
    if (existing) return mapJourney(existing, sessionId);

    const initial = newBabyTemplate.nodes.map((node, index) => ({
      nodeKey: node.key,
      status: toDatabaseStatus(index === 0 ? "in_progress" : "locked"),
      recommended: index === 0,
    }));
    const journey = await prisma.journeyInstance.create({
      data: {
        profileId: profile.id,
        templateId: newBabyTemplate.id,
        templateVersion: 1,
        status: "ACTIVE",
        nodes: { create: initial },
        edges: {
          create: newBabyTemplate.nodes.flatMap((node) =>
            (node.dependsOn ?? []).map((fromNodeKey) => ({ fromNodeKey, toNodeKey: node.key })),
          ),
        },
      },
      include: includeJourney,
    });
    return mapJourney(journey, sessionId);
  }

  async get(sessionId: string, id: string) {
    const journey = await getPrisma().journeyInstance.findFirst({
      where: { id, profile: { sessionId } },
      include: includeJourney,
    });
    return journey ? mapJourney(journey, sessionId) : null;
  }

  async updateFacts(sessionId: string, id: string, facts: Record<string, string>) {
    const journey = await this.get(sessionId, id);
    if (!journey) return null;
    const prisma = getPrisma();
    await prisma.$transaction(
      Object.entries(facts).map(([key, valueJson]) =>
        prisma.fact.upsert({
          where: { journeyId_key: { journeyId: id, key } },
          update: { valueJson, sourceType: "USER_CONFIRMED", confirmed: true },
          create: { journeyId: id, key, valueJson, sourceType: "USER_CONFIRMED", confirmed: true },
        }),
      ),
    );
    return this.get(sessionId, id);
  }

  async completeRegistration(sessionId: string, id: string, idempotencyKey: string) {
    const journey = await this.get(sessionId, id);
    if (!journey) return null;
    const prisma = getPrisma();
    const node = await prisma.journeyNode.findUniqueOrThrow({
      where: { journeyId_nodeKey: { journeyId: id, nodeKey: "birth_registration" } },
    });
    const scopedKey = `${sessionId}:${id}:${idempotencyKey}`;
    const existing = await prisma.externalAction.findUnique({ where: { idempotencyKey: scopedKey } });
    const registrationId =
      existing && existing.responseJson && typeof existing.responseJson === "object" && "registrationId" in existing.responseJson
        ? String(existing.responseJson.registrationId)
        : "BR-DEMO-2026-7429";

    await prisma.$transaction(async (tx) => {
      if (!existing) {
        await tx.externalAction.create({
          data: {
            nodeId: node.id,
            adapterKey: "mock-birth-registry",
            actionType: "register_birth",
            status: "SUCCEEDED",
            idempotencyKey: scopedKey,
            requestJson: { synthetic: true },
            responseJson: { registrationId, synthetic: true },
          },
        });
      }
      await tx.journeyNode.update({
        where: { id: node.id },
        data: { status: "COMPLETED", recommended: false, completedAt: new Date() },
      });
      await tx.journeyNode.updateMany({
        where: { journeyId: id, status: "LOCKED" },
        data: { status: "AVAILABLE" },
      });
      const document = await tx.outputDocument.findFirst({ where: { journeyId: id, nodeId: node.id, type: "birth_certificate" } });
      if (!document) {
        await tx.outputDocument.create({
          data: { journeyId: id, nodeId: node.id, type: "birth_certificate", synthetic: true, metadataJson: { registrationId } },
        });
      }
      await tx.auditEvent.create({
        data: { journeyId: id, actorType: "demo_user", eventType: "birth_registration_completed", payloadJson: { registrationId } },
      });
    });
    return this.get(sessionId, id);
  }

  async reset(sessionId: string) {
    await getPrisma().journeyInstance.updateMany({
      where: { profile: { sessionId }, status: { not: "ABANDONED" } },
      data: { status: "ABANDONED" },
    });
  }
}
