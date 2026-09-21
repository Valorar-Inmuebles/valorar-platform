-- CreateEnum
CREATE TYPE "RentalReminderEventType" AS ENUM ('PRE_DUE', 'DUE', 'POST_DUE');

-- CreateEnum
CREATE TYPE "RentalReminderDispatchStatus" AS ENUM ('PLANNED', 'READY', 'PROCESSING', 'COMPLETED', 'PARTIALLY_COMPLETED', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "RentalReminderDeliveryStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "RentalReminderAttemptStatus" AS ENUM ('PROCESSING', 'ACCEPTED', 'FAILED');

-- CreateEnum
CREATE TYPE "RentalReminderStatusSource" AS ENUM ('INTERNAL', 'PROVIDER_RESPONSE', 'PROVIDER_WEBHOOK');

-- CreateEnum
CREATE TYPE "RentalReminderPlanningIssueType" AS ENUM ('DUE_DATE_MISSING', 'DISPLAY_AMOUNT_MISSING', 'NO_ENABLED_ROUTE', 'CONTACT_POINT_INELIGIBLE', 'TENANT_TIME_ZONE_MISSING_OR_INVALID', 'PROVIDER_CONFIGURATION_INVALID', 'PROVIDER_TEMPLATE_INVALID', 'PLANNING_WINDOW_EXPIRED');

-- CreateEnum
CREATE TYPE "RentalReminderPlanningIssueStatus" AS ENUM ('OPEN', 'RESOLVED');

-- CreateEnum
CREATE TYPE "RentalReminderDispatchOccurrenceStatus" AS ENUM ('INCLUDED', 'EXCLUDED_BEFORE_SEND');

-- CreateEnum
CREATE TYPE "RentalReminderWebhookReceiptStatus" AS ENUM ('RECEIVED', 'APPLIED', 'IGNORED');

-- CreateTable
CREATE TABLE "RentalReminderPolicy" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "preDueEnabled" BOOLEAN NOT NULL DEFAULT true,
    "preDueDays" INTEGER NOT NULL DEFAULT 3,
    "dueEnabled" BOOLEAN NOT NULL DEFAULT true,
    "postDueEnabled" BOOLEAN NOT NULL DEFAULT true,
    "postDueDays" INTEGER NOT NULL DEFAULT 3,
    "sendTimeMinutes" INTEGER NOT NULL DEFAULT 600,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RentalReminderPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentalReminderPlanningIssue" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "contractId" TEXT,
    "occurrenceId" TEXT,
    "recipientContactId" TEXT,
    "channel" "NotificationChannel",
    "type" "RentalReminderPlanningIssueType" NOT NULL,
    "deduplicationKey" TEXT NOT NULL,
    "status" "RentalReminderPlanningIssueStatus" NOT NULL DEFAULT 'OPEN',
    "firstDetectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastDetectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RentalReminderPlanningIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentalReminderDispatch" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "recipientContactId" TEXT,
    "recipientIdentityKey" TEXT NOT NULL,
    "eventType" "RentalReminderEventType" NOT NULL,
    "dueDate" DATE NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "groupKey" TEXT NOT NULL,
    "occurrenceSetHash" TEXT NOT NULL,
    "status" "RentalReminderDispatchStatus" NOT NULL DEFAULT 'PLANNED',
    "skipReason" TEXT,
    "policySnapshot" JSONB NOT NULL,
    "recipientSnapshot" JSONB NOT NULL,
    "contentSnapshot" JSONB NOT NULL,
    "frozenAt" TIMESTAMP(3),
    "firstAttemptAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RentalReminderDispatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentalReminderDispatchOccurrence" (
    "tenantId" TEXT NOT NULL,
    "dispatchId" TEXT NOT NULL,
    "occurrenceId" TEXT NOT NULL,
    "status" "RentalReminderDispatchOccurrenceStatus" NOT NULL DEFAULT 'INCLUDED',
    "exclusionReason" TEXT,
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RentalReminderDispatchOccurrence_pkey" PRIMARY KEY ("dispatchId","occurrenceId")
);

-- CreateTable
CREATE TABLE "RentalReminderDelivery" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "dispatchId" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "contactPointId" TEXT,
    "routeId" TEXT,
    "deliveryKey" TEXT NOT NULL,
    "status" "RentalReminderDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "statusSource" "RentalReminderStatusSource" NOT NULL DEFAULT 'INTERNAL',
    "destinationSnapshot" TEXT NOT NULL,
    "contentSnapshot" JSONB NOT NULL,
    "subjectSnapshot" TEXT,
    "bodySnapshot" TEXT NOT NULL,
    "templateKey" TEXT NOT NULL,
    "templateVersion" TEXT NOT NULL,
    "providerKey" TEXT NOT NULL,
    "providerAccountKey" TEXT NOT NULL,
    "providerTemplateRef" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3),
    "processingToken" TEXT,
    "lockedUntil" TIMESTAMP(3),
    "providerMessageId" TEXT,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "skippedAt" TIMESTAMP(3),
    "errorCategory" TEXT,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RentalReminderDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentalReminderDeliveryAttempt" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "attemptKey" TEXT NOT NULL,
    "status" "RentalReminderAttemptStatus" NOT NULL DEFAULT 'PROCESSING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "latencyMs" INTEGER,
    "providerMessageId" TEXT,
    "errorCategory" TEXT,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RentalReminderDeliveryAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentalReminderWebhookReceipt" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "attemptId" TEXT,
    "providerKey" TEXT NOT NULL,
    "providerAccountKey" TEXT NOT NULL,
    "providerEventKey" TEXT NOT NULL,
    "providerMessageId" TEXT,
    "eventType" TEXT NOT NULL,
    "providerOccurredAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "status" "RentalReminderWebhookReceiptStatus" NOT NULL DEFAULT 'RECEIVED',
    "payloadDigest" TEXT NOT NULL,
    "errorCategory" TEXT,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RentalReminderWebhookReceipt_pkey" PRIMARY KEY ("id")
);

