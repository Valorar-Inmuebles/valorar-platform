import type {
  GeoLocality,
  GeoLocalitySearchResult,
  GeoNeighborhood,
  GeoProvince,
} from "@repo/shared-types";
import { apiFetch } from "./client";

export async function getProvinces(): Promise<GeoProvince[]> {
  return apiFetch<GeoProvince[]>("/geo/provinces");
}

export async function getLocalitiesByProvince(
  provinceId: string,
  q?: string,
): Promise<GeoLocality[]> {
  const params = new URLSearchParams();
  if (q?.trim()) {
    params.set("q", q.trim());
  }

  const query = params.toString();
  const path = query
    ? `/geo/provinces/${provinceId}/localities?${query}`
    : `/geo/provinces/${provinceId}/localities`;

  return apiFetch<GeoLocality[]>(path);
}

export async function searchLocalities(
  q: string,
  provinceId?: string,
): Promise<GeoLocalitySearchResult[]> {
  const params = new URLSearchParams({ q: q.trim() });
  if (provinceId) {
    params.set("provinceId", provinceId);
  }

  return apiFetch<GeoLocalitySearchResult[]>(
    `/geo/localities/search?${params.toString()}`,
  );
}

export async function getNeighborhoodsByLocality(
  localityId: string,
  q?: string,
): Promise<GeoNeighborhood[]> {
  const params = new URLSearchParams();
  if (q?.trim()) {
    params.set("q", q.trim());
  }

  const query = params.toString();
  const path = query
    ? `/geo/localities/${localityId}/neighborhoods?${query}`
    : `/geo/localities/${localityId}/neighborhoods`;

  return apiFetch<GeoNeighborhood[]>(path);
}
