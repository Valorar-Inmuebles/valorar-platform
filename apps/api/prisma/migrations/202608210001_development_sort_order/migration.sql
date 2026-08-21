-- AlterTable
ALTER TABLE "Development" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Development_tenantId_sortOrder_idx" ON "Development"("tenantId", "sortOrder");
