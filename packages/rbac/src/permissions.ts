/** Platform permission keys — V1 fixed; V2 will load from DB. */
export const PERMISSIONS = [
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
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export function isPermission(value: string): value is Permission {
  return (PERMISSIONS as readonly string[]).includes(value);
}
