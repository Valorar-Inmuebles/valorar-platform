import { apiFetch } from "@/lib/api/fetch";
import type {
  ComentarioDto,
  ComentarioEntidadTipo,
  ComentarioUsuarioMencionDto,
} from "@/lib/types/comentario";
import type {
  ComentarioCreateInput,
  ComentarioUpdateInput,
} from "@/lib/validation/schemas/comentario.schema";

async function parseError(res: Response): Promise<string> {
  const err = await res.json().catch(() => ({}));
  return (err as { error?: string }).error ?? "Error en la solicitud";
}

export async function getComentarios(
  entidadTipo: ComentarioEntidadTipo,
  entidadId: string,
): Promise<ComentarioDto[]> {
  const params = new URLSearchParams({
    entidad_tipo: entidadTipo,
    entidad_id: entidadId,
  });
  const res = await apiFetch(`/api/comentarios?${params}`);
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function createComentario(
  payload: ComentarioCreateInput,
): Promise<ComentarioDto> {
  const res = await apiFetch("/api/comentarios", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function updateComentario(
  id: string,
  payload: ComentarioUpdateInput,
): Promise<ComentarioDto> {
  const res = await apiFetch(`/api/comentarios/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function deleteComentario(id: string): Promise<void> {
  const res = await apiFetch(`/api/comentarios/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(await parseError(res));
}

export async function getUsuariosParaMencion(
  q = "",
): Promise<ComentarioUsuarioMencionDto[]> {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  const res = await apiFetch(`/api/comentarios/usuarios-mencion?${params}`);
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}
