-- CreateEnum
CREATE TYPE "ContactPointType" AS ENUM ('EMAIL', 'PHONE');

-- CreateEnum
CREATE TYPE "RentalConceptSystemCode" AS ENUM ('RENT', 'EXPENSES', 'ELECTRICITY', 'GAS', 'ABL', 'AYSA', 'INSURANCE');

-- CreateEnum
CREATE TYPE "RentalContractStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ENDED', 'CANCELLED');

-- AlterTable
ALTER TABLE "TenantSetting"
ADD COLUMN "timeZone" TEXT NOT NULL DEFAULT 'America/Argentina/Buenos_Aires';

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactPoint" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "type" "ContactPointType" NOT NULL,
    "value" TEXT NOT NULL,
    "normalizedValue" TEXT NOT NULL,
    "label" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "canReceiveSms" BOOLEAN NOT NULL DEFAULT false,
    "canReceiveWhatsapp" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactPoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentalConcept" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "systemCode" "RentalConceptSystemCode",
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RentalConcept_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentalContract" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "propertyId" TEXT,
    "renterContactId" TEXT,
    "landlordContactId" TEXT,
    "createdById" TEXT,
    "propertyAddressSnapshot" TEXT NOT NULL,
    "propertyLocalitySnapshot" TEXT,
    "propertyUnitSnapshot" TEXT,
    "propertyNotesSnapshot" TEXT,
    "startsOn" DATE NOT NULL,
    "endsOn" DATE,
    "status" "RentalContractStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RentalContract_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Contact_tenantId_name_idx" ON "Contact"("tenantId", "name");

-- CreateIndex
CREATE INDEX "Contact_tenantId_isActive_idx" ON "Contact"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "ContactPoint_tenantId_contactId_idx" ON "ContactPoint"("tenantId", "contactId");

-- CreateIndex
CREATE INDEX "ContactPoint_tenantId_type_normalizedValue_idx" ON "ContactPoint"("tenantId", "type", "normalizedValue");

-- CreateIndex
CREATE INDEX "ContactPoint_contactId_type_isDefault_idx" ON "ContactPoint"("contactId", "type", "isDefault");

-- CreateIndex
CREATE UNIQUE INDEX "RentalConcept_tenantId_slug_key" ON "RentalConcept"("tenantId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "RentalConcept_tenantId_systemCode_key" ON "RentalConcept"("tenantId", "systemCode");

-- CreateIndex
CREATE INDEX "RentalConcept_tenantId_isActive_idx" ON "RentalConcept"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "RentalConcept_tenantId_sortOrder_idx" ON "RentalConcept"("tenantId", "sortOrder");

-- CreateIndex
CREATE INDEX "RentalContract_tenantId_status_idx" ON "RentalContract"("tenantId", "status");

-- CreateIndex
CREATE INDEX "RentalContract_tenantId_renterContactId_idx" ON "RentalContract"("tenantId", "renterContactId");

-- CreateIndex
CREATE INDEX "RentalContract_tenantId_propertyId_idx" ON "RentalContract"("tenantId", "propertyId");

-- CreateIndex
CREATE INDEX "RentalContract_tenantId_endsOn_idx" ON "RentalContract"("tenantId", "endsOn");

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactPoint" ADD CONSTRAINT "ContactPoint_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactPoint" ADD CONSTRAINT "ContactPoint_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalConcept" ADD CONSTRAINT "RentalConcept_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalContract" ADD CONSTRAINT "RentalContract_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalContract" ADD CONSTRAINT "RentalContract_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalContract" ADD CONSTRAINT "RentalContract_renterContactId_fkey" FOREIGN KEY ("renterContactId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalContract" ADD CONSTRAINT "RentalContract_landlordContactId_fkey" FOREIGN KEY ("landlordContactId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalContract" ADD CONSTRAINT "RentalContract_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed the approved tenant-scoped system concepts for existing tenants.
-- Deterministic ids keep this backfill auditable and idempotent while future
-- tenants use Prisma cuid ids through their transactional creation flow.
INSERT INTO "RentalConcept" (
    "id",
    "tenantId",
    "name",
    "slug",
    "systemCode",
    "isActive",
    "sortOrder",
    "createdAt",
    "updatedAt"
)
SELECT
    'rc_' || md5(tenant."id" || ':' || concept.code),
    tenant."id",
    concept.name,
    concept.slug,
    concept.code::"RentalConceptSystemCode",
    true,
    concept.sort_order,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Tenant" AS tenant
CROSS JOIN (
    VALUES
        ('RENT', 'Alquiler', 'alquiler', 10),
        ('EXPENSES', 'Expensas', 'expensas', 20),
        ('ELECTRICITY', 'Electricidad', 'electricidad', 30),
        ('GAS', 'Gas', 'gas', 40),
        ('ABL', 'ABL', 'abl', 50),
        ('AYSA', 'AySA', 'aysa', 60),
        ('INSURANCE', 'Seguro', 'seguro', 70)
) AS concept(code, name, slug, sort_order)
ON CONFLICT ("tenantId", "systemCode") DO NOTHING;
