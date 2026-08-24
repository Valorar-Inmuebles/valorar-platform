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
  const title = unavailable
    ? null
    : buildSectionTitle(hasActiveFilters, total);

  return (
    <section>
      {title ? (
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          {title}
        </h2>
      ) : null}

      <div className={title ? "mt-6" : undefined}>
        {unavailable ? (
          <PropertyUnavailableState
            title="Emprendimientos temporalmente no disponibles"
            description="No pudimos cargar los emprendimientos en este momento. Intentá nuevamente en unos minutos."
          />
        ) : developments.length === 0 ? (
          <PropertyEmptyState
            title={
              hasActiveFilters
                ? "No encontramos emprendimientos"
                : "No hay emprendimientos disponibles"
            }
            description={
              hasActiveFilters
                ? "Probá con otro barrio o modificá los filtros seleccionados."
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
