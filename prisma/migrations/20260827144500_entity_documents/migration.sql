ALTER TABLE "DocumentIntake" ADD COLUMN "entityId" TEXT;

CREATE INDEX "DocumentIntake_entityId_idx" ON "DocumentIntake"("entityId");

ALTER TABLE "DocumentIntake"
ADD CONSTRAINT "DocumentIntake_entityId_fkey"
FOREIGN KEY ("entityId") REFERENCES "CanonicalEntity"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
