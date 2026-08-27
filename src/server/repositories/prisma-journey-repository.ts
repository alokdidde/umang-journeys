import { activateBranch as activateJourneyBranch, compileJourney, completeNode, getJourneyTemplate, hydrateJourney, isJourneyComplete, newBabyTemplate, type JourneyTemplate, type NodeStatus } from "@/domain/journey-engine";
import { getPrisma } from "@/server/db";
import { buildAgencyCaseInput, canAdvanceFromVerifiedEvidence, canonicalEntityKey, evidenceFacts, type EntityAssociationSeed, type EntityGraphSeed, type JourneyRepository, type JourneySubjectSeed, type LifeEntityRecord, type StoredJourney } from "@/server/repositories/journey-repository";
import { agencyDecisionToServiceRun, evaluateSyntheticAgency, type ExternalAgencyAgent } from "@/server/integrations/external-agency-agent";
import { serviceDefinitionFor, type SandboxServiceRun } from "@/domain/service-workflows";
import type { EvidenceRecord, EvidenceSource, EvidenceType, JourneyEvidence } from "@/domain/evidence";
import type { ConnectedPerson, JourneySubject } from "@/domain/journey-summary";
import type { Prisma } from "@/generated/prisma/client";
import { entityKindFromLegacySubject, type LifeEntityKind } from "@/domain/life-entity";

type DatabaseJourney = Awaited<ReturnType<ReturnType<typeof getPrisma>["journeyInstance"]["findFirst"]>>;

function subjectForJourney(lifeEvent: string, facts: Record<string, string>): { type: "CHILD" | "VEHICLE" | "PERSON" | "RESIDENCE" | "BUSINESS"; displayName: string } {
  if (lifeEvent === "buying_a_vehicle") return { type: "VEHICLE", displayName: facts["vehicle.makeModel"]?.trim() || facts["vehicle.registrationNumber"]?.trim() || "Your vehicle" };
  if (lifeEvent === "moving_home") return { type: "RESIDENCE", displayName: facts["move.label"]?.trim() || `New home in ${facts["move.newCity"]?.trim() || "your new area"}` };
  if (lifeEvent === "starting_a_business") return { type: "BUSINESS", displayName: facts["business.name"]?.trim() || "Your new business" };
  if (lifeEvent === "managing_health_cover" || lifeEvent === "retirement") return { type: "PERSON", displayName: facts["person.name"]?.trim() || "Ananya Sharma" };
  return { type: "CHILD", displayName: facts["child.name"]?.trim() || "Your baby" };
}

function isAccountHolder(subject: ReturnType<typeof subjectForJourney>, facts: Record<string, string>) {
  return subject.type === "PERSON"
    && facts["health.coverageFor"] !== "dependent"
    && !facts["health.dependentRelationship"];
}

function canonicalType(subject: ReturnType<typeof subjectForJourney>) {
  if (subject.type === "VEHICLE") return "VEHICLE" as const;
  if (subject.type === "RESIDENCE") return "ADDRESS" as const;
  if (subject.type === "BUSINESS") return "BUSINESS" as const;
  return "PERSON" as const;
}

function toSubjectType(type: string): JourneySubject["type"] {
  if (type === "VEHICLE") return "vehicle";
  if (type === "PERSON") return "person";
  if (type === "RESIDENCE") return "residence";
  if (type === "BUSINESS") return "business";
  return "child";
}

