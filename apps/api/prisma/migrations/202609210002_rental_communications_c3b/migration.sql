-- C3B stores normalized inbound WhatsApp messages without raw provider payloads.
CREATE TABLE "CommunicationInboundMessage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "providerKey" TEXT NOT NULL,
    "providerAccountKey" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL DEFAULT 'WHATSAPP',
    "providerMessageId" TEXT NOT NULL,
    "senderAddress" TEXT NOT NULL,
    "messageType" TEXT NOT NULL,
    "body" TEXT,
    "metadata" JSONB,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contactPointId" TEXT,
    "contactId" TEXT,
    "contractId" TEXT,
    "deliveryId" TEXT,

    CONSTRAINT "CommunicationInboundMessage_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "CommunicationInboundMessage"
ADD CONSTRAINT "CommunicationInboundMessage_channel_check"
CHECK ("channel" = 'WHATSAPP'),
ADD CONSTRAINT "CommunicationInboundMessage_required_keys_check"
CHECK (
  length(btrim("providerKey")) > 0
  AND length(btrim("providerAccountKey")) > 0
  AND length(btrim("providerMessageId")) > 0
  AND length(btrim("messageType")) > 0
),
ADD CONSTRAINT "CommunicationInboundMessage_senderAddress_check"
CHECK ("senderAddress" ~ '^\+[1-9][0-9]{7,14}$');

CREATE UNIQUE INDEX "Contact_tenantId_id_key"
ON "Contact"("tenantId", "id");

CREATE UNIQUE INDEX "ContactPoint_tenantId_id_key"
ON "ContactPoint"("tenantId", "id");

CREATE UNIQUE INDEX "CommunicationInboundMessage_provider_message_key"
ON "CommunicationInboundMessage"("providerKey", "providerAccountKey", "providerMessageId");

CREATE INDEX "CommunicationInboundMessage_tenantId_receivedAt_idx"
ON "CommunicationInboundMessage"("tenantId", "receivedAt" DESC);

CREATE INDEX "CommunicationInboundMessage_tenantId_contactId_receivedAt_idx"
ON "CommunicationInboundMessage"("tenantId", "contactId", "receivedAt" DESC);

CREATE INDEX "CommunicationInboundMessage_tenantId_contractId_receivedAt_idx"
ON "CommunicationInboundMessage"("tenantId", "contractId", "receivedAt" DESC);

CREATE INDEX "CommunicationInboundMessage_tenantId_deliveryId_idx"
ON "CommunicationInboundMessage"("tenantId", "deliveryId");

ALTER TABLE "CommunicationInboundMessage"
ADD CONSTRAINT "CommunicationInboundMessage_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CommunicationInboundMessage"
ADD CONSTRAINT "CommunicationInboundMessage_tenantId_contactPointId_fkey"
FOREIGN KEY ("tenantId", "contactPointId") REFERENCES "ContactPoint"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CommunicationInboundMessage"
ADD CONSTRAINT "CommunicationInboundMessage_tenantId_contactId_fkey"
FOREIGN KEY ("tenantId", "contactId") REFERENCES "Contact"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CommunicationInboundMessage"
ADD CONSTRAINT "CommunicationInboundMessage_tenantId_contractId_fkey"
FOREIGN KEY ("tenantId", "contractId") REFERENCES "RentalContract"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CommunicationInboundMessage"
ADD CONSTRAINT "CommunicationInboundMessage_tenantId_deliveryId_fkey"
FOREIGN KEY ("tenantId", "deliveryId") REFERENCES "RentalReminderDelivery"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
