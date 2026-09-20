"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import {
  AdminTable,
  AdminTableBody,
  AdminTableCell,
  AdminTableHead,
  AdminTableHeader,
  AdminTableRow,
  AdminTableState,
} from "@repo/ui/admin-table";
import { Button } from "@repo/ui/button";
import { DatePicker } from "@repo/ui/date-picker";
import { FilterBar, type ActiveFilter } from "@repo/ui/filter-bar";
import { FormField, Label } from "@repo/ui/form-field";
import { Pagination } from "@repo/ui/pagination";
import { Select } from "@repo/ui/select";
import type {
  PaginatedResponse,
  RentalContractHistoryItem,
  RentalContractHistoryQuery,
} from "@/lib/api/types/rental";
import {
  contractEventLabel,
  formatDateOnly,
  formatDateTime,
} from "@/lib/rental/rental-ui";

export type RentalHistoryFilters = RentalContractHistoryQuery & {
  page: number;
  pageSize: number;
};
const EVENTS = [
  { value: "ALL", label: "Todos los eventos" },
  { value: "ACTIVATED", label: "Contrato activado" },
  { value: "ENDED", label: "Contrato finalizado" },
  { value: "CANCELLED", label: "Contrato cancelado" },
  { value: "PARTIES_CHANGED", label: "Partes actualizadas" },
  { value: "RENT_VALUE_REVISED", label: "Alquiler actualizado" },
  { value: "RENEWED", label: "Contrato renovado" },
];
function label(item: RentalContractHistoryItem) {
  return item.category === "CONTRACT"
    ? contractEventLabel(item.type)
    : item.type === "FULFILLMENT_REVERSED"
      ? "Cumplimiento revertido"
      : "Cumplimiento registrado";
}
function detail(item: RentalContractHistoryItem) {
  const data = item.metadata ?? {};
  const parts: string[] = [];
  if (typeof data.conceptName === "string") parts.push(data.conceptName);
  if (typeof data.periodKey === "string")
    parts.push(
      data.periodKey === "ONE_TIME"
        ? "Pago puntual"
        : `Período ${data.periodKey}`,
    );
  if (typeof data.amount === "number")
    parts.push(
      new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: data.currency === "USD" ? "USD" : "ARS",
      }).format(data.amount),
    );
  if (typeof data.effectiveFrom === "string")
    parts.push(`Desde ${formatDateOnly(data.effectiveFrom)}`);
  if (typeof data.reversalReason === "string")
    parts.push(`Motivo: ${data.reversalReason}`);
  if (typeof data.notes === "string" && data.notes.trim())
    parts.push(data.notes);
  return (
    parts.join(" · ") ||
    (item.category === "CONTRACT"
      ? "Cambio contractual registrado."
      : "Movimiento de cumplimiento registrado.")
  );
}

export function RentalContractHistoryView({
  result,
  filters,
}: {
  result: PaginatedResponse<RentalContractHistoryItem>;
  filters: RentalHistoryFilters;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const navigate = useCallback(
    (
      updates: Record<string, string | number | undefined>,
      resetPage = true,
    ) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", "history");
      Object.entries(updates).forEach(([key, value]) =>
        value === undefined || value === ""
          ? params.delete(key)
          : params.set(key, String(value)),
      );
      if (resetPage) params.delete("page");
      startTransition(() =>
        router.replace(`${pathname}?${params}`, { scroll: false }),
      );
    },
    [pathname, router, searchParams],
  );
  const active: ActiveFilter[] = [];
  if (filters.category)
    active.push({
      id: "category",
      label:
        filters.category === "CONTRACT"
          ? "Categoría: contrato"
          : "Categoría: cumplimiento",
      onRemove: () => navigate({ category: undefined, type: undefined }),
    });
  if (filters.type)
    active.push({
      id: "type",
      label:
        EVENTS.find((item) => item.value === filters.type)?.label ??
        "Tipo seleccionado",
      onRemove: () => navigate({ type: undefined }),
    });
  if (filters.from)
    active.push({
      id: "from",
      label: `Desde: ${formatDateOnly(filters.from)}`,
      onRemove: () => navigate({ from: undefined }),
    });
  if (filters.to)
    active.push({
      id: "to",
      label: `Hasta: ${formatDateOnly(filters.to)}`,
      onRemove: () => navigate({ to: undefined }),
    });
  const clear = () =>
    startTransition(() =>
      router.replace(`${pathname}?tab=history`, { scroll: false }),
    );
  return (
    <section
      className="rounded-xl border border-border bg-surface p-4 sm:p-5"
      aria-busy={pending || undefined}
    >
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Historial del contrato</h2>
        <p className="text-sm text-muted">
          Eventos contractuales y movimientos de cumplimiento registrados.
        </p>
      </div>
      <FilterBar
        filters={
          <>
            <div className="w-48">
              <Select
                value={filters.category ?? "ALL"}
                onChange={(value) =>
                  navigate({
                    category: value === "ALL" ? undefined : value,
                    type: undefined,
                  })
                }
                options={[
                  { value: "ALL", label: "Todas las categorías" },
                  { value: "CONTRACT", label: "Contrato" },
                  { value: "FULFILLMENT", label: "Cumplimiento" },
                ]}
              />
            </div>
            <div className="w-52">
              <Select
                value={filters.type ?? "ALL"}
                disabled={filters.category === "FULFILLMENT"}
                onChange={(value) =>
                  navigate({
                    category: value === "ALL" ? filters.category : "CONTRACT",
                    type: value === "ALL" ? undefined : value,
                  })
                }
                options={EVENTS}
              />
            </div>
            <FormField className="w-44">
              <Label>Desde</Label>
              <DatePicker
                value={filters.from ?? ""}
                max={filters.to}
                onChange={(value) => navigate({ from: value || undefined })}
              />
            </FormField>
            <FormField className="w-44">
              <Label>Hasta</Label>
              <DatePicker
                value={filters.to ?? ""}
                min={filters.from}
                onChange={(value) => navigate({ to: value || undefined })}
              />
            </FormField>
          </>
        }
        actions={
          <Button variant="secondary" onClick={clear}>
            Limpiar filtros
          </Button>
        }
        activeFilters={active}
        onClearAll={clear}
      />
      <div className="mt-4">
        <AdminTable className="min-w-[840px]">
          <AdminTableHead>
            <tr>
              <AdminTableHeader>Fecha y hora</AdminTableHeader>
              <AdminTableHeader>Tipo de evento</AdminTableHeader>
              <AdminTableHeader>Detalle</AdminTableHeader>
              <AdminTableHeader>Realizado por</AdminTableHeader>
            </tr>
          </AdminTableHead>
          <AdminTableBody>
            {result.items.length ? (
              result.items.map((item) => (
                <AdminTableRow key={item.id}>
                  <AdminTableCell className="whitespace-nowrap">
                    {formatDateTime(item.occurredAt)}
                  </AdminTableCell>
                  <AdminTableCell className="font-medium">
                    {label(item)}
                  </AdminTableCell>
                  <AdminTableCell className="max-w-xl text-muted">
                    {detail(item)}
                  </AdminTableCell>
                  <AdminTableCell>
                    {item.actor?.name ?? "Sin actor registrado"}
                  </AdminTableCell>
                </AdminTableRow>
              ))
            ) : (
              <AdminTableState
                colSpan={4}
                state="empty"
                title="Sin eventos"
                description="No hay eventos que coincidan con los filtros seleccionados."
              />
            )}
          </AdminTableBody>
        </AdminTable>
      </div>
      {result.totalPages > 0 ? (
        <div className="mt-4">
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
    </section>
  );
}