function toDatabaseSubjectType(type: JourneySubject["type"]) {
  return type.toUpperCase() as "CHILD" | "VEHICLE" | "PERSON" | "RESIDENCE" | "BUSINESS";
}

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
    facts: Array<{ key: string; valueJson: unknown; revisions: Array<{ id: string; valueJson: unknown; sourceType: string; sourceRef: string | null; status: string; createdAt: Date }> }>;
    documents: Array<{ metadataJson: unknown }>;
    evidence: Array<{ id: string; type: string; provider: string; metadataJson: unknown }>;
    subject: { id: string; type: string; displayName: string };
    entityLinks: Array<{ entityId: string; role: string }>;
    templateSnapshot: { configJson: unknown } | null;
    audits: Array<{ id: string; actorType: string; eventType: string; payloadJson: unknown; createdAt: Date }>;
  },
  sessionId: string,
): StoredJourney {
  const nodeByKey = new Map(journey.nodes.map((node) => [node.nodeKey, node]));
  const snapshot = journey.templateSnapshot?.configJson;
  const snapshotTemplate = snapshot && typeof snapshot === "object" && "nodes" in snapshot && Array.isArray(snapshot.nodes) && "branches" in snapshot && Array.isArray(snapshot.branches)
    ? snapshot as unknown as JourneyTemplate
    : null;
  const template = snapshotTemplate ?? getJourneyTemplate(journey.templateId) ?? newBabyTemplate;

  const facts = Object.fromEntries(
    journey.facts.map((fact) => [fact.key, typeof fact.valueJson === "string" ? fact.valueJson : String(fact.valueJson)]),
  );
  const activeBranchKeys = template.branches
    .filter((branch) => facts[`journey.branch.${branch.key}.active`] === "true")
    .map((branch) => branch.key);
  const projection = hydrateJourney(
    template,
    template.nodes.map((definition) => ({ key: definition.key, status: (nodeByKey.get(definition.key)?.status.toLowerCase() ?? "locked") as NodeStatus })),
    activeBranchKeys,
    facts,
  );
  const registration = journey.documents
    .map((document) => document.metadataJson)
    .find((metadata): metadata is { registrationId: string } =>
      Boolean(metadata && typeof metadata === "object" && "registrationId" in metadata),
    );

  const serviceRuns: Record<string, SandboxServiceRun | undefined> = {};
  for (const fact of journey.facts) {
    const match = fact.key.match(/^service\.(.+)\.run$/);
    if (!match) continue;
    try {
      const raw = typeof fact.valueJson === "string" ? fact.valueJson : JSON.stringify(fact.valueJson);
      serviceRuns[match[1]] = JSON.parse(raw) as SandboxServiceRun;
    } catch {
      // Ignore an invalid historical sandbox snapshot and allow the run to restart.
    }
  }

  const evidence: JourneyEvidence[] = journey.evidence.flatMap((item) => {
    const metadata = item.metadataJson;
    if (!metadata || typeof metadata !== "object") return [];
    const value = metadata as Record<string, unknown>;
    return [{
      id: item.id,
      type: item.type as EvidenceType,
      fileName: String(value.fileName ?? "evidence"),
      mimeType: String(value.mimeType ?? "application/octet-stream"),
      size: Number(value.size ?? 0),
      source: String(value.source ?? item.provider) as EvidenceSource,
      verificationStatus: String(value.verificationStatus ?? "needs_review") as JourneyEvidence["verificationStatus"],
      extractedFields: value.extractedFields && typeof value.extractedFields === "object" ? value.extractedFields as Record<string, string> : {},
      analysisConfidence: typeof value.analysisConfidence === "number" ? value.analysisConfidence : undefined,
      checks: Array.isArray(value.checks) ? value.checks as JourneyEvidence["checks"] : undefined,
      checksum: typeof value.checksum === "string" ? value.checksum : undefined,
      scanStatus: value.scanStatus === "clean" ? "clean" as const : value.scanStatus === "flagged" ? "flagged" as const : undefined,
      retentionExpiresAt: typeof value.retentionExpiresAt === "string" ? value.retentionExpiresAt : undefined,
      version: typeof value.version === "number" ? value.version : undefined,
      reviewedAt: typeof value.reviewedAt === "string" ? value.reviewedAt : undefined,
      createdAt: String(value.createdAt ?? journey.updatedAt.toISOString()),
    }];
  });

  return {
    id: journey.id,
    sessionId,
    status: journey.status === "COMPLETED" ? "completed" : journey.status === "ABANDONED" ? "abandoned" : "active",
    subject: {
      id: journey.subject.id,
      type: toSubjectType(journey.subject.type),
      entityKind: (facts["intake.entityKind"] as LifeEntityKind | undefined) ?? entityKindFromLegacySubject(toSubjectType(journey.subject.type)),
      displayName: journey.subject.displayName,
      canonicalEntityId: journey.entityLinks.find((link) => link.role === "subject")?.entityId,
      householdId: journey.entityLinks.find((link) => link.role === "household")?.entityId,
      role: journey.entityLinks.find((link) => link.role === "subject")?.entityId === journey.entityLinks.find((link) => link.role === "applicant")?.entityId ? "account_holder" : journey.subject.type === "PERSON" || journey.subject.type === "CHILD" ? "person" : "asset",
    },
    projection,
    facts,
    factHistory: journey.facts.flatMap((fact) => fact.revisions.map((revision) => ({
      id: revision.id,
      key: fact.key,
      value: typeof revision.valueJson === "string" ? revision.valueJson : String(revision.valueJson),
      source: revision.sourceType === "DERIVED" ? (revision.sourceRef?.startsWith("provider:") ? "provider" as const : "document" as const) : revision.sourceType === "DEMO_PROFILE" ? "demo" as const : "user_statement" as const,
      sourceRef: revision.sourceRef ?? undefined,
      status: revision.status.toLowerCase() as "active" | "corrected" | "retracted",
      recordedAt: revision.createdAt.toISOString(),
    }))),
    auditLog: journey.audits.map((event) => ({ id: event.id, actor: event.actorType === "sandbox_adapter" ? "provider" as const : event.actorType === "document_agent" ? "document_agent" as const : event.actorType === "system" ? "system" as const : "citizen" as const, event: event.eventType, detail: event.payloadJson && typeof event.payloadJson === "object" ? Object.fromEntries(Object.entries(event.payloadJson).map(([key, value]) => [key, String(value)])) : {}, occurredAt: event.createdAt.toISOString() })),
    serviceRuns,
    evidence,
    registrationId: registration?.registrationId ?? serviceRuns.birth_registration?.receipt,
    createdAt: journey.startedAt.toISOString(),
    updatedAt: journey.updatedAt.toISOString(),
  };
}

const includeJourney = { nodes: true, facts: { include: { revisions: { orderBy: { createdAt: "asc" as const } } } }, documents: true, evidence: true, subject: true, entityLinks: true, templateSnapshot: true, audits: true } as const;

const transactionOptions = {
  maxWait: 10_000,
  timeout: 30_000,
} as const;

function associationKindForDatabase(kind: EntityAssociationSeed["kind"]) {
  return kind.toUpperCase();
}

function jsonRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

async function addEntityContexts(sessionId: string, journeys: StoredJourney[]) {
  const subjectIds = journeys.flatMap((journey) => journey.subject.canonicalEntityId ? [journey.subject.canonicalEntityId] : []);
  if (!subjectIds.length) return journeys;
  const entities = await getPrisma().canonicalEntity.findMany({
    where: { id: { in: subjectIds }, profile: { sessionId } },
    include: { incomingRelationships: { where: { validTo: null }, include: { from: true } } },
  });
  const entityById = new Map(entities.map((entity) => [entity.id, entity]));
  return journeys.map((journey) => {
    const entityId = journey.subject.canonicalEntityId;
    const entity = entityId ? entityById.get(entityId) : undefined;
    if (!entity) return journey;
    const family = entity.incomingRelationships.find((relationship) => relationship.kind === "FAMILY" && jsonRecord(relationship.from.dataJson).role === "account_holder");
    const householdMember = entity.incomingRelationships.some((relationship) => relationship.kind === "HOUSEHOLD_MEMBER");
    const byPerson = new Map<string, ConnectedPerson>();
    for (const relationship of entity.incomingRelationships) {
      if (["FAMILY", "HOUSEHOLD_MEMBER"].includes(relationship.kind) || relationship.from.type !== "PERSON") continue;
      const metadata = jsonRecord(relationship.metadataJson);
      const accountHolder = jsonRecord(relationship.from.dataJson).role === "account_holder";
      const existing = byPerson.get(relationship.fromId);
      if (existing) {
        if (!existing.roles.includes(relationship.role)) existing.roles.push(relationship.role);
        existing.ownershipShare ??= typeof metadata.ownershipShare === "number" ? metadata.ownershipShare : undefined;
        existing.canAct ||= metadata.canAct === true;
      } else {
        byPerson.set(relationship.fromId, {
          entityId: relationship.fromId,
          displayName: accountHolder ? "You" : relationship.from.displayName,
          isAccountHolder: accountHolder,
          roles: [relationship.role],
          ownershipShare: typeof metadata.ownershipShare === "number" ? metadata.ownershipShare : undefined,
          canAct: metadata.canAct === true ? true : undefined,
        });
      }
    }
    return { ...journey, subject: { ...journey.subject, displayName: entity.displayName, context: {
      relationshipToAccountHolder: family?.role || undefined,
      householdMember: householdMember || undefined,
      connectedPeople: byPerson.size ? [...byPerson.values()] : undefined,
    } } };
  });
}

