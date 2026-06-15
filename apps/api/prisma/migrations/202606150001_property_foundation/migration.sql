-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM ('HOUSE', 'APARTMENT', 'PH', 'OFFICE', 'COMMERCIAL', 'WAREHOUSE', 'INDUSTRIAL', 'LAND', 'FIELD', 'GARAGE', 'COUNTRY_HOUSE', 'OTHER');

-- CreateEnum
CREATE TYPE "PropertyCondition" AS ENUM ('NEW', 'EXCELLENT', 'VERY_GOOD', 'GOOD', 'REGULAR', 'TO_RENOVATE', 'UNDER_CONSTRUCTION');

-- CreateEnum
CREATE TYPE "PropertyListingType" AS ENUM ('SALE', 'RENT', 'TEMPORARY_RENT');

-- CreateEnum
CREATE TYPE "PropertyListingStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'RESERVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('ARS', 'USD');

-- CreateEnum
CREATE TYPE "PropertyFeatureCategory" AS ENUM ('GENERAL', 'SERVICE', 'ROOM', 'AMENITY');

-- CreateEnum
CREATE TYPE "Orientation" AS ENUM ('NORTH', 'SOUTH', 'EAST', 'WEST', 'NORTHEAST', 'NORTHWEST', 'SOUTHEAST', 'SOUTHWEST');

-- CreateEnum
CREATE TYPE "PropertyLayout" AS ENUM ('FRONT', 'BACK', 'SIDE', 'INTERNAL', 'CORNER');

-- CreateEnum
CREATE TYPE "PropertyBrightness" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateTable
CREATE TABLE "Property" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "internalCode" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "propertyType" "PropertyType" NOT NULL,
    "condition" "PropertyCondition",
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "street" TEXT,
    "streetNumber" TEXT,
    "floor" TEXT,
    "apartment" TEXT,
    "neighborhood" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT,
    "country" TEXT NOT NULL DEFAULT 'AR',
    "postalCode" TEXT,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "totalArea" DECIMAL(10,2),
    "coveredArea" DECIMAL(10,2),
    "uncoveredArea" DECIMAL(10,2),
    "lotFront" DECIMAL(10,2),
    "lotDepth" DECIMAL(10,2),
    "rooms" INTEGER,
    "bedrooms" INTEGER,
    "bathrooms" INTEGER,
    "halfBathrooms" INTEGER,
    "parkingSpaces" INTEGER,
    "yearBuilt" INTEGER,
    "orientation" "Orientation",
    "layout" "PropertyLayout",
    "brightness" "PropertyBrightness",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyListing" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "listingType" "PropertyListingType" NOT NULL,
    "status" "PropertyListingStatus" NOT NULL DEFAULT 'DRAFT',
    "expensesAmount" DECIMAL(12,2),
    "expensesCurrency" "Currency",
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyPrice" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" "Currency" NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyImage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "url" TEXT,
    "altText" TEXT,
    "mimeType" TEXT,
    "fileSize" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isCover" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyFeature" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" "PropertyFeatureCategory" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyFeature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyFeatureAssignment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "featureId" TEXT NOT NULL,
    "value" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyFeatureAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyAgentAccess" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "canView" BOOLEAN NOT NULL DEFAULT true,
    "canEdit" BOOLEAN NOT NULL DEFAULT false,
    "grantedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyAgentAccess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Property_tenantId_idx" ON "Property"("tenantId");

-- CreateIndex
CREATE INDEX "Property_tenantId_createdById_idx" ON "Property"("tenantId", "createdById");

-- CreateIndex
CREATE INDEX "Property_tenantId_city_idx" ON "Property"("tenantId", "city");

-- CreateIndex
CREATE INDEX "Property_tenantId_propertyType_idx" ON "Property"("tenantId", "propertyType");

-- CreateIndex
CREATE INDEX "Property_tenantId_condition_idx" ON "Property"("tenantId", "condition");

-- CreateIndex
CREATE INDEX "Property_tenantId_updatedAt_idx" ON "Property"("tenantId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Property_tenantId_slug_key" ON "Property"("tenantId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Property_tenantId_internalCode_key" ON "Property"("tenantId", "internalCode");

-- CreateIndex
CREATE INDEX "PropertyListing_tenantId_idx" ON "PropertyListing"("tenantId");

-- CreateIndex
CREATE INDEX "PropertyListing_tenantId_listingType_status_idx" ON "PropertyListing"("tenantId", "listingType", "status");

-- CreateIndex
CREATE INDEX "PropertyListing_tenantId_isFeatured_idx" ON "PropertyListing"("tenantId", "isFeatured");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyListing_propertyId_listingType_key" ON "PropertyListing"("propertyId", "listingType");

-- CreateIndex
CREATE INDEX "PropertyPrice_tenantId_idx" ON "PropertyPrice"("tenantId");

-- CreateIndex
CREATE INDEX "PropertyPrice_listingId_idx" ON "PropertyPrice"("listingId");

-- CreateIndex
CREATE INDEX "PropertyImage_tenantId_idx" ON "PropertyImage"("tenantId");

-- CreateIndex
CREATE INDEX "PropertyImage_propertyId_sortOrder_idx" ON "PropertyImage"("propertyId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyFeature_slug_key" ON "PropertyFeature"("slug");

-- CreateIndex
CREATE INDEX "PropertyFeature_category_idx" ON "PropertyFeature"("category");

-- CreateIndex
CREATE INDEX "PropertyFeatureAssignment_tenantId_idx" ON "PropertyFeatureAssignment"("tenantId");

-- CreateIndex
CREATE INDEX "PropertyFeatureAssignment_propertyId_idx" ON "PropertyFeatureAssignment"("propertyId");

-- CreateIndex
CREATE INDEX "PropertyFeatureAssignment_featureId_idx" ON "PropertyFeatureAssignment"("featureId");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyFeatureAssignment_propertyId_featureId_key" ON "PropertyFeatureAssignment"("propertyId", "featureId");

-- CreateIndex
CREATE INDEX "PropertyAgentAccess_tenantId_idx" ON "PropertyAgentAccess"("tenantId");

-- CreateIndex
CREATE INDEX "PropertyAgentAccess_userId_idx" ON "PropertyAgentAccess"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyAgentAccess_propertyId_userId_key" ON "PropertyAgentAccess"("propertyId", "userId");

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyListing" ADD CONSTRAINT "PropertyListing_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyListing" ADD CONSTRAINT "PropertyListing_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyPrice" ADD CONSTRAINT "PropertyPrice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyPrice" ADD CONSTRAINT "PropertyPrice_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "PropertyListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyImage" ADD CONSTRAINT "PropertyImage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyImage" ADD CONSTRAINT "PropertyImage_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyFeatureAssignment" ADD CONSTRAINT "PropertyFeatureAssignment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyFeatureAssignment" ADD CONSTRAINT "PropertyFeatureAssignment_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyFeatureAssignment" ADD CONSTRAINT "PropertyFeatureAssignment_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "PropertyFeature"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyAgentAccess" ADD CONSTRAINT "PropertyAgentAccess_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyAgentAccess" ADD CONSTRAINT "PropertyAgentAccess_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyAgentAccess" ADD CONSTRAINT "PropertyAgentAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyAgentAccess" ADD CONSTRAINT "PropertyAgentAccess_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
