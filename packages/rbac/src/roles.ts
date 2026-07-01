import type { Permission } from './permissions';

/** V1 platform roles — matches Prisma UserRole enum. */
export type PlatformRole =
  | 'SUPER_ADMIN'
  | 'TENANT_ADMIN'
  | 'MANAGER'
  | 'AGENT'
  | 'COLLABORATOR';

export const PLATFORM_ROLES: PlatformRole[] = [
  'SUPER_ADMIN',
  'TENANT_ADMIN',
  'MANAGER',
  'AGENT',
  'COLLABORATOR',
];

export const ROLE_LABELS: Record<PlatformRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  TENANT_ADMIN: 'Administrador',
  MANAGER: 'Manager',
  AGENT: 'Agente',
  COLLABORATOR: 'Colaborador',
};

export const ROLE_DESCRIPTIONS: Record<PlatformRole, string> = {
  SUPER_ADMIN: 'Acceso global a todos los tenants de la plataforma.',
  TENANT_ADMIN: 'Administración completa de la inmobiliaria.',
  MANAGER: 'Gestión operativa de propiedades y equipo (sin configuración crítica).',
  AGENT: 'Operación sobre propiedades asignadas y propias.',
  COLLABORATOR: 'Consulta de propiedades asignadas; sin edición.',
};

/**
 * V1 fixed role → permission map.
 * V2: replace with DB-driven RolePermission assignments.
 */
export const ROLE_PERMISSIONS: Record<PlatformRole, readonly Permission[]> = {
  SUPER_ADMIN: [
    'property.read',
    'property.create',
    'property.update.own',
    'property.update.any',
    'property.delete',
    'property.publish',
    'listing.manage',
    'user.read',
    'user.create',
    'user.update',
    'organization.update',
    'dashboard.view',
  ],
  TENANT_ADMIN: [
    'property.read',
    'property.create',
    'property.update.own',
    'property.update.any',
    'property.delete',
    'property.publish',
    'listing.manage',
    'user.read',
    'user.create',
    'user.update',
    'organization.update',
    'dashboard.view',
  ],
  MANAGER: [
    'property.read',
    'property.create',
    'property.update.own',
    'property.update.any',
    'property.delete',
    'property.publish',
    'listing.manage',
    'user.read',
    'dashboard.view',
  ],
  AGENT: [
    'property.read',
    'property.create',
    'property.update.own',
    'property.publish',
    'listing.manage',
    'dashboard.view',
  ],
  COLLABORATOR: ['property.read', 'dashboard.view'],
};

export function getPermissionsForRole(role: PlatformRole): readonly Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function hasPermission(role: PlatformRole, permission: Permission): boolean {
  return getPermissionsForRole(role).includes(permission);
}

export function hasAnyPermission(
  role: PlatformRole,
  permissions: readonly Permission[],
): boolean {
  return permissions.some((permission) => hasPermission(role, permission));
}

export function hasAllPermissions(
  role: PlatformRole,
  permissions: readonly Permission[],
): boolean {
  return permissions.every((permission) => hasPermission(role, permission));
}
