-- Rental V1.1 Phase 1: tenant-scoped contract identity, stable primary
-- parties, canonical document types, and concurrent-safe renewal linkage.

CREATE TYPE "ContactDocumentType" AS ENUM ('DNI', 'CUIT', 'CUIL', 'PASSPORT');

UPDATE "Contact"
SET "documentType" = NULL
WHERE "documentType" IS NOT NULL
  AND BTRIM("documentType") = '';

ALTER TABLE "Contact"
  ALTER COLUMN "documentType" TYPE "ContactDocumentType"
  USING UPPER(BTRIM("documentType"))::"ContactDocumentType";

CREATE TABLE "RentalContractSequence" (
  "tenantId" TEXT NOT NULL,
  "lastValue" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RentalContractSequence_pkey" PRIMARY KEY ("tenantId")
);

ALTER TABLE "RentalContract"
  ADD COLUMN "internalNumber" TEXT,
  ADD COLUMN "previousContractId" TEXT;

ALTER TABLE "RentalContractParty"
  ADD COLUMN "isPrimary" BOOLEAN NOT NULL DEFAULT false;

WITH numbered AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY "tenantId"
      ORDER BY "createdAt" ASC, id ASC
    ) AS sequence_number
  FROM "RentalContract"
)
UPDATE "RentalContract" AS contract
SET "internalNumber" = 'ALQ-' || LPAD(numbered.sequence_number::TEXT, 6, '0')
FROM numbered
WHERE contract.id = numbered.id
  AND contract."internalNumber" IS NULL;

ALTER TABLE "RentalContract"
  ALTER COLUMN "internalNumber" SET NOT NULL;

INSERT INTO "RentalContractSequence" ("tenantId", "lastValue", "updatedAt")
SELECT
  tenant.id,
  COALESCE(MAX(SUBSTRING(contract."internalNumber" FROM 5)::INTEGER), 0),
  CURRENT_TIMESTAMP
FROM "Tenant" AS tenant
LEFT JOIN "RentalContract" AS contract ON contract."tenantId" = tenant.id
GROUP BY tenant.id
ON CONFLICT ("tenantId") DO UPDATE
SET
  "lastValue" = GREATEST("RentalContractSequence"."lastValue", EXCLUDED."lastValue"),
  "updatedAt" = CURRENT_TIMESTAMP;

WITH ranked_renters AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY "contractId"
      ORDER BY "createdAt" ASC, id ASC
    ) AS renter_order
  FROM "RentalContractParty"
  WHERE role = 'RENTER'
)
UPDATE "RentalContractParty" AS party
SET "isPrimary" = true
FROM ranked_renters
WHERE party.id = ranked_renters.id
  AND ranked_renters.renter_order = 1
  AND party."isPrimary" = false;

CREATE UNIQUE INDEX "RentalContract_tenantId_internalNumber_key"
  ON "RentalContract"("tenantId", "internalNumber");
CREATE UNIQUE INDEX "RentalContract_tenantId_previousContractId_key"
  ON "RentalContract"("tenantId", "previousContractId");
CREATE UNIQUE INDEX "RentalContract_tenantId_id_key"
  ON "RentalContract"("tenantId", id);
CREATE UNIQUE INDEX "RentalContractParty_one_primary_renter_per_contract_key"
  ON "RentalContractParty"("contractId")
  WHERE role = 'RENTER' AND "isPrimary" = true;

ALTER TABLE "RentalContract"
  ADD CONSTRAINT "RentalContract_internalNumber_format_check"
  CHECK ("internalNumber" ~ '^ALQ-[0-9]{6}$');

ALTER TABLE "RentalContractParty"
  ADD CONSTRAINT "RentalContractParty_primary_role_check"
  CHECK (role = 'RENTER' OR "isPrimary" = false);

ALTER TABLE "RentalContractSequence"
  ADD CONSTRAINT "RentalContractSequence_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"(id)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RentalContract"
  ADD CONSTRAINT "RentalContract_previousContract_tenant_fkey"
  FOREIGN KEY ("tenantId", "previousContractId")
  REFERENCES "RentalContract"("tenantId", id)
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION prevent_rental_contract_internal_number_change()
RETURNS trigger AS $$
BEGIN
  IF NEW."internalNumber" IS DISTINCT FROM OLD."internalNumber" THEN
    RAISE EXCEPTION 'Rental contract internal number is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "RentalContract_internalNumber_immutable"
BEFORE UPDATE OF "internalNumber" ON "RentalContract"
FOR EACH ROW
EXECUTE FUNCTION prevent_rental_contract_internal_number_change();
