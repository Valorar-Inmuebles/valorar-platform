import { PropertyEmptyState } from "@/components/property/property-empty-state";

export function SuperAdminTenantEmptyState() {
  return (
    <PropertyEmptyState
      title="Seleccioná una inmobiliaria"
      description="Como SUPER_ADMIN, elegí una inmobiliaria desde el selector superior para comenzar a administrar sus propiedades."
    />
  );
}
