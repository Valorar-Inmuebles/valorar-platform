"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { formatPrice } from "@repo/shared-types/format-money";
import {
  AdminTable,
  AdminTableActions,
  AdminTableBody,
  AdminTableCell,
  AdminTableHead,
  AdminTableHeader,
  AdminTableRow,
  AdminTableState,
  type SortDirection,
} from "@repo/ui/admin-table";
import { Badge, type BadgeVariant } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { DropdownMenu } from "@repo/ui/dropdown-menu";
import { FilterBar, type ActiveFilter } from "@repo/ui/filter-bar";
import { Input } from "@repo/ui/input";
import { Pagination } from "@repo/ui/pagination";
import { Select } from "@repo/ui/select";
import { Tabs } from "@repo/ui/tabs";
import { RentalFulfillmentPanel } from "@/components/rental/rental-fulfillment-panel";
import type {
  PaginatedResponse,
  RentalConcept,
  RentalOccurrence,
  RentalOccurrenceStatus,
} from "@/lib/api/types/rental";
import {
  formatDateOnly,
  OCCURRENCE_STATUS_LABELS,
} from "@/lib/rental/rental-ui";

export type RentalDueFilters = {
  month: string;
  category: "ALL" | "RENT" | "OTHER" | "OVERDUE";
  status?: RentalOccurrenceStatus;
  conceptId?: string;
  search?: string;
  sortBy?: "dueDate" | "internalNumber" | "concept" | "amount" | "status";
  sortOrder?: "asc" | "desc";
  page: number;
  pageSize: number;
};

type Props = {
  result: PaginatedResponse<RentalOccurrence>;
  filters: RentalDueFilters;
  totals: Record<"ALL" | "RENT" | "OTHER" | "OVERDUE", number>;
  concepts: RentalConcept[];
  canManage: boolean;
  canFulfill: boolean;
  canReverse: boolean;
};

const STATUS_VARIANT: Record<RentalOccurrenceStatus, BadgeVariant> = {
  PENDING: "warning",
  OVERDUE: "danger",
  FULFILLED: "success",
  CANCELLED: "neutral",
};

