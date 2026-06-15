"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import {
  getAgendaViewPreference,
  saveAgendaViewPreference,
} from "@/lib/agenda/agenda-view-preference";
import {
  anchorToDateKey,
  dateFromKey,
  formatViewTitle,
  getViewRange,
  navigateAnchor,
  parseAnchorDate,
  type AgendaViewMode,
} from "@/lib/agenda/agenda-view-range";
import {
  getAgendaEvento,
  getAgendaEventosTenant,
  updateAgendaEvento,
  type AgendaEventosTenantFilters,
} from "@/lib/api/agenda.api";
import { getCurrentUser } from "@/lib/api/me.api";
import type { AgendaEntidadPadreFilterTipo, AgendaEventoDto } from "@/lib/types/agenda";
import type { CurrentUserDto } from "@/lib/types/me";

import type { AgendaCreateSlot } from "@/lib/agenda/agenda-create-slot";

import {
  AgendaContextMenu,
  type AgendaContextMenuState,
} from "./AgendaContextMenu";
import { AgendaDayView } from "./AgendaDayView";
import { AgendaEventoSidePanel } from "./AgendaEventoSidePanel";
import { AgendaFilters, type AgendaFiltersState } from "./AgendaFilters";
import { AgendaMonthView } from "./AgendaMonthView";
import { AgendaToolbar } from "./AgendaToolbar";
import { AgendaWeekView } from "./AgendaWeekView";

const EMPTY_PARTICIPANT_IDS: string[] = [];

/**
 * En `/agenda`: si es `true`, al crear un evento el padre (expediente, caso, etc.) es obligatorio.
 * Si es `false`, el evento puede guardarse sin asociación.
 */
const AGENDA_CREAR_EVENTO_REQUIERE_PADRE = false;

function parseView(value: string | null): AgendaViewMode {
  if (value === "day" || value === "week" || value === "month") return value;
  return "week";
}

function filtersFromSearchParams(
  params: URLSearchParams,
): AgendaFiltersState {
  const entidadTipo = params.get("entidad_tipo");
  const validTipos: AgendaEntidadPadreFilterTipo[] = [
    "expediente",
    "caso",
    "cliente",
    "legajo",
  ];

  return {
    tipo_id: params.get("tipo_id") ?? undefined,
    participante_id: params.get("participante_id") ?? undefined,
    entidad_tipo:
      entidadTipo && validTipos.includes(entidadTipo as AgendaEntidadPadreFilterTipo)
        ? (entidadTipo as AgendaEntidadPadreFilterTipo)
        : undefined,
    entidad_id: params.get("entidad_id") ?? undefined,
  };
}

function buildSearchParams(
  view: AgendaViewMode,
  anchor: Date,
  filters: AgendaFiltersState,
): URLSearchParams {
  const params = new URLSearchParams();
  params.set("v", view);
  params.set("fecha", anchorToDateKey(anchor));

  if (filters.tipo_id) params.set("tipo_id", filters.tipo_id);
  if (filters.participante_id) params.set("participante_id", filters.participante_id);
  if (filters.entidad_tipo) params.set("entidad_tipo", filters.entidad_tipo);
  if (filters.entidad_id) params.set("entidad_id", filters.entidad_id);

  return params;
}

