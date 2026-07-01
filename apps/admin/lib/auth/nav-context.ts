import type { NavViewerContext } from "@/components/layout/nav-config";
import type { AuthUser } from "@/lib/auth/types";

export function sessionToNavContext(user: AuthUser): NavViewerContext {
  return {
    isSuperAdmin: user.role === "SUPER_ADMIN",
    roles: [user.role],
    permissions: user.permissions,
  };
}

export { getUserInitials } from "@/components/user/user-avatar";
