-- CreateTable
-- MigrationSourceRef: import traceability (wordpress-houzez, etc.)
-- NOTE: entityId is intentionally NOT a polymorphic foreign key.
-- PostgreSQL cannot enforce FKs to multiple tables from a single column.
-- Application code owns referential integrity for entityType + entityId.
CREATE TABLE "MigrationSourceRef" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "sourceSystem" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "migrationBatchId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MigrationSourceRef_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MigrationSourceRef_migrationBatchId_idx" ON "MigrationSourceRef"("migrationBatchId");

-- CreateIndex
CREATE INDEX "MigrationSourceRef_tenantId_entityType_entityId_idx" ON "MigrationSourceRef"("tenantId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "MigrationSourceRef_tenantId_sourceSystem_migrationBatchId_idx" ON "MigrationSourceRef"("tenantId", "sourceSystem", "migrationBatchId");

-- CreateIndex
CREATE UNIQUE INDEX "MigrationSourceRef_tenantId_sourceSystem_sourceId_entityType_key" ON "MigrationSourceRef"("tenantId", "sourceSystem", "sourceId", "entityType");

-- AddForeignKey
ALTER TABLE "MigrationSourceRef" ADD CONSTRAINT "MigrationSourceRef_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
