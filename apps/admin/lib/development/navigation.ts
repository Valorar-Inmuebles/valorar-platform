export type DevelopmentLifecycleVariant = "active" | "archived";

export const DEVELOPMENT_LIFECYCLE_LABELS: Record<
  DevelopmentLifecycleVariant,
  string
> = {
  active: "Activo",
  archived: "Archivado",
};

export type DevelopmentSubNavTab =
  | "general"
  | "comercializacion"
  | "caracteristicas"
  | "imagenes"
  | "tipologias";

export function resolveDevelopmentSubNavTab(
  pathname: string,
  developmentId: string,
): DevelopmentSubNavTab {
  if (pathname.includes("/comercializacion")) {
    return "comercializacion";
  }
  if (pathname.includes("/caracteristicas")) {
    return "caracteristicas";
  }
  if (pathname.includes("/imagenes")) {
    return "imagenes";
  }
  if (pathname.includes("/tipologias")) {
    return "tipologias";
  }

  const base = `/emprendimientos/${developmentId}`;
  if (pathname === base) {
    return "general";
  }

  return "general";
}

export function developmentSubNavHref(
  developmentId: string,
  tab: DevelopmentSubNavTab,
): string {
  switch (tab) {
    case "general":
      return `/emprendimientos/${developmentId}`;
    case "comercializacion":
      return `/emprendimientos/${developmentId}/comercializacion`;
    case "caracteristicas":
      return `/emprendimientos/${developmentId}/caracteristicas`;
    case "imagenes":
      return `/emprendimientos/${developmentId}/imagenes`;
    case "tipologias":
      return `/emprendimientos/${developmentId}/tipologias`;
  }
}
