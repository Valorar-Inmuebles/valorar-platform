import type { Permission, PlatformRole } from "@/lib/permissions";

export type AuthUserRole = PlatformRole;

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  avatarUrl?: string | null;
  role: AuthUserRole;
  tenantId: string | null;
  lastLoginAt?: string | null;
  permissions: Permission[];
};

export type AdminSession = {
  user: AuthUser;
};

export function sessionHasPermission(
  user: AuthUser,
  permission: Permission,
): boolean {
  return user.permissions.includes(permission);
}

export function sessionHasAnyPermission(
  user: AuthUser,
  permissions: Permission[],
): boolean {
  return permissions.some((permission) => sessionHasPermission(user, permission));
}
