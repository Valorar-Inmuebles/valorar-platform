import type { PublicPropertyDetail } from "@repo/shared-types";
import { JsonLd } from "@/components/seo/json-ld";
import { getSiteConfig } from "@/config/site";
import { getListingTypeLabel } from "@/lib/format/labels";

type PropertyJsonLdProps = {
  property: PublicPropertyDetail;
};

export function PropertyJsonLd({ property }: PropertyJsonLdProps) {
  const site = getSiteConfig();
  const url = `${site.siteUrl}/propiedades/${property.slug}`;
  const description =
    property.description?.trim() ??
    `${getListingTypeLabel(property.listingType)} en ${property.city}.`;

  const address: Record<string, string> = {
    "@type": "PostalAddress",
    addressCountry: property.country,
    addressLocality: property.city,
  };

  if (property.province) {
    address.addressRegion = property.province;
  }

  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: property.title,
    description,
    url,
    address,
    offers: {
      "@type": "Offer",
      price: property.price.amount,
      priceCurrency: property.price.currency,
    },
  };

  if (property.coverImage.url) {
    data.image = property.coverImage.url;
  }

  if (property.latitude != null && property.longitude != null) {
    data.geo = {
      "@type": "GeoCoordinates",
      latitude: property.latitude,
      longitude: property.longitude,
    };
  }

  if (property.bedrooms != null) {
    data.numberOfBedrooms = property.bedrooms;
  }

  if (property.bathrooms != null) {
    data.numberOfBathroomsTotal = property.bathrooms;
  }

  if (property.totalArea != null) {
    data.floorSize = {
      "@type": "QuantitativeValue",
      value: property.totalArea,
      unitCode: "MTK",
    };
  }

  return <JsonLd data={data} />;
}