function validDate(value: string | undefined) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? undefined : date;
}

export class PrismaJourneyRepository implements JourneyRepository {
  constructor(private readonly agencyAgent: ExternalAgencyAgent = evaluateSyntheticAgency) {}

  async create(sessionId: string, facts: Record<string, string> = {}, templateId = newBabyTemplate.id, subjectSeed?: JourneySubjectSeed) {
    const template = getJourneyTemplate(templateId);
    if (!template) throw new Error(`Unknown journey template: ${templateId}`);
    const subject = subjectSeed
      ? { type: toDatabaseSubjectType(subjectSeed.type), displayName: subjectSeed.displayName }
      : subjectForJourney(template.lifeEvent, facts);
    const subjectIsAccountHolder = subjectSeed ? subjectSeed.role === "account_holder" : isAccountHolder(subject, facts);
    const prisma = getPrisma();
    const profile = await prisma.userProfile.upsert({
      where: { sessionId },
      update: {},
      create: { sessionId, displayName: "Ananya", stateCode: "DL", demoProfile: true },
    });
    await prisma.journeyTemplate.upsert({
      where: { id: template.id },
      update: { version: template.version, lifeEvent: template.lifeEvent, configJson: template },
      create: { id: template.id, version: template.version, lifeEvent: template.lifeEvent, configJson: template },
    });
    await prisma.journeyTemplateVersion.upsert({
      where: { templateKey_version: { templateKey: template.id, version: template.version } },
      update: { lifeEvent: template.lifeEvent, configJson: template },
      create: { templateKey: template.id, version: template.version, lifeEvent: template.lifeEvent, configJson: template },
    });

    const primaryPerson = await prisma.canonicalEntity.upsert({
      where: { profileId_type_externalKey: { profileId: profile.id, type: "PERSON", externalKey: "person:ananya-sharma" } },
      update: { displayName: subjectIsAccountHolder ? facts["person.name"]?.trim() || "Ananya Sharma" : "Ananya Sharma", dataJson: { role: "account_holder" } },
      create: { profileId: profile.id, type: "PERSON", externalKey: "person:ananya-sharma", displayName: subjectIsAccountHolder ? facts["person.name"]?.trim() || "Ananya Sharma" : "Ananya Sharma", dataJson: { role: "account_holder" } },
    });
    const household = await prisma.canonicalEntity.upsert({
      where: { profileId_type_externalKey: { profileId: profile.id, type: "HOUSEHOLD", externalKey: "household:ananya" } },
      update: {},
      create: { profileId: profile.id, type: "HOUSEHOLD", externalKey: "household:ananya", displayName: "Ananya's household", dataJson: { synthetic: true } },
    });
    const selectedSubjectEntity = subjectSeed?.canonicalEntityId
      ? await prisma.canonicalEntity.findFirst({ where: { id: subjectSeed.canonicalEntityId, profileId: profile.id } })
      : null;
    if (subjectSeed?.canonicalEntityId && !selectedSubjectEntity) throw new Error("The selected person or thing is not available in this profile.");
    const entityKind = subjectSeed?.entityKind ?? entityKindFromLegacySubject(toSubjectType(subject.type));
    const subjectEntityKey = canonicalEntityKey({ type: toSubjectType(subject.type), entityKind, displayName: subject.displayName, role: subjectSeed?.role }, facts);
    const subjectEntity = selectedSubjectEntity ?? (subjectIsAccountHolder ? primaryPerson : await prisma.canonicalEntity.upsert({
      where: { profileId_type_externalKey: { profileId: profile.id, type: canonicalType(subject), externalKey: subjectEntityKey } },
      update: { displayName: subject.displayName, dataJson: { entityKind, ...facts } },
      create: { profileId: profile.id, type: canonicalType(subject), externalKey: subjectEntityKey, displayName: subject.displayName, dataJson: { entityKind, ...facts } },
    }));
    const relationships = [
      { fromId: household.id, toId: primaryPerson.id, kind: "HOUSEHOLD_MEMBER", role: "Household member", metadataJson: {} },
      ...(subjectEntity.id === primaryPerson.id ? [] : [{
        fromId: primaryPerson.id,
        toId: subjectEntity.id,
        kind: subject.type === "CHILD" || subject.type === "PERSON" ? "FAMILY" : subject.type === "RESIDENCE" ? "OCCUPANT" : "OWNER",
        role: subject.type === "CHILD" || subject.type === "PERSON" ? facts["person.relationship"] || facts["health.dependentRelationship"] || "Family member" : subject.type === "RESIDENCE" ? "Occupant" : "Owner",
        metadataJson: subject.type === "BUSINESS" ? { canAct: true } : {},
      }]),
    ];
    for (const relationship of relationships) {
      const existing = await prisma.entityRelationship.findFirst({ where: { fromId: relationship.fromId, toId: relationship.toId, kind: relationship.kind, role: relationship.role } });
      if (!existing) await prisma.entityRelationship.create({ data: relationship });
    }

    const initialProjection = compileJourney(template, facts);
    const initial = initialProjection.nodes.map((node) => ({ nodeKey: node.key, status: toDatabaseStatus(node.status), recommended: node.recommended }));
    const journey = await prisma.journeyInstance.create({
      data: {
        profile: { connect: { id: profile.id } },
        template: { connect: { id: template.id } },
        templateSnapshot: { connect: { templateKey_version: { templateKey: template.id, version: template.version } } },
        status: "ACTIVE",
        subject: {
          create: {
            type: subject.type,
            displayName: subject.displayName,
            dateOfBirth: subject.type === "PERSON" ? validDate(facts["person.dateOfBirth"]) : subject.type === "CHILD" ? validDate(facts["child.dateOfBirth"]) : undefined,
            profile: { connect: { id: profile.id } },
          },
        },
        entityLinks: { create: [
          { entityId: subjectEntity.id, role: "subject" },
          { entityId: primaryPerson.id, role: "applicant" },
          { entityId: household.id, role: "household" },
        ] },
        nodes: { create: initial },
        facts: {
          create: Object.entries(facts).map(([key, valueJson]) => ({
            key,
            valueJson,
            sourceType: "USER_CONFIRMED" as const,
            confirmed: true,
            revisions: { create: { valueJson, sourceType: "USER_CONFIRMED", status: "ACTIVE" } },
          })),
        },
        edges: {
          create: template.nodes.flatMap((node) =>
            (node.dependsOn ?? []).map((fromNodeKey) => ({ fromNodeKey, toNodeKey: node.key })),
          ),
        },
      },
      include: includeJourney,
    });
    return (await addEntityContexts(sessionId, [mapJourney(journey, sessionId)]))[0]!;
  }

