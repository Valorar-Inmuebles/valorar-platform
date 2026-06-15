import type { PublicPropertyCard as PublicPropertyCardData } from "@repo/shared-types";
import { SiteContainer } from "@/components/layout/site-container";
import { PropertyEmptyState } from "@/components/property/property-empty-state";
import { PropertyGrid } from "@/components/property/property-grid";
import { PublicPropertyCard } from "@/components/property/public-property-card";
import { PropertySectionHeader } from "./property-section-header";

type FeaturedPropertiesSectionProps = {
  properties: PublicPropertyCardData[];
};

export function FeaturedPropertiesSection({
  properties,
}: FeaturedPropertiesSectionProps) {
  return (
    <section className="py-16 md:py-20">
      <SiteContainer>
        <PropertySectionHeader title="Propiedades destacadas" href="/propiedades" />

        {properties.length === 0 ? (
          <PropertyEmptyState
            title="Aún no hay propiedades destacadas"
            description="Pronto publicaremos nuevas oportunidades seleccionadas para vos."
          />
        ) : (
          <PropertyGrid columns="featured">
            {properties.map((property) => (
              <PublicPropertyCard key={property.id} property={property} />
            ))}
          </PropertyGrid>
        )}
      </SiteContainer>
    </section>
  );
}
