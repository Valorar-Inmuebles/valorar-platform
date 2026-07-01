import type { Permission } from './permissions';
import { hasPermission } from './roles';
import type { PlatformRole } from './roles';
import type { PropertyTenantPolicies } from './property-policies';
import { roleViewsAllProperties } from './roles';

export type PropertyAccessContext = {
  userId: string;
  role: PlatformRole;
  createdById: string;
  assignedToId: string | null;
  tenantPolicies: PropertyTenantPolicies;
  sharedCanView?: boolean;
  sharedCanEdit?: boolean;
};

/** Whether the user can see a property in list/detail. */
export function canViewProperty(ctx: PropertyAccessContext): boolean {
  if (roleViewsAllProperties(ctx.role)) {
    return true;
  }

  if (ctx.tenantPolicies.visibility === 'AGENT_SEE_ALL') {
    return true;
  }

  if (ctx.sharedCanView) {
    return true;
  }

  if (ctx.createdById === ctx.userId) {
    return true;
  }

  if (ctx.assignedToId === ctx.userId) {
    return true;
  }

  return false;
}

/** Whether the user can mutate a property (update/delete/publish). */
export function canEditProperty(ctx: PropertyAccessContext): boolean {
  if (ctx.role === 'COLLABORATOR') {
    return false;
  }

  if (hasPermission(ctx.role, 'property.update.any')) {
    return true;
  }

  if (!hasPermission(ctx.role, 'property.update.own')) {
    return false;
  }

  const isCreator = ctx.createdById === ctx.userId;
  const isAssignee = ctx.assignedToId === ctx.userId;

  if (ctx.tenantPolicies.edit === 'CREATOR_ONLY') {
    if (ctx.sharedCanEdit) {
      return true;
    }
    return isCreator;
  }

  if (ctx.sharedCanEdit) {
    return true;
  }

  return isCreator || isAssignee;
}

/** Whether list queries should scope to own/shared properties only. */
export function shouldScopePropertyList(
  role: PlatformRole,
  policies: PropertyTenantPolicies,
): boolean {
  if (roleViewsAllProperties(role)) {
    return false;
  }

  return policies.visibility === 'AGENT_OWN_ONLY';
}
