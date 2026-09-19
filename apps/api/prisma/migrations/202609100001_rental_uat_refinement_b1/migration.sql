-- Rental UAT Refinement B.1: structured contract address, multiple parties,
-- and persisted per-contract contact routes. No reminder automation is added.

CREATE TYPE "RentalContractPartyRole" AS ENUM ('RENTER', 'LANDLORD');
CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'WHATSAPP', 'SMS');

ALTER TABLE "Contact"
  ADD COLUMN "documentType" TEXT,
  ADD COLUMN "documentNumber" TEXT;

CREATE INDEX "Contact_tenantId_documentNumber_idx"
  ON "Contact"("tenantId", "documentNumber");

ALTER TABLE "RentalContract"
  ADD COLUMN "propertyCountryId" TEXT,
  ADD COLUMN "propertyProvinceId" TEXT,
  ADD COLUMN "propertyLocalityId" TEXT,
  ADD COLUMN "propertyNeighborhoodId" TEXT,
  ADD COLUMN "propertyCountrySnapshot" TEXT,
  ADD COLUMN "propertyProvinceSnapshot" TEXT,
  ADD COLUMN "propertyNeighborhoodSnapshot" TEXT,
  ADD COLUMN "propertyStreetSnapshot" TEXT,
  ADD COLUMN "propertyStreetNumberSnapshot" TEXT,
  ADD COLUMN "propertyFloorSnapshot" TEXT,
  ADD COLUMN "propertyPostalCodeSnapshot" TEXT;

UPDATE "RentalContract" AS contract
SET
  "propertyCountryId" = property."countryId",
  "propertyProvinceId" = property."provinceId",
  "propertyLocalityId" = property."localityId",
  "propertyNeighborhoodId" = property."neighborhoodId",
  "propertyCountrySnapshot" = COALESCE(country.name, property.country),
  "propertyProvinceSnapshot" = COALESCE(province.name, property.province),
  "propertyLocalitySnapshot" = COALESCE(locality.name, contract."propertyLocalitySnapshot", property.city),
  "propertyNeighborhoodSnapshot" = COALESCE(neighborhood.name, property.neighborhood),
  "propertyStreetSnapshot" = COALESCE(property.street, contract."propertyAddressSnapshot"),
  "propertyStreetNumberSnapshot" = property."streetNumber",
  "propertyFloorSnapshot" = property.floor,
  "propertyUnitSnapshot" = COALESCE(contract."propertyUnitSnapshot", property.apartment),
  "propertyPostalCodeSnapshot" = property."postalCode"
FROM "Property" AS property
LEFT JOIN "Country" AS country ON country.id = property."countryId"
LEFT JOIN "Province" AS province ON province.id = property."provinceId"
LEFT JOIN "Locality" AS locality ON locality.id = property."localityId"
LEFT JOIN "Neighborhood" AS neighborhood ON neighborhood.id = property."neighborhoodId"
WHERE contract."propertyId" = property.id;

UPDATE "RentalContract"
SET "propertyStreetSnapshot" = "propertyAddressSnapshot"
WHERE "propertyStreetSnapshot" IS NULL;

CREATE INDEX "RentalContract_propertyCountryId_idx" ON "RentalContract"("propertyCountryId");
CREATE INDEX "RentalContract_propertyProvinceId_idx" ON "RentalContract"("propertyProvinceId");
CREATE INDEX "RentalContract_propertyLocalityId_idx" ON "RentalContract"("propertyLocalityId");
CREATE INDEX "RentalContract_propertyNeighborhoodId_idx" ON "RentalContract"("propertyNeighborhoodId");

