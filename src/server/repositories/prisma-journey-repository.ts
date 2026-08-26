import { activateBranch as activateJourneyBranch, compileJourney, completeNode, getJourneyTemplate, hydrateJourney, isJourneyComplete, newBabyTemplate, type JourneyTemplate, type NodeStatus } from "@/domain/journey-engine";
import { getPrisma } from "@/server/db";
import { canAdvanceFromVerifiedEvidence, evidenceFacts, type JourneyRepository, type StoredJourney } from "@/server/repositories/journey-repository";
import { advanceSimulatedService, isSandboxServiceKey, simulateExternalService } from "@/server/integrations/sandbox-services";
import type { SandboxServiceKey, SandboxServiceRun } from "@/domain/service-workflows";
import type { EvidenceRecord, EvidenceSource, EvidenceType, JourneyEvidence } from "@/domain/evidence";
import type { JourneySubject } from "@/domain/journey-summary";

type DatabaseJourney = Awaited<ReturnType<ReturnType<typeof getPrisma>["journeyInstance"]["findFirst"]>>;

function subjectForJourney(lifeEvent: string, facts: Record<string, string>): { type: "CHILD" | "VEHICLE" | "PERSON" | "RESIDENCE" | "BUSINESS"; displayName: string } {
  if (lifeEvent === "buying_a_vehicle") return { type: "VEHICLE", displayName: facts["vehicle.makeModel"]?.trim() || facts["vehicle.registrationNumber"]?.trim() || "Your vehicle" };
  if (lifeEvent === "moving_home") return { type: "RESIDENCE", displayName: facts["move.label"]?.trim() || `New home in ${facts["move.newCity"]?.trim() || "your new area"}` };
  if (lifeEvent === "starting_a_business") return { type: "BUSINESS", displayName: facts["business.name"]?.trim() || "Your new business" };
  if (lifeEvent === "managing_health_cover" || lifeEvent === "retirement") return { type: "PERSON", displayName: facts["person.name"]?.trim() || "Ananya Sharma" };
  return { type: "CHILD", displayName: facts["child.name"]?.trim() || "Your baby" };
}

function canonicalKey(subject: ReturnType<typeof subjectForJourney>, facts: Record<string, string>) {
  const slug = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "unknown";
  if (subject.type === "CHILD") return `child:${facts["child.dateOfBirth"] || slug(subject.displayName)}`;
  if (subject.type === "VEHICLE") return `vehicle:${slug(facts["vehicle.registrationNumber"] || subject.displayName)}`;
  if (subject.type === "RESIDENCE") return `address:${slug(facts["move.postalCode"] || facts["move.newCity"] || subject.displayName)}`;
  if (subject.type === "BUSINESS") return `business:${slug(facts["business.gstin"] || facts["business.pan"] || subject.displayName)}`;
  return facts["health.dependentRelationship"]
    ? `person:${slug(facts["health.dependentRelationship"])}`
    : "person:ananya-sharma";
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
    subject: { id: journey.subject.id, type: toSubjectType(journey.subject.type), displayName: journey.subject.displayName },
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
    registrationId: registration?.registrationId,
    createdAt: journey.startedAt.toISOString(),
    updatedAt: journey.updatedAt.toISOString(),
  };
}

const includeJourney = { nodes: true, facts: { include: { revisions: { orderBy: { createdAt: "asc" as const } } } }, documents: true, evidence: true, subject: true, templateSnapshot: true, audits: true } as const;

function validDate(value: string | undefined) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? undefined : date;
}

