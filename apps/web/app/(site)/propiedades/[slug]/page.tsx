import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteContainer } from "@/components/layout/site-container";
import { PropertyDescription } from "@/components/property/property-description";
import { PropertyFeatures } from "@/components/property/property-features";
import { PropertyGallery } from "@/components/property/property-gallery";
import { PropertyHeader } from "@/components/property/property-header";
import { PropertyTechnicalSheet } from "@/components/property/property-technical-sheet";
import { ListingTypeSwitcher } from "@/components/property/listing-type-switcher";
import { PropertyMapPlaceholder } from "@/components/property/property-map-placeholder";
import { PropertyPriceCard } from "@/components/property/property-price-card";
import { RelatedPropertiesSection } from "@/components/property/related-properties-section";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { PropertyJsonLd } from "@/components/seo/property-json-ld";
import {
  getPropertyBySlug,
  getRelatedProperties,
} from "@/lib/api/public-property";
import { getListingTypeLabel } from "@/lib/format/labels";
import { createPageMetadata } from "@/lib/seo/metadata";
import type { PropertyListingType } from "@repo/shared-types";

type PropertyDetailPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function parseListingType(
  value: string | string[] | undefined,
): PropertyListingType | undefined {
  const raw = Array.isArray(value) ? value[0] : value;

  if (raw === "SALE" || raw === "RENT" || raw === "TEMPORARY_RENT") {
    return raw;
  }

  return undefined;
}

function buildPropertyTitle(property: NonNullable<Awaited<ReturnType<typeof getPropertyBySlug>>>) {
  const location = property.neighborhood ?? property.city;

  return `${property.title} — ${getListingTypeLabel(property.listingType)} en ${location}`;
}

export async function generateMetadata({
  params,
  searchParams,
}: PropertyDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const query = await searchParams;
  const listingType = parseListingType(query.listingType);
  const property = await getPropertyBySlug(slug, listingType);

  if (!property) {
    return {
      title: "Propiedad no encontrada",
      robots: { index: false, follow: false },
    };
  }

  const title = buildPropertyTitle(property);
  const description =
    property.description?.trim().slice(0, 160) ??
    `${getListingTypeLabel(property.listingType)} en ${property.city}.`;
  const canonicalPath = `/propiedades/${property.slug}`;

  return createPageMetadata({
    title,
    description,
    path: canonicalPath,
    openGraph: {
      images: property.coverImage.url
        ? [
            {
              url: property.coverImage.url,
              alt: property.coverImage.altText ?? property.title,
            },
          ]
        : undefined,
    },
  });
}

export const revalidate = 300;

export default async function PropertyDetailPage({
  params,
  searchParams,
}: PropertyDetailPageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const listingType = parseListingType(query.listingType);
  const property = await getPropertyBySlug(slug, listingType);

  if (!property) {
    notFound();
  }

  const relatedProperties = await getRelatedProperties(property);

  return (
    <>
      <PropertyJsonLd property={property} />
      <PropertyGallery images={property.gallery} title={property.title} />

      <SiteContainer className="py-10 md:py-14">
        <Breadcrumbs
          items={[
            { label: "Inicio", href: "/" },
            { label: "Propiedades", href: "/propiedades" },
            { label: property.title },
          ]}
        />

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
          <div className="min-w-0">
            <ListingTypeSwitcher
              slug={property.slug}
              currentListingType={property.listingType}
              availableListingTypes={
                property.availableListingTypes ?? [property.listingType]
              }
              className="mb-4"
            />
            <PropertyHeader property={property} />

            <div className="mt-8 lg:hidden">
              <PropertyPriceCard property={property} />
            </div>

            <PropertyTechnicalSheet property={property} />
            <PropertyFeatures features={property.features} />
            <PropertyDescription description={property.description} />
            <PropertyMapPlaceholder
              city={property.city}
              neighborhood={property.neighborhood}
              latitude={property.latitude}
              longitude={property.longitude}
            />
            <RelatedPropertiesSection properties={relatedProperties} />
          </div>

          <div className="hidden lg:block">
            <PropertyPriceCard property={property} />
          </div>
        </div>
      </SiteContainer>
    </>
  );
}
