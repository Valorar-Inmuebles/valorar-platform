import Link from "next/link";
import type { PublicPropertyCard as PublicPropertyCardData } from "@repo/shared-types";
import { SiteContainer } from "@/components/layout/site-container";
import { PropertyEmptyState } from "@/components/property/property-empty-state";
import { PropertyGrid } from "@/components/property/property-grid";
import { PropertyUnavailableState } from "@/components/property/property-unavailable-state";
import { PublicPropertyCard } from "@/components/property/public-property-card";
import { PropertySectionHeader } from "./property-section-header";

type RecentPropertiesSectionProps = {
  properties: PublicPropertyCardData[];
  unavailable?: boolean;
};

export function RecentPropertiesSection({
  properties,
  unavailable = false,
}: RecentPropertiesSectionProps) {
  return (
    <section className="bg-slate-50 py-16 md:py-20">
      <SiteContainer>
        <PropertySectionHeader title="Propiedades recientes" href="/propiedades" />

        {unavailable ? (
          <PropertyUnavailableState title="Propiedades recientes temporalmente no disponibles" />
        ) : properties.length === 0 ? (
          <PropertyEmptyState />
        ) : (
          <>
            <PropertyGrid columns="recent">
              {properties.map((property) => (
                <PublicPropertyCard key={property.id} property={property} />
              ))}
            </PropertyGrid>

            <div className="mt-10 flex justify-center">
              <Link
                href="/propiedades"
                className="inline-flex h-12 items-center justify-center rounded-xl border border-primary bg-white px-8 text-sm font-semibold text-primary transition hover:bg-primary hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Ver más propiedades
              </Link>
            </div>
          </>
        )}
      </SiteContainer>
    </section>
  );
}