  async list(sessionId: string) {
    const journeys = await getPrisma().journeyInstance.findMany({
      where: { profile: { sessionId }, status: { not: "ABANDONED" } },
      orderBy: { updatedAt: "desc" },
      include: includeJourney,
    });
    return addEntityContexts(sessionId, journeys.map((journey) => mapJourney(journey, sessionId)));
  }

  async get(sessionId: string, id: string) {
    const journey = await getPrisma().journeyInstance.findFirst({
      where: { id, profile: { sessionId } },
      include: includeJourney,
    });
    return journey ? (await addEntityContexts(sessionId, [mapJourney(journey, sessionId)]))[0]! : null;
  }

  async updateFacts(sessionId: string, id: string, facts: Record<string, string>, provenance: { source: "user_statement" | "document" | "provider" | "demo"; sourceRef?: string } = { source: "user_statement" }) {
    const journey = await this.get(sessionId, id);
    if (!journey) return null;
    const prisma = getPrisma();
    const sourceType = provenance.source === "document" || provenance.source === "provider" ? "DERIVED" as const : provenance.source === "demo" ? "DEMO_PROFILE" as const : "USER_CONFIRMED" as const;
    await prisma.$transaction(async (tx) => {
      const factEntries = Object.entries(facts);
      const currentFacts = factEntries.length
        ? await tx.fact.findMany({ where: { journeyId: id, key: { in: factEntries.map(([key]) => key) } } })
        : [];
      const currentByKey = new Map(currentFacts.map((fact) => [fact.key, fact]));
      for (const [key, valueJson] of factEntries) {
        const current = currentByKey.get(key);
        if (current) {
          await tx.factRevision.updateMany({ where: { factId: current.id, status: "ACTIVE" }, data: { status: "CORRECTED" } });
          await tx.fact.update({
            where: { id: current.id },
            data: { valueJson, sourceType, sourceRef: provenance.sourceRef, confirmed: provenance.source === "user_statement" },
          });
          await tx.factRevision.create({
            data: { factId: current.id, valueJson, sourceType, sourceRef: provenance.sourceRef, status: "ACTIVE" },
          });
        } else {
          await tx.fact.create({
            data: { journeyId: id, key, valueJson, sourceType, sourceRef: provenance.sourceRef, confirmed: provenance.source === "user_statement", revisions: { create: { valueJson, sourceType, sourceRef: provenance.sourceRef, status: "ACTIVE" } } },
          });
        }
      }
      const nextDisplayName = facts["child.name"]?.trim() || facts["vehicle.makeModel"]?.trim() || facts["vehicle.registrationNumber"]?.trim() || facts["move.label"]?.trim() || (facts["move.newCity"]?.trim() ? `New home in ${facts["move.newCity"].trim()}` : undefined) || facts["business.name"]?.trim() || facts["person.name"]?.trim();
      if (nextDisplayName) await tx.journeySubject.update({ where: { id: journey.subject.id }, data: { displayName: nextDisplayName } });
      const subjectLink = await tx.journeyEntityLink.findFirst({ where: { journeyId: id, role: "subject" }, include: { entity: true } });
      if (subjectLink) {
        const currentData = JSON.parse(JSON.stringify(subjectLink.entity.dataJson)) as Record<string, string>;
        await tx.canonicalEntity.update({ where: { id: subjectLink.entityId }, data: { displayName: nextDisplayName || subjectLink.entity.displayName, dataJson: { ...currentData, ...facts } } });
      }
      await tx.journeyInstance.update({ where: { id }, data: { updatedAt: new Date() } });
    }, transactionOptions);
    return this.get(sessionId, id);
  }

