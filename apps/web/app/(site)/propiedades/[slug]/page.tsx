import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteContainer } from "@/components/layout/site-container";
import { PropertyCharacteristics } from "@/components/property/property-characteristics";
import { PropertyDescription } from "@/components/property/property-description";
import { PropertyGallery } from "@/components/property/property-gallery";
import { PropertyHeader } from "@/components/property/property-header";
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
import { getPublicSiteConfig } from "@/lib/tenant/site-config";
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
  const site = getPublicSiteConfig();
  const contact = {
    whatsapp: site.whatsapp,
    email: site.email,
    phone: site.phone,
    siteUrl: site.siteUrl,
  };

  return (
    <>
      <PropertyJsonLd property={property} />
      <PropertyGallery images={property.gallery} title={property.title} />

      <SiteContainer className="pb-10 pt-4 md:pb-14 md:pt-5">
        <Breadcrumbs
          items={[
            { label: "Inicio", href: "/" },
            { label: "Propiedades", href: "/propiedades" },
            { label: property.title },
          ]}
        />

        <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-8">
          <div className="min-w-0">
            <ListingTypeSwitcher
              slug={property.slug}
              currentListingType={property.listingType}
              availableListingTypes={
                property.availableListingTypes ?? [property.listingType]
              }
              className="mb-3"
            />
            <PropertyHeader property={property} />

            <div className="mt-6 lg:hidden">
              <PropertyPriceCard property={property} contact={contact} />
            </div>

            <PropertyCharacteristics property={property} />
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
            <PropertyPriceCard property={property} contact={contact} />
          </div>
        </div>
      </SiteContainer>
    </>
  );
}
