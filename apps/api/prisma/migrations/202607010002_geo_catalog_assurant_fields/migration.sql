-- Geo Catalog: enrich schema with Assurant source fields
-- Re-seed required after applying (SEED_GEO_CATALOG=true).

DELETE FROM "Neighborhood";
DELETE FROM "Locality";
DELETE FROM "Province";
DELETE FROM "Country";

ALTER TABLE "Country" ADD COLUMN "iso3" TEXT;

UPDATE "Country" SET "iso3" = 'ARG' WHERE "isoCode" = 'AR';

ALTER TABLE "Country" ALTER COLUMN "iso3" SET NOT NULL;

CREATE UNIQUE INDEX "Country_iso3_key" ON "Country"("iso3");

ALTER TABLE "Province" ADD COLUMN "subdivisionCode" TEXT;
ALTER TABLE "Province" ADD COLUMN "branchCode" TEXT;

ALTER TABLE "Locality" ADD COLUMN "assurantCode" TEXT;
ALTER TABLE "Neighborhood" ADD COLUMN "postalCode" TEXT;
ALTER TABLE "Neighborhood" ADD COLUMN "assurantCode" TEXT;

-- Existing geo seed data (if any) must be re-seeded after this migration.

CREATE UNIQUE INDEX "Province_subdivisionCode_key" ON "Province"("subdivisionCode");
CREATE UNIQUE INDEX "Province_branchCode_key" ON "Province"("branchCode");
CREATE UNIQUE INDEX "Locality_assurantCode_key" ON "Locality"("assurantCode");
CREATE UNIQUE INDEX "Neighborhood_assurantCode_key" ON "Neighborhood"("assurantCode");

ALTER TABLE "Province" ALTER COLUMN "subdivisionCode" SET NOT NULL;
ALTER TABLE "Province" ALTER COLUMN "branchCode" SET NOT NULL;
ALTER TABLE "Locality" ALTER COLUMN "assurantCode" SET NOT NULL;
