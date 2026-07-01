/** Tenant-configurable property access policies (persisted in TenantSetting). */
export type PropertyVisibilityPolicy = 'AGENT_OWN_ONLY' | 'AGENT_SEE_ALL';

export type PropertyEditPolicy = 'CREATOR_ONLY' | 'CREATOR_OR_ASSIGNEE';

export type PropertyTenantPolicies = {
  visibility: PropertyVisibilityPolicy;
  edit: PropertyEditPolicy;
};

export const DEFAULT_PROPERTY_TENANT_POLICIES: PropertyTenantPolicies = {
  visibility: 'AGENT_OWN_ONLY',
  edit: 'CREATOR_OR_ASSIGNEE',
};

export const PROPERTY_VISIBILITY_LABELS: Record<PropertyVisibilityPolicy, string> = {
  AGENT_OWN_ONLY: 'Cada agente solo ve sus propiedades',
  AGENT_SEE_ALL: 'Los agentes pueden visualizar propiedades de otros agentes',
};

export const PROPERTY_EDIT_LABELS: Record<PropertyEditPolicy, string> = {
  CREATOR_ONLY: 'Solo puede editar el creador',
  CREATOR_OR_ASSIGNEE: 'Puede editar el creador o el responsable asignado',
};
