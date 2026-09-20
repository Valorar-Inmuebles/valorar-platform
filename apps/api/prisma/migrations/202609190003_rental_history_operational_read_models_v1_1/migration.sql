-- CreateEnum
CREATE TYPE "RentalContractEventType" AS ENUM (
    'ACTIVATED',
    'ENDED',
    'CANCELLED',
    'PARTIES_CHANGED',
    'RENT_VALUE_REVISED',
    'RENEWED'
);

-- CreateTable
CREATE TABLE "RentalContractEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "type" "RentalContractEventType" NOT NULL,
    "actorId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RentalContractEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RentalContractEvent_tenantId_contractId_occurredAt_idx"
ON "RentalContractEvent"("tenantId", "contractId", "occurredAt" DESC);

-- CreateIndex
CREATE INDEX "RentalContractEvent_tenantId_contractId_type_occurredAt_idx"
ON "RentalContractEvent"("tenantId", "contractId", "type", "occurredAt" DESC);

-- CreateIndex
CREATE INDEX "RentalContractEvent_actorId_idx"
ON "RentalContractEvent"("actorId");

-- AddForeignKey
ALTER TABLE "RentalContractEvent"
ADD CONSTRAINT "RentalContractEvent_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalContractEvent"
ADD CONSTRAINT "RentalContractEvent_tenantId_contractId_fkey"
FOREIGN KEY ("tenantId", "contractId") REFERENCES "RentalContract"("tenantId", "id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalContractEvent"
ADD CONSTRAINT "RentalContractEvent_actorId_fkey"
FOREIGN KEY ("actorId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
