import { apiFetch } from "@/lib/api/fetch";
import type {
  CloneWorkflowInput,
  CopyWorkflowCamposFromCatalogInput,
  CopyWorkflowCamposFromWorkflowInput,
  CopyWorkflowParteCamposFromParteInput,
  CreateDraftWorkflowInput,
  CreateWorkflowCampoDinamicoInput,
  CreateWorkflowParteCampoDinamicoInput,
  CreateWorkflowEtapaInput,
  CreateWorkflowInput,
  CreateWorkflowParteInput,
  CreateWorkflowTareaInput,
  ReorderWorkflowCamposDinamicosInput,
  ReorderWorkflowParteCamposDinamicosInput,
  ReorderWorkflowEtapasInput,
  ReorderWorkflowPartesInput,
  ReorderWorkflowTareasInput,
  UpdateWorkflowCampoDinamicoInput,
  UpdateWorkflowParteCampoDinamicoInput,
  UpdateWorkflowEtapaInput,
  UpdateWorkflowParteInput,
  UpdateWorkflowTareaInput,
  UpdateWorkflowInput,
  WorkflowDetailDto,
  WorkflowListFilters,
  WorkflowListItemDto,
} from "@/lib/types/workflow";

export type {
  WorkflowDetailDto,
  WorkflowListItemDto,
  CreateWorkflowInput,
  CreateDraftWorkflowInput,
  UpdateWorkflowInput,
  CloneWorkflowInput,
  WorkflowListFilters,
  CreateWorkflowEtapaInput,
  UpdateWorkflowEtapaInput,
  ReorderWorkflowEtapasInput,
  CreateWorkflowParteInput,
  UpdateWorkflowParteInput,
  ReorderWorkflowPartesInput,
  CreateWorkflowCampoDinamicoInput,
  UpdateWorkflowCampoDinamicoInput,
  ReorderWorkflowCamposDinamicosInput,
  CopyWorkflowCamposFromWorkflowInput,
  CopyWorkflowCamposFromCatalogInput,
  CopyWorkflowParteCamposFromParteInput,
  CreateWorkflowParteCampoDinamicoInput,
  UpdateWorkflowParteCampoDinamicoInput,
  ReorderWorkflowParteCamposDinamicosInput,
  CreateWorkflowTareaInput,
  UpdateWorkflowTareaInput,
  ReorderWorkflowTareasInput,
};

export class WorkflowApiError extends Error {
  constructor(
    message: string,
    public readonly field: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "WorkflowApiError";
  }
}

async function parseErrorResponse(res: Response, fallback: string): Promise<never> {
  const body = await res.json().catch(() => ({}));
  const parsed = body as {
    error?: string;
    message?: string;
    field?: string;
    code?: string;
  };

  if (parsed.field && parsed.code && parsed.message) {
    throw new WorkflowApiError(parsed.message, parsed.field, parsed.code);
  }

  throw new Error(parsed.error ?? parsed.message ?? fallback);
}

export async function getWorkflows(
  filters: WorkflowListFilters = {},
): Promise<WorkflowListItemDto[]> {
  const params = new URLSearchParams();
  if (filters.origen) params.set("origen", filters.origen);
  if (filters.estado) params.set("estado", filters.estado);
  if (filters.workflow_tipo_id) {
    params.set("workflow_tipo_id", filters.workflow_tipo_id);
  }
  if (filters.q?.trim()) params.set("q", filters.q.trim());

  const query = params.toString();
  const res = await apiFetch(query ? `/api/workflows?${query}` : "/api/workflows");

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: string }).error ?? "Error al obtener workflows",
    );
  }

  return res.json();
}

export async function getWorkflow(id: string): Promise<WorkflowDetailDto> {
  const res = await apiFetch(`/api/workflows/${id}`);

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: string }).error ?? "Error al obtener el workflow",
    );
  }

  return res.json();
}

export async function createWorkflow(
  payload: CreateWorkflowInput,
): Promise<WorkflowDetailDto> {
  const res = await apiFetch("/api/workflows", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    await parseErrorResponse(res, "Error al crear el workflow");
  }

  return res.json();
}

export async function createDraftWorkflow(
  payload: CreateDraftWorkflowInput = {},
): Promise<WorkflowDetailDto> {
  const res = await apiFetch("/api/workflows/draft", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    await parseErrorResponse(res, "Error al crear el borrador del workflow");
  }

  return res.json();
}

export async function updateWorkflow(
  id: string,
  payload: UpdateWorkflowInput,
): Promise<WorkflowDetailDto> {
  const res = await apiFetch(`/api/workflows/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    await parseErrorResponse(res, "Error al actualizar el workflow");
  }

  return res.json();
}

export async function publishWorkflow(id: string): Promise<WorkflowDetailDto> {
  const res = await apiFetch(`/api/workflows/${id}/publish`, {
    method: "POST",
  });

  if (!res.ok) {
    await parseErrorResponse(res, "Error al publicar el workflow");
  }

  return res.json();
}

export async function archiveWorkflow(id: string): Promise<WorkflowDetailDto> {
  const res = await apiFetch(`/api/workflows/${id}/archive`, {
    method: "POST",
  });

  if (!res.ok) {
    await parseErrorResponse(res, "Error al archivar el workflow");
  }

  return res.json();
}

export async function deleteWorkflow(id: string): Promise<void> {
  const res = await apiFetch(`/api/workflows/${id}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    await parseErrorResponse(res, "Error al eliminar el workflow");
  }
}

