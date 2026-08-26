import type { DocumentAnalysis, DocumentProposal } from "@/domain/document-intake";
import { getPrisma } from "@/server/db";

export type DocumentIntakeStatus = "proposed" | "applied" | "rejected";

export type StoredDocumentIntake = {
  id: string;
  sessionId: string;
  status: DocumentIntakeStatus;
  fileName: string;
  mimeType: string;
  size: number;
  source: "sample" | "user_upload";
  contentBase64: string;
  analysis: DocumentAnalysis;
  proposal: DocumentProposal;
  appliedJourneyId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NewDocumentIntake = Pick<StoredDocumentIntake,
  "fileName" | "mimeType" | "size" | "source" | "contentBase64" | "analysis" | "proposal"
>;

export interface DocumentIntakeRepository {
  create(sessionId: string, input: NewDocumentIntake): Promise<StoredDocumentIntake>;
  list(sessionId: string): Promise<StoredDocumentIntake[]>;
  get(sessionId: string, id: string): Promise<StoredDocumentIntake | null>;
  setDecision(sessionId: string, id: string, status: "applied" | "rejected", appliedJourneyId?: string): Promise<StoredDocumentIntake | null>;
  reset(sessionId: string): Promise<void>;
}

export class MemoryDocumentIntakeRepository implements DocumentIntakeRepository {
  private records = new Map<string, StoredDocumentIntake>();

  async create(sessionId: string, input: NewDocumentIntake) {
    const timestamp = new Date().toISOString();
    const record: StoredDocumentIntake = {
      ...input,
      id: `document-${crypto.randomUUID()}`,
      sessionId,
      status: "proposed",
      appliedJourneyId: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.records.set(`${sessionId}:${record.id}`, record);
    return record;
  }

  async get(sessionId: string, id: string) {
    return this.records.get(`${sessionId}:${id}`) ?? null;
  }

  async list(sessionId: string) {
    return [...this.records.values()]
      .filter((record) => record.sessionId === sessionId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  async setDecision(sessionId: string, id: string, status: "applied" | "rejected", appliedJourneyId?: string) {
    const record = await this.get(sessionId, id);
    if (!record) return null;
    const updated = { ...record, status, appliedJourneyId: appliedJourneyId ?? record.appliedJourneyId, updatedAt: new Date().toISOString() };
    this.records.set(`${sessionId}:${id}`, updated);
    return updated;
  }

  async reset(sessionId: string) {
    for (const key of this.records.keys()) if (key.startsWith(`${sessionId}:`)) this.records.delete(key);
  }
}

export class PrismaDocumentIntakeRepository implements DocumentIntakeRepository {
  async create(sessionId: string, input: NewDocumentIntake) {
    const prisma = getPrisma();
    const profile = await prisma.userProfile.upsert({
      where: { sessionId },
      update: {},
      create: { sessionId, displayName: "Ananya", stateCode: "DL", demoProfile: true },
    });
    const record = await prisma.documentIntake.create({
      data: {
        profileId: profile.id,
        status: "proposed",
        fileName: input.fileName,
        mimeType: input.mimeType,
        size: input.size,
        source: input.source,
        documentType: input.analysis.kind,
        confidence: input.analysis.confidence,
        contentBase64: input.contentBase64,
        analysisJson: input.analysis,
        proposalJson: input.proposal,
      },
    });
    return {
      id: record.id,
      sessionId,
      status: record.status as DocumentIntakeStatus,
      fileName: record.fileName,
      mimeType: record.mimeType,
      size: record.size,
      source: record.source as StoredDocumentIntake["source"],
      contentBase64: record.contentBase64,
      analysis: record.analysisJson as DocumentAnalysis,
      proposal: record.proposalJson as DocumentProposal,
      appliedJourneyId: record.journeyId,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  async get(sessionId: string, id: string) {
    const prisma = getPrisma();
    const record = await prisma.documentIntake.findFirst({ where: { id, profile: { sessionId } } });
    if (!record) return null;
    await prisma.accessEvent.create({ data: { profileId: record.profileId, actor: "demo_user", action: "READ", resourceType: "document_intake", resourceId: record.id, metadataJson: { fileName: record.fileName } } });
    return {
      id: record.id,
      sessionId,
      status: record.status as DocumentIntakeStatus,
      fileName: record.fileName,
      mimeType: record.mimeType,
      size: record.size,
      source: record.source as StoredDocumentIntake["source"],
      contentBase64: record.contentBase64,
      analysis: record.analysisJson as DocumentAnalysis,
      proposal: record.proposalJson as DocumentProposal,
      appliedJourneyId: record.journeyId,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  async list(sessionId: string) {
    const records = await getPrisma().documentIntake.findMany({
      where: { profile: { sessionId } },
      orderBy: { createdAt: "desc" },
    });
    return records.map((record) => ({
      id: record.id,
      sessionId,
      status: record.status as DocumentIntakeStatus,
      fileName: record.fileName,
      mimeType: record.mimeType,
      size: record.size,
      source: record.source as StoredDocumentIntake["source"],
      contentBase64: record.contentBase64,
      analysis: record.analysisJson as DocumentAnalysis,
      proposal: record.proposalJson as DocumentProposal,
      appliedJourneyId: record.journeyId,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    }));
  }

  async setDecision(sessionId: string, id: string, status: "applied" | "rejected", appliedJourneyId?: string) {
    const existing = await this.get(sessionId, id);
    if (!existing) return null;
    await getPrisma().documentIntake.update({
      where: { id },
      data: { status, journeyId: appliedJourneyId ?? existing.appliedJourneyId },
    });
    return this.get(sessionId, id);
  }

  async reset(sessionId: string) {
    await getPrisma().documentIntake.deleteMany({ where: { profile: { sessionId } } });
  }
}

export const documentIntakeRepository: DocumentIntakeRepository =
  process.env.PERSISTENCE_MODE === "postgres"
    ? new PrismaDocumentIntakeRepository()
    : new MemoryDocumentIntakeRepository();
