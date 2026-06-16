"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { ConfirmModal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import {
  createComentario,
  deleteComentario,
  updateComentario,
} from "@/lib/api/comentarios.api";
import { getCurrentUser } from "@/lib/api/me.api";
import type {
  ComentarioDto,
  ComentarioEntidadTipo,
  ComentariosVariant,
} from "@/lib/types/comentario";
import type { CurrentUserDto } from "@/lib/types/me";

import { ComentarioComposer } from "./ComentarioComposer";
import { ComentarioList } from "./ComentarioList";
import { ComentariosHeader } from "./ComentariosHeader";
import { ComentariosOcultosHint } from "./ComentariosOcultosHint";
import {
  appendComentarioToCache,
  fetchComentariosCached,
  patchComentarioInCache,
  removeComentarioFromCache,
} from "./comentarios-cache";

export type ComentariosPanelCurrentUser = Pick<
  CurrentUserDto,
  "id" | "nombre" | "has_foto"
>;

export type ComentariosPanelProps = {
  entidadTipo: ComentarioEntidadTipo;
  entidadId: string;
  /** Usuario actual; evita un fetch extra a /api/me si ya está disponible arriba */
  currentUser?: ComentariosPanelCurrentUser;
  /** Solo lectura: muestra comentarios sin crear, editar ni eliminar */
  disabled?: boolean;
  variant?: ComentariosVariant;
  maxVisible?: number;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  className?: string;
  /**
   * Si es true, el composer queda oculto hasta pulsar «Nuevo comentario» en el header.
   * @default false
   */
  botonNuevoComentario?: boolean;
};