  async activateBranch(sessionId: string, id: string, branchKey: string) {
    const journey = await this.get(sessionId, id);
    const branch = journey?.projection.branches.find((candidate) => candidate.key === branchKey);
    if (!journey || !branch || branch.requirement !== "optional") return null;
    if (branch.active) return journey;
    const factKey = `journey.branch.${branchKey}.active`;
    const nextFacts = { ...journey.facts, [factKey]: "true" };
    const projection = activateJourneyBranch(journey.projection, branchKey, nextFacts);
    const prisma = getPrisma();
    await prisma.$transaction(async (tx) => {
      const current = await tx.fact.findUnique({ where: { journeyId_key: { journeyId: id, key: factKey } } });
      if (current) {
        await tx.factRevision.updateMany({ where: { factId: current.id, status: "ACTIVE" }, data: { status: "CORRECTED" } });
        await tx.fact.update({ where: { id: current.id }, data: { valueJson: "true", sourceType: "USER_CONFIRMED", confirmed: true } });
        await tx.factRevision.create({ data: { factId: current.id, valueJson: "true", sourceType: "USER_CONFIRMED", status: "ACTIVE" } });
      } else {
        await tx.fact.create({
          data: { journeyId: id, key: factKey, valueJson: "true", sourceType: "USER_CONFIRMED", confirmed: true, revisions: { create: { valueJson: "true", sourceType: "USER_CONFIRMED", status: "ACTIVE" } } },
        });
      }
      for (const node of projection.nodes) {
        await tx.journeyNode.update({
          where: { journeyId_nodeKey: { journeyId: id, nodeKey: node.key } },
          data: { status: toDatabaseStatus(node.status), recommended: node.recommended, completedAt: node.status === "completed" ? undefined : null },
        });
      }
      await tx.auditEvent.create({ data: { journeyId: id, actorType: "demo_user", eventType: "journey_branch_activated", payloadJson: { branchKey } } });
      await tx.journeyInstance.update({ where: { id }, data: { status: "ACTIVE", updatedAt: new Date() } });
    }, transactionOptions);
    return this.get(sessionId, id);
  }

  async completeStep(sessionId: string, id: string, nodeKey: string, idempotencyKey: string) {
    const journey = await this.get(sessionId, id);
    const node = journey?.projection.nodes.find((candidate) => candidate.key === nodeKey);
    if (!journey || !node || node.status === "locked") return null;
    const prisma = getPrisma();
    const scopedKey = `${sessionId}:${id}:${nodeKey}:${idempotencyKey}`;
    const existing = await prisma.auditEvent.findFirst({ where: { journeyId: id, eventType: scopedKey } });
    if (existing) return journey;
    const projection = completeNode(journey.projection, nodeKey, journey.facts);
    await prisma.$transaction(async (tx) => {
      for (const projectedNode of projection.nodes) {
        await tx.journeyNode.update({
          where: { journeyId_nodeKey: { journeyId: id, nodeKey: projectedNode.key } },
          data: { status: toDatabaseStatus(projectedNode.status), recommended: projectedNode.recommended, completedAt: projectedNode.status === "completed" ? new Date() : null },
        });
      }
      await tx.auditEvent.create({ data: { journeyId: id, actorType: "demo_user", eventType: scopedKey, payloadJson: { nodeKey } } });
      await tx.journeyInstance.update({ where: { id }, data: { status: isJourneyComplete(projection) ? "COMPLETED" : "ACTIVE", updatedAt: new Date() } });
    }, transactionOptions);
    return this.get(sessionId, id);
  }

  async addEvidence(sessionId: string, id: string, input: Omit<EvidenceRecord, "id" | "createdAt">) {
    const journey = await this.get(sessionId, id);
    if (!journey) return null;
    const createdAt = new Date().toISOString();
    const version = journey.evidence.filter((item) => item.type === input.type).length + 1;
    await getPrisma().$transaction(async (tx) => {
      await tx.evidence.create({
        data: {
          journeyId: id,
          type: input.type,
          provider: input.source,
          metadataJson: { ...input, version, createdAt },
        },
      });
      await tx.journeyInstance.update({ where: { id }, data: { updatedAt: new Date() } });
    }, transactionOptions);
    const derivedFacts = evidenceFacts({ ...input, verificationStatus: input.verificationStatus });
    if (Object.keys(derivedFacts).length) await this.updateFacts(sessionId, id, derivedFacts, { source: "document", sourceRef: `evidence:${input.fileName}` });
    return this.get(sessionId, id);
  }

  async reviewEvidence(sessionId: string, id: string, evidenceId: string, approved: boolean, fields?: Record<string, string>) {
    const item = await getPrisma().evidence.findFirst({ where: { id: evidenceId, journeyId: id, journey: { profile: { sessionId } } } });
    if (!item || !item.metadataJson || typeof item.metadataJson !== "object") return null;
    const value = item.metadataJson as Record<string, unknown>;
    if (value.source === "sample") return null;
    const checks = Array.isArray(value.checks) ? value.checks as Array<{ status?: string }> : [];
    const extractedFields = fields ?? (value.extractedFields && typeof value.extractedFields === "object" ? value.extractedFields as Record<string, string> : {});
    const nextStatus = approved && !checks.some((check) => check.status === "failed") && Object.keys(extractedFields).length > 0 ? "verified" : "rejected";
    await getPrisma().$transaction(async (tx) => {
      await tx.evidence.update({ where: { id: evidenceId }, data: { metadataJson: { ...value, extractedFields, verificationStatus: nextStatus, reviewedAt: new Date().toISOString() } } });
      await tx.auditEvent.create({ data: { journeyId: id, actorType: "demo_user", eventType: `evidence_${nextStatus}`, payloadJson: { evidenceId } } });
      await tx.journeyInstance.update({ where: { id }, data: { updatedAt: new Date() } });
    }, transactionOptions);
    if (nextStatus === "verified") {
      const derivedFacts = evidenceFacts({ type: item.type as EvidenceType, extractedFields, verificationStatus: "verified" });
      if (Object.keys(derivedFacts).length) await this.updateFacts(sessionId, id, derivedFacts, { source: "document", sourceRef: evidenceId });
    }
    return this.get(sessionId, id);
  }

