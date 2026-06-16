export type AuthUserRole = "SUPER_ADMIN" | "TENANT_ADMIN" | "AGENT";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: AuthUserRole;
  tenantId: string | null;
};

export type AdminSession = {
  user: AuthUser;
};
