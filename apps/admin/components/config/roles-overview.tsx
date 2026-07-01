"use client";

import { Card } from "@repo/ui/card";
import { Badge } from "@repo/ui/badge";
import {
  getPermissionLabel,
  getVisibleRoles,
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
  ROLE_PERMISSIONS,
  type PlatformRole,
} from "@/lib/permissions";

type RolesOverviewProps = {
  viewerRole: PlatformRole;
};

function getRolesIntro(viewerRole: PlatformRole): string {
  if (viewerRole === "SUPER_ADMIN") {
    return "Roles del sistema. En V1 la matriz es fija; la edición personalizada estará disponible en V2.";
  }

  return "Roles disponibles para esta inmobiliaria. Los permisos son predefinidos en V1.";
}

export function RolesOverview({ viewerRole }: RolesOverviewProps) {
  const visibleRoles = getVisibleRoles(viewerRole);
  const showTechnicalRoleId = viewerRole === "SUPER_ADMIN";

  return (
    <div className="space-y-4">
      <Card className="border-dashed p-4 text-sm text-muted">
        {getRolesIntro(viewerRole)}
      </Card>

      <div className="grid gap-4">
        {visibleRoles.map((role) => (
          <Card key={role} className="p-5">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-foreground">
                {ROLE_LABELS[role]}
              </h3>
              {showTechnicalRoleId ? (
                <Badge variant="neutral">{role}</Badge>
              ) : null}
            </div>
            <p className="mb-4 text-sm text-muted">{ROLE_DESCRIPTIONS[role]}</p>
            <div className="flex flex-wrap gap-2">
              {ROLE_PERMISSIONS[role].map((permission) => (
                <Badge key={permission} variant="info">
                  {getPermissionLabel(permission)}
                </Badge>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
