import { UserRole } from '../../../../generated/prisma/client';

export function buildFullName(firstName: string, lastName: string): string {
  return `${firstName.trim()} ${lastName.trim()}`.trim();
}

export function splitLegacyName(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return { firstName: 'Usuario', lastName: '' };
  }

  if (parts.length === 1) {
    return { firstName: parts[0]!, lastName: '' };
  }

  return {
    firstName: parts[0]!,
    lastName: parts.slice(1).join(' '),
  };
}

export const ASSIGNABLE_ROLES: UserRole[] = [
  UserRole.TENANT_ADMIN,
  UserRole.MANAGER,
  UserRole.AGENT,
  UserRole.COLLABORATOR,
];

export function isAssignableRole(role: UserRole, actorRole: UserRole): boolean {
  if (actorRole === UserRole.SUPER_ADMIN) {
    return ASSIGNABLE_ROLES.includes(role) || role === UserRole.SUPER_ADMIN;
  }

  if (actorRole === UserRole.TENANT_ADMIN) {
    return ASSIGNABLE_ROLES.includes(role);
  }

  return false;
}
