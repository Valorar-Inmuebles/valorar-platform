import { apiFetch } from "@/lib/api/fetch";
export type WorkflowRol = {
  id: string;
  nombre: string;
  descripcion: string | null;
  orden: number;
};

export async function getWorkflowRoles(): Promise<WorkflowRol[]> {
  const res = await apiFetch("/api/workflow-roles");
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: string }).error ?? "Error al obtener roles de workflow",
    );
  }
  return res.json();
}
