import { apiFetch } from "@/lib/api/fetch";
import type { AnsesDashboardDto, AnsesOverviewDto } from "@/lib/types/anses-dashboard";

const inflightById = new Map<string, Promise<AnsesDashboardDto>>();

export function resetAnsesDashboardRequest(id: string) {
  inflightById.delete(id.trim());
}

export async function getAnsesDashboard(id: string): Promise<AnsesDashboardDto> {
  const key = id.trim();
  const pending = inflightById.get(key);
  if (pending) return pending;

  const promise = (async () => {
    const res = await apiFetch(`/api/automatizaciones/anses/${encodeURIComponent(key)}`);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(
        typeof body.error === "string" ? body.error : "Error al cargar información ANSES",
      );
    }

    return res.json() as Promise<AnsesDashboardDto>;
  })().finally(() => {
    if (inflightById.get(key) === promise) {
      inflightById.delete(key);
    }
  });

  inflightById.set(key, promise);
  return promise;
}

function buildReciboHaberesArchivoUrl(
  clienteId: string,
  periodoId: string,
  beneficioId: string,
  kind: "constancia",
): string {
  const params = new URLSearchParams({ beneficio: beneficioId.trim() });
  return `/api/automatizaciones/anses/${encodeURIComponent(clienteId.trim())}/haberes/${encodeURIComponent(periodoId.trim())}/${kind}?${params}`;
}

export function getReciboConstanciaUrl(
  clienteId: string,
  periodoId: string,
  beneficioId: string,
): string {
  return buildReciboHaberesArchivoUrl(clienteId, periodoId, beneficioId, "constancia");
}

export function getConstanciaCuilUrl(clienteId: string): string {
  return `/api/automatizaciones/anses/${encodeURIComponent(clienteId.trim())}/constancia-cuil`;
}

export function getHistoriaLaboralUrl(clienteId: string): string {
  return `/api/automatizaciones/anses/${encodeURIComponent(clienteId.trim())}/historia-laboral`;
}

export async function triggerAnsesClienteSync(clienteId: string): Promise<void> {
  const res = await apiFetch(
    `/api/automatizaciones/anses/${encodeURIComponent(clienteId.trim())}/sincronizar`,
    { method: "POST" },
  );

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      typeof body.error === "string"
        ? body.error
        : "Error al iniciar sincronización ANSES",
    );
  }
}

export async function triggerAnsesSentenciasSync(anioMes: string): Promise<void> {
  const res = await apiFetch("/api/automatizaciones/anses/sentencias/sincronizar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ anioMes: anioMes.trim() }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      typeof body.error === "string"
        ? body.error
        : "Error al iniciar sincronización de sentencias",
    );
  }
}

export async function triggerAnsesClientesSync(): Promise<void> {
  const res = await apiFetch("/api/automatizaciones/anses/clientes/sincronizar", {
    method: "POST",
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      typeof body.error === "string"
        ? body.error
        : "Error al iniciar sincronización de clientes",
    );
  }
}

export async function triggerAnsesTodoSync(): Promise<void> {
  const res = await apiFetch("/api/automatizaciones/anses/todo/sincronizar", {
    method: "POST",
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      typeof body.error === "string"
        ? body.error
        : "Error al iniciar sincronización completa",
    );
  }
}

export async function updateAnsesSincronizacion(
  clienteId: string,
  activa: boolean,
): Promise<void> {
  const res = await apiFetch(
    `/api/automatizaciones/anses/${encodeURIComponent(clienteId.trim())}/sincronizar-anses`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activa }),
    },
  );

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      typeof body.error === "string"
        ? body.error
        : "Error al actualizar sincronización ANSES",
    );
  }
}

export async function updateAnsesPassword(
  clienteId: string,
  password: string,
): Promise<void> {
  const res = await apiFetch(
    `/api/automatizaciones/anses/${encodeURIComponent(clienteId.trim())}/clave`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    },
  );

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      typeof body.error === "string" ? body.error : "Error al guardar contraseña ANSES",
    );
  }
}

export async function getAnsesOverview(): Promise<AnsesOverviewDto> {
  const res = await apiFetch("/api/automatizaciones/anses/overview");

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      typeof body.error === "string" ? body.error : "Error al cargar resumen ANSES",
    );
  }

  return res.json();
}