-- CheckConstraint
ALTER TABLE "RentalReminderPolicy"
ADD CONSTRAINT "RentalReminderPolicy_preDueDays_check"
CHECK ("preDueDays" BETWEEN 1 AND 30),
ADD CONSTRAINT "RentalReminderPolicy_postDueDays_check"
CHECK ("postDueDays" BETWEEN 1 AND 30),
ADD CONSTRAINT "RentalReminderPolicy_sendTimeMinutes_check"
CHECK ("sendTimeMinutes" BETWEEN 0 AND 1439);

-- CheckConstraint
ALTER TABLE "RentalReminderPlanningIssue"
ADD CONSTRAINT "RentalReminderPlanningIssue_deduplicationKey_check"
CHECK ("deduplicationKey" ~ '^[0-9a-f]{64}$'),
ADD CONSTRAINT "RentalReminderPlanningIssue_resolution_check"
CHECK (
  ("status" = 'OPEN' AND "resolvedAt" IS NULL)
  OR ("status" = 'RESOLVED' AND "resolvedAt" IS NOT NULL)
),
ADD CONSTRAINT "RentalReminderPlanningIssue_detection_order_check"
CHECK ("lastDetectedAt" >= "firstDetectedAt");

-- CheckConstraint
ALTER TABLE "RentalReminderDispatch"
ADD CONSTRAINT "RentalReminderDispatch_groupKey_check"
CHECK ("groupKey" ~ '^[0-9a-f]{64}$'),
ADD CONSTRAINT "RentalReminderDispatch_occurrenceSetHash_check"
CHECK ("occurrenceSetHash" ~ '^[0-9a-f]{64}$'),
ADD CONSTRAINT "RentalReminderDispatch_recipientIdentityKey_check"
CHECK (length(btrim("recipientIdentityKey")) > 0),
ADD CONSTRAINT "RentalReminderDispatch_freeze_check"
CHECK ("firstAttemptAt" IS NULL OR "frozenAt" IS NOT NULL),
ADD CONSTRAINT "RentalReminderDispatch_completion_check"
CHECK (
  ("status" IN ('COMPLETED', 'PARTIALLY_COMPLETED', 'FAILED', 'SKIPPED') AND "completedAt" IS NOT NULL)
  OR ("status" NOT IN ('COMPLETED', 'PARTIALLY_COMPLETED', 'FAILED', 'SKIPPED') AND "completedAt" IS NULL)
);

