-- Geo Catalog: realestate model — CABA barrios as localities, minimal business fields
-- Re-seed required after applying (SEED_GEO_CATALOG=true).

DELETE FROM "Neighborhood";
DELETE FROM "Locality";
DELETE FROM "Province";
DELETE FROM "Country";

DROP INDEX IF EXISTS "Country_iso3_key";
ALTER TABLE "Country" DROP COLUMN IF EXISTS "iso3";

DROP INDEX IF EXISTS "Province_countryId_slug_key";
DROP INDEX IF EXISTS "Province_countryId_displayOrder_idx";
ALTER TABLE "Province" DROP COLUMN IF EXISTS "slug";
ALTER TABLE "Province" DROP COLUMN IF EXISTS "displayOrder";
ALTER TABLE "Province" DROP COLUMN IF EXISTS "active";

CREATE UNIQUE INDEX "Province_countryId_name_key" ON "Province"("countryId", "name");

DROP INDEX IF EXISTS "Locality_provinceId_slug_key";
DROP INDEX IF EXISTS "Locality_provinceId_displayOrder_idx";
ALTER TABLE "Locality" DROP COLUMN IF EXISTS "slug";
ALTER TABLE "Locality" DROP COLUMN IF EXISTS "displayOrder";
ALTER TABLE "Locality" DROP COLUMN IF EXISTS "active";

CREATE UNIQUE INDEX "Locality_provinceId_name_key" ON "Locality"("provinceId", "name");

DROP INDEX IF EXISTS "Neighborhood_localityId_slug_key";
DROP INDEX IF EXISTS "Neighborhood_localityId_displayOrder_idx";
ALTER TABLE "Neighborhood" DROP COLUMN IF EXISTS "slug";
ALTER TABLE "Neighborhood" DROP COLUMN IF EXISTS "displayOrder";
ALTER TABLE "Neighborhood" DROP COLUMN IF EXISTS "active";

CREATE UNIQUE INDEX "Neighborhood_localityId_name_key" ON "Neighborhood"("localityId", "name");
