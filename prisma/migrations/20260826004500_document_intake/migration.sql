CREATE TABLE "DocumentIntake" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "journeyId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'proposed',
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "contentBase64" TEXT NOT NULL,
    "analysisJson" JSONB NOT NULL,
    "proposalJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentIntake_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DocumentIntake_profileId_createdAt_idx" ON "DocumentIntake"("profileId", "createdAt");

ALTER TABLE "DocumentIntake" ADD CONSTRAINT "DocumentIntake_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DocumentIntake" ADD CONSTRAINT "DocumentIntake_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "JourneyInstance"("id") ON DELETE SET NULL ON UPDATE CASCADE;
