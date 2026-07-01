import type {
  GeoLocality,
  GeoNeighborhood,
  GeoProvince,
} from "@repo/shared-types";

const DEFAULT_API_URL = "http://localhost:3002";

function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? process.env.API_URL ?? DEFAULT_API_URL;
}

async function publicGeoFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Geo API request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function getProvinces(): Promise<GeoProvince[]> {
  return publicGeoFetch<GeoProvince[]>("/geo/provinces");
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

  return publicGeoFetch<GeoLocality[]>(path);
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

  return publicGeoFetch<GeoNeighborhood[]>(path);
}
