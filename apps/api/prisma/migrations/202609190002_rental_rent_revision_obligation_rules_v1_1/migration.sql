-- Rental V1.1 Phase 2: rent value revisions, due modes and notice flags.
-- Legacy ACTIVE contracts may keep adjustmentIntervalMonths NULL, but their
-- existing RENT configuration must otherwise support a deterministic backfill.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "RentalObligation" obligation
    JOIN "RentalConcept" concept ON concept.id = obligation."conceptId"
    JOIN "RentalContract" contract ON contract.id = obligation."contractId"
    WHERE concept."systemCode" = 'RENT'
      AND contract.status = 'ACTIVE'
      AND (
        obligation."defaultAmount" IS NULL
        OR obligation."defaultAmount" <= 0
        OR obligation."amountMode" <> 'FIXED'
        OR obligation.kind <> 'RECURRING'
        OR obligation."recurrenceMonths" IS DISTINCT FROM 1
        OR obligation."dueDay" IS NULL
        OR obligation."dueDay" NOT BETWEEN 1 AND 31
      )
  ) THEN
    RAISE EXCEPTION 'ACTIVE RENT obligation cannot be migrated deterministically';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "RentalObligation" obligation
    JOIN "RentalConcept" concept ON concept.id = obligation."conceptId"
    WHERE concept."systemCode" = 'RENT'
      AND obligation."defaultAmount" IS NULL
      AND EXISTS (
        SELECT 1 FROM "RentalContract" contract
        WHERE contract.id = obligation."contractId"
          AND contract.status <> 'DRAFT'
      )
  ) THEN
    RAISE EXCEPTION 'Only DRAFT contracts may have RENT without an initial amount';
  END IF;
END $$;

CREATE TYPE "RentalDueMode" AS ENUM ('FIXED_DAY', 'MANUAL_PER_PERIOD');

ALTER TABLE "RentalObligation"
  ADD COLUMN "dueMode" "RentalDueMode" NOT NULL DEFAULT 'FIXED_DAY',
  ADD COLUMN "adjustmentIntervalMonths" INTEGER,
  ADD COLUMN "includeInNotice" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "showAmount" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "RentalObligationOccurrence"
  ALTER COLUMN "dueDate" DROP NOT NULL;

UPDATE "RentalObligation" obligation
SET
  "includeInNotice" = (concept."systemCode" = 'RENT'),
  "showAmount" = (concept."systemCode" = 'RENT')
FROM "RentalConcept" concept
WHERE concept.id = obligation."conceptId";

CREATE UNIQUE INDEX "RentalObligation_tenantId_id_key"
  ON "RentalObligation"("tenantId", id);

CREATE TABLE "RentalRentValueRevision" (
  id TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "obligationId" TEXT NOT NULL,
  "effectiveFrom" DATE NOT NULL,
  amount DECIMAL(14, 2) NOT NULL,
  currency "Currency" NOT NULL,
  "recordedById" TEXT,
  reason TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RentalRentValueRevision_pkey" PRIMARY KEY (id)
);

INSERT INTO "RentalRentValueRevision" (
  id,
  "tenantId",
  "obligationId",
  "effectiveFrom",
  amount,
  currency,
  "recordedById",
  reason,
  "createdAt"
)
SELECT
  'rrvr_' || md5(obligation.id || ':' || obligation."startsOn"::TEXT),
  obligation."tenantId",
  obligation.id,
  obligation."startsOn",
  obligation."defaultAmount",
  obligation.currency,
  NULL,
  NULL,
  obligation."createdAt"
FROM "RentalObligation" obligation
JOIN "RentalConcept" concept ON concept.id = obligation."conceptId"
WHERE concept."systemCode" = 'RENT'
  AND obligation."defaultAmount" IS NOT NULL
ON CONFLICT DO NOTHING;

CREATE UNIQUE INDEX "RentalRentValueRevision_obligationId_effectiveFrom_key"
  ON "RentalRentValueRevision"("obligationId", "effectiveFrom");
CREATE INDEX "RentalRentValueRevision_tenantId_effectiveFrom_idx"
  ON "RentalRentValueRevision"("tenantId", "effectiveFrom");
CREATE INDEX "RentalRentValueRevision_recordedById_idx"
  ON "RentalRentValueRevision"("recordedById");

ALTER TABLE "RentalObligation"
  ADD CONSTRAINT "RentalObligation_recurrence_months_check"
  CHECK (
    (kind = 'RECURRING' AND "recurrenceMonths" BETWEEN 1 AND 12)
    OR (kind = 'ONE_TIME' AND "recurrenceMonths" IS NULL)
  ),
  ADD CONSTRAINT "RentalObligation_due_mode_check"
  CHECK (
    (kind = 'ONE_TIME' AND "dueMode" = 'FIXED_DAY' AND "dueDay" IS NULL)
    OR (
      kind = 'RECURRING'
      AND "dueMode" = 'FIXED_DAY'
      AND "dueDay" BETWEEN 1 AND 31
    )
    OR (
      kind = 'RECURRING'
      AND "dueMode" = 'MANUAL_PER_PERIOD'
      AND "dueDay" IS NULL
    )
  ),
  ADD CONSTRAINT "RentalObligation_adjustment_interval_check"
  CHECK (
    "adjustmentIntervalMonths" IS NULL
    OR "adjustmentIntervalMonths" BETWEEN 1 AND 12
  ),
  ADD CONSTRAINT "RentalObligation_notice_amount_check"
  CHECK ("showAmount" = false OR "includeInNotice" = true);

ALTER TABLE "RentalRentValueRevision"
  ADD CONSTRAINT "RentalRentValueRevision_amount_check"
  CHECK (amount > 0),
  ADD CONSTRAINT "RentalRentValueRevision_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"(id)
  ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "RentalRentValueRevision_obligation_tenant_fkey"
  FOREIGN KEY ("tenantId", "obligationId")
  REFERENCES "RentalObligation"("tenantId", id)
  ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "RentalRentValueRevision_recordedById_fkey"
  FOREIGN KEY ("recordedById") REFERENCES "User"(id)
  ON DELETE SET NULL ON UPDATE CASCADE;
