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
import {
  Table,
  TableHeader,
  TableRow,
  TableCell,
} from "@/components/ui/table";

import { ActionIconButton } from "@/components/ui/action-icon-button";
import { Icon } from "@/components/ui/icons";
import { ContactoSidePanel } from "./ContactoSidePanel";

import {
  getPersonaContactos,
  createPersonaContacto,
  updatePersonaContacto,
  deletePersonaContacto,
  setContactoPredeterminado,
  type PersonaContacto,
} from "@/lib/api/persona-contactos";
import {
  CANAL_LABELS,
  CATEGORIA_LABELS,
  type ContactoInput,
  type Canal,
} from "@/lib/validation/schemas/persona-contacto.schema";

// ── Local contacto type (create mode) ─────────────────────────────────────────

export type LocalContacto = {
  _localId: string;
  canal: string;
  categoria: string;
  valor: string;
  descripcion?: string | null;
  predeterminado: boolean;
  verificado: boolean;
  pais_codigo: string;
};

// ── Props ─────────────────────────────────────────────────────────────────────

type CreateModeProps = {
  mode: "create";
  contactos: LocalContacto[];
  onChange: (contactos: LocalContacto[]) => void;
};

type EditModeProps = {
  mode: "edit";
  personaId: string;
  readOnly?: boolean;
};

type Props = CreateModeProps | EditModeProps;

// ── Canal icons ───────────────────────────────────────────────────────────────

function CanalIcon({ canal }: { canal: string }) {
  if (canal === "email") {
    return (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-3.5" aria-hidden>
        <rect x="1" y="3" width="14" height="10" rx="1.5" />
        <path d="m1 4 7 5 7-5" />
      </svg>
    );
  }
  if (canal === "telefono") {
    return (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-3.5" aria-hidden>
        <path d="M2 2.5A1.5 1.5 0 0 1 3.5 1h1.618a1.5 1.5 0 0 1 1.393.941l.65 1.626A1.5 1.5 0 0 1 6.8 5.2l-.75.75a9.052 9.052 0 0 0 3.999 4l.75-.75a1.5 1.5 0 0 1 1.633-.361l1.626.65A1.5 1.5 0 0 1 15 11v1.5a1.5 1.5 0 0 1-1.5 1.5C6.044 14 2 9.956 2 4.5V2.5Z" />
      </svg>
    );
  }
  if (canal === "whatsapp") {
    return (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-3.5" aria-hidden>
        <circle cx="8" cy="8" r="6.5" />
        <path d="M5 10c.3.6 1 1.5 2.5 1.5C9.5 11.5 11 10 11 8s-1.5-3-3-3S5 6.5 5 8c0 .7.2 1.3.5 1.7L5 11l1.5-.5" />
      </svg>
    );
  }
  if (canal === "web") {
    return (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-3.5" aria-hidden>
        <circle cx="8" cy="8" r="6.5" />
        <path d="M1.5 8h13M8 1.5C6.5 3.5 5.5 5.5 5.5 8s1 4.5 2.5 6.5M8 1.5c1.5 2 2.5 4 2.5 6.5s-1 4.5-2.5 6.5" />
      </svg>
    );
  }
  return null;
}

function EditIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-3.5" aria-hidden>
      <path d="m11.5 2.5 2 2L5 13H3v-2L11.5 2.5Z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-3.5" aria-hidden>
      <path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 9a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-9" />
    </svg>
  );
}

// ── Row overlay spinner ───────────────────────────────────────────────────────
// Rendered inside an absolutely-positioned <td> that covers the entire row.
// The spinner itself stays at full opacity since the overlay — not the row —
// carries the dimming. Size and color are tuned for the white/50 backdrop.

function RowSpinner() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      className="size-3.5 animate-spin text-zinc-400 shrink-0"
      aria-hidden
    >
      <path d="M8 2a6 6 0 1 0 0 12A6 6 0 0 0 8 2Z" strokeOpacity="0.2" />
      <path d="M8 2a6 6 0 0 1 6 6" />
    </svg>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function canalCountByType(
  contactos: (PersonaContacto | LocalContacto)[],
): Record<string, number> {
  return contactos.reduce(
    (acc, c) => ({ ...acc, [c.canal]: (acc[c.canal] ?? 0) + 1 }),
    {} as Record<string, number>,
  );
}

// ── ContactosCard ─────────────────────────────────────────────────────────────

