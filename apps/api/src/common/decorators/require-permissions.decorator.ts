import { SetMetadata } from '@nestjs/common';
import type { Permission } from '@repo/rbac';

export const PERMISSIONS_KEY = 'permissions';
export const PERMISSIONS_MODE_KEY = 'permissions_mode';

export type PermissionsMode = 'all' | 'any';

export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

export const RequireAnyPermission = (...permissions: Permission[]) => {
  return (
    target: object,
    key?: string | symbol,
    descriptor?: PropertyDescriptor,
  ) => {
    RequirePermissions(...permissions)(target, key!, descriptor!);
    SetMetadata(PERMISSIONS_MODE_KEY, 'any')(target, key!, descriptor!);
  };
};
