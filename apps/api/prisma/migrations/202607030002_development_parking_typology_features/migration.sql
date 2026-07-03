-- AlterTable
ALTER TABLE "Development" ADD COLUMN "hasParkingSpaces" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Development" ADD COLUMN "parkingSpacesCount" INTEGER;

-- Remove typology feature assignments outside the allowed slug list
DELETE FROM "DevelopmentTypologyFeatureAssignment"
WHERE "featureId" IN (
  SELECT "id"
  FROM "PropertyFeature"
  WHERE "slug" NOT IN (
    'banos',
    'bano-en-suite',
    'toilette',
    'cocina',
    'living',
    'comedor',
    'escritorio',
    'dependencia',
    'lavadero',
    'balcon',
    'terraza',
    'patio',
    'baulera'
  )
);