-- CheckConstraint
ALTER TABLE "RentalReminderDispatchOccurrence"
ADD CONSTRAINT "RentalReminderDispatchOccurrence_exclusion_check"
CHECK (
  ("status" = 'INCLUDED' AND "exclusionReason" IS NULL)
  OR ("status" = 'EXCLUDED_BEFORE_SEND' AND length(btrim("exclusionReason")) > 0)
);

-- CheckConstraint
ALTER TABLE "RentalReminderDelivery"
ADD CONSTRAINT "RentalReminderDelivery_operationalChannel_check"
CHECK ("channel" IN ('EMAIL', 'WHATSAPP')),
ADD CONSTRAINT "RentalReminderDelivery_deliveryKey_check"
CHECK ("deliveryKey" ~ '^[0-9a-f]{64}$'),
ADD CONSTRAINT "RentalReminderDelivery_attemptCount_check"
CHECK ("attemptCount" BETWEEN 0 AND 4),
ADD CONSTRAINT "RentalReminderDelivery_lease_check"
CHECK (("processingToken" IS NULL) = ("lockedUntil" IS NULL)),
ADD CONSTRAINT "RentalReminderDelivery_status_timestamp_check"
CHECK (
  ("status" = 'SENT' AND "sentAt" IS NOT NULL)
  OR ("status" = 'DELIVERED' AND "deliveredAt" IS NOT NULL)
  OR ("status" = 'READ' AND "readAt" IS NOT NULL)
  OR ("status" = 'FAILED' AND "failedAt" IS NOT NULL)
  OR ("status" = 'SKIPPED' AND "skippedAt" IS NOT NULL)
  OR "status" IN ('PENDING', 'PROCESSING')
),
ADD CONSTRAINT "RentalReminderDelivery_required_keys_check"
CHECK (
  length(btrim("templateKey")) > 0
  AND length(btrim("templateVersion")) > 0
  AND length(btrim("providerKey")) > 0
  AND length(btrim("providerAccountKey")) > 0
);

-- CheckConstraint
ALTER TABLE "RentalReminderDeliveryAttempt"
ADD CONSTRAINT "RentalReminderDeliveryAttempt_attemptNumber_check"
CHECK ("attemptNumber" BETWEEN 1 AND 4),
ADD CONSTRAINT "RentalReminderDeliveryAttempt_attemptKey_check"
CHECK ("attemptKey" ~ '^[0-9a-f]{64}$'),
ADD CONSTRAINT "RentalReminderDeliveryAttempt_status_check"
CHECK (
  ("status" = 'PROCESSING' AND "finishedAt" IS NULL)
  OR ("status" IN ('ACCEPTED', 'FAILED') AND "finishedAt" IS NOT NULL)
),
ADD CONSTRAINT "RentalReminderDeliveryAttempt_latency_check"
CHECK ("latencyMs" IS NULL OR "latencyMs" >= 0);

-- CheckConstraint
ALTER TABLE "RentalReminderWebhookReceipt"
ADD CONSTRAINT "RentalReminderWebhookReceipt_payloadDigest_check"
CHECK ("payloadDigest" ~ '^[0-9a-f]{64}$'),
ADD CONSTRAINT "RentalReminderWebhookReceipt_processing_check"
CHECK (
  ("status" = 'RECEIVED' AND "processedAt" IS NULL)
  OR ("status" IN ('APPLIED', 'IGNORED') AND "processedAt" IS NOT NULL)
),
ADD CONSTRAINT "RentalReminderWebhookReceipt_required_keys_check"
CHECK (
  length(btrim("providerKey")) > 0
  AND length(btrim("providerAccountKey")) > 0
  AND length(btrim("providerEventKey")) > 0
  AND length(btrim("eventType")) > 0
);

