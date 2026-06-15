-- Location v1.1: rename state -> province, add geocoding enrichment fields

CREATE TYPE "GeocodeSource" AS ENUM ('MANUAL', 'GOOGLE_PLACES', 'IMPORT');
CREATE TYPE "GeocodeAccuracy" AS ENUM ('EXACT', 'APPROXIMATE', 'NEIGHBORHOOD', 'CITY');

ALTER TABLE "Property" RENAME COLUMN "state" TO "province";

ALTER TABLE "Property"
ADD COLUMN "googlePlaceId" TEXT,
ADD COLUMN "formattedAddress" TEXT,
ADD COLUMN "geocodeSource" "GeocodeSource",
ADD COLUMN "geocodeAccuracy" "GeocodeAccuracy";

CREATE INDEX "Property_tenantId_province_idx" ON "Property"("tenantId", "province");