export class PrismaJourneyRepository implements JourneyRepository {
  async create(sessionId: string, facts: Record<string, string> = {}, templateId = newBabyTemplate.id) {
    const template = getJourneyTemplate(templateId);
    if (!template) throw new Error(`Unknown journey template: ${templateId}`);
    const subject = subjectForJourney(template.lifeEvent, facts);
    const subjectIsAccountHolder = isAccountHolder(subject, facts);
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
    const subjectEntity = subjectIsAccountHolder ? primaryPerson : await prisma.canonicalEntity.upsert({
      where: { profileId_type_externalKey: { profileId: profile.id, type: canonicalType(subject), externalKey: canonicalKey(subject, facts) } },
      update: { displayName: subject.displayName, dataJson: facts },
      create: { profileId: profile.id, type: canonicalType(subject), externalKey: canonicalKey(subject, facts), displayName: subject.displayName, dataJson: facts },
    });
    const relationships = [
      { fromId: household.id, toId: primaryPerson.id, kind: "MEMBER" },
      ...(subjectEntity.id === primaryPerson.id ? [] : [{ fromId: subject.type === "CHILD" ? household.id : primaryPerson.id, toId: subjectEntity.id, kind: subject.type === "CHILD" || subject.type === "PERSON" ? "DEPENDENT" : subject.type === "RESIDENCE" ? "OCCUPIES" : subject.type === "BUSINESS" ? "OPERATES" : "OWNS" }]),
    ];
    for (const relationship of relationships) {
      const existing = await prisma.entityRelationship.findFirst({ where: relationship });
      if (!existing) await prisma.entityRelationship.create({ data: relationship });
    }

    const initialProjection = compileJourney(template);
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

  async updateFacts(sessionId: string, id: string, facts: Record<string, string>, provenance: { source: "user_statement" | "document" | "provider" | "demo"; sourceRef?: string } = { source: "user_statement" }) {
    const journey = await this.get(sessionId, id);
    if (!journey) return null;
    const prisma = getPrisma();
    const sourceType = provenance.source === "document" || provenance.source === "provider" ? "DERIVED" as const : provenance.source === "demo" ? "DEMO_PROFILE" as const : "USER_CONFIRMED" as const;
    await prisma.$transaction(async (tx) => {
      for (const [key, valueJson] of Object.entries(facts)) {
        const current = await tx.fact.findUnique({ where: { journeyId_key: { journeyId: id, key } } });
        if (current) await tx.factRevision.updateMany({ where: { factId: current.id, status: "ACTIVE" }, data: { status: "CORRECTED" } });
        await tx.fact.upsert({
          where: { journeyId_key: { journeyId: id, key } },
          update: { valueJson, sourceType, sourceRef: provenance.sourceRef, confirmed: provenance.source === "user_statement", revisions: { create: { valueJson, sourceType, sourceRef: provenance.sourceRef, status: "ACTIVE" } } },
          create: { journeyId: id, key, valueJson, sourceType, sourceRef: provenance.sourceRef, confirmed: provenance.source === "user_statement", revisions: { create: { valueJson, sourceType, sourceRef: provenance.sourceRef, status: "ACTIVE" } } },
        });
      }
      const nextDisplayName = facts["child.name"]?.trim() || facts["vehicle.makeModel"]?.trim() || facts["vehicle.registrationNumber"]?.trim() || facts["move.label"]?.trim() || (facts["move.newCity"]?.trim() ? `New home in ${facts["move.newCity"].trim()}` : undefined) || facts["business.name"]?.trim() || facts["person.name"]?.trim();
      if (nextDisplayName) await tx.journeySubject.update({ where: { id: journey.subject.id }, data: { displayName: nextDisplayName } });
      const subjectLink = await tx.journeyEntityLink.findFirst({ where: { journeyId: id, role: "subject" }, include: { entity: true } });
      if (subjectLink) {
        const currentData = JSON.parse(JSON.stringify(subjectLink.entity.dataJson)) as Record<string, string>;
        await tx.canonicalEntity.update({ where: { id: subjectLink.entityId }, data: { displayName: nextDisplayName || subjectLink.entity.displayName, dataJson: { ...currentData, ...facts } } });
      }
      await tx.journeyInstance.update({ where: { id }, data: { updatedAt: new Date() } });
    });
    return this.get(sessionId, id);
  }

  async activateBranch(sessionId: string, id: string, branchKey: string) {
    const journey = await this.get(sessionId, id);
    const branch = journey?.projection.branches.find((candidate) => candidate.key === branchKey);
    if (!journey || !branch || branch.requirement !== "optional") return null;
    if (branch.active) return journey;
    const projection = activateJourneyBranch(journey.projection, branchKey);
    const factKey = `journey.branch.${branchKey}.active`;
    const prisma = getPrisma();
    await prisma.$transaction(async (tx) => {
      await tx.fact.upsert({
        where: { journeyId_key: { journeyId: id, key: factKey } },
        update: { valueJson: "true", sourceType: "USER_CONFIRMED", confirmed: true, revisions: { create: { valueJson: "true", sourceType: "USER_CONFIRMED", status: "ACTIVE" } } },
        create: { journeyId: id, key: factKey, valueJson: "true", sourceType: "USER_CONFIRMED", confirmed: true, revisions: { create: { valueJson: "true", sourceType: "USER_CONFIRMED", status: "ACTIVE" } } },
      });
      for (const node of projection.nodes) {
        await tx.journeyNode.update({
          where: { journeyId_nodeKey: { journeyId: id, nodeKey: node.key } },
          data: { status: toDatabaseStatus(node.status), recommended: node.recommended, completedAt: node.status === "completed" ? undefined : null },
        });
      }
      await tx.auditEvent.create({ data: { journeyId: id, actorType: "demo_user", eventType: "journey_branch_activated", payloadJson: { branchKey } } });
      await tx.journeyInstance.update({ where: { id }, data: { status: "ACTIVE", updatedAt: new Date() } });
    });
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
    const projection = completeNode(journey.projection, nodeKey);
    await prisma.$transaction(async (tx) => {
      for (const projectedNode of projection.nodes) {
        await tx.journeyNode.update({
          where: { journeyId_nodeKey: { journeyId: id, nodeKey: projectedNode.key } },
          data: { status: toDatabaseStatus(projectedNode.status), recommended: projectedNode.recommended, completedAt: projectedNode.status === "completed" ? new Date() : null },
        });
      }
      await tx.auditEvent.create({ data: { journeyId: id, actorType: "demo_user", eventType: scopedKey, payloadJson: { nodeKey } } });
      await tx.journeyInstance.update({ where: { id }, data: { status: isJourneyComplete(projection) ? "COMPLETED" : "ACTIVE", updatedAt: new Date() } });
    });
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
    });
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
    });
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
        data: { status: isJourneyComplete(nextProjection) ? "COMPLETED" : "ACTIVE", updatedAt: new Date() },
      });
    });
    return this.get(sessionId, id);
  }

  async advanceService(sessionId: string, id: string, nodeKey: string, idempotencyKey: string) {
    const journey = await this.get(sessionId, id);
    const projectedNode = journey?.projection.nodes.find((candidate) => candidate.key === nodeKey);
    if (!journey || !projectedNode || (projectedNode.status === "locked" && !canAdvanceFromVerifiedEvidence(journey, nodeKey)) || !isSandboxServiceKey(nodeKey)) return null;
    const prisma = getPrisma();
    const node = await prisma.journeyNode.findUniqueOrThrow({ where: { journeyId_nodeKey: { journeyId: id, nodeKey } } });
    const owner = await prisma.journeyInstance.findUniqueOrThrow({ where: { id }, select: { profileId: true } });
    const scopedKey = `${sessionId}:${id}:${nodeKey}:${idempotencyKey}`;
    const existing = await prisma.externalAction.findUnique({ where: { idempotencyKey: scopedKey } });
    if (existing) return this.get(sessionId, id);
    const run = advanceSimulatedService(id, nodeKey, journey.serviceRuns[nodeKey], journey.facts);
    const result = simulateExternalService(id, nodeKey);
    const nodeStatus = run.status === "completed" ? "COMPLETED" : run.status === "waiting_external" ? "WAITING_EXTERNAL" : run.status === "failed" ? "BLOCKED" : "IN_PROGRESS";
    const nextProjection = run.status === "completed" ? completeNode(journey.projection, nodeKey) : null;

    await prisma.$transaction(async (tx) => {
      await tx.externalAction.create({
        data: {
          nodeId: node.id,
          adapterKey: result.adapterKey,
          actionType: run.events.at(-1)?.stageKey ?? result.actionType,
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
      if (!journey.serviceRuns[nodeKey] && journey.facts[`simulation.consent.${nodeKey}`]) {
        await tx.consentGrant.create({ data: { profileId: owner.profileId, purpose: `sandbox_service:${nodeKey}`, scopeJson: { journeyId: id, nodeKey, provider: run.provider }, expiresAt: new Date(journey.facts[`simulation.consent.${nodeKey}`]) } });
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
        data: { status: nextProjection && isJourneyComplete(nextProjection) ? "COMPLETED" : "ACTIVE", updatedAt: new Date() },
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
