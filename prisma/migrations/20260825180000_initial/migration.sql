CREATE SCHEMA IF NOT EXISTS "public";

CREATE TYPE "JourneyStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'ABANDONED');
CREATE TYPE "NodeStatus" AS ENUM ('LOCKED', 'AVAILABLE', 'IN_PROGRESS', 'WAITING_EXTERNAL', 'COMPLETED', 'BLOCKED', 'SKIPPED');
CREATE TYPE "SourceType" AS ENUM ('USER_STATEMENT', 'DERIVED', 'DEMO_PROFILE', 'MOCK_HOSPITAL', 'USER_CONFIRMED');
CREATE TYPE "ExternalActionStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED');
CREATE TYPE "JourneySubjectType" AS ENUM ('CHILD');

CREATE TABLE "UserProfile" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'en-IN',
    "stateCode" TEXT NOT NULL,
    "demoProfile" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "JourneySubject" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "type" "JourneySubjectType" NOT NULL,
    "displayName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "JourneySubject_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "JourneyTemplate" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "lifeEvent" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "configJson" JSONB NOT NULL,
    CONSTRAINT "JourneyTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "JourneyInstance" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "templateVersion" INTEGER NOT NULL,
    "subjectId" TEXT NOT NULL,
    "status" "JourneyStatus" NOT NULL DEFAULT 'DRAFT',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "JourneyInstance_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "JourneyNode" (
    "id" TEXT NOT NULL,
    "journeyId" TEXT NOT NULL,
    "nodeKey" TEXT NOT NULL,
    "status" "NodeStatus" NOT NULL,
    "recommended" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "JourneyNode_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "JourneyEdge" (
    "id" TEXT NOT NULL,
    "journeyId" TEXT NOT NULL,
    "fromNodeKey" TEXT NOT NULL,
    "toNodeKey" TEXT NOT NULL,
    "edgeType" TEXT NOT NULL DEFAULT 'hard',
    CONSTRAINT "JourneyEdge_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Fact" (
    "id" TEXT NOT NULL,
    "journeyId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "valueJson" JSONB NOT NULL,
    "confidence" DOUBLE PRECISION,
    "sourceType" "SourceType" NOT NULL,
    "sourceRef" TEXT,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Fact_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Evidence" (
    "id" TEXT NOT NULL,
    "journeyId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "metadataJson" JSONB NOT NULL,
    CONSTRAINT "Evidence_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExternalAction" (
    "id" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "adapterKey" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "status" "ExternalActionStatus" NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "requestJson" JSONB NOT NULL,
    "responseJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExternalAction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OutputDocument" (
    "id" TEXT NOT NULL,
    "journeyId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "synthetic" BOOLEAN NOT NULL DEFAULT true,
    "metadataJson" JSONB NOT NULL,
    CONSTRAINT "OutputDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "journeyId" TEXT NOT NULL,
    "actorType" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payloadJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserProfile_sessionId_key" ON "UserProfile"("sessionId");
CREATE UNIQUE INDEX "JourneyNode_journeyId_nodeKey_key" ON "JourneyNode"("journeyId", "nodeKey");
CREATE UNIQUE INDEX "Fact_journeyId_key_key" ON "Fact"("journeyId", "key");
CREATE UNIQUE INDEX "ExternalAction_idempotencyKey_key" ON "ExternalAction"("idempotencyKey");

ALTER TABLE "JourneySubject" ADD CONSTRAINT "JourneySubject_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JourneyInstance" ADD CONSTRAINT "JourneyInstance_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "UserProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "JourneyInstance" ADD CONSTRAINT "JourneyInstance_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "JourneyTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "JourneyInstance" ADD CONSTRAINT "JourneyInstance_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "JourneySubject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "JourneyNode" ADD CONSTRAINT "JourneyNode_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "JourneyInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JourneyEdge" ADD CONSTRAINT "JourneyEdge_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "JourneyInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Fact" ADD CONSTRAINT "Fact_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "JourneyInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "JourneyInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExternalAction" ADD CONSTRAINT "ExternalAction_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "JourneyNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OutputDocument" ADD CONSTRAINT "OutputDocument_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "JourneyInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OutputDocument" ADD CONSTRAINT "OutputDocument_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "JourneyNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "JourneyInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
