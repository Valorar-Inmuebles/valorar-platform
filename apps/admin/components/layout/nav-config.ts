export type UserRole =
  | "SUPER_ADMIN"
  | "TENANT_ADMIN"
  | "MANAGER"
  | "AGENT"
  | "COLLABORATOR";

export type NavAccessRule = {
  superAdminOnly?: boolean;
  roles?: UserRole[];
  /** Requires at least one permission from session (checked in MainSidebar). */
  permissions?: string[];
};

export type NavViewerContext = {
  isSuperAdmin: boolean;
  roles: UserRole[];
  permissions?: string[];
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
  if (item.permissions?.length && ctx.permissions) {
    const hasPermission = item.permissions.some((permission) =>
      ctx.permissions!.includes(permission),
    );
    if (!hasPermission) return false;
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

export const HIDE_CONFIGURATION_NAV = false;

export function getVisibleNavigation(ctx: NavViewerContext): NavSection[] {
  if (!HIDE_CONFIGURATION_NAV) {
    return navigation
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => isNavItemVisible(item, ctx)),
      }))
      .filter((section) => section.items.length > 0);
  }

  return navigation.filter((section) => section.id !== "configuracion");
}

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
    id: "plataforma",
    label: "Plataforma",
    items: [
      {
        id: "platform-tenants",
        label: "Tenants",
        href: "/plataforma/tenants",
        iconId: "layers",
        superAdminOnly: true,
      },
    ],
  },
  {
    id: "configuracion",
    label: "Configuración",
    items: [
      {
        id: "config-organizacion",
        label: "Organización",
        href: "/configuracion/organizacion",
        iconId: "settings",
        roles: ["TENANT_ADMIN"],
      },
      {
        id: "config-usuarios",
        label: "Usuarios",
        href: "/configuracion/usuarios",
        iconId: "users",
        permissions: ["user.read"],
      },
      {
        id: "config-roles",
        label: "Roles y permisos",
        href: "/configuracion/roles",
        iconId: "shield",
        permissions: ["user.read"],
      },
      {
        id: "config-perfil",
        label: "Perfil",
        href: "/configuracion/perfil",
        iconId: "user",
      },
      {
        id: "config-preferencias",
        label: "Preferencias",
        href: "/configuracion/preferencias",
        iconId: "sliders",
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
