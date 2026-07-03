-- Rename shortDescription to description and make it required
ALTER TABLE "DevelopmentTypology" RENAME COLUMN "shortDescription" TO "description";

UPDATE "DevelopmentTypology" SET "description" = '' WHERE "description" IS NULL;

ALTER TABLE "DevelopmentTypology" ALTER COLUMN "description" SET NOT NULL;

-- Optional commercial / inventory fields
ALTER TABLE "DevelopmentTypology" ALTER COLUMN "totalCount" DROP NOT NULL;
ALTER TABLE "DevelopmentTypology" ALTER COLUMN "availableCount" DROP NOT NULL;
ALTER TABLE "DevelopmentTypology" ALTER COLUMN "surfaceFrom" DROP NOT NULL;
ALTER TABLE "DevelopmentTypology" ALTER COLUMN "priceFrom" DROP NOT NULL;
ALTER TABLE "DevelopmentTypology" ALTER COLUMN "currency" DROP NOT NULL;

-- CreateTable
CREATE TABLE "DevelopmentTypologyFeatureAssignment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "typologyId" TEXT NOT NULL,
    "featureId" TEXT NOT NULL,
    "value" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DevelopmentTypologyFeatureAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DevelopmentTypologyFeatureAssignment_typologyId_featureId_key" ON "DevelopmentTypologyFeatureAssignment"("typologyId", "featureId");

-- CreateIndex
CREATE INDEX "DevelopmentTypologyFeatureAssignment_tenantId_idx" ON "DevelopmentTypologyFeatureAssignment"("tenantId");

-- CreateIndex
CREATE INDEX "DevelopmentTypologyFeatureAssignment_typologyId_idx" ON "DevelopmentTypologyFeatureAssignment"("typologyId");

-- CreateIndex
CREATE INDEX "DevelopmentTypologyFeatureAssignment_featureId_idx" ON "DevelopmentTypologyFeatureAssignment"("featureId");

-- AddForeignKey
ALTER TABLE "DevelopmentTypologyFeatureAssignment" ADD CONSTRAINT "DevelopmentTypologyFeatureAssignment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DevelopmentTypologyFeatureAssignment" ADD CONSTRAINT "DevelopmentTypologyFeatureAssignment_typologyId_fkey" FOREIGN KEY ("typologyId") REFERENCES "DevelopmentTypology"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DevelopmentTypologyFeatureAssignment" ADD CONSTRAINT "DevelopmentTypologyFeatureAssignment_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "PropertyFeature"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