-- CreateIndex
CREATE UNIQUE INDEX "RentalReminderPolicy_tenantId_key" ON "RentalReminderPolicy"("tenantId");

-- Backfill one deterministic default policy per existing tenant. No communication history is synthesized.
INSERT INTO "RentalReminderPolicy" (
  "id", "tenantId", "preDueEnabled", "preDueDays", "dueEnabled",
  "postDueEnabled", "postDueDays", "sendTimeMinutes", "createdAt", "updatedAt"
)
SELECT
  'rrp_' || md5(tenant."id"), tenant."id", true, 3, true, true, 3, 600,
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Tenant" tenant
ON CONFLICT ("tenantId") DO NOTHING;

-- CreateIndex
CREATE INDEX "RentalReminderPlanningIssue_tenantId_status_lastDetectedAt_idx" ON "RentalReminderPlanningIssue"("tenantId", "status", "lastDetectedAt" DESC);

-- CreateIndex
CREATE INDEX "RentalReminderPlanningIssue_tenantId_contractId_idx" ON "RentalReminderPlanningIssue"("tenantId", "contractId");

-- CreateIndex
CREATE INDEX "RentalReminderPlanningIssue_tenantId_occurrenceId_idx" ON "RentalReminderPlanningIssue"("tenantId", "occurrenceId");

-- CreateIndex
CREATE UNIQUE INDEX "RentalReminderPlanningIssue_tenantId_deduplicationKey_key" ON "RentalReminderPlanningIssue"("tenantId", "deduplicationKey");

-- CreateIndex
CREATE INDEX "RentalReminderDispatch_tenantId_status_scheduledFor_idx" ON "RentalReminderDispatch"("tenantId", "status", "scheduledFor");

