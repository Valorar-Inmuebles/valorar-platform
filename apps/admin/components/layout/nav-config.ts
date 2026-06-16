export type UserRole = "SUPER_ADMIN" | "TENANT_ADMIN" | "AGENT";

export type NavAccessRule = {
  superAdminOnly?: boolean;
  roles?: UserRole[];
};

export type NavViewerContext = {
  isSuperAdmin: boolean;
  roles: UserRole[];
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
  href?: string;
  action?: NavItemAction;
  iconId: string;
  children?: NavChildItem[];
} & NavAccessRule;

export type NavSection = {
  id: string;
  label: string;
  items: NavItem[];
};

export function isNavItemVisible(
  item: NavAccessRule,
  ctx: NavViewerContext,
): boolean {
  if (item.superAdminOnly && !ctx.isSuperAdmin) return false;
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

/** @deprecated Usar sessionToNavContext() con la sesión real. */
export const DEV_NAV_CONTEXT: NavViewerContext = {
  isSuperAdmin: true,
  roles: ["SUPER_ADMIN", "TENANT_ADMIN", "AGENT"],
};

export const navigation: NavSection[] = [
  {
    id: "general",
    label: "General",
    items: [
      { id: "inicio", label: "Inicio", href: "/", iconId: "home" },
    ],
  },
  {
    id: "inmobiliaria",
    label: "Inmobiliaria",
    items: [
      {
        id: "propiedades",
        label: "Propiedades",
        href: "/propiedades",
        iconId: "building",
      },
    ],
  },
  {
    id: "configuracion",
    label: "Configuración",
    items: [
      {
        id: "config-usuarios",
        label: "Usuarios",
        href: "/configuracion/usuarios",
        iconId: "users",
        roles: ["TENANT_ADMIN", "SUPER_ADMIN"],
      },
      {
        id: "config-tenant",
        label: "Inmobiliaria",
        href: "/configuracion/inmobiliaria",
        iconId: "settings",
        roles: ["TENANT_ADMIN"],
      },
      {
        id: "config-tenants",
        label: "Tenants",
        href: "/configuracion/tenants",
        iconId: "layers",
        superAdminOnly: true,
      },
    ],
  },
  {
    id: "cuenta",
    label: "Cuenta",
    items: [
      {
        id: "salir",
        label: "Cerrar sesión",
        action: "sign-out",
        iconId: "log-out",
      },
    ],
  },
];

export function matchNavPath(pathname: string, href?: string): boolean {
  if (!href) return false;
  return href === "/"
    ? pathname === "/"
    : pathname === href || pathname.startsWith(`${href}/`);
}