export function ContactosCard(props: Props) {
  const readOnly = props.mode === "edit" && Boolean(props.readOnly);
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  // Edit-mode state
  const [contactos, setContactos] = useState<PersonaContacto[]>([]);
  const [loading, setLoading] = useState(false);

  // Row-level loading: tracks which contacto IDs have a pending predeterminado toggle
  const [pendingToggleIds, setPendingToggleIds] = useState<Set<string>>(new Set());

  // Shared UI state
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [editingContacto, setEditingContacto] = useState<PersonaContacto | LocalContacto | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sidePanelPending, setSidePanelPending] = useState(false);

  // Load contactos in edit mode
  useEffect(() => {
    if (props.mode !== "edit") return;
    setLoading(true);
    getPersonaContactos(props.personaId)
      .then(setContactos)
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.mode === "edit" && props.personaId]);

  // ── Derived data ─────────────────────────────────────────────────────────────

  const allContactos: (PersonaContacto | LocalContacto)[] =
    props.mode === "create" ? props.contactos : contactos;

  const canalCount = canalCountByType(allContactos);

  // ── Handlers — create mode ────────────────────────────────────────────────────

  function handleCreateModeAdd(data: ContactoInput) {
    if (props.mode !== "create") return;

    const isFirstOfCanal = !allContactos.some((c) => c.canal === data.canal);
    const newContacto: LocalContacto = {
      _localId: `local-${Date.now()}`,
      canal: data.canal,
      categoria: data.categoria,
      valor: data.valor,
      descripcion: data.descripcion ?? null,
      predeterminado: isFirstOfCanal ? true : data.predeterminado,
      verificado: data.verificado,
      pais_codigo: data.pais_codigo,
    };

    let updated = [...props.contactos, newContacto];

    // Enforce single predeterminado per canal
    if (newContacto.predeterminado) {
      updated = updated.map((c) =>
        c._localId !== newContacto._localId && c.canal === newContacto.canal
          ? { ...c, predeterminado: false }
          : c,
      );
    }

    props.onChange(updated);
  }

  function handleCreateModeEdit(localId: string, data: ContactoInput) {
    if (props.mode !== "create") return;

    let updated = props.contactos.map((c) =>
      c._localId === localId
        ? { ...c, ...data }
        : c,
    );

    // Enforce single predeterminado per canal
    if (data.predeterminado) {
      updated = updated.map((c) =>
        c._localId !== localId && c.canal === data.canal
          ? { ...c, predeterminado: false }
          : c,
      );
    }

    props.onChange(updated);
  }

  function handleCreateModeDelete(localId: string) {
    if (props.mode !== "create") return;
    const remaining = props.contactos.filter((c) => c._localId !== localId);

    // If we removed the predeterminado, promote the first of that canal
    const deleted = props.contactos.find((c) => c._localId === localId);
    if (deleted?.predeterminado) {
      const firstOfCanal = remaining.find((c) => c.canal === deleted.canal);
      if (firstOfCanal) {
        props.onChange(
          remaining.map((c) =>
            c._localId === firstOfCanal._localId
              ? { ...c, predeterminado: true }
              : c,
          ),
        );
        return;
      }
    }
    props.onChange(remaining);
  }

  function handleCreateModeTogglePredeterminado(localId: string, canal: string) {
    if (props.mode !== "create") return;
    const updated = props.contactos.map((c) =>
      c.canal === canal
        ? { ...c, predeterminado: c._localId === localId }
        : c,
    );
    props.onChange(updated);
  }

  // ── Handlers — edit mode ──────────────────────────────────────────────────────

  async function handleEditModeAdd(data: ContactoInput) {
    if (props.mode !== "edit") return;
    setSidePanelPending(true);
    try {
      const isFirstOfCanal = !contactos.some((c) => c.canal === data.canal);
      const payload: ContactoInput = {
        ...data,
        predeterminado: isFirstOfCanal ? true : data.predeterminado,
      };
      const created = await createPersonaContacto(props.personaId, payload);
      setContactos((prev) => {
        const updated = isFirstOfCanal || payload.predeterminado
          ? prev.map((c) =>
              c.canal === created.canal ? { ...c, predeterminado: false } : c,
            )
          : prev;
        return [...updated, created];
      });
      toast.success("Contacto agregado");
      setSidePanelOpen(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al agregar contacto");
    } finally {
      setSidePanelPending(false);
    }
  }

  async function handleEditModeEdit(contactoId: string, data: ContactoInput) {
    if (props.mode !== "edit") return;
    setSidePanelPending(true);
    try {
      const updated = await updatePersonaContacto(props.personaId, contactoId, data);
      setContactos((prev) => {
        let next = prev.map((c) => (c.id === contactoId ? updated : c));
        if (data.predeterminado) {
          next = next.map((c) =>
            c.id !== contactoId && c.canal === data.canal
              ? { ...c, predeterminado: false }
              : c,
          );
        }
        return next;
      });
      toast.success("Contacto actualizado");
      setSidePanelOpen(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al actualizar contacto");
    } finally {
      setSidePanelPending(false);
    }
  }

  function handleEditModeDelete(contactoId: string) {
    if (props.mode !== "edit") return;
    startTransition(async () => {
      try {
        await deletePersonaContacto(props.personaId, contactoId);
        setContactos((prev) => {
          const deleted = prev.find((c) => c.id === contactoId);
          const remaining = prev.filter((c) => c.id !== contactoId);
          // Promote first of canal if predeterminado was removed
          if (deleted?.predeterminado) {
            const firstOfCanal = remaining.find((c) => c.canal === deleted.canal);
            if (firstOfCanal) {
              return remaining.map((c) =>
                c.id === firstOfCanal.id ? { ...c, predeterminado: true } : c,
              );
            }
          }
          return remaining;
        });
        toast.success("Contacto eliminado");
        setDeletingId(null);
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Error al eliminar contacto");
      }
    });
  }

  async function handleEditModeTogglePredeterminado(
    contactoId: string,
    canal: string,
  ) {
    if (props.mode !== "edit") return;

    setPendingToggleIds((prev) => new Set(prev).add(contactoId));

    try {
      await setContactoPredeterminado(props.personaId, contactoId, canal);
      setContactos((prev) =>
        prev.map((c) =>
          c.canal === canal
            ? { ...c, predeterminado: c.id === contactoId }
            : c,
        ),
      );
      toast.success("Contacto principal actualizado");
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Error al actualizar predeterminado",
      );
    } finally {
      setPendingToggleIds((prev) => {
        const next = new Set(prev);
        next.delete(contactoId);
        return next;
      });
    }
  }

  // ── Side panel submit dispatcher ─────────────────────────────────────────────

  async function handleSidePanelSubmit(data: ContactoInput) {
    if (editingContacto) {
      // Edit
      if (props.mode === "create") {
        handleCreateModeEdit((editingContacto as LocalContacto)._localId, data);
        setSidePanelOpen(false);
      } else {
        await handleEditModeEdit((editingContacto as PersonaContacto).id, data);
      }
    } else {
      // Create
      if (props.mode === "create") {
        handleCreateModeAdd(data);
        setSidePanelOpen(false);
      } else {
        await handleEditModeAdd(data);
      }
    }
  }

  // ── Open panel helpers ────────────────────────────────────────────────────────

  function openAddPanel() {
    setEditingContacto(null);
    setSidePanelOpen(true);
  }

  function openEditPanel(contacto: PersonaContacto | LocalContacto) {
    setEditingContacto(contacto);
    setSidePanelOpen(true);
  }

  // ── Delete dispatcher ─────────────────────────────────────────────────────────

  function handleDeleteConfirm() {
    if (!deletingId) return;
    if (props.mode === "create") {
      handleCreateModeDelete(deletingId);
      setDeletingId(null);
    } else {
      handleEditModeDelete(deletingId);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <>
      <ConfirmModal
        open={deletingId !== null}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDeleteConfirm}
        loading={isPending}
        title="Eliminar contacto"
        description="¿Estás seguro que querés eliminar este medio de contacto?"
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
      />

      <ContactoSidePanel
        open={sidePanelOpen}
        onClose={() => setSidePanelOpen(false)}
        onSubmit={handleSidePanelSubmit}
        mode={editingContacto ? "edit" : "create"}
        isPending={sidePanelPending}
        initialValues={
          editingContacto
            ? {
                canal: editingContacto.canal as Canal,
                categoria: editingContacto.categoria as any,
                valor: editingContacto.valor,
                descripcion: editingContacto.descripcion ?? "",
                predeterminado: editingContacto.predeterminado,
                verificado: editingContacto.verificado,
                pais_codigo: editingContacto.pais_codigo,
              }
            : undefined
        }
      />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Contactos</CardTitle>
            {allContactos.length > 0 && (
              <Badge variant="neutral">{allContactos.length}</Badge>
            )}
          </div>
          {!readOnly && (
            <CardHeaderActions>
              <Button
                variant="outline-primary"
                size="md"
                type="button"
                onClick={openAddPanel}
                leftIcon={<PlusIcon />}
              >
                Agregar contacto
              </Button>
            </CardHeaderActions>
          )}
        </CardHeader>

        {loading && (
          <div className="px-5 py-6 text-center text-sm text-zinc-400">
            Cargando contactos…
          </div>
        )}

        {!loading && allContactos.length === 0 && (
          <div className="px-5 py-6 text-center text-sm text-zinc-400">
            Sin contactos registrados
          </div>
        )}

        {!loading && allContactos.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <TableHeader>
                <TableRow>
                  <TableCell isHeader className="pl-5 w-8">
                    <span className="sr-only">Canal</span>
                  </TableCell>
                  <TableCell isHeader>Valor</TableCell>
                  <TableCell isHeader>Categoría</TableCell>
                  <TableCell isHeader align="center">Principal</TableCell>
                  {!readOnly && (
                    <TableCell isHeader align="right" className="pr-4">
                      Acciones
                    </TableCell>
                  )}
                </TableRow>
              </TableHeader>
              <tbody>
                {allContactos.map((contacto) => {
                  const id =
                    props.mode === "create"
                      ? (contacto as LocalContacto)._localId
                      : (contacto as PersonaContacto).id;
                  const isOnlyOfCanal = (canalCount[contacto.canal] ?? 0) <= 1;
                  const isToggling =
                    props.mode === "edit" && pendingToggleIds.has(id);

                  return (
                    <TableRow
                      key={id}
                      className={`relative transition-colors duration-200${isToggling ? " pointer-events-none" : ""}`}
                    >
                      <TableCell className="pl-5 w-8">
                        <span
                          className="inline-flex items-center justify-center size-6 rounded-md bg-zinc-50 border border-zinc-200 text-zinc-500"
                          title={CANAL_LABELS[contacto.canal as Canal] ?? contacto.canal}
                        >
                          <CanalIcon canal={contacto.canal} />
                        </span>
                      </TableCell>

                      <TableCell>
                        <span className="font-medium text-zinc-900">
                          {contacto.valor}
                        </span>
                        {contacto.descripcion && (
                          <span className="ml-1.5 text-xs text-zinc-400">
                            {contacto.descripcion}
                          </span>
                        )}
                      </TableCell>

                      <TableCell>
                        <Badge variant="neutral">
                          {CATEGORIA_LABELS[
                            contacto.categoria as keyof typeof CATEGORIA_LABELS
                          ] ?? contacto.categoria}
                        </Badge>
                      </TableCell>

                      <TableCell align="center">
                        {readOnly ? (
                          contacto.predeterminado ? (
                            <Badge variant="success">Sí</Badge>
                          ) : (
                            <span className="text-zinc-400">—</span>
                          )
                        ) : (
                          <Switch
                            size="sm"
                            checked={contacto.predeterminado}
                            disabled={
                              (isOnlyOfCanal && contacto.predeterminado) ||
                              isToggling
                            }
                            onChange={() => {
                              if (contacto.predeterminado) return;
                              if (props.mode === "create") {
                                handleCreateModeTogglePredeterminado(
                                  (contacto as LocalContacto)._localId,
                                  contacto.canal,
                                );
                              } else {
                                handleEditModeTogglePredeterminado(
                                  (contacto as PersonaContacto).id,
                                  contacto.canal,
                                );
                              }
                            }}
                          />
                        )}
                      </TableCell>

                      {!readOnly && (
                        <TableCell align="right" className="pr-4">
                          <div className="flex items-center justify-end gap-0.5">
                            <ActionIconButton
                              aria-label="Editar contacto"
                              onClick={() => openEditPanel(contacto)}
                            >
                              <Icon.Edit />
                            </ActionIconButton>

                            <ActionIconButton
                              variant="destructive"
                              aria-label="Eliminar contacto"
                              onClick={() => setDeletingId(id)}
                            >
                              <Icon.Trash />
                            </ActionIconButton>
                          </div>
                        </TableCell>
                      )}

                      {/* Row-level overlay — absolutely fills the <tr> (requires `relative` on the row).
                          The overlay carries the dimming so row content stays at full opacity underneath. */}
                      {isToggling && (
                        <td
                          aria-hidden
                          className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-white/50 backdrop-blur-[0.5px] transition-opacity duration-200"
                        >
                          <RowSpinner />
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

// ── Inline icons ──────────────────────────────────────────────────────────────

function PlusIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="size-3.5" aria-hidden>
      <path d="M8 3v10M3 8h10" />
    </svg>
  );
}
