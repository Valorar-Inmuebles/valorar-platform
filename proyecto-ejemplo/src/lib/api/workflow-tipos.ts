import { apiFetch } from "@/lib/api/fetch";
export type WorkflowTipo = {
  id: string;
  nombre: string;
  descripcion: string | null;
  orden: number;
};

export async function getWorkflowTipos(): Promise<WorkflowTipo[]> {
  const res = await apiFetch("/api/workflow-tipos");
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: string }).error ?? "Error al obtener tipos de workflow",
    );
  }
  return res.json();
}