  async getEvidence(sessionId: string, id: string, evidenceId: string) {
    const prisma = getPrisma();
    const item = await prisma.evidence.findFirst({ where: { id: evidenceId, journeyId: id, journey: { profile: { sessionId } } }, include: { journey: { select: { profileId: true } } } });
    if (!item || !item.metadataJson || typeof item.metadataJson !== "object") return null;
    await prisma.accessEvent.create({ data: { profileId: item.journey.profileId, actor: "demo_user", action: "READ", resourceType: "journey_evidence", resourceId: item.id, metadataJson: { journeyId: id, evidenceType: item.type } } });
    const value = item.metadataJson as Record<string, unknown>;
    return {
      id: item.id,
      type: item.type as EvidenceType,
      fileName: String(value.fileName ?? "evidence"),
      mimeType: String(value.mimeType ?? "application/octet-stream"),
      size: Number(value.size ?? 0),
      source: String(value.source ?? item.provider) as EvidenceSource,
      verificationStatus: String(value.verificationStatus ?? "needs_review") as EvidenceRecord["verificationStatus"],
      extractedFields: value.extractedFields && typeof value.extractedFields === "object" ? value.extractedFields as Record<string, string> : {},
      analysisConfidence: typeof value.analysisConfidence === "number" ? value.analysisConfidence : undefined,
      checks: Array.isArray(value.checks) ? value.checks as EvidenceRecord["checks"] : undefined,
      checksum: typeof value.checksum === "string" ? value.checksum : undefined,
      scanStatus: value.scanStatus === "clean" ? "clean" as const : value.scanStatus === "flagged" ? "flagged" as const : undefined,
      retentionExpiresAt: typeof value.retentionExpiresAt === "string" ? value.retentionExpiresAt : undefined,
      version: typeof value.version === "number" ? value.version : undefined,
      reviewedAt: typeof value.reviewedAt === "string" ? value.reviewedAt : undefined,
      createdAt: String(value.createdAt ?? ""),
      contentBase64: String(value.contentBase64 ?? ""),
    };
  }

  async completeRegistration(sessionId: string, id: string, idempotencyKey: string) {
    return this.advanceService(sessionId, id, "birth_registration", idempotencyKey);
  }

