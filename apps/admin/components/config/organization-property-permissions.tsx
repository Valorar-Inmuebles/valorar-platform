"use client";

import { Card } from "@repo/ui/card";
import {
  PROPERTY_EDIT_LABELS,
  PROPERTY_VISIBILITY_LABELS,
  type PropertyEditPolicy,
  type PropertyVisibilityPolicy,
} from "@/lib/permissions";

type OrganizationPropertyPermissionsProps = {
  visibilityPolicy: PropertyVisibilityPolicy;
  editPolicy: PropertyEditPolicy;
  readOnly?: boolean;
  disabled?: boolean;
};

export function OrganizationPropertyPermissions({
  visibilityPolicy,
  editPolicy,
  readOnly = false,
  disabled = false,
}: OrganizationPropertyPermissionsProps) {
  const isDisabled = readOnly || disabled;

  return (
    <Card className="space-y-6 p-6">
      <div>
        <h2 className="text-sm font-semibold text-foreground">
          Permisos de propiedades
        </h2>
        <p className="mt-1 text-xs text-muted">
          Define cómo los agentes acceden al inventario. Managers y administradores siempre ven y editan todas las propiedades.
        </p>
      </div>

      <fieldset className="space-y-3" disabled={isDisabled}>
        <legend className="text-sm font-medium text-foreground">Visibilidad</legend>
        {(Object.entries(PROPERTY_VISIBILITY_LABELS) as [PropertyVisibilityPolicy, string][]).map(
          ([value, label]) => (
            <label key={value} className="flex cursor-pointer items-start gap-2 text-sm">
              <input
                type="radio"
                name="propertyVisibilityPolicy"
                value={value}
                defaultChecked={visibilityPolicy === value}
                className="mt-0.5"
              />
              <span>{label}</span>
            </label>
          ),
        )}
        <ul className="ml-6 list-disc space-y-1 text-xs text-muted">
          <li>Managers ven todas las propiedades.</li>
          <li>Administradores ven todas las propiedades.</li>
        </ul>
      </fieldset>

      <fieldset className="space-y-3" disabled={isDisabled}>
        <legend className="text-sm font-medium text-foreground">Edición</legend>
        {(Object.entries(PROPERTY_EDIT_LABELS) as [PropertyEditPolicy, string][]).map(
          ([value, label]) => (
            <label key={value} className="flex cursor-pointer items-start gap-2 text-sm">
              <input
                type="radio"
                name="propertyEditPolicy"
                value={value}
                defaultChecked={editPolicy === value}
                className="mt-0.5"
              />
              <span>{label}</span>
            </label>
          ),
        )}
        <ul className="ml-6 list-disc space-y-1 text-xs text-muted">
          <li>Managers pueden editar todas las propiedades.</li>
          <li>Administradores pueden editar todas las propiedades.</li>
        </ul>
      </fieldset>

      <p className="rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted">
        V2: acceso compartido por propiedad vía PropertyAgentAccess sin cambiar esta configuración base.
      </p>
    </Card>
  );
}