function monthLabel(month: string) {
  const [year = 1970, value = 1] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("es-AR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, value - 1, 1)));
}

function shiftMonth(month: string, amount: number) {
  const [year = 1970, value = 1] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, value - 1 + amount, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function RentalDueDatesView({
  result,
  filters,
  totals,
  concepts,
  canManage,
  canFulfill,
  canReverse,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState(filters.search ?? "");
  const [items, setItems] = useState(result.items);
  const [selected, setSelected] = useState<RentalOccurrence | null>(null);

  useEffect(() => setItems(result.items), [result.items]);
  useEffect(() => setSearch(filters.search ?? ""), [filters.search]);

  const navigate = useCallback(
    (
      updates: Record<string, string | number | undefined>,
      resetPage = true,
    ) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) =>
        value === undefined || value === ""
          ? params.delete(key)
          : params.set(key, String(value)),
      );
      if (resetPage) params.delete("page");
      startTransition(() =>
        router.replace(params.size ? `${pathname}?${params}` : pathname, {
          scroll: false,
        }),
      );
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    const value = search.trim();
    if (value === (filters.search ?? "")) return;
    const timer = window.setTimeout(
      () => navigate({ search: value || undefined }),
      350,
    );
    return () => window.clearTimeout(timer);
  }, [filters.search, navigate, search]);

  const activeFilters = useMemo<ActiveFilter[]>(() => {
    const values: ActiveFilter[] = [
      {
        id: "month",
        label: `Período: ${monthLabel(filters.month)}`,
        onRemove: () => navigate({ month: undefined }),
      },
    ];
    if (filters.search)
      values.push({
        id: "search",
        label: `Búsqueda: ${filters.search}`,
        onRemove: () => {
          setSearch("");
          navigate({ search: undefined });
        },
      });
    if (filters.status)
      values.push({
        id: "status",
        label: `Estado: ${OCCURRENCE_STATUS_LABELS[filters.status]}`,
        onRemove: () => navigate({ status: undefined }),
      });
    if (filters.conceptId)
      values.push({
        id: "concept",
        label: `Concepto: ${concepts.find((item) => item.id === filters.conceptId)?.name ?? "seleccionado"}`,
        onRemove: () => navigate({ conceptId: undefined }),
      });
    return values;
  }, [concepts, filters, navigate]);

  const clearFilters = () => {
    setSearch("");
    startTransition(() =>
      router.replace(`${pathname}?month=${filters.month}`, { scroll: false }),
    );
  };
  const directionFor = (
    field: NonNullable<RentalDueFilters["sortBy"]>,
  ): SortDirection | null =>
    filters.sortBy === field ? (filters.sortOrder ?? "asc") : null;
  const sort = (field: NonNullable<RentalDueFilters["sortBy"]>) =>
    navigate({
      sortBy: field,
      sortOrder: directionFor(field) === "asc" ? "desc" : "asc",
    });
  const updateSelected = (updated: RentalOccurrence) => {
    setItems((current) =>
      current.map((item) => (item.id === updated.id ? updated : item)),
    );
    setSelected(updated);
    router.refresh();
  };

  return (
    <>
      <div className="space-y-4" aria-busy={pending || undefined}>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <Tabs
            ariaLabel="Categoría de vencimientos"
            value={filters.category}
            onChange={(value) =>
              navigate({ category: value === "ALL" ? undefined : value })
            }
            items={[
              { value: "ALL", label: "Todos", badge: totals.ALL },
              { value: "RENT", label: "Alquileres", badge: totals.RENT },
              {
                value: "OTHER",
                label: "Otras obligaciones",
                badge: totals.OTHER,
              },
              {
                value: "OVERDUE",
                label: "Vencidos",
                badge: totals.OVERDUE,
                tone: "danger",
              },
            ]}
          />
          <div className="flex items-center self-end rounded-lg border border-border bg-surface">
            <Button
              variant="ghost"
              aria-label="Mes anterior"
              onClick={() => navigate({ month: shiftMonth(filters.month, -1) })}
            >
              ←
            </Button>
            <span className="min-w-44 px-3 text-center text-sm font-semibold capitalize text-foreground">
              {monthLabel(filters.month)}
            </span>
            <Button
              variant="ghost"
              aria-label="Mes siguiente"
              onClick={() => navigate({ month: shiftMonth(filters.month, 1) })}
            >
              →
            </Button>
          </div>
        </div>

        <FilterBar
          search={
            <Input
              aria-label="Buscar vencimientos"
              placeholder="Contrato, inmueble o inquilino…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          }
          filters={
            <>
              <div className="w-40">
                <Select
                  value={filters.status ?? "ALL"}
                  onChange={(value) =>
                    navigate({ status: value === "ALL" ? undefined : value })
                  }
                  options={[
                    { value: "ALL", label: "Todos los estados" },
                    { value: "PENDING", label: "Pendientes" },
                    { value: "FULFILLED", label: "Cumplidos" },
                    { value: "CANCELLED", label: "Cancelados" },
                    { value: "OVERDUE", label: "Vencidos" },
                  ]}
                />
              </div>
              <div className="w-44">
                <Select
                  value={filters.conceptId ?? "ALL"}
                  onChange={(value) =>
                    navigate({ conceptId: value === "ALL" ? undefined : value })
                  }
                  options={[
                    { value: "ALL", label: "Todos los conceptos" },
                    ...concepts.map((item) => ({
                      value: item.id,
                      label: item.name,
                    })),
                  ]}
                />
              </div>
            </>
          }
          actions={
            <Button variant="secondary" onClick={clearFilters}>
              Limpiar filtros
            </Button>
          }
          activeFilters={activeFilters}
          onClearAll={clearFilters}
        />

        <AdminTable className="min-w-[1040px]">
          <AdminTableHead>
            <tr>
              <AdminTableHeader
                direction={directionFor("dueDate")}
                onSort={() => sort("dueDate")}
              >
                Vencimiento
              </AdminTableHeader>
              <AdminTableHeader
                direction={directionFor("internalNumber")}
                onSort={() => sort("internalNumber")}
              >
                Contrato / Inmueble
              </AdminTableHeader>
              <AdminTableHeader>Inquilino/s</AdminTableHeader>
              <AdminTableHeader
                direction={directionFor("concept")}
                onSort={() => sort("concept")}
              >
                Concepto
              </AdminTableHeader>
              <AdminTableHeader
                direction={directionFor("amount")}
                onSort={() => sort("amount")}
              >
                Importe
              </AdminTableHeader>
              <AdminTableHeader
                direction={directionFor("status")}
                onSort={() => sort("status")}
              >
                Estado
              </AdminTableHeader>
              <AdminTableHeader className="text-right">Acción</AdminTableHeader>
            </tr>
          </AdminTableHead>
          <AdminTableBody>
            {items.length === 0 ? (
              <AdminTableState
                colSpan={7}
                state="empty"
                title={
                  activeFilters.length > 1 || filters.category !== "ALL"
                    ? "Sin resultados"
                    : "Sin vencimientos"
                }
                description="No hay vencimientos que coincidan con el período y los filtros seleccionados."
              />
            ) : (
              items.map((item) => {
                const contract = item.obligation.contract;
                const canOpen =
                  item.status === "FULFILLED" ||
                  (item.status === "PENDING" &&
                    ((canFulfill && item.actions.canFulfill) ||
                      (canManage &&
                        (item.actions.canSetAmount ||
                          item.actions.canSetDueDate))));
                return (
                  <AdminTableRow key={item.id}>
                    <AdminTableCell>
                      <p className="font-medium">
                        {item.dueDatePending
                          ? "Fecha pendiente"
                          : formatDateOnly(item.dueDate)}
                      </p>
                      {item.operationalStatus === "OVERDUE" && item.dueDate ? (
                        <p className="text-xs text-red-700">Vencido</p>
                      ) : null}
                    </AdminTableCell>
                    <AdminTableCell>
                      <Link
                        href={`/alquileres/${contract.id}`}
                        className="font-semibold text-foreground hover:text-primary"
                      >
                        {contract.internalNumber}
                      </Link>
                      <p className="mt-0.5 max-w-64 text-xs text-muted">
                        {contract.propertyAddressSnapshot}
                      </p>
                    </AdminTableCell>
                    <AdminTableCell>
                      {contract.parties[0]?.contact.name ?? "Sin inquilino"}
                      {contract.parties.length > 1 ? (
                        <p className="text-xs text-muted">
                          +{contract.parties.length - 1} más
                        </p>
                      ) : null}
                    </AdminTableCell>
                    <AdminTableCell>
                      {item.obligation.concept.name}
                    </AdminTableCell>
                    <AdminTableCell>
                      {item.amount == null ? (
                        <span className="text-primary">Importe pendiente</span>
                      ) : (
                        formatPrice(item.amount, item.currency)
                      )}
                    </AdminTableCell>
                    <AdminTableCell>
                      <Badge variant={STATUS_VARIANT[item.operationalStatus]}>
                        {OCCURRENCE_STATUS_LABELS[item.operationalStatus]}
                      </Badge>
                    </AdminTableCell>
                    <AdminTableCell>
                      <AdminTableActions>
                        {canOpen ? (
                          <Button
                            size="sm"
                            variant={
                              item.status === "PENDING"
                                ? "outline-primary"
                                : "secondary"
                            }
                            onClick={() => setSelected(item)}
                          >
                            {item.status === "FULFILLED"
                              ? "Ver"
                              : item.amount == null && canManage
                                ? "Cargar valor"
                                : item.dueDatePending && canManage
                                  ? "Cargar fecha"
                                  : "Registrar"}
                          </Button>
                        ) : null}
                        <DropdownMenu
                          ariaLabel={`Acciones de ${contract.internalNumber}`}
                          trigger={
                            <span className="flex size-8 items-center justify-center rounded-md text-lg text-muted hover:bg-surface-alt">
                              ⋯
                            </span>
                          }
                          items={[
                            {
                              id: "contract",
                              label: "Ver contrato",
                              onSelect: () =>
                                router.push(`/alquileres/${contract.id}`),
                            },
                            ...(canOpen
                              ? [
                                  {
                                    id: "detail",
                                    label:
                                      item.status === "FULFILLED"
                                        ? "Ver cumplimiento"
                                        : "Gestionar vencimiento",
                                    onSelect: () => setSelected(item),
                                  },
                                ]
                              : []),
                          ]}
                        />
                      </AdminTableActions>
                    </AdminTableCell>
                  </AdminTableRow>
                );
              })
            )}
          </AdminTableBody>
        </AdminTable>

        {result.totalPages > 0 ? (
          <div className="rounded-xl border border-border bg-surface px-4 py-3">
            <Pagination
              page={result.page}
              pageSize={result.pageSize}
              total={result.total}
              totalPages={result.totalPages}
              disabled={pending}
              onPageChange={(page) => navigate({ page }, false)}
            />
          </div>
        ) : null}
      </div>
      <RentalFulfillmentPanel
        occurrence={selected}
        open={Boolean(selected)}
        canManage={canManage}
        canFulfill={canFulfill}
        canReverse={canReverse}
        onClose={() => setSelected(null)}
        onChange={updateSelected}
      />
    </>
  );
}
