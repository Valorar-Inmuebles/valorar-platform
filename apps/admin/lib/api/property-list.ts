import type { PropertyListResponse } from "@repo/shared-types";
import { apiFetch } from "@/lib/api/client";
import {
  propertyListApiPath,
  type PropertyListQuery,
} from "@/lib/property/property-list-query";

export function getPropertyList(
  query: PropertyListQuery,
): Promise<PropertyListResponse> {
  return apiFetch<PropertyListResponse>(propertyListApiPath(query), {
    cache: "no-store",
  });
}
