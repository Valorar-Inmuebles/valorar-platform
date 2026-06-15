import type { PublicPropertyCard as PublicPropertyCardData } from "@repo/shared-types";
import { PropertyGrid } from "./property-grid";
import { PublicPropertyCard } from "./public-property-card";

type RelatedPropertiesSectionProps = {
  properties: PublicPropertyCardData[];
};

export function RelatedPropertiesSection({
  properties,
}: RelatedPropertiesSectionProps) {
  if (properties.length === 0) {
    return null;
  }

  return (
    <section className="mt-16 border-t border-border pt-12">
      <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
        Propiedades similares
      </h2>
      <p className="mt-2 text-sm text-muted">
        Otras opciones en la misma zona y categoría.
      </p>

      <div className="mt-8">
        <PropertyGrid columns="featured">
          {properties.map((property) => (
            <PublicPropertyCard key={property.id} property={property} />
          ))}
        </PropertyGrid>
      </div>
    </section>
  );
}
