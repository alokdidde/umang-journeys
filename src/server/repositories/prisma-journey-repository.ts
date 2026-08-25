import { completeNode, newBabyTemplate, type JourneyProjection, type NodeStatus } from "@/domain/journey-engine";
import { getPrisma } from "@/server/db";
import type { JourneyRepository, StoredJourney } from "@/server/repositories/journey-repository";
import { advanceSimulatedService, isSandboxServiceKey, simulateExternalService } from "@/server/integrations/sandbox-services";
import type { SandboxServiceKey, SandboxServiceRun } from "@/domain/service-workflows";

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
    subject: { id: string; type: string; displayName: string };
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

  const serviceRuns: Partial<Record<SandboxServiceKey, SandboxServiceRun>> = {};
  for (const fact of journey.facts) {
    const match = fact.key.match(/^service\.(.+)\.run$/);
    if (!match || !isSandboxServiceKey(match[1])) continue;
    try {
      const raw = typeof fact.valueJson === "string" ? fact.valueJson : JSON.stringify(fact.valueJson);
      serviceRuns[match[1]] = JSON.parse(raw) as SandboxServiceRun;
    } catch {
      // Ignore an invalid historical sandbox snapshot and allow the run to restart.
    }
  }

  return {
    id: journey.id,
    sessionId,
    status: journey.status === "COMPLETED" ? "completed" : journey.status === "ABANDONED" ? "abandoned" : "active",
    subject: { id: journey.subject.id, type: "child", displayName: journey.subject.displayName },
    projection,
    facts,
    serviceRuns,
    registrationId: registration?.registrationId,
    createdAt: journey.startedAt.toISOString(),
    updatedAt: journey.updatedAt.toISOString(),
  };
}

const includeJourney = { nodes: true, facts: true, documents: true, subject: true } as const;

function validDate(value: string | undefined) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? undefined : date;
}

function projectionIsComplete(projection: JourneyProjection) {
  return projection.nodes.every((node) => node.status === "completed" || node.status === "skipped");
}

