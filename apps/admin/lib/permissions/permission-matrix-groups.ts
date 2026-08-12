import type { Permission } from "@/lib/permissions";
import { PERMISSIONS } from "@/lib/permissions";

/**
 * Presentation-only grouping for the roles comparison matrix.
 * Must not define authorization — cells use hasPermission / ROLE_PERMISSIONS.
 */
export const PERMISSION_MATRIX_GROUPS: ReadonlyArray<{
  label: string;
  permissions: readonly Permission[];
}> = [
  {
    label: "Propiedades",
    permissions: [
      "property.read",
      "property.create",
      "property.update.own",
      "property.update.any",
      "property.delete",
      "property.publish",
    ],
  },
  {
    label: "Comercialización",
    permissions: ["listing.manage"],
  },
  {
    label: "Emprendimientos",
    permissions: [
      "development.read",
      "development.create",
      "development.update",
      "development.delete",
    ],
  },
  {
    label: "Usuarios",
    permissions: ["user.read", "user.create", "user.update"],
  },
  {
    label: "Configuración",
    permissions: ["organization.update"],
  },
  {
    label: "Dashboard",
    permissions: ["dashboard.view"],
  },
];

export function listMatrixPermissions(): Permission[] {
  return PERMISSION_MATRIX_GROUPS.flatMap((group) => [...group.permissions]);
}

/** Ensures every registered permission appears exactly once in the matrix. */
export function assertMatrixCoversAllPermissions(): {
  missing: Permission[];
  duplicates: Permission[];
  extra: string[];
} {
  const listed = listMatrixPermissions();
  const seen = new Set<string>();
  const duplicates: Permission[] = [];

  for (const permission of listed) {
    if (seen.has(permission)) {
      duplicates.push(permission);
    }
    seen.add(permission);
  }

  const missing = PERMISSIONS.filter((permission) => !seen.has(permission));
  const catalog = new Set<string>(PERMISSIONS);
  const extra = listed.filter((permission) => !catalog.has(permission));

  return { missing, duplicates, extra };
}
