import { Card } from "@repo/ui/card";
import { Badge } from "@repo/ui/badge";
import {
  PLATFORM_ROLES,
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
  ROLE_PERMISSIONS,
} from "@/lib/permissions";

export function RolesOverview() {
  return (
    <div className="space-y-4">
      <Card className="border-dashed p-4 text-sm text-muted">
        Roles predefinidos en V1. La edición personalizada de roles estará disponible en V2.
      </Card>

      <div className="grid gap-4">
        {PLATFORM_ROLES.map((role) => (
          <Card key={role} className="p-5">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-foreground">
                {ROLE_LABELS[role]}
              </h3>
              <Badge variant="neutral">{role}</Badge>
            </div>
            <p className="mb-4 text-sm text-muted">{ROLE_DESCRIPTIONS[role]}</p>
            <div className="flex flex-wrap gap-2">
              {ROLE_PERMISSIONS[role].map((permission) => (
                <Badge key={permission} variant="info">
                  {permission}
                </Badge>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
