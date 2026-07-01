import type { Permission } from './permissions';

/** Human-readable permission labels for admin UI (Spanish). */
export const PERMISSION_LABELS: Record<Permission, string> = {
  'property.read': 'Ver propiedades',
  'property.create': 'Crear propiedades',
  'property.update.own': 'Editar propiedades propias',
  'property.update.any': 'Editar cualquier propiedad',
  'property.delete': 'Eliminar propiedades',
  'property.publish': 'Publicar propiedades',
  'listing.manage': 'Administrar comercialización',
  'user.read': 'Ver usuarios',
  'user.create': 'Crear usuarios',
  'user.update': 'Editar usuarios',
  'organization.update': 'Editar organización',
  'dashboard.view': 'Ver dashboard',
};

export function getPermissionLabel(permission: Permission): string {
  return PERMISSION_LABELS[permission] ?? permission;
}
