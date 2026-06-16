import { apiFetch } from "@/lib/api/client";
import type {
  AdminPropertyListing,
  CreatePropertyListingPayload,
  UpdatePropertyListingPayload,
} from "@/lib/api/types/property-listing";
import { requireAdminTenantId } from "@/lib/tenant/get-admin-context";

type ListPropertyListingsOptions = {
  propertyId?: string;
  listingType?: string;
  status?: string;
};

function buildTenantQuery(tenantId: string, extra?: Record<string, string>) {
  const params = new URLSearchParams({ tenantId, ...extra });
  return params.toString();
}

export async function listPropertyListings(
  options: ListPropertyListingsOptions = {},
): Promise<AdminPropertyListing[]> {
  const tenantId = requireAdminTenantId();
  const extra: Record<string, string> = {};

  if (options.propertyId) extra.propertyId = options.propertyId;
  if (options.listingType) extra.listingType = options.listingType;
  if (options.status) extra.status = options.status;

  return apiFetch<AdminPropertyListing[]>(
    `/property-listings?${buildTenantQuery(tenantId, extra)}`,
    { cache: "no-store" },
  );
}

export async function getPropertyListing(
  id: string,
): Promise<AdminPropertyListing> {
  const tenantId = requireAdminTenantId();
  return apiFetch<AdminPropertyListing>(
    `/property-listings/${id}?${buildTenantQuery(tenantId)}`,
    { cache: "no-store" },
  );
}

export async function createPropertyListing(
  propertyId: string,
  payload: CreatePropertyListingPayload,
): Promise<AdminPropertyListing> {
  const tenantId = requireAdminTenantId();

  return apiFetch<AdminPropertyListing>("/property-listings", {
    method: "POST",
    body: JSON.stringify({
      tenantId,
      propertyId,
      ...payload,
    }),
    cache: "no-store",
  });
}

export async function updatePropertyListing(
  id: string,
  payload: UpdatePropertyListingPayload,
): Promise<AdminPropertyListing> {
  const tenantId = requireAdminTenantId();

  return apiFetch<AdminPropertyListing>(
    `/property-listings/${id}?${buildTenantQuery(tenantId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
      cache: "no-store",
    },
  );
}

export async function closePropertyListing(
  id: string,
): Promise<AdminPropertyListing> {
  const tenantId = requireAdminTenantId();

  return apiFetch<AdminPropertyListing>(
    `/property-listings/${id}?${buildTenantQuery(tenantId)}`,
    {
      method: "DELETE",
      cache: "no-store",
    },
  );
}