export function AgendaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const view = parseView(searchParams.get("v"));
  const anchor = parseAnchorDate(searchParams.get("fecha"));
  const eventoIdFromUrl = searchParams.get("evento_id");
  const filters = useMemo(
    () => filtersFromSearchParams(searchParams),
    [searchParams],
  );

  const [eventos, setEventos] = useState<AgendaEventoDto[]>([]);
  const [loading, setLoading] = useState(true);

  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [selectedEvento, setSelectedEvento] = useState<AgendaEventoDto | null>(
    null,
  );
  const [createPanelOpen, setCreatePanelOpen] = useState(false);
  const [createSlot, setCreateSlot] = useState<AgendaCreateSlot | null>(null);
  const [contextMenu, setContextMenu] = useState<AgendaContextMenuState | null>(
    null,
  );
  const [userId, setUserId] = useState<string | undefined>();
  const [currentUser, setCurrentUser] = useState<CurrentUserDto | undefined>();
  const openedEventoIdRef = useRef<string | null>(null);

  const title = formatViewTitle(view, anchor);
  const range = getViewRange(view, anchor);
  const defaultParticipanteIdsForCreate = useMemo(
    () => (userId ? [userId] : EMPTY_PARTICIPANT_IDS),
    [userId],
  );

  const syncUrl = useCallback(
    (
      nextView: AgendaViewMode,
      nextAnchor: Date,
      nextFilters: AgendaFiltersState,
    ) => {
      const params = buildSearchParams(nextView, nextAnchor, nextFilters);
      router.replace(`/agenda?${params.toString()}`, { scroll: false });
    },
    [router],
  );

  const loadEventos = useCallback(async () => {
    setLoading(true);
    try {
      const query: AgendaEventosTenantFilters = {
        desde: range.desde,
        hasta: range.hasta,
        tipo_id: filters.tipo_id,
        participante_id: filters.participante_id,
        entidad_tipo: filters.entidad_tipo,
        entidad_id: filters.entidad_id,
      };
      const data = await getAgendaEventosTenant(query);
      setEventos(data);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudieron cargar los eventos",
      );
      setEventos([]);
    } finally {
      setLoading(false);
    }
  }, [range.desde, range.hasta, filters, toast]);

  useEffect(() => {
    void loadEventos();
  }, [loadEventos]);

  useEffect(() => {
    if (!eventoIdFromUrl) {
      openedEventoIdRef.current = null;
      return;
    }

    if (openedEventoIdRef.current === eventoIdFromUrl) return;

    const fromList = eventos.find((evento) => evento.id === eventoIdFromUrl);
    if (fromList) {
      openedEventoIdRef.current = eventoIdFromUrl;
      setSelectedEvento(fromList);
      setSidePanelOpen(true);
      return;
    }

    if (loading) return;

    let cancelled = false;
    void getAgendaEvento(eventoIdFromUrl)
      .then((evento) => {
        if (cancelled) return;
        openedEventoIdRef.current = eventoIdFromUrl;
        setSelectedEvento(evento);
        setSidePanelOpen(true);
      })
      .catch(() => {
        if (cancelled) return;
        toast.error("No se pudo abrir el evento");
      });

    return () => {
      cancelled = true;
    };
  }, [eventoIdFromUrl, eventos, loading, toast]);

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
    if (searchParams.get("v")) return;

    const preferred = getAgendaViewPreference(userId);
    if (!preferred) return;

    syncUrl(
      preferred,
      parseAnchorDate(searchParams.get("fecha")),
      filtersFromSearchParams(searchParams),
    );
  }, [searchParams, userId, syncUrl]);

  function handleViewChange(nextView: AgendaViewMode) {
    saveAgendaViewPreference(nextView, userId);
    syncUrl(nextView, anchor, filters);
  }

  function handleNavigate(direction: -1 | 1) {
    syncUrl(view, navigateAnchor(view, anchor, direction), filters);
  }

  function handleToday() {
    syncUrl(view, new Date(), filters);
  }

  function handleFiltersChange(nextFilters: AgendaFiltersState) {
    syncUrl(view, anchor, nextFilters);
  }

  function handleDayClick(dateKey: string) {
    syncUrl("day", dateFromKey(dateKey), filters);
  }

  function handleEventoClick(evento: AgendaEventoDto) {
    setSelectedEvento(evento);
    setSidePanelOpen(true);
  }

  function handleSlotContextMenu(event: MouseEvent, slot: AgendaCreateSlot) {
    event.preventDefault();
    setContextMenu({
      kind: "slot",
      x: event.clientX,
      y: event.clientY,
      slot,
    });
  }

  function handleEventoContextMenu(event: MouseEvent, evento: AgendaEventoDto) {
    event.preventDefault();
    setContextMenu({
      kind: "evento",
      x: event.clientX,
      y: event.clientY,
      evento,
    });
  }

  function handleContextMenuNewEvent() {
    if (!contextMenu || contextMenu.kind !== "slot") return;
    setCreateSlot(contextMenu.slot);
    setCreatePanelOpen(true);
  }

  function handleContextMenuEditEvento(evento: AgendaEventoDto) {
    handleEventoClick(evento);
  }

  async function handleContextMenuMarkEstado(
    evento: AgendaEventoDto,
    estado: "realizado" | "cancelado",
  ) {
    if (!evento.puedeCambiarEstado) {
      toast.error("No podés cambiar el estado de este evento");
      return;
    }

    try {
      const updated = await updateAgendaEvento(evento.id, { estado });
      const message =
        estado === "realizado"
          ? "Evento marcado como realizado"
          : "Evento cancelado";
      toast.success(message);
      handleSaved(updated);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo actualizar el estado del evento",
      );
    }
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

  return (
    <div className="space-y-4">
      <AgendaToolbar
        view={view}
        title={title}
        onViewChange={handleViewChange}
        onPrev={() => handleNavigate(-1)}
        onNext={() => handleNavigate(1)}
        onToday={handleToday}
      />

      <AgendaFilters value={filters} onChange={handleFiltersChange} />

      <div className="relative min-h-[320px]">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/70">
            <Spinner className="size-6" />
          </div>
        )}

        {!loading && view === "day" && (
          <AgendaDayView
            anchor={anchor}
            eventos={eventos}
            onEventoClick={handleEventoClick}
            onSlotContextMenu={handleSlotContextMenu}
            onEventoContextMenu={handleEventoContextMenu}
          />
        )}

        {!loading && view === "week" && (
          <AgendaWeekView
            anchor={anchor}
            eventos={eventos}
            onEventoClick={handleEventoClick}
            onSlotContextMenu={handleSlotContextMenu}
            onEventoContextMenu={handleEventoContextMenu}
          />
        )}

        {!loading && view === "month" && (
          <AgendaMonthView
            anchor={anchor}
            eventos={eventos}
            onEventoClick={handleEventoClick}
            onDayClick={handleDayClick}
            onSlotContextMenu={handleSlotContextMenu}
            onEventoContextMenu={handleEventoContextMenu}
          />
        )}
      </div>

      <AgendaEventoSidePanel
        open={sidePanelOpen && selectedEvento != null}
        onClose={() => {
          setSidePanelOpen(false);
          setSelectedEvento(null);
        }}
        mode="edit"
        entidadTipo={selectedEvento?.padre?.entidadTipo}
        entidadId={selectedEvento?.padre?.entidadId}
        evento={selectedEvento}
        currentUser={currentUser}
        onSaved={handleSaved}
      />

      <AgendaEventoSidePanel
        open={createPanelOpen}
        onClose={() => {
          setCreatePanelOpen(false);
          setCreateSlot(null);
        }}
        mode="create"
        entidadTipo={filters.entidad_tipo}
        entidadId={filters.entidad_id}
        requirePadre={AGENDA_CREAR_EVENTO_REQUIERE_PADRE}
        createDefaults={createSlot}
        defaultParticipanteIds={defaultParticipanteIdsForCreate}
        currentUser={currentUser}
        onSaved={handleSaved}
      />

      <AgendaContextMenu
        state={contextMenu}
        onClose={() => setContextMenu(null)}
        onNewEvent={handleContextMenuNewEvent}
        onEditEvento={handleContextMenuEditEvento}
        onMarkRealizado={(evento) =>
          void handleContextMenuMarkEstado(evento, "realizado")
        }
        onMarkCancelado={(evento) =>
          void handleContextMenuMarkEstado(evento, "cancelado")
        }
      />
    </div>
  );
}
