-- CreateEnum
CREATE TYPE "DevelopmentStatus" AS ENUM ('IN_PIT', 'UNDER_CONSTRUCTION', 'COMPLETED');

-- CreateTable
CREATE TABLE "Development" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "internalCode" TEXT,
    "title" TEXT NOT NULL,
    "shortDescription" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "DevelopmentStatus",
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "street" TEXT,
    "streetNumber" TEXT,
    "neighborhood" TEXT,
    "city" TEXT NOT NULL,
    "province" TEXT,
    "country" TEXT NOT NULL DEFAULT 'AR',
    "countryId" TEXT,
    "provinceId" TEXT,
    "localityId" TEXT,
    "neighborhoodId" TEXT,
    "postalCode" TEXT,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "googlePlaceId" TEXT,
    "formattedAddress" TEXT,
    "geocodeSource" "GeocodeSource",
    "geocodeAccuracy" "GeocodeAccuracy",
    "priceFrom" DECIMAL(14,2),
    "currency" "Currency",
    "hasFinancing" BOOLEAN NOT NULL DEFAULT false,
    "financingDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Development_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DevelopmentImage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "developmentId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "url" TEXT,
    "altText" TEXT,
    "mimeType" TEXT,
    "fileSize" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isCover" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DevelopmentImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DevelopmentFeatureAssignment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "developmentId" TEXT NOT NULL,
    "featureId" TEXT NOT NULL,
    "value" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DevelopmentFeatureAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DevelopmentTypology" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "developmentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortDescription" TEXT,
    "totalCount" INTEGER NOT NULL,
    "availableCount" INTEGER NOT NULL,
    "surfaceFrom" DECIMAL(10,2) NOT NULL,
    "surfaceTo" DECIMAL(10,2),
    "priceFrom" DECIMAL(14,2) NOT NULL,
    "currency" "Currency" NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DevelopmentTypology_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Development_tenantId_slug_key" ON "Development"("tenantId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Development_tenantId_internalCode_key" ON "Development"("tenantId", "internalCode");

-- CreateIndex
CREATE INDEX "Development_tenantId_idx" ON "Development"("tenantId");

-- CreateIndex
CREATE INDEX "Development_tenantId_createdById_idx" ON "Development"("tenantId", "createdById");

-- CreateIndex
CREATE INDEX "Development_tenantId_city_idx" ON "Development"("tenantId", "city");

-- CreateIndex
CREATE INDEX "Development_tenantId_province_idx" ON "Development"("tenantId", "province");

-- CreateIndex
CREATE INDEX "Development_tenantId_provinceId_idx" ON "Development"("tenantId", "provinceId");

-- CreateIndex
CREATE INDEX "Development_tenantId_localityId_idx" ON "Development"("tenantId", "localityId");

-- CreateIndex
CREATE INDEX "Development_countryId_idx" ON "Development"("countryId");

-- CreateIndex
CREATE INDEX "Development_provinceId_idx" ON "Development"("provinceId");

-- CreateIndex
CREATE INDEX "Development_localityId_idx" ON "Development"("localityId");

-- CreateIndex
CREATE INDEX "Development_neighborhoodId_idx" ON "Development"("neighborhoodId");

-- CreateIndex
CREATE INDEX "Development_tenantId_status_idx" ON "Development"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Development_tenantId_updatedAt_idx" ON "Development"("tenantId", "updatedAt");

-- CreateIndex
CREATE INDEX "DevelopmentImage_tenantId_idx" ON "DevelopmentImage"("tenantId");

-- CreateIndex
CREATE INDEX "DevelopmentImage_developmentId_sortOrder_idx" ON "DevelopmentImage"("developmentId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "DevelopmentFeatureAssignment_developmentId_featureId_key" ON "DevelopmentFeatureAssignment"("developmentId", "featureId");

-- CreateIndex
CREATE INDEX "DevelopmentFeatureAssignment_tenantId_idx" ON "DevelopmentFeatureAssignment"("tenantId");

-- CreateIndex
CREATE INDEX "DevelopmentFeatureAssignment_developmentId_idx" ON "DevelopmentFeatureAssignment"("developmentId");

-- CreateIndex
CREATE INDEX "DevelopmentFeatureAssignment_featureId_idx" ON "DevelopmentFeatureAssignment"("featureId");

-- CreateIndex
CREATE INDEX "DevelopmentTypology_tenantId_idx" ON "DevelopmentTypology"("tenantId");

-- CreateIndex
CREATE INDEX "DevelopmentTypology_developmentId_sortOrder_idx" ON "DevelopmentTypology"("developmentId", "sortOrder");

-- AddForeignKey
ALTER TABLE "Development" ADD CONSTRAINT "Development_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Development" ADD CONSTRAINT "Development_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Development" ADD CONSTRAINT "Development_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Development" ADD CONSTRAINT "Development_provinceId_fkey" FOREIGN KEY ("provinceId") REFERENCES "Province"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Development" ADD CONSTRAINT "Development_localityId_fkey" FOREIGN KEY ("localityId") REFERENCES "Locality"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Development" ADD CONSTRAINT "Development_neighborhoodId_fkey" FOREIGN KEY ("neighborhoodId") REFERENCES "Neighborhood"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DevelopmentImage" ADD CONSTRAINT "DevelopmentImage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DevelopmentImage" ADD CONSTRAINT "DevelopmentImage_developmentId_fkey" FOREIGN KEY ("developmentId") REFERENCES "Development"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DevelopmentFeatureAssignment" ADD CONSTRAINT "DevelopmentFeatureAssignment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DevelopmentFeatureAssignment" ADD CONSTRAINT "DevelopmentFeatureAssignment_developmentId_fkey" FOREIGN KEY ("developmentId") REFERENCES "Development"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DevelopmentFeatureAssignment" ADD CONSTRAINT "DevelopmentFeatureAssignment_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "PropertyFeature"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DevelopmentTypology" ADD CONSTRAINT "DevelopmentTypology_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DevelopmentTypology" ADD CONSTRAINT "DevelopmentTypology_developmentId_fkey" FOREIGN KEY ("developmentId") REFERENCES "Development"("id") ON DELETE CASCADE ON UPDATE CASCADE;
