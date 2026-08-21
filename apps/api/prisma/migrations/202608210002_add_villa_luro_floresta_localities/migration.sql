-- Data: ensure CABA Localities "Villa Luro" and "Floresta" for local-developments-v1.
-- Idempotent: skips when slug/search/name already exists under Capital Federal.
-- Does not create a province. Does not update existing rows.

INSERT INTO "Locality" (
  "id",
  "provinceId",
  "name",
  "postalCode",
  "slug",
  "search",
  "createdAt",
  "updatedAt"
)
SELECT
  'cmrvillalurocaba0001loc01',
  p."id",
  'Villa Luro',
  NULL,
  'villa-luro',
  'villaluro',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Province" p
WHERE p."slug" = 'capital-federal'
  AND p."isoCode" = 'AR-C'
  AND NOT EXISTS (
    SELECT 1
    FROM "Locality" l
    WHERE l."provinceId" = p."id"
      AND (
        l."slug" = 'villa-luro'
        OR l."search" = 'villaluro'
        OR lower(l."name") = lower('Villa Luro')
      )
  );

INSERT INTO "Locality" (
  "id",
  "provinceId",
  "name",
  "postalCode",
  "slug",
  "search",
  "createdAt",
  "updatedAt"
)
SELECT
  'cmrflorestacaba00001loc01',
  p."id",
  'Floresta',
  NULL,
  'floresta',
  'floresta',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Province" p
WHERE p."slug" = 'capital-federal'
  AND p."isoCode" = 'AR-C'
  AND NOT EXISTS (
    SELECT 1
    FROM "Locality" l
    WHERE l."provinceId" = p."id"
      AND (
        l."slug" = 'floresta'
        OR l."search" = 'floresta'
        OR lower(l."name") = lower('Floresta')
      )
  );
