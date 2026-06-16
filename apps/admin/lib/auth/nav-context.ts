import type { NavViewerContext } from "@/components/layout/nav-config";
import type { AuthUser } from "@/lib/auth/types";

export function sessionToNavContext(user: AuthUser): NavViewerContext {
  return {
    isSuperAdmin: user.role === "SUPER_ADMIN",
    roles: [user.role],
  };
}

export function getUserInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "VA";
  }

  if (parts.length === 1) {
    return parts[0]!.slice(0, 2).toUpperCase();
  }

  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}