export async function cloneWorkflow(
  sourceWorkflowId: string,
  payload: Pick<CloneWorkflowInput, "nombre"> = {},
): Promise<WorkflowDetailDto> {
  const res = await apiFetch(`/api/workflows/${sourceWorkflowId}/clone`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    await parseErrorResponse(res, "Error al clonar el workflow");
  }

  return res.json();
}

export async function createWorkflowEtapa(
  workflowId: string,
  payload: CreateWorkflowEtapaInput,
): Promise<WorkflowDetailDto> {
  const res = await apiFetch(`/api/workflows/${workflowId}/etapas`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    await parseErrorResponse(res, "Error al crear la etapa");
  }

  return res.json();
}

export async function updateWorkflowEtapa(
  workflowId: string,
  etapaId: string,
  payload: UpdateWorkflowEtapaInput,
): Promise<WorkflowDetailDto> {
  const res = await apiFetch(`/api/workflows/${workflowId}/etapas/${etapaId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    await parseErrorResponse(res, "Error al actualizar la etapa");
  }

  return res.json();
}

export async function deleteWorkflowEtapa(
  workflowId: string,
  etapaId: string,
): Promise<WorkflowDetailDto> {
  const res = await apiFetch(`/api/workflows/${workflowId}/etapas/${etapaId}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    await parseErrorResponse(res, "Error al eliminar la etapa");
  }

  return res.json();
}

export async function reorderWorkflowEtapas(
  workflowId: string,
  payload: ReorderWorkflowEtapasInput,
): Promise<WorkflowDetailDto> {
  const res = await apiFetch(`/api/workflows/${workflowId}/etapas/reorder`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    await parseErrorResponse(res, "Error al reordenar las etapas");
  }

  return res.json();
}

