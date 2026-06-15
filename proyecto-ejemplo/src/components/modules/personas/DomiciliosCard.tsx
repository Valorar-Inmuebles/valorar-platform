"use client";

import { useEffect, useState, useTransition } from "react";

import {
  Card,
  CardHeader,
  CardTitle,
  CardHeaderActions,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ConfirmModal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableHeader,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { ActionIconButton } from "@/components/ui/action-icon-button";
import { Icon } from "@/components/ui/icons";
import { DomicilioSidePanel } from "./DomicilioSidePanel";

import {
  getPersonaDomicilios,
  createPersonaDomicilio,
  updatePersonaDomicilio,
  deletePersonaDomicilio,
  setDomicilioPredeterminado,
  type PersonaDomicilio,
} from "@/lib/api/persona-domicilios";
import {
  CATEGORIA_DOMICILIO_LABELS,
  type CategoriaDomicilio,
  type DomicilioInput,
} from "@/lib/validation/schemas/persona-domicilio.schema";

// ── Local domicilio type (create mode) ────────────────────────────────────────

export type LocalDomicilio = {
  _localId: string;
  categoria: string;
  calle: string;
  numero?: string | null;
  piso?: string | null;
  departamento?: string | null;
  barrio?: string | null;
  localidad_id?: string | null;
  localidad_nombre?: string | null;
  codigo_postal?: string | null;
  descripcion?: string | null;
  predeterminado: boolean;
  activo: boolean;
};

// ── Props ─────────────────────────────────────────────────────────────────────

type CreateModeProps = {
  mode: "create";
  domicilios: LocalDomicilio[];
  onChange: (domicilios: LocalDomicilio[]) => void;
};

type EditModeProps = {
  mode: "edit";
  personaId: string;
  readOnly?: boolean;
};

type Props = CreateModeProps | EditModeProps;

// ── Address helpers ───────────────────────────────────────────────────────────

function formatDireccion(d: PersonaDomicilio | LocalDomicilio): string {
  return [d.calle, d.numero].filter(Boolean).join(" ");
}

function formatPisoDpto(d: PersonaDomicilio | LocalDomicilio): string | null {
  const parts = [
    d.piso ? `Piso ${d.piso}` : null,
    d.departamento ? `Dpto. ${d.departamento}` : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}

// ── DomiciliosCard ────────────────────────────────────────────────────────────

export function DomiciliosCard(props: Props) {
  const readOnly = props.mode === "edit" && Boolean(props.readOnly);
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  // Edit-mode state
  const [domicilios, setDomicilios] = useState<PersonaDomicilio[]>([]);
  const [loading, setLoading] = useState(false);

  // Row-level loading: tracks which domicilio IDs have a pending predeterminado toggle
  const [pendingToggleIds, setPendingToggleIds] = useState<Set<string>>(new Set());

  // Shared UI state
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [editingDomicilio, setEditingDomicilio] = useState<PersonaDomicilio | LocalDomicilio | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sidePanelPending, setSidePanelPending] = useState(false);

  // Load domicilios in edit mode
  useEffect(() => {
    if (props.mode !== "edit") return;
    setLoading(true);
    getPersonaDomicilios(props.personaId)
      .then(setDomicilios)
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.mode === "edit" && props.personaId]);

  // ── Derived data ──────────────────────────────────────────────────────────

  const allDomicilios: (PersonaDomicilio | LocalDomicilio)[] =
    props.mode === "create" ? props.domicilios : domicilios;

  const isOnly = allDomicilios.length <= 1;

  // ── Handlers — create mode ────────────────────────────────────────────────

  function handleCreateModeAdd(data: DomicilioInput) {
    if (props.mode !== "create") return;

    const isFirst = props.domicilios.length === 0;
    const newDomicilio: LocalDomicilio = {
      _localId: `local-${Date.now()}`,
      categoria: data.categoria,
      calle: data.calle,
      numero: data.numero ?? null,
      piso: data.piso ?? null,
      departamento: data.departamento ?? null,
      barrio: data.barrio ?? null,
      localidad_id: data.localidad_id ?? null,
      localidad_nombre: null,
      codigo_postal: data.codigo_postal ?? null,
      descripcion: data.descripcion ?? null,
      predeterminado: isFirst ? true : data.predeterminado,
      activo: data.activo,
    };

    let updated = [...props.domicilios, newDomicilio];

    // Enforce single predeterminado per persona
    if (newDomicilio.predeterminado) {
      updated = updated.map((d) =>
        d._localId !== newDomicilio._localId ? { ...d, predeterminado: false } : d,
      );
    }

    props.onChange(updated);
  }

  function handleCreateModeEdit(localId: string, data: DomicilioInput) {
    if (props.mode !== "create") return;

    let updated = props.domicilios.map((d) =>
      d._localId === localId
        ? {
            ...d,
            categoria: data.categoria,
            calle: data.calle,
            numero: data.numero ?? null,
            piso: data.piso ?? null,
            departamento: data.departamento ?? null,
            barrio: data.barrio ?? null,
            localidad_id: data.localidad_id ?? null,
            codigo_postal: data.codigo_postal ?? null,
            descripcion: data.descripcion ?? null,
            predeterminado: data.predeterminado,
            activo: data.activo,
          }
        : d,
    );

    // Enforce single predeterminado per persona
    if (data.predeterminado) {
      updated = updated.map((d) =>
        d._localId !== localId ? { ...d, predeterminado: false } : d,
      );
    }

    props.onChange(updated);
  }

  function handleCreateModeDelete(localId: string) {
    if (props.mode !== "create") return;
    const remaining = props.domicilios.filter((d) => d._localId !== localId);

    // Promote first if predeterminado was removed
    const deleted = props.domicilios.find((d) => d._localId === localId);
    if (deleted?.predeterminado && remaining.length > 0) {
      props.onChange(
        remaining.map((d, i) => (i === 0 ? { ...d, predeterminado: true } : d)),
      );
      return;
    }

    props.onChange(remaining);
  }

  function handleCreateModeTogglePredeterminado(localId: string) {
    if (props.mode !== "create") return;
    props.onChange(
      props.domicilios.map((d) => ({ ...d, predeterminado: d._localId === localId })),
    );
  }

  // ── Handlers — edit mode ──────────────────────────────────────────────────

  async function handleEditModeAdd(data: DomicilioInput) {
    if (props.mode !== "edit") return;
    setSidePanelPending(true);
    try {
      const isFirst = domicilios.length === 0;
      const payload: DomicilioInput = {
        ...data,
        predeterminado: isFirst ? true : data.predeterminado,
      };
      const created = await createPersonaDomicilio(props.personaId, payload);
      setDomicilios((prev) => {
        const updated =
          isFirst || payload.predeterminado
            ? prev.map((d) => ({ ...d, predeterminado: false }))
            : prev;
        return [...updated, created];
      });
      toast.success("Domicilio agregado");
      setSidePanelOpen(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al agregar domicilio");
    } finally {
      setSidePanelPending(false);
    }
  }

  async function handleEditModeEdit(domicilioId: string, data: DomicilioInput) {
    if (props.mode !== "edit") return;
    setSidePanelPending(true);
    try {
      const updated = await updatePersonaDomicilio(props.personaId, domicilioId, data);
      setDomicilios((prev) => {
        let next = prev.map((d) => (d.id === domicilioId ? updated : d));
        if (data.predeterminado) {
          next = next.map((d) =>
            d.id !== domicilioId ? { ...d, predeterminado: false } : d,
          );
        }
        return next;
      });
      toast.success("Domicilio actualizado");
      setSidePanelOpen(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al actualizar domicilio");
    } finally {
      setSidePanelPending(false);
    }
  }

  function handleEditModeDelete(domicilioId: string) {
    if (props.mode !== "edit") return;
    startTransition(async () => {
      try {
        await deletePersonaDomicilio(props.personaId, domicilioId);
        setDomicilios((prev) => {
          const deleted = prev.find((d) => d.id === domicilioId);
          const remaining = prev.filter((d) => d.id !== domicilioId);
          // Promote first remaining if predeterminado was removed
          if (deleted?.predeterminado && remaining.length > 0) {
            return remaining.map((d, i) => (i === 0 ? { ...d, predeterminado: true } : d));
          }
          return remaining;
        });
        toast.success("Domicilio eliminado");
        setDeletingId(null);
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Error al eliminar domicilio");
      }
    });
  }

  async function handleEditModeTogglePredeterminado(domicilioId: string) {
    if (props.mode !== "edit") return;

    setPendingToggleIds((prev) => new Set(prev).add(domicilioId));

    try {
      await setDomicilioPredeterminado(props.personaId, domicilioId);
      setDomicilios((prev) =>
        prev.map((d) => ({ ...d, predeterminado: d.id === domicilioId })),
      );
      toast.success("Domicilio principal actualizado");
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Error al actualizar predeterminado",
      );
    } finally {
      setPendingToggleIds((prev) => {
        const next = new Set(prev);
        next.delete(domicilioId);
        return next;
      });
    }
  }

  // ── Side panel submit dispatcher ──────────────────────────────────────────

  async function handleSidePanelSubmit(data: DomicilioInput) {
    if (editingDomicilio) {
      if (props.mode === "create") {
        handleCreateModeEdit((editingDomicilio as LocalDomicilio)._localId, data);
        setSidePanelOpen(false);
      } else {
        await handleEditModeEdit((editingDomicilio as PersonaDomicilio).id, data);
      }
    } else {
      if (props.mode === "create") {
        handleCreateModeAdd(data);
        setSidePanelOpen(false);
      } else {
        await handleEditModeAdd(data);
      }
    }
  }

  // ── Open panel helpers ────────────────────────────────────────────────────

  function openAddPanel() {
    setEditingDomicilio(null);
    setSidePanelOpen(true);
  }

  function openEditPanel(domicilio: PersonaDomicilio | LocalDomicilio) {
    setEditingDomicilio(domicilio);
    setSidePanelOpen(true);
  }

  // ── Delete dispatcher ─────────────────────────────────────────────────────

  function handleDeleteConfirm() {
    if (!deletingId) return;
    if (props.mode === "create") {
      handleCreateModeDelete(deletingId);
      setDeletingId(null);
    } else {
      handleEditModeDelete(deletingId);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <ConfirmModal
        open={deletingId !== null}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDeleteConfirm}
        loading={isPending}
        title="Eliminar domicilio"
        description="¿Estás seguro que querés eliminar este domicilio?"
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
      />

      <DomicilioSidePanel
        open={sidePanelOpen}
        onClose={() => setSidePanelOpen(false)}
        onSubmit={handleSidePanelSubmit}
        mode={editingDomicilio ? "edit" : "create"}
        isPending={sidePanelPending}
        initialValues={
          editingDomicilio
            ? {
                categoria: editingDomicilio.categoria as CategoriaDomicilio,
                calle: editingDomicilio.calle,
                numero: editingDomicilio.numero ?? "",
                piso: editingDomicilio.piso ?? "",
                departamento: editingDomicilio.departamento ?? "",
                barrio: editingDomicilio.barrio ?? "",
                localidad_id: editingDomicilio.localidad_id ?? "",
                codigo_postal: editingDomicilio.codigo_postal ?? "",
                descripcion: editingDomicilio.descripcion ?? "",
                predeterminado: editingDomicilio.predeterminado,
                activo: editingDomicilio.activo,
                _provincia_id:
                  props.mode === "edit"
                    ? (editingDomicilio as PersonaDomicilio).localidad_provincia_id ?? ""
                    : "",
                _localidad_nombre: editingDomicilio.localidad_nombre ?? "",
              }
            : undefined
        }
      />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Domicilios</CardTitle>
            {allDomicilios.length > 0 && (
              <Badge variant="neutral">{allDomicilios.length}</Badge>
            )}
          </div>
          {!readOnly && (
            <CardHeaderActions>
              <Button
                variant="outline-primary"
                size="md"
                type="button"
                onClick={openAddPanel}
                leftIcon={<Icon.PlusSm className="size-3.5" />}
              >
                Agregar domicilio
              </Button>
            </CardHeaderActions>
          )}
        </CardHeader>

        {loading && (
          <div className="px-5 py-6 text-center text-sm text-zinc-400">
            Cargando domicilios…
          </div>
        )}

        {!loading && allDomicilios.length === 0 && (
          <div className="px-5 py-6 text-center text-sm text-zinc-400">
            Sin domicilios registrados
          </div>
        )}

        {!loading && allDomicilios.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <TableHeader>
                <TableRow>
                  <TableCell isHeader className="pl-5">Dirección</TableCell>
                  <TableCell isHeader>Localidad</TableCell>
                  <TableCell isHeader>Categoría</TableCell>
                  <TableCell isHeader>Estado</TableCell>
                  <TableCell isHeader align="center">Principal</TableCell>
                  {!readOnly && (
                    <TableCell isHeader align="right" className="pr-4">
                      Acciones
                    </TableCell>
                  )}
                </TableRow>
              </TableHeader>
              <tbody>
                {allDomicilios.map((domicilio) => {
                  const id =
                    props.mode === "create"
                      ? (domicilio as LocalDomicilio)._localId
                      : (domicilio as PersonaDomicilio).id;

                  const isToggling =
                    props.mode === "edit" && pendingToggleIds.has(id);

                  const pisoDpto = formatPisoDpto(domicilio);

                  return (
                    <TableRow
                      key={id}
                      className={`relative transition-colors duration-200${isToggling ? " pointer-events-none" : ""}`}
                    >
                      {/* Dirección */}
                      <TableCell className="pl-5">
                        <span className="font-medium text-zinc-900">
                          {formatDireccion(domicilio)}
                        </span>
                        {pisoDpto && (
                          <span className="ml-1.5 text-xs text-zinc-400">
                            {pisoDpto}
                          </span>
                        )}
                        {domicilio.descripcion && (
                          <p className="mt-0.5 text-xs text-zinc-400">
                            {domicilio.descripcion}
                          </p>
                        )}
                      </TableCell>

                      {/* Localidad */}
                      <TableCell>
                        {domicilio.localidad_nombre ? (
                          <span className="text-zinc-700">
                            {domicilio.localidad_nombre}
                          </span>
                        ) : domicilio.barrio ? (
                          <span className="text-zinc-700">{domicilio.barrio}</span>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                        {domicilio.localidad_nombre && domicilio.barrio && (
                          <p className="mt-0.5 text-xs text-zinc-400">
                            {domicilio.barrio}
                          </p>
                        )}
                      </TableCell>

                      {/* Categoría */}
                      <TableCell>
                        <Badge variant="neutral">
                          {CATEGORIA_DOMICILIO_LABELS[
                            domicilio.categoria as CategoriaDomicilio
                          ] ?? domicilio.categoria}
                        </Badge>
                      </TableCell>

                      {/* Estado */}
                      <TableCell>
                        <Badge variant={domicilio.activo ? "success" : "neutral"}>
                          {domicilio.activo ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>

                      {/* Principal */}
                      <TableCell align="center">
                        {readOnly ? (
                          domicilio.predeterminado ? (
                            <Badge variant="success">Sí</Badge>
                          ) : (
                            <span className="text-zinc-400">—</span>
                          )
                        ) : (
                          <Switch
                            size="sm"
                            checked={domicilio.predeterminado}
                            disabled={
                              (isOnly && domicilio.predeterminado) || isToggling
                            }
                            onChange={() => {
                              if (domicilio.predeterminado) return;
                              if (props.mode === "create") {
                                handleCreateModeTogglePredeterminado(
                                  (domicilio as LocalDomicilio)._localId,
                                );
                              } else {
                                handleEditModeTogglePredeterminado(
                                  (domicilio as PersonaDomicilio).id,
                                );
                              }
                            }}
                          />
                        )}
                      </TableCell>

                      {/* Acciones */}
                      {!readOnly && (
                      <TableCell align="right" className="pr-4">
                        <div className="flex items-center justify-end gap-0.5">
                          <ActionIconButton
                            aria-label="Editar domicilio"
                            onClick={() => openEditPanel(domicilio)}
                          >
                            <Icon.Edit />
                          </ActionIconButton>

                          <ActionIconButton
                            variant="destructive"
                            aria-label="Eliminar domicilio"
                            onClick={() => setDeletingId(id)}
                          >
                            <Icon.Trash />
                          </ActionIconButton>
                        </div>
                      </TableCell>
                      )}

                      {/* Row-level overlay for predeterminado toggle */}
                      {isToggling && (
                        <td
                          aria-hidden
                          className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-white/50 backdrop-blur-[0.5px] transition-opacity duration-200"
                        >
                          <Spinner size="sm" />
                        </td>
                      )}
                    </TableRow>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
