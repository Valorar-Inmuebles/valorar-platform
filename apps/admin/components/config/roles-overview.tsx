"use client";

import { Badge } from "@repo/ui/badge";
import { Card } from "@repo/ui/card";
import {
  getPermissionLabel,
  hasPermission,
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
  ROLE_PERMISSIONS,
  TENANT_ROLES,
  type Permission,
  type PlatformRole,
} from "@/lib/permissions";
import { PERMISSION_MATRIX_GROUPS } from "@/lib/permissions/permission-matrix-groups";

type RolesOverviewProps = {
  viewerRole: PlatformRole;
};

function PermissionGrantedIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
      aria-hidden
    >
      <circle cx="8" cy="8" r="6.25" />
      <polyline points="5,8.5 7,10.5 11,6" />
    </svg>
  );
}

function PermissionDeniedIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
      aria-hidden
    >
      <circle cx="8" cy="8" r="6.25" />
      <path d="m5.5 5.5 5 5M10.5 5.5l-5 5" />
    </svg>
  );
}

function PermissionCell({
  role,
  permission,
}: {
  role: PlatformRole;
  permission: Permission;
}) {
  const granted = hasPermission(role, permission);
  const label = granted ? "Concedido" : "No concedido";
  const roleLabel = ROLE_LABELS[role];
  const permissionLabel = getPermissionLabel(permission);

  return (
    <td className="border-b border-border px-3 py-2.5 text-center align-middle">
      <span
        className={
          granted
            ? "inline-flex text-green-700"
            : "inline-flex text-red-600/70"
        }
        title={label}
        aria-label={`${permissionLabel} — ${roleLabel}: ${label}`}
        role="img"
      >
        {granted ? <PermissionGrantedIcon /> : <PermissionDeniedIcon />}
      </span>
    </td>
  );
}

function PermissionGroupRows({
  group,
}: {
  group: (typeof PERMISSION_MATRIX_GROUPS)[number];
}) {
  return (
    <>
      <tr className="bg-surface-alt/70">
        <th
          scope="colgroup"
          colSpan={1 + TENANT_ROLES.length}
          className="sticky left-0 z-10 bg-surface-alt/95 px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted"
        >
          {group.label}
        </th>
      </tr>
      {group.permissions.map((permission) => (
        <tr key={permission} className="hover:bg-zinc-50/80">
          <th
            scope="row"
            className="sticky left-0 z-10 max-w-[14rem] border-r border-border bg-white px-4 py-2.5 text-left font-medium text-foreground"
            title={permission}
          >
            <span className="block truncate">
              {getPermissionLabel(permission)}
            </span>
          </th>
          {TENANT_ROLES.map((role) => (
            <PermissionCell
              key={role}
              role={role}
              permission={permission}
            />
          ))}
        </tr>
      ))}
    </>
  );
}

export function RolesOverview({ viewerRole }: RolesOverviewProps) {
  const showPlatformSection = viewerRole === "SUPER_ADMIN";

  return (
    <div className="space-y-4">
      <Card className="border-dashed p-4 text-sm text-muted">
        Matriz comparativa de solo lectura. Los permisos son predefinidos en V1
        y no se editan desde esta pantalla.
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="max-h-[min(70vh,40rem)] overflow-auto">
          <table className="min-w-[44rem] w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border">
                <th
                  scope="col"
                  className="sticky left-0 top-0 z-30 border-r border-border bg-surface-alt px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted"
                >
                  Permiso
                </th>
                {TENANT_ROLES.map((role) => (
                  <th
                    key={role}
                    scope="col"
                    className="sticky top-0 z-20 min-w-[7.5rem] bg-surface-alt px-3 py-3 text-center text-xs font-medium uppercase tracking-wide text-muted"
                  >
                    <span className="block normal-case tracking-normal text-foreground">
                      {ROLE_LABELS[role]}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSION_MATRIX_GROUPS.map((group) => (
                <PermissionGroupRows key={group.label} group={group} />
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {showPlatformSection ? (
        <Card className="space-y-3 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-foreground">
              {ROLE_LABELS.SUPER_ADMIN}
            </h3>
            <Badge variant="warning">Plataforma</Badge>
          </div>
          <p className="text-sm text-muted">
            Rol de plataforma. No puede asignarse ni administrarse desde una
            inmobiliaria.
          </p>
          <p className="text-sm text-muted">{ROLE_DESCRIPTIONS.SUPER_ADMIN}</p>
          <div className="flex flex-wrap gap-2">
            {ROLE_PERMISSIONS.SUPER_ADMIN.map((permission) => (
              <Badge key={permission} variant="neutral" title={permission}>
                {getPermissionLabel(permission)}
              </Badge>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
