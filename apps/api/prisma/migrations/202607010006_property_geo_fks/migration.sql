-- GEO-002: Property geo FK columns + backfill from legacy text via catalog search fields

CREATE OR REPLACE FUNCTION geo_search_normalize(input TEXT) RETURNS TEXT AS $$
DECLARE
  normalized TEXT;
BEGIN
  IF input IS NULL OR btrim(input) = '' THEN
    RETURN NULL;
  END IF;

  normalized := lower(btrim(input));
  normalized := translate(
    normalized,
    'áàäâãåéèëêíìïîóòöôõúùüûñç',
    'aaaaaaeeeeiiiiooooouuuunc'
  );
  normalized := regexp_replace(normalized, '[^a-z0-9]', '', 'g');

  RETURN normalized;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE TABLE IF NOT EXISTS "PropertyGeoMigrationAudit" (
  "id" TEXT NOT NULL DEFAULT 'geo-002-backfill',
  "totalProperties" INTEGER NOT NULL,
  "countryMatched" INTEGER NOT NULL,
  "provinceMatched" INTEGER NOT NULL,
  "localityMatched" INTEGER NOT NULL,
  "neighborhoodMatched" INTEGER NOT NULL,
  "fullyMatched" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PropertyGeoMigrationAudit_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "countryId" TEXT;
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "provinceId" TEXT;
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "localityId" TEXT;
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "neighborhoodId" TEXT;

UPDATE "Property" AS p
SET "countryId" = c."id"
FROM "Country" AS c
WHERE p."countryId" IS NULL
  AND (
    upper(btrim(p."country")) = upper(c."iso2")
    OR geo_search_normalize(p."country") = c."search"
  );

UPDATE "Property" AS p
SET "provinceId" = pr."id"
FROM "Province" AS pr
WHERE p."provinceId" IS NULL
  AND p."countryId" = pr."countryId"
  AND p."province" IS NOT NULL
  AND btrim(p."province") <> ''
  AND pr."search" = geo_search_normalize(p."province");

UPDATE "Property" AS p
SET "provinceId" = pr."id"
FROM "Province" AS pr
WHERE p."provinceId" IS NULL
  AND p."countryId" = pr."countryId"
  AND pr."search" = 'capitalfederal'
  AND geo_search_normalize(p."city") IN (
    'ciudadautonomadebuenosaires',
    'caba',
    'capitalfederal',
    'ciudaddebuenosaires',
    'capfed'
  );

UPDATE "Property" AS p
SET "localityId" = l."id"
FROM "Locality" AS l
WHERE p."localityId" IS NULL
  AND p."provinceId" = l."provinceId"
  AND l."search" = geo_search_normalize(p."city");

UPDATE "Property" AS p
SET "localityId" = l."id"
FROM "Locality" AS l
WHERE p."localityId" IS NULL
  AND p."provinceId" = l."provinceId"
  AND p."neighborhood" IS NOT NULL
  AND btrim(p."neighborhood") <> ''
  AND l."search" = geo_search_normalize(p."neighborhood");

UPDATE "Property" AS p
SET "neighborhoodId" = n."id"
FROM "Neighborhood" AS n
WHERE p."neighborhoodId" IS NULL
  AND p."localityId" = n."localityId"
  AND p."neighborhood" IS NOT NULL
  AND btrim(p."neighborhood") <> ''
  AND n."search" = geo_search_normalize(p."neighborhood")
  AND n."search" <> (
    SELECT l."search" FROM "Locality" AS l WHERE l."id" = p."localityId"
  );

DELETE FROM "PropertyGeoMigrationAudit" WHERE "id" = 'geo-002-backfill';

INSERT INTO "PropertyGeoMigrationAudit" (
  "totalProperties",
  "countryMatched",
  "provinceMatched",
  "localityMatched",
  "neighborhoodMatched",
  "fullyMatched"
)
SELECT
  (SELECT COUNT(*)::INTEGER FROM "Property"),
  (SELECT COUNT(*)::INTEGER FROM "Property" WHERE "countryId" IS NOT NULL),
  (SELECT COUNT(*)::INTEGER FROM "Property" WHERE "provinceId" IS NOT NULL),
  (SELECT COUNT(*)::INTEGER FROM "Property" WHERE "localityId" IS NOT NULL),
  (SELECT COUNT(*)::INTEGER FROM "Property" WHERE "neighborhoodId" IS NOT NULL),
  (SELECT COUNT(*)::INTEGER FROM "Property"
   WHERE "countryId" IS NOT NULL
     AND "provinceId" IS NOT NULL
     AND "localityId" IS NOT NULL);

CREATE INDEX IF NOT EXISTS "Property_countryId_idx" ON "Property"("countryId");
CREATE INDEX IF NOT EXISTS "Property_provinceId_idx" ON "Property"("provinceId");
CREATE INDEX IF NOT EXISTS "Property_localityId_idx" ON "Property"("localityId");
CREATE INDEX IF NOT EXISTS "Property_neighborhoodId_idx" ON "Property"("neighborhoodId");
CREATE INDEX IF NOT EXISTS "Property_tenantId_provinceId_idx" ON "Property"("tenantId", "provinceId");
CREATE INDEX IF NOT EXISTS "Property_tenantId_localityId_idx" ON "Property"("tenantId", "localityId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Property_countryId_fkey'
  ) THEN
    ALTER TABLE "Property" ADD CONSTRAINT "Property_countryId_fkey"
      FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Property_provinceId_fkey'
  ) THEN
    ALTER TABLE "Property" ADD CONSTRAINT "Property_provinceId_fkey"
      FOREIGN KEY ("provinceId") REFERENCES "Province"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Property_localityId_fkey'
  ) THEN
    ALTER TABLE "Property" ADD CONSTRAINT "Property_localityId_fkey"
      FOREIGN KEY ("localityId") REFERENCES "Locality"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Property_neighborhoodId_fkey'
  ) THEN
    ALTER TABLE "Property" ADD CONSTRAINT "Property_neighborhoodId_fkey"
      FOREIGN KEY ("neighborhoodId") REFERENCES "Neighborhood"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DROP FUNCTION IF EXISTS geo_search_normalize(TEXT);
