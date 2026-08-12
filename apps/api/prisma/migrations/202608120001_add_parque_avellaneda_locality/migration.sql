-- Data: ensure CABA Locality "Parque Avellaneda" for Houzez explicit mapping (WP 11099).
-- Idempotent: skips when slug/search/name already exists under Capital Federal.

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
  'cmrpaqavellaneda0001caba01',
  p."id",
  'Parque Avellaneda',
  NULL,
  'parque-avellaneda',
  'parqueavellaneda',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Province" p
WHERE p."slug" = 'capital-federal'
  AND NOT EXISTS (
    SELECT 1
    FROM "Locality" l
    WHERE l."provinceId" = p."id"
      AND (
        l."slug" = 'parque-avellaneda'
        OR l."search" = 'parqueavellaneda'
        OR l."name" = 'Parque Avellaneda'
      )
  );
