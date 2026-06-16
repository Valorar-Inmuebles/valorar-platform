import type { CurrentUserDto } from "@/lib/types/me";

const TTL_MS = 5 * 60 * 1000;

let cache: CurrentUserDto | null = null;
let fetchedAt = 0;
let inflight: Promise<CurrentUserDto> | null = null;

async function fetchCurrentUserFromApi(): Promise<CurrentUserDto> {
  const res = await fetch("/api/me");
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? "No se pudo obtener el usuario");
  }
  return res.json();
}

export function invalidateCurrentUserCache(): void {
  cache = null;
  fetchedAt = 0;
}

export async function fetchCurrentUserCached(): Promise<CurrentUserDto> {
  if (cache && Date.now() - fetchedAt < TTL_MS) {
    return cache;
  }

  if (!inflight) {
    inflight = fetchCurrentUserFromApi()
      .then((data) => {
        cache = data;
        fetchedAt = Date.now();
        return data;
      })
      .finally(() => {
        inflight = null;
      });
  }

  return inflight;
}
