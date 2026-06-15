import { apiFetch } from "@/lib/api/fetch";
export type CasoExpediente = {
  id: string;
  caso_id: string;
  nombre: string | null;
  organismo_id: string | null;
  parte_representada_id: string | null;
  tipo: string | null;
  created_at: string | null;
};

export async function getCasoExpedientes(casoId: string): Promise<CasoExpediente[]> {
  const res = await apiFetch(`/api/casos/${casoId}/expedientes`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error ?? "Error al obtener expedientes");
  }
  return res.json();
}

export async function createCasoExpediente(
  casoId: string,
  payload: {
    nombre: string;
    tipo?: string | null;
    organismo_id?: string | null;
    parte_representada_id?: string | null;
  },
): Promise<CasoExpediente> {
  const res = await apiFetch(`/api/casos/${casoId}/expedientes`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error ?? "Error al crear expediente");
  }

  return res.json();
}

export async function updateCasoExpediente(
  casoId: string,
  expedienteId: string,
  payload: {
    nombre?: string | null;
    tipo?: string | null;
    organismo_id?: string | null;
    parte_representada_id?: string | null;
  },
): Promise<void> {
  const res = await apiFetch(
    `/api/casos/${casoId}/expedientes/${expedienteId}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error ?? "Error al actualizar expediente");
  }
}

export async function deleteCasoExpediente(casoId: string, expedienteId: string) {
  const res = await apiFetch(
    `/api/casos/${casoId}/expedientes/${expedienteId}`,
    {
      method: "DELETE",
    },
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error ?? "Error al eliminar expediente");
  }
}
