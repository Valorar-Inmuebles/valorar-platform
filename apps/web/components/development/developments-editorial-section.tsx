import type { PublicDevelopmentCard } from "@repo/shared-types";
import { DevelopmentEditorialRow } from "@/components/development/development-editorial-row";
import { PropertyEmptyState } from "@/components/property/property-empty-state";
import { PropertyUnavailableState } from "@/components/property/property-unavailable-state";

type DevelopmentsEditorialSectionProps = {
  developments: PublicDevelopmentCard[];
  unavailable?: boolean;
  hasActiveFilters: boolean;
  total: number;
};

function buildSectionTitle(hasActiveFilters: boolean, total: number): string {
  if (!hasActiveFilters) {
    return "Emprendimientos disponibles";
  }

  return `Resultados (${total})`;
}

export function DevelopmentsEditorialSection({
  developments,
  unavailable = false,
  hasActiveFilters,
  total,
}: DevelopmentsEditorialSectionProps) {
  const title = buildSectionTitle(hasActiveFilters, total);

  return (
    <section>
      <h2 className="text-xl font-semibold tracking-tight text-foreground">
        {title}
      </h2>

      <div className="mt-6">
        {unavailable ? (
          <PropertyUnavailableState title="Emprendimientos temporalmente no disponibles" />
        ) : developments.length === 0 ? (
          <PropertyEmptyState
            title={
              hasActiveFilters
                ? "No encontramos emprendimientos con estos filtros"
                : "No hay emprendimientos disponibles"
            }
            description={
              hasActiveFilters
                ? "Probá ajustando los filtros o limpiá la búsqueda."
                : "Volvé a consultar más tarde para ver nuevos proyectos."
            }
          />
        ) : (
          <div>
            {developments.map((development) => (
              <DevelopmentEditorialRow
                key={development.id}
                development={development}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
