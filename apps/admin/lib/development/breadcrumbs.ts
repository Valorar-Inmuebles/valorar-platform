import type { BreadcrumbItem } from "@/components/layout/PageHeader";

export function developmentListBreadcrumbs(): BreadcrumbItem[] {
  return [
    { label: "Inicio", href: "/" },
    { label: "Emprendimientos" },
  ];
}

export function developmentCreateBreadcrumbs(): BreadcrumbItem[] {
  return [
    { label: "Inicio", href: "/" },
    { label: "Emprendimientos", href: "/emprendimientos" },
    { label: "Nuevo emprendimiento" },
  ];
}

export function developmentDetailBreadcrumbs(
  developmentId: string,
  developmentTitle: string,
): BreadcrumbItem[] {
  return [
    { label: "Inicio", href: "/" },
    { label: "Emprendimientos", href: "/emprendimientos" },
    {
      label: developmentTitle,
      href: `/emprendimientos/${developmentId}`,
    },
  ];
}

export function developmentComercializacionBreadcrumbs(
  developmentId: string,
  developmentTitle: string,
): BreadcrumbItem[] {
  return [
    ...developmentDetailBreadcrumbs(developmentId, developmentTitle),
    { label: "Comercialización" },
  ];
}

export function developmentImagenesBreadcrumbs(
  developmentId: string,
  developmentTitle: string,
): BreadcrumbItem[] {
  return [
    ...developmentDetailBreadcrumbs(developmentId, developmentTitle),
    { label: "Imágenes" },
  ];
}

export function developmentCaracteristicasBreadcrumbs(
  developmentId: string,
  developmentTitle: string,
): BreadcrumbItem[] {
  return [
    ...developmentDetailBreadcrumbs(developmentId, developmentTitle),
    { label: "Características" },
  ];
}

export function developmentTipologiasBreadcrumbs(
  developmentId: string,
  developmentTitle: string,
): BreadcrumbItem[] {
  return [
    ...developmentDetailBreadcrumbs(developmentId, developmentTitle),
    { label: "Unidades" },
  ];
}
