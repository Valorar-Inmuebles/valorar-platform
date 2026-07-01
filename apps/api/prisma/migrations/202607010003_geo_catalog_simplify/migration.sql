-- Geo Catalog: simplify model — remove import-only / legacy columns
-- Re-seed required after applying (SEED_GEO_CATALOG=true).

DELETE FROM "Neighborhood";
DELETE FROM "Locality";
DELETE FROM "Province";
DELETE FROM "Country";

ALTER TABLE "Country" RENAME COLUMN "isoCode" TO "iso2";
ALTER TABLE "Country" DROP COLUMN IF EXISTS "slug";
ALTER TABLE "Country" DROP COLUMN IF EXISTS "displayOrder";
ALTER TABLE "Country" DROP COLUMN IF EXISTS "active";

DROP INDEX IF EXISTS "Country_slug_key";

ALTER TABLE "Province" DROP COLUMN IF EXISTS "subdivisionCode";
ALTER TABLE "Province" DROP COLUMN IF EXISTS "branchCode";
ALTER TABLE "Province" DROP COLUMN IF EXISTS "legacyCode";

DROP INDEX IF EXISTS "Province_subdivisionCode_key";
DROP INDEX IF EXISTS "Province_branchCode_key";

ALTER TABLE "Locality" DROP COLUMN IF EXISTS "assurantCode";
ALTER TABLE "Locality" DROP COLUMN IF EXISTS "legacyCode";

DROP INDEX IF EXISTS "Locality_assurantCode_key";

ALTER TABLE "Neighborhood" DROP COLUMN IF EXISTS "postalCode";
ALTER TABLE "Neighborhood" DROP COLUMN IF EXISTS "assurantCode";

DROP INDEX IF EXISTS "Neighborhood_assurantCode_key";