  async advanceService(sessionId: string, id: string, nodeKey: string, idempotencyKey: string) {
    const journey = await this.get(sessionId, id);
    const projectedNode = journey?.projection.nodes.find((candidate) => candidate.key === nodeKey);
    if (!journey || !projectedNode || projectedNode.action === "none" || (projectedNode.status === "locked" && !canAdvanceFromVerifiedEvidence(journey, nodeKey))) return null;
    if (journey.serviceRuns[nodeKey]?.status === "completed") return journey;
    const prisma = getPrisma();
    const node = await prisma.journeyNode.findUniqueOrThrow({ where: { journeyId_nodeKey: { journeyId: id, nodeKey } } });
    const owner = await prisma.journeyInstance.findUniqueOrThrow({ where: { id }, select: { profileId: true } });
    const scopedKey = `${sessionId}:${id}:${nodeKey}:${idempotencyKey}`;
    const existing = await prisma.externalAction.findUnique({ where: { idempotencyKey: scopedKey } });
    if (existing) return this.get(sessionId, id);
    const decision = await this.agencyAgent(buildAgencyCaseInput(journey, nodeKey));
    const run = agencyDecisionToServiceRun(nodeKey, serviceDefinitionFor(projectedNode).agency, decision, journey.serviceRuns[nodeKey]);
    const nodeStatus = run.status === "completed" ? "COMPLETED" : run.status === "waiting_external" ? "WAITING_EXTERNAL" : run.status === "failed" ? "BLOCKED" : "IN_PROGRESS";
    const nextProjection = run.status === "completed" ? completeNode(journey.projection, nodeKey, journey.facts) : null;

    await prisma.$transaction(async (tx) => {
      await tx.externalAction.create({
        data: {
          nodeId: node.id,
          adapterKey: "vercel-ai-synthetic-agency",
          actionType: run.events.at(-1)?.stageKey ?? "review_case",
          status: run.status === "failed" ? "FAILED" : run.status === "waiting_external" ? "PENDING" : "SUCCEEDED",
          idempotencyKey: scopedKey,
          requestJson: { runId: run.runId, stage: run.currentStage, synthetic: true },
          responseJson: { progress: run.progress, state: run.status, receipt: run.receipt, synthetic: true },
        },
      });
      const caseStatus = (run.caseStatus ?? "under_review").toUpperCase() as "SUBMITTED" | "ACKNOWLEDGED" | "UNDER_REVIEW" | "ACTION_REQUIRED" | "APPROVED" | "REJECTED" | "WITHDRAWN" | "EXPIRED" | "APPEALED";
      await tx.providerCase.upsert({
        where: { journeyId_nodeKey: { journeyId: id, nodeKey } },
        update: { status: caseStatus, scenario: run.scenario ?? "success", reasonCode: run.reasonCode, nextTransitionAt: run.nextTransitionAt ? new Date(run.nextTransitionAt) : null, payloadJson: run },
        create: { journeyId: id, nodeKey, provider: run.provider, status: caseStatus, scenario: run.scenario ?? "success", reasonCode: run.reasonCode, nextTransitionAt: run.nextTransitionAt ? new Date(run.nextTransitionAt) : null, payloadJson: run },
      });
      if (!journey.serviceRuns[nodeKey] && journey.facts[`agency.consent.${nodeKey}`]) {
        await tx.consentGrant.create({ data: { profileId: owner.profileId, purpose: `sandbox_service:${nodeKey}`, scopeJson: { journeyId: id, nodeKey, provider: run.provider }, expiresAt: new Date(journey.facts[`agency.consent.${nodeKey}`]) } });
      }
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
          [`service.${nodeKey}.summary`, run.artifact?.subtitle ?? run.actionMessage ?? "Synthetic agency review completed."],
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
        data: { status: nextProjection && isJourneyComplete(nextProjection) ? "COMPLETED" : "ACTIVE", updatedAt: new Date() },
      });
    }, transactionOptions);
    return this.get(sessionId, id);
  }

  async syncEntityGraph(sessionId: string, entities: EntityGraphSeed[], associations: EntityAssociationSeed[]) {
    const prisma = getPrisma();
    const profile = await prisma.userProfile.upsert({
      where: { sessionId },
      update: {},
      create: { sessionId, displayName: "Ananya", stateCode: "DL", demoProfile: true },
    });
    const primary = await prisma.canonicalEntity.upsert({
      where: { profileId_type_externalKey: { profileId: profile.id, type: "PERSON", externalKey: "person:ananya-sharma" } },
      update: {},
      create: { profileId: profile.id, type: "PERSON", externalKey: "person:ananya-sharma", displayName: "Ananya Sharma", dataJson: { role: "account_holder" } },
    });
    const entityIds: Record<string, string> = { account_holder: primary.id };
    for (const seed of entities) {
      if (seed.isAccountHolder) {
        await prisma.canonicalEntity.update({ where: { id: primary.id }, data: { displayName: seed.displayName, dataJson: { role: "account_holder", entityKind: "person", ...seed.facts } } });
        entityIds[seed.ref] = primary.id;
        continue;
      }
      const selected = seed.canonicalEntityId
        ? await prisma.canonicalEntity.findFirst({ where: { id: seed.canonicalEntityId, profileId: profile.id } })
        : null;
      const type = seed.type === "vehicle" ? "VEHICLE" as const : seed.type === "residence" ? "ADDRESS" as const : seed.type === "business" ? "BUSINESS" as const : "PERSON" as const;
      const externalKey = canonicalEntityKey({ type: seed.type, entityKind: seed.entityKind, displayName: seed.displayName, role: "person" }, seed.facts);
      const birthDateKey = seed.type === "child" ? "child.dateOfBirth" : "person.dateOfBirth";
      const birthDate = seed.facts[birthDateKey];
      const relationship = seed.facts["person.relationship"] || seed.facts["health.dependentRelationship"];
      const sameNamedPeople = type === "PERSON" && !selected ? await prisma.canonicalEntity.findMany({
        where: { profileId: profile.id, type: "PERSON", displayName: { equals: seed.displayName, mode: "insensitive" } },
      }) : [];
      const compatiblePeople = sameNamedPeople.filter((candidate) => {
        const existingBirthDate = jsonRecord(candidate.dataJson)[birthDateKey];
        const existingData = jsonRecord(candidate.dataJson);
        const existingRelationship = existingData["person.relationship"] || existingData["health.dependentRelationship"];
        return (!birthDate || typeof existingBirthDate !== "string" || birthDate === existingBirthDate)
          && (!relationship || typeof existingRelationship !== "string" || relationship === existingRelationship);
      });
      const nameMatch = compatiblePeople.length === 1 ? compatiblePeople[0] : null;
      const entity = selected ?? nameMatch ?? await prisma.canonicalEntity.upsert({
        where: { profileId_type_externalKey: { profileId: profile.id, type, externalKey } },
        update: { displayName: seed.displayName, dataJson: { entityKind: seed.entityKind, ...seed.facts } },
        create: { profileId: profile.id, type, externalKey, displayName: seed.displayName, dataJson: { entityKind: seed.entityKind, ...seed.facts } },
      });
      if (selected || nameMatch) {
        const mergedData = JSON.parse(JSON.stringify({ ...jsonRecord(entity.dataJson), entityKind: seed.entityKind, ...seed.facts })) as Prisma.InputJsonObject;
        await prisma.canonicalEntity.update({ where: { id: entity.id }, data: { displayName: seed.displayName, dataJson: mergedData } });
      }
      entityIds[seed.ref] = entity.id;
    }
    const ownershipKinds = new Set(["owner", "partner", "shareholder"]);
    const ownershipChanges = associations.filter((association) => ownershipKinds.has(association.kind));
    const ownershipTargetIds = [...new Set(ownershipChanges.flatMap((association) => entityIds[association.toSubjectRef] ?? []))];
    if (ownershipTargetIds.length) {
      const current = await prisma.entityRelationship.findMany({ where: { toId: { in: ownershipTargetIds }, kind: { in: ["OWNER", "PARTNER", "SHAREHOLDER"] }, validTo: null } });
      const projected = new Map(current.map((relationship) => [`${relationship.fromId}:${relationship.toId}:${relationship.kind}:${relationship.role}`, { toId: relationship.toId, share: Number(jsonRecord(relationship.metadataJson).ownershipShare ?? 0) }]));
      for (const association of ownershipChanges) {
        const fromId = entityIds[association.fromSubjectRef];
        const toId = entityIds[association.toSubjectRef];
        if (!fromId || !toId) continue;
        const key = `${fromId}:${toId}:${associationKindForDatabase(association.kind)}:${association.role}`;
        if (association.operation === "disconnect") projected.delete(key);
        else projected.set(key, { toId, share: association.ownershipShare ?? 0 });
      }
      const totals = new Map<string, number>();
      for (const relationship of projected.values()) totals.set(relationship.toId, (totals.get(relationship.toId) ?? 0) + relationship.share);
      if ([...totals.values()].some((total) => total > 100)) throw Object.assign(new Error("Saved ownership shares cannot add up to more than 100%."), { code: "INVALID_OWNERSHIP_TOTAL" });
    }
    for (const association of associations) {
      const fromId = entityIds[association.fromSubjectRef];
      const toId = entityIds[association.toSubjectRef];
      if (!fromId || !toId) continue;
      const kind = associationKindForDatabase(association.kind);
      const metadataJson = {
        ...(association.ownershipShare === undefined ? {} : { ownershipShare: association.ownershipShare }),
        ...(association.canAct === undefined ? {} : { canAct: association.canAct }),
      };
      const existing = await prisma.entityRelationship.findFirst({ where: { fromId, toId, kind, role: association.role, validTo: null } });
      if (association.operation === "disconnect") {
        if (existing) await prisma.entityRelationship.update({ where: { id: existing.id }, data: { validTo: new Date() } });
        continue;
      }
      if (existing) await prisma.entityRelationship.update({ where: { id: existing.id }, data: { metadataJson } });
      else await prisma.entityRelationship.create({ data: { fromId, toId, kind, role: association.role, metadataJson } });
    }
    return Object.fromEntries(Object.entries(entityIds).filter(([ref]) => ref !== "account_holder"));
  }

  async archiveEntity(sessionId: string, entityId: string, reason?: string) {
    const prisma = getPrisma();
    const entity = await prisma.canonicalEntity.findFirst({ where: { id: entityId, profile: { sessionId } } });
    if (!entity || jsonRecord(entity.dataJson).role === "account_holder") return false;
    await prisma.$transaction(async (tx) => {
      const data = jsonRecord(entity.dataJson);
      await tx.canonicalEntity.update({ where: { id: entity.id }, data: { dataJson: { ...data, "intake.recordVisibility": "archived", ...(reason ? { "record.archiveReason": reason } : {}) } as Prisma.InputJsonObject } });
      const links = await tx.journeyEntityLink.findMany({ where: { entityId: entity.id, role: "subject" }, select: { journeyId: true } });
      if (links.length) await tx.journeyInstance.updateMany({ where: { id: { in: links.map((link) => link.journeyId) }, profile: { sessionId } }, data: { status: "ABANDONED" } });
      await tx.entityRelationship.updateMany({ where: { OR: [{ fromId: entity.id }, { toId: entity.id }], validTo: null }, data: { validTo: new Date() } });
    }, transactionOptions);
    return true;
  }

  async listEntityRecords(sessionId: string) {
    const entities = await getPrisma().canonicalEntity.findMany({
      where: { profile: { sessionId } },
      include: { incomingRelationships: { where: { validTo: null }, include: { from: true } } },
      orderBy: { updatedAt: "desc" },
    });
    return entities.flatMap((entity): LifeEntityRecord[] => {
      const data = jsonRecord(entity.dataJson);
      if (entity.type === "HOUSEHOLD" || data.role === "account_holder" || data["intake.recordVisibility"] !== "standalone") return [];
      const inferred = entity.type === "VEHICLE" ? "vehicle" : entity.type === "BUSINESS" ? "organisation" : entity.type === "ADDRESS" ? "premises" : entity.type === "PERSON" ? "person" : "other";
      const kind = typeof data.entityKind === "string" ? data.entityKind as LifeEntityKind : inferred;
      const family = entity.incomingRelationships.find((relationship) => relationship.kind === "FAMILY" && jsonRecord(relationship.from.dataJson).role === "account_holder");
      const householdMember = entity.incomingRelationships.some((relationship) => relationship.kind === "HOUSEHOLD_MEMBER");
      const connectedPeople = entity.incomingRelationships.flatMap((relationship) => {
        if (["FAMILY", "HOUSEHOLD_MEMBER"].includes(relationship.kind) || relationship.from.type !== "PERSON") return [];
        const metadata = jsonRecord(relationship.metadataJson);
        const accountHolder = jsonRecord(relationship.from.dataJson).role === "account_holder";
        return [{ entityId: relationship.fromId, displayName: accountHolder ? "You" : relationship.from.displayName, isAccountHolder: accountHolder, roles: [relationship.role], ownershipShare: typeof metadata.ownershipShare === "number" ? metadata.ownershipShare : undefined, canAct: typeof metadata.canAct === "boolean" ? metadata.canAct : undefined }];
      });
      let unavailableNeeds: LifeEntityRecord["unavailableNeeds"] = [];
      try { unavailableNeeds = JSON.parse(typeof data["intake.unavailableNeeds"] === "string" ? data["intake.unavailableNeeds"] : "[]") as LifeEntityRecord["unavailableNeeds"]; } catch { /* Ignore invalid historical metadata. */ }
      return [{ id: entity.id, kind, displayName: entity.displayName, context: family || householdMember || connectedPeople.length ? { relationshipToAccountHolder: family?.role || undefined, householdMember: householdMember || undefined, connectedPeople: connectedPeople.length ? connectedPeople : undefined } : undefined, unavailableNeeds, updatedAt: entity.updatedAt.toISOString() }];
    });
  }

  async listEntityCandidates(sessionId: string) {
    const entities = await getPrisma().canonicalEntity.findMany({ where: { profile: { sessionId } }, orderBy: { updatedAt: "desc" } });
    return entities.flatMap((entity) => {
      const data = jsonRecord(entity.dataJson);
      if (entity.type === "HOUSEHOLD" || data.role === "account_holder" || data["intake.recordVisibility"] === "archived") return [];
      const inferred = entity.type === "VEHICLE" ? "vehicle" : entity.type === "BUSINESS" ? "organisation" : entity.type === "ADDRESS" ? "premises" : entity.type === "PERSON" ? "person" : "other";
      return [{ id: entity.id, kind: typeof data.entityKind === "string" ? data.entityKind as LifeEntityKind : inferred as LifeEntityKind, displayName: entity.displayName }];
    });
  }

  async reset(sessionId: string) {
    const prisma = getPrisma();
    await prisma.journeyInstance.updateMany({
      where: { profile: { sessionId }, status: { not: "ABANDONED" } },
      data: { status: "ABANDONED" },
    });
    const standalone = await prisma.canonicalEntity.findMany({ where: { profile: { sessionId } } });
    await Promise.all(standalone.flatMap((entity) => {
      const data = jsonRecord(entity.dataJson);
      if (data["intake.recordVisibility"] !== "standalone") return [];
      return [prisma.canonicalEntity.update({ where: { id: entity.id }, data: { dataJson: { ...data, "intake.recordVisibility": "archived" } as Prisma.InputJsonObject } })];
    }));
  }
}
