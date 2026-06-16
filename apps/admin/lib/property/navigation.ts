export type PropertyStatusVariant =
  | "active"
  | "archived"
  | "published"
  | "commercial-draft";

export const PROPERTY_STATUS_LABELS: Record<PropertyStatusVariant, string> = {
  active: "Activa",
  archived: "Archivada",
  published: "Publicada",
  "commercial-draft": "Borrador comercial",
};

export type PropertySubNavTab =
  | "general"
  | "publicaciones"
  | "caracteristicas"
  | "imagenes";

export function resolvePropertySubNavTab(
  pathname: string,
  propertyId: string,
): PropertySubNavTab {
  if (pathname.includes("/publicaciones")) {
    return "publicaciones";
  }
  if (pathname.includes("/caracteristicas")) {
    return "caracteristicas";
  }
  if (pathname.includes("/imagenes")) {
    return "imagenes";
  }

  const base = `/propiedades/${propertyId}`;
  if (pathname === base || pathname === `${base}/editar`) {
    return "general";
  }

  return "general";
}

export function propertySubNavHref(
  propertyId: string,
  tab: PropertySubNavTab,
): string {
  switch (tab) {
    case "general":
      return `/propiedades/${propertyId}`;
    case "publicaciones":
      return `/propiedades/${propertyId}/publicaciones`;
    case "caracteristicas":
      return `/propiedades/${propertyId}/caracteristicas`;
    case "imagenes":
      return `/propiedades/${propertyId}/imagenes`;
  }
}
