-- Fase 5: Admin base — User profile, roles, organization, property assignment

-- Extend UserRole enum
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'MANAGER';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'COLLABORATOR';

-- User profile fields
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "firstName" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastName" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT;

-- Backfill firstName/lastName from existing name
UPDATE "User"
SET
  "firstName" = COALESCE(
    NULLIF(TRIM(SPLIT_PART("name", ' ', 1)), ''),
    "name"
  ),
  "lastName" = COALESCE(
    NULLIF(
      TRIM(
        SUBSTRING("name" FROM LENGTH(SPLIT_PART("name", ' ', 1)) + 2)
      ),
      ''
    ),
    ''
  )
WHERE "firstName" IS NULL OR "lastName" IS NULL;

ALTER TABLE "User" ALTER COLUMN "firstName" SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "lastName" SET NOT NULL;

-- TenantSetting organization fields
ALTER TABLE "TenantSetting" ADD COLUMN IF NOT EXISTS "legalName" TEXT;
ALTER TABLE "TenantSetting" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "TenantSetting" ADD COLUMN IF NOT EXISTS "website" TEXT;
ALTER TABLE "TenantSetting" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "TenantSetting" ADD COLUMN IF NOT EXISTS "facebookUrl" TEXT;
ALTER TABLE "TenantSetting" ADD COLUMN IF NOT EXISTS "instagramUrl" TEXT;
ALTER TABLE "TenantSetting" ADD COLUMN IF NOT EXISTS "linkedinUrl" TEXT;
ALTER TABLE "TenantSetting" ADD COLUMN IF NOT EXISTS "shortDescription" TEXT;
ALTER TABLE "TenantSetting" ADD COLUMN IF NOT EXISTS "seoTitle" TEXT;
ALTER TABLE "TenantSetting" ADD COLUMN IF NOT EXISTS "seoDescription" TEXT;

-- Property logical owner
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "assignedToId" TEXT;

ALTER TABLE "Property"
  ADD CONSTRAINT "Property_assignedToId_fkey"
  FOREIGN KEY ("assignedToId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "Property_tenantId_assignedToId_idx"
  ON "Property"("tenantId", "assignedToId");
