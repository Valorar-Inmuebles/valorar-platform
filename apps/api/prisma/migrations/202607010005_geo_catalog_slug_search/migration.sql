-- Geo Catalog: slug + search fields for URLs and fast lookup
-- Re-seed required after applying (SEED_GEO_CATALOG=true).

DELETE FROM "Neighborhood";
DELETE FROM "Locality";
DELETE FROM "Province";
DELETE FROM "Country";

ALTER TABLE "Country" ADD COLUMN "slug" TEXT NOT NULL;
ALTER TABLE "Country" ADD COLUMN "search" TEXT NOT NULL;

CREATE UNIQUE INDEX "Country_slug_key" ON "Country"("slug");
CREATE INDEX "Country_search_idx" ON "Country"("search");

ALTER TABLE "Province" ADD COLUMN "slug" TEXT NOT NULL;
ALTER TABLE "Province" ADD COLUMN "search" TEXT NOT NULL;

CREATE UNIQUE INDEX "Province_countryId_slug_key" ON "Province"("countryId", "slug");
CREATE INDEX "Province_search_idx" ON "Province"("search");

ALTER TABLE "Locality" ADD COLUMN "slug" TEXT NOT NULL;
ALTER TABLE "Locality" ADD COLUMN "search" TEXT NOT NULL;

CREATE UNIQUE INDEX "Locality_provinceId_slug_key" ON "Locality"("provinceId", "slug");
CREATE INDEX "Locality_search_idx" ON "Locality"("search");

ALTER TABLE "Neighborhood" ADD COLUMN "slug" TEXT NOT NULL;
ALTER TABLE "Neighborhood" ADD COLUMN "search" TEXT NOT NULL;

CREATE UNIQUE INDEX "Neighborhood_localityId_slug_key" ON "Neighborhood"("localityId", "slug");
CREATE INDEX "Neighborhood_search_idx" ON "Neighborhood"("search");
