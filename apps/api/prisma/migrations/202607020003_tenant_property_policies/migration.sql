-- Fase 5 QA: configurable property visibility and edit policies per tenant

CREATE TYPE "PropertyVisibilityPolicy" AS ENUM ('AGENT_OWN_ONLY', 'AGENT_SEE_ALL');
CREATE TYPE "PropertyEditPolicy" AS ENUM ('CREATOR_ONLY', 'CREATOR_OR_ASSIGNEE');

ALTER TABLE "TenantSetting"
  ADD COLUMN "propertyVisibilityPolicy" "PropertyVisibilityPolicy" NOT NULL DEFAULT 'AGENT_OWN_ONLY',
  ADD COLUMN "propertyEditPolicy" "PropertyEditPolicy" NOT NULL DEFAULT 'CREATOR_OR_ASSIGNEE';
