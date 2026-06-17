import type { BreadcrumbItem } from "@/components/layout/PageHeader";

export const DEMO_PROPERTY_ID = "demo-property";

export function getMockPropertyTitle(propertyId: string): string {
  if (propertyId === DEMO_PROPERTY_ID) {
    return "Departamento en Palermo";
  }
  return `Propiedad ${propertyId.slice(0, 8)}`;
}

export function getMockListingLabel(listingId: string): string {
  if (listingId === "demo-listing") {
    return "Venta";
  }
  return "Publicación";
}

export function propertyListBreadcrumbs(): BreadcrumbItem[] {
  return [
    { label: "Inicio", href: "/" },
    { label: "Propiedades" },
  ];
}

export function propertyCreateBreadcrumbs(): BreadcrumbItem[] {
  return [
    { label: "Inicio", href: "/" },
    { label: "Propiedades", href: "/propiedades" },
    { label: "Nueva propiedad" },
  ];
}

export function propertyDetailBreadcrumbs(
  propertyId: string,
  propertyTitle: string,
): BreadcrumbItem[] {
  return [
    { label: "Inicio", href: "/" },
    { label: "Propiedades", href: "/propiedades" },
    {
      label: propertyTitle,
      href: `/propiedades/${propertyId}`,
    },
  ];
}

export function propertyGeneralBreadcrumbs(
  propertyId: string,
  propertyTitle: string,
): BreadcrumbItem[] {
  return [
    { label: "Inicio", href: "/" },
    { label: "Propiedades", href: "/propiedades" },
    { label: propertyTitle },
  ];
}

export function propertyPublicacionesBreadcrumbs(
  propertyId: string,
  propertyTitle: string,
): BreadcrumbItem[] {
  return [
    ...propertyDetailBreadcrumbs(propertyId, propertyTitle),
    { label: "Publicaciones" },
  ];
}

export function propertyListingCreateBreadcrumbs(
  propertyId: string,
  propertyTitle: string,
): BreadcrumbItem[] {
  return [
    ...propertyDetailBreadcrumbs(propertyId, propertyTitle),
    {
      label: "Publicaciones",
      href: `/propiedades/${propertyId}/publicaciones`,
    },
    { label: "Nueva publicación" },
  ];
}

export function propertyListingEditBreadcrumbs(
  propertyId: string,
  propertyTitle: string,
  listingLabel: string,
): BreadcrumbItem[] {
  return [
    ...propertyDetailBreadcrumbs(propertyId, propertyTitle),
    {
      label: "Publicaciones",
      href: `/propiedades/${propertyId}/publicaciones`,
    },
    { label: listingLabel },
  ];
}

export function propertyImagenesBreadcrumbs(
  propertyId: string,
  propertyTitle: string,
): BreadcrumbItem[] {
  return [
    ...propertyDetailBreadcrumbs(propertyId, propertyTitle),
    { label: "Imágenes" },
  ];
}

export function propertyCaracteristicasBreadcrumbs(
  propertyId: string,
  propertyTitle: string,
): BreadcrumbItem[] {
  return [
    ...propertyDetailBreadcrumbs(propertyId, propertyTitle),
    { label: "Características" },
  ];
}

export function propertyPreciosBreadcrumbs(
  propertyId: string,
  propertyTitle: string,
  listingId: string,
  listingLabel: string,
): BreadcrumbItem[] {
  return [
    ...propertyDetailBreadcrumbs(propertyId, propertyTitle),
    {
      label: "Publicaciones",
      href: `/propiedades/${propertyId}/publicaciones`,
    },
    {
      label: listingLabel,
      href: `/propiedades/${propertyId}/publicaciones/${listingId}`,
    },
    { label: "Precios" },
  ];
}
