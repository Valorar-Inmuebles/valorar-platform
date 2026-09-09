-- CreateEnum
CREATE TYPE "RentalObligationKind" AS ENUM ('RECURRING', 'ONE_TIME');

-- CreateEnum
CREATE TYPE "RentalAmountMode" AS ENUM ('FIXED', 'VARIABLE');

-- CreateEnum
CREATE TYPE "RentalOccurrenceStatus" AS ENUM ('PENDING', 'FULFILLED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RentalFulfillmentStatus" AS ENUM ('RECORDED', 'REVERSED');

-- CreateEnum
CREATE TYPE "RentalFulfillmentOrigin" AS ENUM ('ADMIN');

-- CreateTable
CREATE TABLE "RentalObligation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "conceptId" TEXT NOT NULL,
    "kind" "RentalObligationKind" NOT NULL,
    "recurrenceMonths" INTEGER,
    "dueDay" INTEGER,
    "amountMode" "RentalAmountMode" NOT NULL,
    "defaultAmount" DECIMAL(14,2),
    "currency" "Currency" NOT NULL,
    "startsOn" DATE NOT NULL,
    "endsOn" DATE,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RentalObligation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentalObligationOccurrence" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "obligationId" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "periodStartsOn" DATE,
    "periodEndsOn" DATE,
    "dueDate" DATE NOT NULL,
    "amount" DECIMAL(14,2),
    "currency" "Currency" NOT NULL,
    "status" "RentalOccurrenceStatus" NOT NULL DEFAULT 'PENDING',
    "cancelledAt" TIMESTAMP(3),
    "cancelledById" TEXT,
    "cancellationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RentalObligationOccurrence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentalFulfillment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "occurrenceId" TEXT NOT NULL,
    "status" "RentalFulfillmentStatus" NOT NULL DEFAULT 'RECORDED',
    "fulfilledOn" DATE NOT NULL,
    "amount" DECIMAL(14,2),
    "notes" TEXT,
    "origin" "RentalFulfillmentOrigin" NOT NULL DEFAULT 'ADMIN',
    "recordedById" TEXT,
    "reversedAt" TIMESTAMP(3),
    "reversedById" TEXT,
    "reversalReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RentalFulfillment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RentalObligation_tenantId_contractId_isActive_idx" ON "RentalObligation"("tenantId", "contractId", "isActive");
CREATE INDEX "RentalObligation_tenantId_conceptId_idx" ON "RentalObligation"("tenantId", "conceptId");
CREATE UNIQUE INDEX "RentalObligationOccurrence_obligationId_periodKey_key" ON "RentalObligationOccurrence"("obligationId", "periodKey");
CREATE INDEX "RentalObligationOccurrence_tenantId_status_dueDate_idx" ON "RentalObligationOccurrence"("tenantId", "status", "dueDate");
CREATE INDEX "RentalObligationOccurrence_tenantId_obligationId_dueDate_idx" ON "RentalObligationOccurrence"("tenantId", "obligationId", "dueDate");
CREATE INDEX "RentalFulfillment_tenantId_occurrenceId_status_idx" ON "RentalFulfillment"("tenantId", "occurrenceId", "status");
CREATE INDEX "RentalFulfillment_tenantId_fulfilledOn_idx" ON "RentalFulfillment"("tenantId", "fulfilledOn");

-- AddForeignKey
ALTER TABLE "RentalObligation" ADD CONSTRAINT "RentalObligation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RentalObligation" ADD CONSTRAINT "RentalObligation_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "RentalContract"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RentalObligation" ADD CONSTRAINT "RentalObligation_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "RentalConcept"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RentalObligationOccurrence" ADD CONSTRAINT "RentalObligationOccurrence_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RentalObligationOccurrence" ADD CONSTRAINT "RentalObligationOccurrence_obligationId_fkey" FOREIGN KEY ("obligationId") REFERENCES "RentalObligation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RentalObligationOccurrence" ADD CONSTRAINT "RentalObligationOccurrence_cancelledById_fkey" FOREIGN KEY ("cancelledById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RentalFulfillment" ADD CONSTRAINT "RentalFulfillment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RentalFulfillment" ADD CONSTRAINT "RentalFulfillment_occurrenceId_fkey" FOREIGN KEY ("occurrenceId") REFERENCES "RentalObligationOccurrence"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RentalFulfillment" ADD CONSTRAINT "RentalFulfillment_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RentalFulfillment" ADD CONSTRAINT "RentalFulfillment_reversedById_fkey" FOREIGN KEY ("reversedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