export function ComentariosPanel({
  entidadTipo,
  entidadId,
  currentUser,
  disabled: readOnly = false,
  variant = "default",
  maxVisible = 5,
  collapsible = false,
  defaultCollapsed = false,
  className = "",
  botonNuevoComentario = false,
}: ComentariosPanelProps) {
  const { toast } = useToast();
  const composerRef = useRef<HTMLDivElement>(null);

  const [comentarios, setComentarios] = useState<ComentarioDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [autorNombre, setAutorNombre] = useState("");
  const [autorId, setAutorId] = useState<string | undefined>();
  const [autorHasFoto, setAutorHasFoto] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setAutorId(currentUser.id);
      setAutorNombre(currentUser.nombre);
      setAutorHasFoto(currentUser.has_foto);
      return;
    }

    let cancelled = false;

    void getCurrentUser()
      .then((user) => {
        if (!cancelled) {
          setAutorId(user.id);
          setAutorNombre(user.nombre);
          setAutorHasFoto(user.has_foto);
        }
      })
      .catch(() => {
        // Sin sesión o error: se mantiene el fallback "Usuario"
      });

    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  // Carga inicial única por entidad; no reintenta si falla.
  useEffect(() => {
    let cancelled = false;

    async function fetchInitial() {
      setLoading(true);
      setLoadError(null);
      setComentarios([]);

      try {
        const data = await fetchComentariosCached(entidadTipo, entidadId);
        if (!cancelled) {
          setComentarios(data);
        }
      } catch (error) {
        if (!cancelled) {
          const message =
            error instanceof Error
              ? error.message
              : "No se pudieron cargar los comentarios";
          setLoadError(message);
          toast.error(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void fetchInitial();

    return () => {
      cancelled = true;
    };
  }, [entidadTipo, entidadId]);

  useEffect(() => {
    setComposerOpen(false);
  }, [entidadTipo, entidadId]);

  const visibleComentarios =
    maxVisible != null && !expanded
      ? comentarios.slice(-maxVisible)
      : comentarios;

  const hiddenCount =
    maxVisible != null && comentarios.length > maxVisible && !expanded
      ? comentarios.length - maxVisible
      : 0;

  const showVerTodas = hiddenCount > 0;

  const loadFailed = loadError != null;
  const mutationsDisabled = readOnly || loadFailed;

  const focusComposer = useCallback(() => {
    if (mutationsDisabled) return;
    composerRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    const textarea = composerRef.current?.querySelector("textarea");
    textarea?.focus();
  }, [mutationsDisabled]);

  const showComposer =
    !readOnly && !loading && (!botonNuevoComentario || composerOpen);

  const showNuevoComentarioButton =
    botonNuevoComentario &&
    !composerOpen &&
    !readOnly &&
    !loadFailed &&
    !loading;

  const handleNuevoComentario = () => {
    setComposerOpen(true);
  };

  useEffect(() => {
    if (!composerOpen) return;
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => focusComposer());
    });
    return () => cancelAnimationFrame(id);
  }, [composerOpen, focusComposer]);

  const handleCreate = async (contenido: string) => {
    if (mutationsDisabled) return;
    try {
      const created = await createComentario({
        entidad_tipo: entidadTipo,
        entidad_id: entidadId,
        contenido,
      });
      appendComentarioToCache(entidadTipo, entidadId, created);
      setComentarios((prev) => [...prev, created]);
      toast.success("Comentario publicado");
      if (botonNuevoComentario) {
        setComposerOpen(false);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo publicar el comentario",
      );
      throw error;
    }
  };

  const handleEdit = async (id: string, contenido: string) => {
    if (mutationsDisabled) return;

    setEditingId(id);
    try {
      const updated = await updateComentario(id, { contenido });
      patchComentarioInCache(entidadTipo, entidadId, updated);
      setComentarios((prev) =>
        prev.map((c) => (c.id === id ? updated : c)),
      );
      toast.success("Comentario actualizado");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo editar el comentario",
      );
      throw error;
    } finally {
      setEditingId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId || mutationsDisabled) return;
    const id = deleteId;
    setDeleteId(null);
    setDeletingId(id);

    try {
      await deleteComentario(id);
      removeComentarioFromCache(entidadTipo, entidadId, id);
      setComentarios((prev) => prev.filter((c) => c.id !== id));
      toast.success("Comentario eliminado");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo eliminar el comentario",
      );
    } finally {
      setDeletingId(null);
    }
  };

  const listClassName =
    variant === "sidebar"
      ? "max-h-[min(24rem,50vh)] overflow-y-auto"
      : maxVisible != null && !expanded
        ? "max-h-64 overflow-y-auto"
        : "";

  return (
    <>
      <Card
        flat={variant !== "default"}
        aria-disabled={loadFailed || readOnly}
        className={`flex flex-col ${variant === "sidebar" ? "h-full min-h-0" : ""} ${loadFailed ? "opacity-60" : ""} ${className}`}
      >
        <CardHeader className={variant === "compact" ? "py-2.5" : undefined}>
          <ComentariosHeader
            variant={variant}
            count={comentarios.length}
            collapsed={collapsed}
            disabled={loadFailed}
            hiddenCount={hiddenCount}
            showVerTodas={showVerTodas}
            onVerTodas={loadFailed ? undefined : () => setExpanded(true)}
            showNuevoComentario={showNuevoComentarioButton}
            onNuevoComentario={
              showNuevoComentarioButton ? handleNuevoComentario : undefined
            }
            onToggleCollapse={
              collapsible && !loadFailed
                ? () => setCollapsed((v) => !v)
                : undefined
            }
          />
        </CardHeader>

        {!collapsed && (
          <CardContent
            className={`flex flex-1 flex-col gap-0 ${variant === "default" ? "" : "p-4 pt-0"} ${variant === "sidebar" ? "min-h-0" : ""} ${loadFailed ? "pointer-events-none" : ""}`}
          >
            <div
              className={`${listClassName} ${showVerTodas ? "relative" : ""}`}
            >
              {showVerTodas && !loading && !loadError && (
                <ComentariosOcultosHint
                  count={hiddenCount}
                  disabled={loadFailed}
                  onShowAll={() => setExpanded(true)}
                />
              )}
              {loading ? (
                <p className="py-6 text-center text-sm text-zinc-400">Cargando comentarios…</p>
              ) : loadError ? (
                <p className="pointer-events-auto py-6 text-center text-sm text-red-600">
                  {loadError}
                </p>
              ) : (
                <ComentarioList
                  comentarios={visibleComentarios}
                  editingId={editingId}
                  deletingId={deletingId}
                  disabled={mutationsDisabled}
                  onEdit={handleEdit}
                  onDelete={setDeleteId}
                />
              )}
            </div>

            {showComposer && (
              <div ref={composerRef}>
                <ComentarioComposer
                  variant={variant}
                  autorId={autorId}
                  autorNombre={autorNombre}
                  autorHasFoto={autorHasFoto}
                  disabled={loadFailed}
                  onSubmit={handleCreate}
                />
              </div>
            )}
          </CardContent>
        )}
      </Card>

      <ConfirmModal
        open={deleteId != null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDeleteConfirm}
        title="Eliminar comentario"
        description="¿Confirmás que querés eliminar este comentario?"
        confirmLabel="Eliminar"
        loading={deletingId != null}
      />
    </>
  );
}
