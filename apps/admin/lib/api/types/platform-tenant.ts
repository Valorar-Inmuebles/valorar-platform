export type TenantStatus = "ACTIVE" | "SUSPENDED";

export type PlatformTenant = {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  logoUrl?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  domain?: string | null;
  userCount: number;
  propertyCount: number;
  createdAt: string;
  updatedAt: string;
};

export type PlatformTenantStats = {
  activeTenants: number;
  suspendedTenants: number;
  totalUsers: number;
  totalProperties: number;
};

export type PlatformTenantListResponse = {
  stats: PlatformTenantStats;
  items: PlatformTenant[];
};

export type PlatformTenantOption = {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  logoUrl?: string | null;
};

export type CreatePlatformTenantPayload = {
  name: string;
  slug?: string;
  logoUrl?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  domain?: string;
};

export type UpdatePlatformTenantPayload = {
  name?: string;
  slug?: string;
  logoUrl?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  domain?: string | null;
};

export function getTenantStatusLabel(status: TenantStatus): string {
  return status === "ACTIVE" ? "Activo" : "Suspendido";
}

export function getTenantStatusVariant(
  status: TenantStatus,
): "success" | "warning" {
  return status === "ACTIVE" ? "success" : "warning";
}
