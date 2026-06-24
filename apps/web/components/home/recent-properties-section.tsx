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
    <section className="bg-surface-alt py-16 md:py-20">
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
                className="inline-flex h-12 items-center justify-center rounded-xl border border-brand-green bg-brand-green px-8 text-sm font-semibold text-white transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green"
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
