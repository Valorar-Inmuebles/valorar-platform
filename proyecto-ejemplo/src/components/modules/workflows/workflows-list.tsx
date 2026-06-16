"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardList,
  CardListItem,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmModal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { Icon, IconChevronDown } from "@/components/ui/icons";
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownTrigger,
} from "@/components/ui/dropdown";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  TableSearch,
  TableSurface,
  TableToolbar,
  TableFooter,
} from "@/components/ui/table";
import {
  archiveWorkflow,
  cloneWorkflow,
  deleteWorkflow,
  getWorkflows,
  WorkflowApiError,
} from "@/lib/api/workflows.api";
import type {
  WorkflowEstado,
  WorkflowListItemDto,
} from "@/lib/types/workflow";

const BASE_PATH = "/workflows";

type EstadoFilter = WorkflowEstado | "all";
type TipoFilter = string | "all";

type PendingArchive = { id: string; nombre: string } | null;
type PendingDelete = { id: string; nombre: string } | null;

const ESTADO_LABEL: Record<WorkflowEstado, string> = {
  borrador: "Borrador",
  activo: "Activo",
  archivado: "Archivado",
};

const ESTADO_BADGE: Record<
  WorkflowEstado,
  "warning" | "success" | "neutral"
> = {
  borrador: "warning",
  activo: "success",
  archivado: "neutral",
};

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("es-AR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return "—";
  }
}

function formatClasificacion(workflow: WorkflowListItemDto): string {
  return [
    workflow.tipo.nombre,
    workflow.jurisdiccion.nombre,
    workflow.fuero.nombre,
    workflow.objeto.nombre,
    workflow.rol.nombre,
  ]
    .filter((part) => part && part !== "—")
    .join(" · ");
}

function isWorkflowEditable(workflow: WorkflowListItemDto): boolean {
  return workflow.estado !== "archivado";
}