export async function createWorkflowParte(
  workflowId: string,
  payload: CreateWorkflowParteInput,
): Promise<WorkflowDetailDto> {
  const res = await apiFetch(`/api/workflows/${workflowId}/partes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    await parseErrorResponse(res, "Error al crear la parte");
  }

  return res.json();
}

export async function updateWorkflowParte(
  workflowId: string,
  parteId: string,
  payload: UpdateWorkflowParteInput,
): Promise<WorkflowDetailDto> {
  const res = await apiFetch(`/api/workflows/${workflowId}/partes/${parteId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    await parseErrorResponse(res, "Error al actualizar la parte");
  }

  return res.json();
}

export async function deleteWorkflowParte(
  workflowId: string,
  parteId: string,
): Promise<WorkflowDetailDto> {
  const res = await apiFetch(`/api/workflows/${workflowId}/partes/${parteId}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    await parseErrorResponse(res, "Error al eliminar la parte");
  }

  return res.json();
}

export async function reorderWorkflowPartes(
  workflowId: string,
  payload: ReorderWorkflowPartesInput,
): Promise<WorkflowDetailDto> {
  const res = await apiFetch(`/api/workflows/${workflowId}/partes/reorder`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    await parseErrorResponse(res, "Error al reordenar las partes");
  }

  return res.json();
}

export async function createWorkflowCampoDinamico(
  workflowId: string,
  payload: CreateWorkflowCampoDinamicoInput,
): Promise<WorkflowDetailDto> {
  const res = await apiFetch(`/api/workflows/${workflowId}/campos-dinamicos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    await parseErrorResponse(res, "Error al crear el campo dinámico");
  }

  return res.json();
}

export async function updateWorkflowCampoDinamico(
  workflowId: string,
  campoDinamicoId: string,
  payload: UpdateWorkflowCampoDinamicoInput,
): Promise<WorkflowDetailDto> {
  const res = await apiFetch(
    `/api/workflows/${workflowId}/campos-dinamicos/${campoDinamicoId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );

  if (!res.ok) {
    await parseErrorResponse(res, "Error al actualizar el campo dinámico");
  }

  return res.json();
}

export async function deleteWorkflowCampoDinamico(
  workflowId: string,
  campoDinamicoId: string,
): Promise<WorkflowDetailDto> {
  const res = await apiFetch(
    `/api/workflows/${workflowId}/campos-dinamicos/${campoDinamicoId}`,
    {
      method: "DELETE",
    },
  );

  if (!res.ok) {
    await parseErrorResponse(res, "Error al eliminar el campo dinámico");
  }

  return res.json();
}

export async function reorderWorkflowCamposDinamicos(
  workflowId: string,
  payload: ReorderWorkflowCamposDinamicosInput,
): Promise<WorkflowDetailDto> {
  const res = await apiFetch(
    `/api/workflows/${workflowId}/campos-dinamicos/reorder`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );

  if (!res.ok) {
    await parseErrorResponse(res, "Error al reordenar los campos dinámicos");
  }

  return res.json();
}

export async function copyWorkflowCamposFromWorkflow(
  workflowId: string,
  payload: CopyWorkflowCamposFromWorkflowInput,
): Promise<WorkflowDetailDto> {
  const res = await apiFetch(
    `/api/workflows/${workflowId}/campos-dinamicos/copy-from-workflow`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );

  if (!res.ok) {
    await parseErrorResponse(res, "Error al copiar campos del workflow");
  }

  return res.json();
}

export async function copyWorkflowCamposFromCatalog(
  workflowId: string,
  payload: CopyWorkflowCamposFromCatalogInput,
): Promise<WorkflowDetailDto> {
  const res = await apiFetch(
    `/api/workflows/${workflowId}/campos-dinamicos/copy-from-catalog`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );

  if (!res.ok) {
    await parseErrorResponse(res, "Error al copiar campos del catálogo");
  }

  return res.json();
}

export async function createWorkflowParteCampoDinamico(
  workflowId: string,
  parteId: string,
  payload: CreateWorkflowParteCampoDinamicoInput,
): Promise<WorkflowDetailDto> {
  const res = await apiFetch(
    `/api/workflows/${workflowId}/partes/${parteId}/campos-dinamicos`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );

  if (!res.ok) {
    await parseErrorResponse(res, "Error al crear el campo de parte");
  }

  return res.json();
}

export async function updateWorkflowParteCampoDinamico(
  workflowId: string,
  parteId: string,
  campoId: string,
  payload: UpdateWorkflowParteCampoDinamicoInput,
): Promise<WorkflowDetailDto> {
  const res = await apiFetch(
    `/api/workflows/${workflowId}/partes/${parteId}/campos-dinamicos/${campoId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );

  if (!res.ok) {
    await parseErrorResponse(res, "Error al actualizar el campo de parte");
  }

  return res.json();
}

export async function deleteWorkflowParteCampoDinamico(
  workflowId: string,
  parteId: string,
  campoId: string,
): Promise<WorkflowDetailDto> {
  const res = await apiFetch(
    `/api/workflows/${workflowId}/partes/${parteId}/campos-dinamicos/${campoId}`,
    {
      method: "DELETE",
    },
  );

  if (!res.ok) {
    await parseErrorResponse(res, "Error al eliminar el campo de parte");
  }

  return res.json();
}

export async function reorderWorkflowParteCamposDinamicos(
  workflowId: string,
  parteId: string,
  payload: ReorderWorkflowParteCamposDinamicosInput,
): Promise<WorkflowDetailDto> {
  const res = await apiFetch(
    `/api/workflows/${workflowId}/partes/${parteId}/campos-dinamicos/reorder`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );

  if (!res.ok) {
    await parseErrorResponse(res, "Error al reordenar los campos de parte");
  }

  return res.json();
}

export async function copyWorkflowParteCamposFromParte(
  workflowId: string,
  targetParteId: string,
  payload: CopyWorkflowParteCamposFromParteInput,
): Promise<WorkflowDetailDto> {
  const res = await apiFetch(
    `/api/workflows/${workflowId}/partes/${targetParteId}/campos-dinamicos/copy-from-parte`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );

  if (!res.ok) {
    await parseErrorResponse(res, "Error al copiar campos desde otra parte");
  }

  return res.json();
}

export async function createWorkflowTarea(
  workflowId: string,
  etapaId: string,
  payload: CreateWorkflowTareaInput,
): Promise<WorkflowDetailDto> {
  const res = await apiFetch(
    `/api/workflows/${workflowId}/etapas/${etapaId}/tareas`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );

  if (!res.ok) {
    await parseErrorResponse(res, "Error al crear la tarea");
  }

  return res.json();
}

export async function updateWorkflowTarea(
  workflowId: string,
  etapaId: string,
  tareaId: string,
  payload: UpdateWorkflowTareaInput,
): Promise<WorkflowDetailDto> {
  const res = await apiFetch(
    `/api/workflows/${workflowId}/etapas/${etapaId}/tareas/${tareaId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );

  if (!res.ok) {
    await parseErrorResponse(res, "Error al actualizar la tarea");
  }

  return res.json();
}

export async function deleteWorkflowTarea(
  workflowId: string,
  etapaId: string,
  tareaId: string,
): Promise<WorkflowDetailDto> {
  const res = await apiFetch(
    `/api/workflows/${workflowId}/etapas/${etapaId}/tareas/${tareaId}`,
    {
      method: "DELETE",
    },
  );

  if (!res.ok) {
    await parseErrorResponse(res, "Error al eliminar la tarea");
  }

  return res.json();
}

export async function reorderWorkflowTareas(
  workflowId: string,
  etapaId: string,
  payload: ReorderWorkflowTareasInput,
): Promise<WorkflowDetailDto> {
  const res = await apiFetch(
    `/api/workflows/${workflowId}/etapas/${etapaId}/tareas/reorder`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );

  if (!res.ok) {
    await parseErrorResponse(res, "Error al reordenar las tareas");
  }

  return res.json();
}
