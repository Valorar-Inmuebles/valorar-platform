import type { PublicationCheckKey } from "@repo/property-rules";

export type PublicationCtaGroupId = "general" | "images" | "listings";

export type PublicationCtaGroup = {
  id: PublicationCtaGroupId;
  label: string;
  keys: PublicationCheckKey[];
  href: (propertyId: string, listingId?: string) => string;
};

export const PUBLICATION_CTA_GROUPS: PublicationCtaGroup[] = [
  {
    id: "general",
    label: "Ir a Datos generales",
    keys: ["property-active"],
    href: (propertyId) => `/propiedades/${propertyId}`,
  },
  {
    id: "images",
    label: "Ir a Imágenes",
    keys: ["has-image", "cover-image"],
    href: (propertyId) => `/propiedades/${propertyId}/imagenes`,
  },
  {
    id: "listings",
    label: "Ir a Publicaciones",
    keys: ["listing-active", "primary-price"],
    href: (propertyId, listingId) =>
      listingId
        ? `/propiedades/${propertyId}/publicaciones/${listingId}`
        : `/propiedades/${propertyId}/publicaciones`,
  },
];

export function resolvePublicationCheckHref(
  key: PublicationCheckKey,
  propertyId: string,
  listingId?: string,
): string | undefined {
  switch (key) {
    case "property-active":
      return `/propiedades/${propertyId}`;
    case "has-image":
    case "cover-image":
      return `/propiedades/${propertyId}/imagenes`;
    case "listing-active":
      return listingId
        ? `/propiedades/${propertyId}/publicaciones/${listingId}`
        : `/propiedades/${propertyId}/publicaciones`;
    case "primary-price":
      return listingId
        ? `/propiedades/${propertyId}/publicaciones/${listingId}/precios`
        : `/propiedades/${propertyId}/publicaciones`;
    default:
      return undefined;
  }
}

export function getPublicationCtaGroupsForMissing(
  missing: PublicationCheckKey[],
  propertyId: string,
  listingId?: string,
): Array<{ id: PublicationCtaGroupId; label: string; href: string }> {
  const groups: Array<{
    id: PublicationCtaGroupId;
    label: string;
    href: string;
  }> = [];

  for (const group of PUBLICATION_CTA_GROUPS) {
    if (!group.keys.some((key) => missing.includes(key))) {
      continue;
    }

    groups.push({
      id: group.id,
      label: group.label,
      href: group.href(propertyId, listingId),
    });
  }

  return groups;
}
