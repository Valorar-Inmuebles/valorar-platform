// ── Types ──────────────────────────────────────────────────────────────────────

export type NavAccessRule = {
  /** Solo visible para usuarios del tenant super (00000000-...) */
  superUsuarioOnly?: boolean;
  /** Visible si el usuario tiene al menos uno de estos roles */
  roles?: string[];
};

export type NavViewerContext = {
  isSuperUsuario: boolean;
  roles: string[];
};

export type NavChildItem = {
  id: string;
  label: string;
  href: string;
} & NavAccessRule;

export type NavItemAction = "sign-out";

export type NavItem = {
  id: string;
  label: string;
  /** If present the item is a direct link; otherwise it is a group toggle */
  href?: string;
  /** Acción en lugar de navegación (ej. cerrar sesión) */
  action?: NavItemAction;
  iconId: string;
  children?: NavChildItem[];
} & NavAccessRule;

export function isNavItemVisible(
  item: NavAccessRule,
  ctx: NavViewerContext,
): boolean {
  if (item.superUsuarioOnly && !ctx.isSuperUsuario) return false;
  if (item.roles?.length) {
    const hasRole = item.roles.some((role) => ctx.roles.includes(role));
    if (!hasRole) return false;
  }
  return true;
}

export function visibleNavChildren(
  item: NavItem,
  ctx: NavViewerContext,
): NavChildItem[] | undefined {
  if (!item.children || !isNavItemVisible(item, ctx)) return undefined;
  return item.children.filter((child) => isNavItemVisible(child, ctx));
}

export type NavSection = {
  id: string;
  label: string;
  items: NavItem[];
};

// ── Navigation tree ────────────────────────────────────────────────────────────

export const navigation: NavSection[] = [
  {
    id: "general",
    label: "General",
    items: [
      {
        id: "inicio",
        label: "Inicio",
        href: "/",
        iconId: "home",
      },
      {
        id: "clientes",
        label: "Clientes",
        iconId: "users",
        children: [
          { id: "clientes-lista",  label: "Lista",  href: "/clientes" },
          { id: "clientes-crear",  label: "Crear",  href: "/clientes/crear" },
        ],
      },
      {
        id: "casos",
        label: "Casos",
        iconId: "briefcase",
        children: [
          { id: "casos-lista",  label: "Lista",  href: "/casos" },
          { id: "casos-crear",  label: "Crear",  href: "/casos/crear" },
        ],
      },
      {
        id: "expedientes",
        label: "Expedientes",
        iconId: "file-text",
        children: [
          { id: "expedientes-lista",  label: "Lista",  href: "/expedientes/" },
          { id: "expedientes-crear",  label: "Crear",  href: "/expedientes/" },
        ],
      },
    ],
  },

  {
    id: "procesos",
    label: "Procesos",
    items: [
      {
        id: "automatizaciones",
        label: "Automatizaciones",
        iconId: "zap",
        children: [
          { id: "automatizaciones-anses",     label: "Legajos ANSES",     href: "/automatizaciones/anses" },
          { id: "automatizaciones-cruces",    label: "Cruces ANSES",    href: "/automatizaciones/cruces" },
        ],
      },
      {
        id: "workflows",
        label: "Workflows",
        iconId: "layers",
        children: [
          { id: "workflows-lista", label: "Lista", href: "/workflows" },
          { id: "workflows-crear", label: "Crear", href: "/workflows/crear" },
        ],
      },
    ],
  },

  {
    id: "operativo",
    label: "Operativo",
    items: [
      { id: "reportes", label: "Reportes", href: "/reportes", iconId: "bar-chart" },
      { id: "agenda",   label: "Agenda",   href: "/agenda",   iconId: "calendar" },
    ],
  },

  {
    id: "sistema",
    label: "Sistema",
    items: [
      { id: "herramientas",  label: "Herramientas",  href: "/herramientas",  iconId: "wrench", roles: ["admin"] },
      { id: "ui-kit",        label: "UI Kit",         href: "/ui-kit",        iconId: "layers", roles: ["admin"] },
      { id: "lexia",         label: "LexIA",          href: "/lexia",         iconId: "bot", roles: ["admin"] },
      // { id: "nuevo",         label: "Nuevo",          href: "/nuevo",         iconId: "plus-circle", roles: ["admin"] },
      {
        id: "configuracion",
        label: "Configuración",
        iconId: "settings",
        children: [
          { id: "configuracion-campos",  label: "Campos",  href: "/configuracion/campos", roles: ["admin"] },
          { id: "configuracion-plantillas", label: "Plantillas", href: "/configuracion/plantillas", roles: ["admin"] },
          { id: "configuracion-usuarios", label: "Usuarios", href: "/configuracion/usuarios", roles: ["admin"] },
          {
            id: "configuracion-tenants",
            label: "Tenants",
            href: "/configuracion/tenants",
            superUsuarioOnly: true,
          },
          { id: "configuracion-varios",   label: "Varios",  href: "/configuracion/varios", roles: ["admin"] },
        ],
      },
      { id: "salir",         label: "Salir",          action: "sign-out",     iconId: "log-out" },
    ],
  },
];
