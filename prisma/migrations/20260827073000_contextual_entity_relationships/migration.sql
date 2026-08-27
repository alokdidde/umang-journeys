ALTER TABLE "EntityRelationship"
ADD COLUMN "role" TEXT NOT NULL DEFAULT '',
ADD COLUMN "metadataJson" JSONB NOT NULL DEFAULT '{}';

CREATE INDEX "EntityRelationship_fromId_toId_kind_idx"
ON "EntityRelationship"("fromId", "toId", "kind");

UPDATE "EntityRelationship"
SET "kind" = 'HOUSEHOLD_MEMBER', "role" = 'Household member'
WHERE "kind" = 'MEMBER';

UPDATE "EntityRelationship" AS relationship
SET "kind" = 'FAMILY',
    "role" = COALESCE(
      entity."dataJson" ->> 'person.relationship',
      entity."dataJson" ->> 'health.dependentRelationship',
      'Family member'
    )
FROM "CanonicalEntity" AS entity
WHERE relationship."toId" = entity."id"
  AND relationship."kind" = 'DEPENDENT';

UPDATE "EntityRelationship"
SET "kind" = 'OCCUPANT', "role" = 'Occupant'
WHERE "kind" = 'OCCUPIES';

UPDATE "EntityRelationship"
SET "kind" = 'OPERATOR', "role" = 'Operator'
WHERE "kind" = 'OPERATES';

UPDATE "EntityRelationship"
SET "kind" = 'OWNER', "role" = 'Owner'
WHERE "kind" = 'OWNS';
