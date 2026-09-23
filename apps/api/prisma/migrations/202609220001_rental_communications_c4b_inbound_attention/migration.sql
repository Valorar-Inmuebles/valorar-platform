-- C4B adds the inbound attention state. Existing inbound rows stay
-- readAt = acknowledgedAt = acknowledgedById = NULL (no backfill).
ALTER TABLE "CommunicationInboundMessage"
ADD COLUMN     "acknowledgedAt" TIMESTAMP(3),
ADD COLUMN     "acknowledgedById" TEXT,
ADD COLUMN     "readAt" TIMESTAMP(3);

-- Supports pending-queue lookups (acknowledgedAt IS NULL) and the
-- inboundUnacknowledged summary counter, always tenant-scoped.
CREATE INDEX "CommunicationInboundMessage_tenantId_acknowledgedAt_idx"
ON "CommunicationInboundMessage"("tenantId", "acknowledgedAt");

ALTER TABLE "CommunicationInboundMessage"
ADD CONSTRAINT "CommunicationInboundMessage_acknowledgedById_fkey"
FOREIGN KEY ("acknowledgedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;