import type {
  GeoLocality,
  GeoNeighborhood,
  GeoProvince,
} from "@repo/shared-types";
import { apiFetch } from "@/lib/api/client";

export function getProvinces(): Promise<GeoProvince[]> {
  return apiFetch<GeoProvince[]>("/geo/provinces", { cache: "no-store" });
}

export function getLocalitiesByProvince(
  provinceId: string,
  q?: string,
): Promise<GeoLocality[]> {
  const params = new URLSearchParams();
  if (q?.trim()) params.set("q", q.trim());

  const query = params.toString();
  const path = query
    ? `/geo/provinces/${provinceId}/localities?${query}`
    : `/geo/provinces/${provinceId}/localities`;

  return apiFetch<GeoLocality[]>(path, { cache: "no-store" });
}

export function getNeighborhoodsByLocality(
  localityId: string,
  q?: string,
): Promise<GeoNeighborhood[]> {
  const params = new URLSearchParams();
  if (q?.trim()) params.set("q", q.trim());

  const query = params.toString();
  const path = query
    ? `/geo/localities/${localityId}/neighborhoods?${query}`
    : `/geo/localities/${localityId}/neighborhoods`;

  return apiFetch<GeoNeighborhood[]>(path, { cache: "no-store" });
}
