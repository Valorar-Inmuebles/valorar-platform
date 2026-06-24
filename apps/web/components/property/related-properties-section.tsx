import type { PublicPropertyCard as PublicPropertyCardData } from "@repo/shared-types";
import { PropertyGrid } from "./property-grid";
import { PublicPropertyCard } from "./public-property-card";
import { PropertyDetailSection } from "./property-detail-section";

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
    <PropertyDetailSection
      title="Propiedades similares"
      description="Otras opciones en la misma zona y categoría."
      className="mt-16 border-t border-border-default pt-12"
    >
      <PropertyGrid columns="featured">
        {properties.map((property) => (
          <PublicPropertyCard key={property.id} property={property} />
        ))}
      </PropertyGrid>
    </PropertyDetailSection>
  );
}
