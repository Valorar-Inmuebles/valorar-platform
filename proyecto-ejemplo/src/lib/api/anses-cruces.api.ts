import { apiFetch } from "@/lib/api/fetch";
import type { AnsesCrucesPageDto } from "@/lib/types/anses-cruces";

export async function getAnsesCruces(): Promise<AnsesCrucesPageDto> {
  const res = await apiFetch("/api/automatizaciones/cruces");

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      typeof body.error === "string" ? body.error : "Error al cargar cruces ANSES",
    );
  }

  return res.json();
}