ALTER TABLE "RentalContract" ADD CONSTRAINT "RentalContract_propertyCountryId_fkey"
  FOREIGN KEY ("propertyCountryId") REFERENCES "Country"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RentalContract" ADD CONSTRAINT "RentalContract_propertyProvinceId_fkey"
  FOREIGN KEY ("propertyProvinceId") REFERENCES "Province"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RentalContract" ADD CONSTRAINT "RentalContract_propertyLocalityId_fkey"
  FOREIGN KEY ("propertyLocalityId") REFERENCES "Locality"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RentalContract" ADD CONSTRAINT "RentalContract_propertyNeighborhoodId_fkey"
  FOREIGN KEY ("propertyNeighborhoodId") REFERENCES "Neighborhood"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "RentalContractParty" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "contractId" TEXT NOT NULL,
  "contactId" TEXT NOT NULL,
  "role" "RentalContractPartyRole" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RentalContractParty_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RentalContractNotificationRoute" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "contractPartyId" TEXT NOT NULL,
  "channel" "NotificationChannel" NOT NULL,
  "contactPointId" TEXT NOT NULL,
  "isEnabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RentalContractNotificationRoute_pkey" PRIMARY KEY ("id")
);

INSERT INTO "RentalContractParty" ("id", "tenantId", "contractId", "contactId", "role", "createdAt", "updatedAt")
SELECT 'rcp_' || md5(contract.id || ':RENTER:' || contract."renterContactId"), contract."tenantId", contract.id,
       contract."renterContactId", 'RENTER'::"RentalContractPartyRole", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "RentalContract" AS contract
WHERE contract."renterContactId" IS NOT NULL;

INSERT INTO "RentalContractParty" ("id", "tenantId", "contractId", "contactId", "role", "createdAt", "updatedAt")
SELECT 'rcp_' || md5(contract.id || ':LANDLORD:' || contract."landlordContactId"), contract."tenantId", contract.id,
       contract."landlordContactId", 'LANDLORD'::"RentalContractPartyRole", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "RentalContract" AS contract
WHERE contract."landlordContactId" IS NOT NULL;

CREATE UNIQUE INDEX "RentalContractParty_contractId_contactId_role_key"
  ON "RentalContractParty"("contractId", "contactId", "role");
CREATE INDEX "RentalContractParty_tenantId_contractId_role_idx"
  ON "RentalContractParty"("tenantId", "contractId", "role");
CREATE INDEX "RentalContractParty_tenantId_contactId_idx"
  ON "RentalContractParty"("tenantId", "contactId");
CREATE UNIQUE INDEX "RentalContractNotificationRoute_contractPartyId_channel_key"
  ON "RentalContractNotificationRoute"("contractPartyId", "channel");
CREATE INDEX "RentalContractNotificationRoute_tenantId_contractPartyId_idx"
  ON "RentalContractNotificationRoute"("tenantId", "contractPartyId");
CREATE INDEX "RentalContractNotificationRoute_tenantId_contactPointId_idx"
  ON "RentalContractNotificationRoute"("tenantId", "contactPointId");

ALTER TABLE "RentalContractParty" ADD CONSTRAINT "RentalContractParty_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RentalContractParty" ADD CONSTRAINT "RentalContractParty_contractId_fkey"
  FOREIGN KEY ("contractId") REFERENCES "RentalContract"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RentalContractParty" ADD CONSTRAINT "RentalContractParty_contactId_fkey"
  FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RentalContractNotificationRoute" ADD CONSTRAINT "RentalContractNotificationRoute_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RentalContractNotificationRoute" ADD CONSTRAINT "RentalContractNotificationRoute_contractPartyId_fkey"
  FOREIGN KEY ("contractPartyId") REFERENCES "RentalContractParty"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RentalContractNotificationRoute" ADD CONSTRAINT "RentalContractNotificationRoute_contactPointId_fkey"
  FOREIGN KEY ("contactPointId") REFERENCES "ContactPoint"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

DROP INDEX "RentalContract_tenantId_renterContactId_idx";
ALTER TABLE "RentalContract" DROP CONSTRAINT "RentalContract_renterContactId_fkey";
ALTER TABLE "RentalContract" DROP CONSTRAINT "RentalContract_landlordContactId_fkey";
ALTER TABLE "RentalContract"
  DROP COLUMN "renterContactId",
  DROP COLUMN "landlordContactId";