-- CreateIndex
CREATE INDEX "RentalReminderDispatch_tenantId_contractId_createdAt_idx" ON "RentalReminderDispatch"("tenantId", "contractId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "RentalReminderDispatch_tenantId_recipientContactId_idx" ON "RentalReminderDispatch"("tenantId", "recipientContactId");

-- CreateIndex
CREATE UNIQUE INDEX "RentalReminderDispatch_tenantId_id_key" ON "RentalReminderDispatch"("tenantId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "RentalReminderDispatch_tenantId_groupKey_key" ON "RentalReminderDispatch"("tenantId", "groupKey");

-- CreateIndex
CREATE INDEX "RentalReminderDispatchOccurrence_tenantId_occurrenceId_idx" ON "RentalReminderDispatchOccurrence"("tenantId", "occurrenceId");

-- CreateIndex
CREATE INDEX "RentalReminderDelivery_tenantId_status_nextAttemptAt_idx" ON "RentalReminderDelivery"("tenantId", "status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "RentalReminderDelivery_tenantId_dispatchId_idx" ON "RentalReminderDelivery"("tenantId", "dispatchId");

-- CreateIndex
CREATE UNIQUE INDEX "RentalReminderDelivery_tenantId_id_key" ON "RentalReminderDelivery"("tenantId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "RentalReminderDelivery_tenantId_deliveryKey_key" ON "RentalReminderDelivery"("tenantId", "deliveryKey");

-- CreateIndex
CREATE UNIQUE INDEX "RentalReminderDelivery_dispatchId_channel_key" ON "RentalReminderDelivery"("dispatchId", "channel");

-- CreateIndex
CREATE UNIQUE INDEX "RentalReminderDelivery_provider_message_key"
ON "RentalReminderDelivery"("providerKey", "providerAccountKey", "providerMessageId")
WHERE "providerMessageId" IS NOT NULL;

-- CreateIndex
CREATE INDEX "RentalReminderDeliveryAttempt_tenantId_deliveryId_startedAt_idx" ON "RentalReminderDeliveryAttempt"("tenantId", "deliveryId", "startedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "RentalReminderDeliveryAttempt_tenantId_id_key" ON "RentalReminderDeliveryAttempt"("tenantId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "RentalReminderDeliveryAttempt_deliveryId_attemptNumber_key" ON "RentalReminderDeliveryAttempt"("deliveryId", "attemptNumber");

-- CreateIndex
CREATE UNIQUE INDEX "RentalReminderDeliveryAttempt_tenantId_attemptKey_key" ON "RentalReminderDeliveryAttempt"("tenantId", "attemptKey");

-- CreateIndex
CREATE INDEX "RentalReminderWebhookReceipt_tenantId_deliveryId_receivedAt_idx" ON "RentalReminderWebhookReceipt"("tenantId", "deliveryId", "receivedAt" DESC);

-- CreateIndex
CREATE INDEX "RentalReminderWebhookReceipt_tenantId_attemptId_idx" ON "RentalReminderWebhookReceipt"("tenantId", "attemptId");

-- CreateIndex
CREATE INDEX "RentalReminderWebhookReceipt_providerKey_providerAccountKey_providerMessageId_idx" ON "RentalReminderWebhookReceipt"("providerKey", "providerAccountKey", "providerMessageId");

-- CreateIndex
CREATE UNIQUE INDEX "RentalReminderWebhookReceipt_providerKey_providerAccountKey_key" ON "RentalReminderWebhookReceipt"("providerKey", "providerAccountKey", "providerEventKey");

-- CreateIndex
CREATE UNIQUE INDEX "RentalObligationOccurrence_tenantId_id_key" ON "RentalObligationOccurrence"("tenantId", "id");

-- AddForeignKey
ALTER TABLE "RentalReminderPolicy" ADD CONSTRAINT "RentalReminderPolicy_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalReminderPlanningIssue" ADD CONSTRAINT "RentalReminderPlanningIssue_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalReminderDispatch" ADD CONSTRAINT "RentalReminderDispatch_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalReminderDispatch" ADD CONSTRAINT "RentalReminderDispatch_tenantId_contractId_fkey" FOREIGN KEY ("tenantId", "contractId") REFERENCES "RentalContract"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalReminderDispatchOccurrence" ADD CONSTRAINT "RentalReminderDispatchOccurrence_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalReminderDispatchOccurrence" ADD CONSTRAINT "RentalReminderDispatchOccurrence_tenantId_dispatchId_fkey" FOREIGN KEY ("tenantId", "dispatchId") REFERENCES "RentalReminderDispatch"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalReminderDispatchOccurrence" ADD CONSTRAINT "RentalReminderDispatchOccurrence_tenantId_occurrenceId_fkey" FOREIGN KEY ("tenantId", "occurrenceId") REFERENCES "RentalObligationOccurrence"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalReminderDelivery" ADD CONSTRAINT "RentalReminderDelivery_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalReminderDelivery" ADD CONSTRAINT "RentalReminderDelivery_tenantId_dispatchId_fkey" FOREIGN KEY ("tenantId", "dispatchId") REFERENCES "RentalReminderDispatch"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalReminderDeliveryAttempt" ADD CONSTRAINT "RentalReminderDeliveryAttempt_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalReminderDeliveryAttempt" ADD CONSTRAINT "RentalReminderDeliveryAttempt_tenantId_deliveryId_fkey" FOREIGN KEY ("tenantId", "deliveryId") REFERENCES "RentalReminderDelivery"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalReminderWebhookReceipt" ADD CONSTRAINT "RentalReminderWebhookReceipt_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalReminderWebhookReceipt" ADD CONSTRAINT "RentalReminderWebhookReceipt_tenantId_deliveryId_fkey" FOREIGN KEY ("tenantId", "deliveryId") REFERENCES "RentalReminderDelivery"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalReminderWebhookReceipt" ADD CONSTRAINT "RentalReminderWebhookReceipt_tenantId_attemptId_fkey" FOREIGN KEY ("tenantId", "attemptId") REFERENCES "RentalReminderDeliveryAttempt"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
