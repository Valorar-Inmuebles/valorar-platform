"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { ConfirmModal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import {
  deleteAgendaEvento,
  getAgendaEventos,
} from "@/lib/api/agenda.api";
import { getCurrentUser } from "@/lib/api/me.api";
import type {
  AgendaEntidadTipo,
  AgendaEventoDto,
  AgendaVariant,
} from "@/lib/types/agenda";
import type { CurrentUserDto } from "@/lib/types/me";

import { AgendaEventoList } from "./AgendaEventoList";
import { AgendaEventoSidePanel } from "./AgendaEventoSidePanel";
import { AgendaHeader } from "./AgendaHeader";

const EMPTY_PARTICIPANT_IDS: string[] = [];

export type AgendaPanelProps = {
  entidadTipo: AgendaEntidadTipo;
  entidadId: string;
  variant?: AgendaVariant;
  /** Solo lectura: sin crear, editar ni cambiar estado */
  disabled?: boolean;
  maxVisible?: number;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  className?: string;
  /** Muestra link «Ver calendario completo» → /agenda */
  showCalendarioLink?: boolean;
  /** Usuarios preseleccionados al crear un evento desde el panel */
  defaultParticipanteIds?: string[];
};

export function AgendaPanel({
  entidadTipo,
  entidadId,
  variant = "default",
  disabled: readOnly = false,
  maxVisible = 5,
  collapsible = false,
  defaultCollapsed = false,
  className = "",
  showCalendarioLink = true,
  defaultParticipanteIds = EMPTY_PARTICIPANT_IDS,
}: AgendaPanelProps) {
  const { toast } = useToast();
  const contextEntidad = useMemo(
    () => ({ entidadTipo, entidadId }),
    [entidadTipo, entidadId],
  );

  const enabled = Boolean(entidadId);
  const mutationsDisabled = readOnly || !enabled;

  const [eventos, setEventos] = useState<AgendaEventoDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [sidePanelMode, setSidePanelMode] = useState<"create" | "edit">("create");
  const [selectedEvento, setSelectedEvento] = useState<AgendaEventoDto | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [userId, setUserId] = useState<string | undefined>();
  const [currentUser, setCurrentUser] = useState<CurrentUserDto | undefined>();

  const resolvedDefaultParticipanteIds = useMemo(() => {
    if (defaultParticipanteIds.length > 0) return defaultParticipanteIds;
    return userId ? [userId] : EMPTY_PARTICIPANT_IDS;
  }, [defaultParticipanteIds, userId]);

  const loadEventos = useCallback(async () => {
    if (!enabled) {
      setEventos([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);
    try {
      const data = await getAgendaEventos(entidadTipo, entidadId);
      setEventos(data);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudieron cargar los eventos";
      setLoadError(message);
      setEventos([]);
    } finally {
      setLoading(false);
    }
  }, [entidadTipo, entidadId, enabled]);

  useEffect(() => {
    void loadEventos();
  }, [loadEventos]);

  useEffect(() => {
    let cancelled = false;
    void getCurrentUser()
      .then((user) => {
        if (!cancelled) {
          setCurrentUser(user);
          setUserId(user.id);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCurrentUser(undefined);
          setUserId(undefined);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setSidePanelOpen(false);
    setSelectedEvento(null);
    setDeleteId(null);
    setExpanded(false);
  }, [entidadTipo, entidadId]);

  useEffect(() => {
    if (loadError) {
      toast.error(loadError);
    }
  }, [loadError, toast]);

  const visibleEventos =
    expanded || maxVisible <= 0
      ? eventos
      : eventos.slice(0, maxVisible);

  const hiddenCount = Math.max(0, eventos.length - visibleEventos.length);
  const showVerTodos = hiddenCount > 0 && !expanded;

  const listClassName =
    variant === "sidebar"
      ? "max-h-[min(24rem,50vh)] overflow-y-auto"
      : maxVisible != null && !expanded
        ? "max-h-64 overflow-y-auto"
        : "";

  function openCreate() {
    setSidePanelMode("create");
    setSelectedEvento(null);
    setSidePanelOpen(true);
  }

  function openEdit(evento: AgendaEventoDto) {
    setSidePanelMode("edit");
    setSelectedEvento(evento);
    setSidePanelOpen(true);
  }

  function handleSaved(evento: AgendaEventoDto) {
    setEventos((prev) => {
      const idx = prev.findIndex((e) => e.id === evento.id);
      if (idx === -1) {
        return [...prev, evento].sort(
          (a, b) =>
            new Date(a.inicioAt).getTime() - new Date(b.inicioAt).getTime(),
        );
      }
      const next = [...prev];
      next[idx] = evento;
      return next;
    });
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await deleteAgendaEvento(deleteId);
      setEventos((prev) => prev.filter((e) => e.id !== deleteId));
      toast.success("Evento eliminado");
      setDeleteId(null);
      if (selectedEvento?.id === deleteId) {
        setSidePanelOpen(false);
        setSelectedEvento(null);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo eliminar el evento",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Card
        flat={variant !== "default"}
        aria-disabled={loadError != null || readOnly}
        className={`flex flex-col ${variant === "sidebar" ? "h-full min-h-0" : ""} ${loadError ? "opacity-60" : ""} ${className}`}
      >
        <CardHeader className={variant === "compact" ? "py-2.5" : undefined}>
          <AgendaHeader
            variant={variant}
            count={eventos.length}
            collapsed={collapsed}
            disabled={mutationsDisabled || loading || loadError != null}
            hiddenCount={hiddenCount}
            showVerTodos={showVerTodos}
            onVerTodos={loadError ? undefined : () => setExpanded(true)}
            onNuevoEvento={mutationsDisabled ? undefined : openCreate}
            onToggleCollapse={
              collapsible && !loadError
                ? () => setCollapsed((v) => !v)
                : undefined
            }
          />
        </CardHeader>

        {!collapsed && (
          <CardContent
            className={`flex flex-1 flex-col gap-0 ${variant === "default" ? "pt-0" : "p-4 pt-0"} ${variant === "sidebar" ? "min-h-0" : ""} ${loadError ? "pointer-events-none" : ""}`}
          >
            <div className={listClassName}>
              {loading ? (
                <p className="py-6 text-center text-sm text-zinc-400">
                  Cargando eventos…
                </p>
              ) : loadError ? (
                <p className="pointer-events-auto py-6 text-center text-sm text-red-600">
                  {loadError}
                </p>
              ) : (
                <AgendaEventoList
                  eventos={visibleEventos}
                  onEventoClick={openEdit}
                  showResumenTooltip
                  rowVariant={variant}
                />
              )}
            </div>

            {showCalendarioLink && variant === "default" && (
              <div className="mt-4 border-t border-zinc-200 pt-3">
                <Link
                  href="/agenda"
                  className="text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  Ver calendario completo
                </Link>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      <AgendaEventoSidePanel
        open={sidePanelOpen}
        onClose={() => setSidePanelOpen(false)}
        mode={sidePanelMode}
        entidadTipo={entidadTipo}
        entidadId={entidadId}
        contextEntidad={contextEntidad}
        evento={selectedEvento}
        defaultParticipanteIds={resolvedDefaultParticipanteIds}
        currentUser={currentUser}
        readOnly={readOnly}
        onSaved={handleSaved}
      />

      <ConfirmModal
        open={deleteId != null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Eliminar evento"
        description="Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        loading={deleting}
      />
    </>
  );
}