export function WorkflowsList() {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [plantillas, setPlantillas] = useState<WorkflowListItemDto[]>([]);
  const [organizacion, setOrganizacion] = useState<WorkflowListItemDto[]>([]);
  const [tipoOptions, setTipoOptions] = useState<
    Array<{ id: string; nombre: string }>
  >([]);

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [estadoFilter, setEstadoFilter] = useState<EstadoFilter>("all");
  const [tipoFilter, setTipoFilter] = useState<TipoFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [pendingArchive, setPendingArchive] = useState<PendingArchive>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete>(null);
  const [cloningId, setCloningId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const sharedFilters = useMemo(() => {
    const filters: {
      q?: string;
      workflow_tipo_id?: string;
    } = {};

    if (debouncedQuery.trim()) filters.q = debouncedQuery.trim();
    if (tipoFilter !== "all") filters.workflow_tipo_id = tipoFilter;

    return filters;
  }, [debouncedQuery, tipoFilter]);

  const hasFilters =
    query.trim() !== "" ||
    estadoFilter !== "all" ||
    tipoFilter !== "all";

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [systemRows, tenantRows] = await Promise.all([
        getWorkflows({ ...sharedFilters, origen: "system" }),
        getWorkflows({
          ...sharedFilters,
          origen: "tenant",
          ...(estadoFilter !== "all" ? { estado: estadoFilter } : {}),
        }),
      ]);

      setPlantillas(systemRows);
      setOrganizacion(tenantRows);
    } catch (e: unknown) {
      setPlantillas([]);
      setOrganizacion([]);
      setError(
        e instanceof Error ? e.message : "Error al cargar workflows",
      );
    } finally {
      setLoading(false);
    }
  }, [sharedFilters, estadoFilter]);

  const loadTipoOptions = useCallback(async () => {
    try {
      const [systemRows, tenantRows] = await Promise.all([
        getWorkflows({ origen: "system" }),
        getWorkflows({ origen: "tenant" }),
      ]);

      const byId = new Map<string, string>();
      for (const row of [...systemRows, ...tenantRows]) {
        if (!row.workflow_tipo_id) continue;
        byId.set(row.workflow_tipo_id, row.tipo.nombre);
      }

      setTipoOptions(
        [...byId.entries()]
          .map(([id, nombre]) => ({ id, nombre }))
          .sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
      );
    } catch {
      setTipoOptions([]);
    }
  }, []);

  useEffect(() => {
    void loadTipoOptions();
  }, [loadTipoOptions]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, estadoFilter, tipoFilter]);

  const totalOrganizacion = organizacion.length;
  const pageStart = (page - 1) * pageSize;
  const paginatedOrganizacion = organizacion.slice(
    pageStart,
    pageStart + pageSize,
  );

  function clearFilters() {
    setQuery("");
    setEstadoFilter("all");
    setTipoFilter("all");
  }

  function handleClone(workflow: WorkflowListItemDto) {
    setCloningId(workflow.id);
    startTransition(async () => {
      try {
        await cloneWorkflow(workflow.id);
        toast.success("Workflow clonado");
        await load();
        router.refresh();
      } catch (e: unknown) {
        toast.error(
          e instanceof Error ? e.message : "Error al clonar el workflow",
        );
      } finally {
        setCloningId(null);
      }
    });
  }

  function handleConfirmArchive() {
    if (!pendingArchive) return;

    startTransition(async () => {
      try {
        await archiveWorkflow(pendingArchive.id);
        toast.success("Workflow archivado");
        setPendingArchive(null);
        await load();
        router.refresh();
      } catch (e: unknown) {
        toast.error(
          e instanceof Error ? e.message : "Error al archivar el workflow",
        );
      }
    });
  }

  function handleConfirmDelete() {
    if (!pendingDelete) return;

    startTransition(async () => {
      try {
        await deleteWorkflow(pendingDelete.id);
        toast.success("Workflow eliminado");
        setPendingDelete(null);
        await load();
        router.refresh();
      } catch (e: unknown) {
        const message =
          e instanceof WorkflowApiError
            ? e.message
            : e instanceof Error
              ? e.message
              : "Error al eliminar el workflow";
        toast.error(message);
      }
    });
  }

  const selectedTipoLabel =
    tipoFilter === "all"
      ? "Tipo"
      : (tipoOptions.find((t) => t.id === tipoFilter)?.nombre ?? "Tipo");

  return (
    <>
      <ConfirmModal
        open={pendingArchive !== null}
        onClose={() => setPendingArchive(null)}
        onConfirm={handleConfirmArchive}
        loading={isPending}
        title="Archivar workflow"
        description={
          pendingArchive
            ? `¿Archivar "${pendingArchive.nombre}"?`
            : ""
        }
        confirmLabel="Archivar"
        cancelLabel="Cancelar"
      />

      <ConfirmModal
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={handleConfirmDelete}
        loading={isPending}
        title="Eliminar workflow"
        description={
          pendingDelete
            ? `¿Eliminar "${pendingDelete.nombre}"? Esta acción no se puede deshacer.`
            : ""
        }
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
      />

      <div className="space-y-8">
        <TableSurface>
          <TableToolbar>
            <TableSearch
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre…"
              aria-label="Buscar workflows"
              className="w-56"
            />

            <Dropdown align="end">
              <DropdownTrigger>
                <Button
                  variant={tipoFilter !== "all" ? "outline-primary" : "secondary"}
                  rightIcon={<IconChevronDown className="size-3.5" />}
                >
                  {selectedTipoLabel}
                </Button>
              </DropdownTrigger>
              <DropdownContent className="min-w-[10rem]">
                <DropdownItem onClick={() => setTipoFilter("all")}>
                  Todos los tipos
                </DropdownItem>
                {tipoOptions.map((tipo) => (
                  <DropdownItem
                    key={tipo.id}
                    onClick={() => setTipoFilter(tipo.id)}
                  >
                    {tipo.nombre}
                  </DropdownItem>
                ))}
              </DropdownContent>
            </Dropdown>

            <Dropdown align="end">
              <DropdownTrigger>
                <Button
                  variant={estadoFilter !== "all" ? "outline-primary" : "secondary"}
                  rightIcon={<IconChevronDown className="size-3.5" />}
                >
                  {estadoFilter === "all"
                    ? "Estado"
                    : ESTADO_LABEL[estadoFilter]}
                </Button>
              </DropdownTrigger>
              <DropdownContent className="min-w-[9rem]">
                <DropdownItem onClick={() => setEstadoFilter("all")}>
                  Todos
                </DropdownItem>
                {(["borrador", "activo", "archivado"] as const).map((estado) => (
                  <DropdownItem
                    key={estado}
                    onClick={() => setEstadoFilter(estado)}
                  >
                    {ESTADO_LABEL[estado]}
                  </DropdownItem>
                ))}
              </DropdownContent>
            </Dropdown>

            {hasFilters && (
              <Button variant="ghost" onClick={clearFilters}>
                Limpiar filtros
              </Button>
            )}

            <div className="ml-auto" />

            <Link href={`${BASE_PATH}/crear`}>
              <Button>Nuevo Workflow</Button>
            </Link>
          </TableToolbar>
        </TableSurface>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-md font-semibold text-gray-900">
              Plantillas JurilexIA
            </h2>
            <span className="text-xs tabular-nums text-zinc-400">
              {plantillas.length}{" "}
              {plantillas.length === 1 ? "plantilla" : "plantillas"}
            </span>
          </div>

          {error ? (
            <EmptyState title="Error al cargar" description={error} />
          ) : loading ? (
            <p className="text-sm text-zinc-400">Cargando plantillas…</p>
          ) : plantillas.length === 0 ? (
            <EmptyState
              title="Sin plantillas"
              description={
                hasFilters
                  ? "No hay plantillas que coincidan con los filtros."
                  : "No hay plantillas JurilexIA disponibles."
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {plantillas.map((workflow) => (
                <Card key={workflow.id} flat>
                  <CardHeader>
                    <CardTitle className="truncate">{workflow.nombre}</CardTitle>
                    <Badge variant="info">Plantilla oficial</Badge>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-zinc-500">
                      {formatClasificacion(workflow)}
                    </p>
                  </CardContent>
                  <CardFooter>
                    <Link href={`${BASE_PATH}/${workflow.id}`}>
                      <Button variant="secondary" size="sm">
                        Ver
                      </Button>
                    </Link>
                    <Button
                      variant="secondary"
                      size="sm"
                      loading={cloningId === workflow.id && isPending}
                      onClick={() => handleClone(workflow)}
                    >
                      Clonar
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-md font-semibold text-gray-900">
              Workflows de la Organización
            </h2>
            <span className="text-xs tabular-nums text-zinc-400">
              {organizacion.length}{" "}
              {organizacion.length === 1 ? "workflow" : "workflows"}
            </span>
          </div>

          <Card flat>
            {error ? (
              <CardContent>
                <p className="text-sm text-red-600">{error}</p>
              </CardContent>
            ) : loading ? (
              <CardContent>
                <p className="text-sm text-zinc-400">Cargando workflows…</p>
              </CardContent>
            ) : organizacion.length === 0 ? (
              <CardContent>
                <EmptyState
                  title="Sin workflows"
                  description={
                    hasFilters
                      ? "No hay workflows que coincidan con los filtros."
                      : "Creá tu primer workflow con el botón Nuevo Workflow."
                  }
                  action={
                    !hasFilters ? (
                      <Link href={`${BASE_PATH}/crear`}>
                        <Button size="sm">Nuevo Workflow</Button>
                      </Link>
                    ) : undefined
                  }
                />
              </CardContent>
            ) : (
              <>
                <CardList>
                  {paginatedOrganizacion.map((workflow) => {
                    const editable = isWorkflowEditable(workflow);
                    const canArchive =
                      workflow.estado === "borrador" ||
                      workflow.estado === "activo";

                    return (
                      <CardListItem key={workflow.id}>
                        <div className="flex min-w-0 flex-1 items-start gap-3">
                          <Icon.FileText className="mt-0.5 size-4 shrink-0 text-zinc-400" />
                          <div className="min-w-0 space-y-0.5">
                            <Link
                              href={`${BASE_PATH}/${workflow.id}`}
                              className="block truncate font-medium text-zinc-900 hover:text-zinc-600"
                            >
                              {workflow.nombre}
                            </Link>
                            <p className="truncate text-xs text-zinc-500">
                              {formatClasificacion(workflow)}
                            </p>
                            <p className="text-xs text-zinc-400">
                              Creado {formatDate(workflow.created_at)} ·
                              Actualizado {formatDate(workflow.updated_at)}
                            </p>
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                          <Badge variant={ESTADO_BADGE[workflow.estado]}>
                            {ESTADO_LABEL[workflow.estado]}
                          </Badge>

                          <Link href={`${BASE_PATH}/${workflow.id}`}>
                            <Button variant="secondary" size="sm">
                              Ver
                            </Button>
                          </Link>

                          <Button
                            variant="secondary"
                            size="sm"
                            loading={cloningId === workflow.id && isPending}
                            onClick={() => handleClone(workflow)}
                          >
                            Clonar
                          </Button>

                          {canArchive && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() =>
                                setPendingArchive({
                                  id: workflow.id,
                                  nombre: workflow.nombre,
                                })
                              }
                            >
                              Archivar
                            </Button>
                          )}

                          <DropdownMenu align="end">
                            <DropdownMenuTrigger
                              className="inline-flex size-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-zinc-700"
                              aria-label="Más acciones"
                            >
                              <Icon.DotsVertical className="size-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              {editable && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    router.push(
                                      `${BASE_PATH}/${workflow.id}/editar`,
                                    )
                                  }
                                >
                                  Editar
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() =>
                                  setPendingDelete({
                                    id: workflow.id,
                                    nombre: workflow.nombre,
                                  })
                                }
                              >
                                Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardListItem>
                    );
                  })}
                </CardList>

                <TableFooter
                  page={page}
                  pageSize={pageSize}
                  total={totalOrganizacion}
                  pageSizeOptions={[5, 10, 25]}
                  onPageChange={setPage}
                  onPageSizeChange={(size) => {
                    setPageSize(size);
                    setPage(1);
                  }}
                  className="border-t border-gray-200"
                />
              </>
            )}
          </Card>
        </section>
      </div>
    </>
  );
}