export class PrismaJourneyRepository implements JourneyRepository {
  async create(sessionId: string, facts: Record<string, string> = {}) {
    const prisma = getPrisma();
    const profile = await prisma.userProfile.upsert({
      where: { sessionId },
      update: {},
      create: { sessionId, displayName: "Ananya", stateCode: "DL", demoProfile: true },
    });
    await prisma.journeyTemplate.upsert({
      where: { id: newBabyTemplate.id },
      update: { version: 1, lifeEvent: newBabyTemplate.lifeEvent, configJson: newBabyTemplate },
      create: { id: newBabyTemplate.id, version: 1, lifeEvent: newBabyTemplate.lifeEvent, configJson: newBabyTemplate },
    });

    const initial = newBabyTemplate.nodes.map((node, index) => ({
      nodeKey: node.key,
      status: toDatabaseStatus(index === 0 ? "in_progress" : "locked"),
      recommended: index === 0,
    }));
    const journey = await prisma.journeyInstance.create({
      data: {
        profile: { connect: { id: profile.id } },
        template: { connect: { id: newBabyTemplate.id } },
        templateVersion: 1,
        status: "ACTIVE",
        subject: {
          create: {
            type: "CHILD" as const,
            displayName: facts["child.name"]?.trim() || "Your baby",
            dateOfBirth: validDate(facts["child.dateOfBirth"]),
            profile: { connect: { id: profile.id } },
          },
        },
        nodes: { create: initial },
        facts: {
          create: Object.entries(facts).map(([key, valueJson]) => ({
            key,
            valueJson,
            sourceType: "USER_CONFIRMED" as const,
            confirmed: true,
          })),
        },
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

  async list(sessionId: string) {
    const journeys = await getPrisma().journeyInstance.findMany({
      where: { profile: { sessionId }, status: { not: "ABANDONED" } },
      orderBy: { updatedAt: "desc" },
      include: includeJourney,
    });
    return journeys.map((journey) => mapJourney(journey, sessionId));
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
      [
        ...Object.entries(facts).map(([key, valueJson]) =>
        prisma.fact.upsert({
          where: { journeyId_key: { journeyId: id, key } },
          update: { valueJson, sourceType: "USER_CONFIRMED", confirmed: true },
          create: { journeyId: id, key, valueJson, sourceType: "USER_CONFIRMED", confirmed: true },
        })),
        ...(facts["child.name"]?.trim()
          ? [prisma.journeySubject.update({ where: { id: journey.subject.id }, data: { displayName: facts["child.name"].trim() } })]
          : []),
        prisma.journeyInstance.update({ where: { id }, data: { updatedAt: new Date() } }),
      ],
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
    const nextProjection = completeNode(journey.projection, "birth_registration");

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
      for (const projectedNode of nextProjection.nodes) {
        await tx.journeyNode.update({
          where: { journeyId_nodeKey: { journeyId: id, nodeKey: projectedNode.key } },
          data: {
            status: toDatabaseStatus(projectedNode.status),
            recommended: projectedNode.recommended,
            completedAt: projectedNode.status === "completed" ? new Date() : null,
          },
        });
      }
      const document = await tx.outputDocument.findFirst({ where: { journeyId: id, nodeId: node.id, type: "birth_certificate" } });
      if (!document) {
        await tx.outputDocument.create({
          data: { journeyId: id, nodeId: node.id, type: "birth_certificate", synthetic: true, metadataJson: { registrationId } },
        });
      }
      await tx.auditEvent.create({
        data: { journeyId: id, actorType: "demo_user", eventType: "birth_registration_completed", payloadJson: { registrationId } },
      });
      await tx.journeyInstance.update({
        where: { id },
        data: { status: projectionIsComplete(nextProjection) ? "COMPLETED" : "ACTIVE", updatedAt: new Date() },
      });
    });
    return this.get(sessionId, id);
  }

  async advanceService(sessionId: string, id: string, nodeKey: string, idempotencyKey: string) {
    const journey = await this.get(sessionId, id);
    const projectedNode = journey?.projection.nodes.find((candidate) => candidate.key === nodeKey);
    if (!journey || !projectedNode || projectedNode.status === "locked" || !isSandboxServiceKey(nodeKey)) return null;
    const prisma = getPrisma();
    const node = await prisma.journeyNode.findUniqueOrThrow({ where: { journeyId_nodeKey: { journeyId: id, nodeKey } } });
    const scopedKey = `${sessionId}:${id}:${nodeKey}:${idempotencyKey}`;
    const existing = await prisma.externalAction.findUnique({ where: { idempotencyKey: scopedKey } });
    if (existing) return this.get(sessionId, id);
    const run = advanceSimulatedService(id, nodeKey, journey.serviceRuns[nodeKey]);
    const result = simulateExternalService(id, nodeKey);
    const nodeStatus = run.status === "completed" ? "COMPLETED" : run.status === "waiting_external" ? "WAITING_EXTERNAL" : "IN_PROGRESS";
    const nextProjection = run.status === "completed" ? completeNode(journey.projection, nodeKey) : null;

    await prisma.$transaction(async (tx) => {
      await tx.externalAction.create({
        data: {
          nodeId: node.id,
          adapterKey: result.adapterKey,
          actionType: run.events.at(-1)?.stageKey ?? result.actionType,
          status: run.status === "waiting_external" ? "PENDING" : "SUCCEEDED",
          idempotencyKey: scopedKey,
          requestJson: { runId: run.runId, stage: run.currentStage, synthetic: true },
          responseJson: { progress: run.progress, state: run.status, receipt: run.receipt, synthetic: true },
        },
      });
      if (nextProjection) {
        for (const projectedNode of nextProjection.nodes) {
          await tx.journeyNode.update({
            where: { journeyId_nodeKey: { journeyId: id, nodeKey: projectedNode.key } },
            data: {
              status: toDatabaseStatus(projectedNode.status),
              recommended: projectedNode.recommended,
              completedAt: projectedNode.status === "completed"
                ? (projectedNode.key === nodeKey && run.completedAt ? new Date(run.completedAt) : undefined)
                : null,
            },
          });
        }
      } else {
        await tx.journeyNode.update({
          where: { id: node.id },
          data: { status: nodeStatus, recommended: false, completedAt: null },
        });
      }
      await tx.fact.upsert({
        where: { journeyId_key: { journeyId: id, key: `service.${nodeKey}.run` } },
        update: { valueJson: JSON.stringify(run), sourceType: "DERIVED", confirmed: true },
        create: { journeyId: id, key: `service.${nodeKey}.run`, valueJson: JSON.stringify(run), sourceType: "DERIVED", confirmed: true },
      });
      if (run.status === "completed") {
        for (const [key, valueJson] of [
          [`service.${nodeKey}.receipt`, run.receipt],
          [`service.${nodeKey}.summary`, run.artifact?.subtitle ?? result.summary],
        ]) {
          await tx.fact.upsert({
            where: { journeyId_key: { journeyId: id, key } },
            update: { valueJson, sourceType: "DERIVED", confirmed: true },
            create: { journeyId: id, key, valueJson, sourceType: "DERIVED", confirmed: true },
          });
        }
      }
      const latest = run.events.at(-1);
      await tx.auditEvent.create({
        data: { journeyId: id, actorType: "sandbox_adapter", eventType: `${nodeKey}_${latest?.stageKey ?? "advanced"}`, payloadJson: { runId: run.runId, progress: run.progress, status: run.status } },
      });
      await tx.journeyInstance.update({
        where: { id },
        data: { status: nextProjection && projectionIsComplete(nextProjection) ? "COMPLETED" : "ACTIVE", updatedAt: new Date() },
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
