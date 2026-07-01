-- Fase 6: Platform — Tenant status (ACTIVE / SUSPENDED)

CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

ALTER TABLE "Tenant" ADD COLUMN "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVE';
