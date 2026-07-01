import type { PlatformRole } from './roles';
import { hasPermission } from './roles';

export type PropertyAccessContext = {
  userId: string;
  role: PlatformRole;
  createdById: string;
  assignedToId: string | null;
  sharedCanView?: boolean;
  sharedCanEdit?: boolean;
};

/** Whether the user can see a property in list/detail. */
export function canViewProperty(ctx: PropertyAccessContext): boolean {
  if (ctx.role === 'SUPER_ADMIN' || ctx.role === 'TENANT_ADMIN' || ctx.role === 'MANAGER') {
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

  if (ctx.sharedCanEdit) {
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
