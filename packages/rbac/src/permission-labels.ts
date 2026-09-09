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
  'development.read': 'Ver emprendimientos',
  'development.create': 'Crear emprendimientos',
  'development.update': 'Editar emprendimientos',
  'development.delete': 'Eliminar emprendimientos',
  'user.read': 'Ver usuarios',
  'user.create': 'Crear usuarios',
  'user.update': 'Editar usuarios',
  'organization.update': 'Editar organización',
  'dashboard.view': 'Ver dashboard',
  'rental.read': 'Ver gestión de alquileres',
  'rental.contract.create': 'Crear contratos de alquiler',
  'rental.contract.update': 'Editar contratos de alquiler',
  'rental.contract.end': 'Finalizar o cancelar contratos de alquiler',
  'rental.contact.manage': 'Administrar contactos de alquileres',
  'rental.obligation.manage': 'Administrar obligaciones y vencimientos',
  'rental.fulfillment.manage': 'Registrar cumplimientos de alquileres',
};

export function getPermissionLabel(permission: Permission): string {
  return PERMISSION_LABELS[permission] ?? permission;
}
