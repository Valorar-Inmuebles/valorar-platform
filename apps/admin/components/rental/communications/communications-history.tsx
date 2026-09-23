"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { SystemIcon } from "@repo/icons";
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
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { DatePicker } from "@repo/ui/date-picker";
import { DropdownMenu } from "@repo/ui/dropdown-menu";
import { FilterBar, type ActiveFilter } from "@repo/ui/filter-bar";
import { Input } from "@repo/ui/input";
import {
  Modal,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@repo/ui/modal";
import { Pagination } from "@repo/ui/pagination";
import { Select } from "@repo/ui/select";
import { useToast } from "@repo/ui/toast";
import { retryDeliveryAction } from "@/lib/api/rental-communications-actions";
import {
  buildDispatchStatusSummary,
  COMMUNICATION_CHANNEL_LABELS,
  COMMUNICATION_DELIVERY_STATUS_LABELS,
  DISPATCH_STATUS_LABELS,
  formatConceptsLabel,
  formatRecipientsLabel,
  HISTORY_COLUMNS,
  HISTORY_COLUMNS_STORAGE_KEY,
  historyColumnsFromStorage,
  REMINDER_EVENT_LABELS,
  retryDeliveryFeedback,
  type HistoryColumnKey,
} from "@/lib/rental/rental-communications";
import { formatDateOnly, formatDateTime } from "@/lib/rental/rental-ui";
import { CommunicationsHistoryPanel } from "./communications-history-panel";
import type {
  PaginatedResponse,
  RentalDeliveryChannel,
  RentalDispatchHistoryItem,
} from "@repo/shared-types";

type Props = {
  result: PaginatedResponse<RentalDispatchHistoryItem>;
  canManage: boolean;
};

type HistorySortBy = "scheduledFor" | "internalNumber" | "status" | "eventType";

const PAGE_SIZE_OPTIONS = [20, 50, 100];
const DEFAULT_PAGE_SIZE = 20;
const EVENT_OPTIONS = [
  { value: "ALL", label: "Todos los eventos" },
  { value: "PRE_DUE", label: REMINDER_EVENT_LABELS.PRE_DUE },
  { value: "DUE", label: REMINDER_EVENT_LABELS.DUE },
  { value: "POST_DUE", label: REMINDER_EVENT_LABELS.POST_DUE },
];
const STATUS_OPTIONS = [
  { value: "ALL", label: "Todos los estados" },
  { value: "PLANNED", label: DISPATCH_STATUS_LABELS.PLANNED },
  { value: "READY", label: DISPATCH_STATUS_LABELS.READY },
  { value: "PROCESSING", label: DISPATCH_STATUS_LABELS.PROCESSING },
  { value: "COMPLETED", label: DISPATCH_STATUS_LABELS.COMPLETED },
  {
    value: "PARTIALLY_COMPLETED",
    label: DISPATCH_STATUS_LABELS.PARTIALLY_COMPLETED,
  },
  { value: "FAILED", label: DISPATCH_STATUS_LABELS.FAILED },
  { value: "SKIPPED", label: DISPATCH_STATUS_LABELS.SKIPPED },
];
const CHANNEL_OPTIONS = [
  { value: "ALL", label: "Todos los canales" },
  { value: "EMAIL", label: COMMUNICATION_CHANNEL_LABELS.EMAIL },
  { value: "WHATSAPP", label: COMMUNICATION_CHANNEL_LABELS.WHATSAPP },
];
const SORTABLE = new Set<HistorySortBy>([
  "scheduledFor",
  "internalNumber",
  "status",
  "eventType",
]);
const DEFAULT_ALL_COLUMNS = HISTORY_COLUMNS.map((column) => column.key);
const WINDOW_FILTER_LABELS: Record<string, string> = {
  scheduledFrom: "Programados desde",
  scheduledTo: "Programados hasta",
  sentFrom: "Enviados desde",
  sentTo: "Enviados hasta",
  deliveredFrom: "Entregados desde",
  deliveredTo: "Entregados hasta",
  failedFrom: "Fallidos desde",
  failedTo: "Fallidos hasta",
};
const RETRY_COPY =
  "Se reprogramará este envío para el próximo ciclo. No se envía en este momento: no es un envío instantáneo. El historial de intentos se conserva.";

function firstParam(params: URLSearchParams, key: string): string | undefined {
  const value = params.get(key);
  return value === null || value === "" ? undefined : value;
}

/**
 * Los bounds `*To` se guardan como día inclusive (DatePicker) o ISO ya
 * exclusivo (filtros rápidos del KPI). Para la etiqueta del chip se muestra
 * el último día inclusive: día literal, o el anterior al bound exclusivo.
 */
function inclusiveBoundDay(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

/**
 * Historial global de avisos: filtros, sorting, selector de columnas y
 * paginación server-side gobernados por la URL (sin estado paralelo). El
 * selector de columnas vive en localStorage porque es preferencia de la
 * persona usuaria, no estado de la lista. Click en fila abre el SidePanel
 * con contenido congelado; los controles de la fila detienen la propagación.
 */
export function CommunicationsHistory({ result, canManage }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [searchDraft, setSearchDraft] = useState(
    () => firstParam(searchParams, "search") ?? "",
  );
  const [visibleColumns, setVisibleColumns] =
    useState<HistoryColumnKey[]>(DEFAULT_ALL_COLUMNS);
  const [selected, setSelected] = useState<RentalDispatchHistoryItem | null>(
    null,
  );
  const [retryDelivery, setRetryDelivery] = useState<{
    id: string;
    channel: RentalDeliveryChannel;
    destination: string;
  } | null>(null);
  const [retrying, setRetrying] = useState(false);

  // Preferencia visual de columnas: se aplica en un efecto post-mount para
  // que SSR y cliente inicial rendericen siempre las mismas columnas.
  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(HISTORY_COLUMNS_STORAGE_KEY);
    } catch {
      stored = null;
    }
    setVisibleColumns(historyColumnsFromStorage(stored));
  }, []);

  const navigate = useCallback(
    (
      overrides: Record<string, string | number | undefined>,
      { resetPage = true }: { resetPage?: boolean } = {},
    ) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", "history");
      if (resetPage) params.delete("page");
      Object.entries(overrides).forEach(([key, value]) => {
        if (value === undefined || value === "") params.delete(key);
        else params.set(key, String(value));
      });
      startTransition(() => {
        router.push(`/alquileres/comunicaciones?${params.toString()}`);
      });
    },
    [router, searchParams],
  );

  const urlSearch = firstParam(searchParams, "search") ?? "";
  const rawEventType = firstParam(searchParams, "eventType");
  const rawStatus = firstParam(searchParams, "status");
  const rawChannel = firstParam(searchParams, "channel");
  const rawSortBy = firstParam(searchParams, "sortBy");
  const rawSortOrder = firstParam(searchParams, "sortOrder");
  const rawPageSize = Number(firstParam(searchParams, "pageSize"));
  const pageSize = PAGE_SIZE_OPTIONS.includes(rawPageSize)
    ? rawPageSize
    : DEFAULT_PAGE_SIZE;
  const page = Math.max(1, Number(firstParam(searchParams, "page")) || 1);
  const sortBy: HistorySortBy =
    rawSortBy && SORTABLE.has(rawSortBy as HistorySortBy)
      ? (rawSortBy as HistorySortBy)
      : "scheduledFor";
  const sortOrder: SortDirection = rawSortOrder === "asc" ? "asc" : "desc";

  // Búsqueda server-side con debounce a la URL (no hay estado paralelo al
  // resultado: cada push re-renderiza la página con la query nueva).
  useEffect(() => {
    const normalized = searchDraft.trim();
    if (normalized === urlSearch) return;
    const timer = setTimeout(
      () => navigate({ search: normalized || undefined }),
      350,
    );
    return () => clearTimeout(timer);
  }, [navigate, searchDraft, urlSearch]);

  const visibleSet = useMemo(() => {
    const set = new Set(visibleColumns);
    HISTORY_COLUMNS.forEach((column) => {
      if (column.locked) set.add(column.key);
    });
    return set;
  }, [visibleColumns]);
  const renderedColumns = HISTORY_COLUMNS.filter((column) =>
    visibleSet.has(column.key),
  );

  const activeFilters: ActiveFilter[] = [];
  if (urlSearch) {
    activeFilters.push({
      id: "search",
      label: `Búsqueda: ${urlSearch}`,
      onRemove: () => navigate({ search: undefined }),
    });
  }
  if (rawEventType && rawEventType in REMINDER_EVENT_LABELS) {
    activeFilters.push({
      id: "eventType",
      label: `Evento: ${REMINDER_EVENT_LABELS[rawEventType as keyof typeof REMINDER_EVENT_LABELS]}`,
      onRemove: () => navigate({ eventType: undefined }),
    });
  }
  if (rawStatus && rawStatus in DISPATCH_STATUS_LABELS) {
    activeFilters.push({
      id: "status",
      label: `Estado: ${DISPATCH_STATUS_LABELS[rawStatus as keyof typeof DISPATCH_STATUS_LABELS]}`,
      onRemove: () => navigate({ status: undefined }),
    });
  }
  if (rawChannel && rawChannel in COMMUNICATION_CHANNEL_LABELS) {
    activeFilters.push({
      id: "channel",
      label: `Canal: ${COMMUNICATION_CHANNEL_LABELS[rawChannel as keyof typeof COMMUNICATION_CHANNEL_LABELS]}`,
      onRemove: () => navigate({ channel: undefined }),
    });
  }
  Object.entries(WINDOW_FILTER_LABELS).forEach(([param, label]) => {
    const value = firstParam(searchParams, param);
    if (!value) return;
    const shown = param.endsWith("To") ? inclusiveBoundDay(value) : value;
    activeFilters.push({
      id: param,
      label: `${label} ${formatDateOnly(shown)}`,
      onRemove: () => navigate({ [param]: undefined }),
    });
  });

  function clearAllFilters() {
    navigate({
      search: undefined,
      eventType: undefined,
      status: undefined,
      channel: undefined,
      scheduledFrom: undefined,
      scheduledTo: undefined,
      sentFrom: undefined,
      sentTo: undefined,
      deliveredFrom: undefined,
      deliveredTo: undefined,
      failedFrom: undefined,
      failedTo: undefined,
    });
  }

  function toggleSort(column: HistorySortBy) {
    if (sortBy === column) {
      navigate({
        sortBy: column,
        sortOrder: sortOrder === "asc" ? "desc" : "asc",
      });
    } else {
      navigate({ sortBy: column, sortOrder: "asc" });
    }
  }

  function sortDirection(column: HistorySortBy): SortDirection | null {
    return sortBy === column ? sortOrder : null;
  }

  function toggleColumn(key: HistoryColumnKey) {
    const next = visibleColumns.includes(key)
      ? visibleColumns.filter((column) => column !== key)
      : [...visibleColumns, key];
    setVisibleColumns(next);
    try {
      window.localStorage.setItem(
        HISTORY_COLUMNS_STORAGE_KEY,
        JSON.stringify(
          HISTORY_COLUMNS.filter((column) => next.includes(column.key)).map(
            (column) => column.key,
          ),
        ),
      );
    } catch {
      // Preferencia no persistida: la sesión sigue funcionando.
    }
  }

  async function confirmRetry() {
    if (!retryDelivery) return;
    setRetrying(true);
    const outcome = await retryDeliveryAction(retryDelivery.id);
    setRetrying(false);
    setRetryDelivery(null);
    if (outcome.ok) {
      toast.success("Envío reprogramado para el próximo ciclo.");
    } else if (outcome.reason) {
      const feedback = retryDeliveryFeedback(outcome.reason);
      toast[feedback.variant](feedback.message);
    } else {
      toast.error(outcome.error);
    }
    router.refresh();
  }

  function columnMenuItems(item: RentalDispatchHistoryItem) {
    const eligible = item.deliveries.find((delivery) => delivery.retryEligible);
    return [
      {
        id: "detail",
        label: "Ver detalle",
        onSelect: () => setSelected(item),
      },
      {
        id: "contract",
        label: "Ver contrato",
        onSelect: () => router.push(`/alquileres/${item.contract.id}`),
      },
      ...(eligible && canManage
        ? [
            {
              id: "retry",
              label: "Reintentar",
              onSelect: () =>
                setRetryDelivery({
                  id: eligible.id,
                  channel: eligible.channel,
                  destination: eligible.destination,
                }),
            },
          ]
        : []),
    ];
  }

  const channelIcon: Record<
    RentalDeliveryChannel,
    "mail" | "whatsapp" | "document"
  > = {
    EMAIL: "mail",
    WHATSAPP: "whatsapp",
    SMS: "document",
  };

  function renderCell(item: RentalDispatchHistoryItem, key: HistoryColumnKey) {
    switch (key) {
      case "scheduledFor":
        return (
          <span className="whitespace-nowrap">
            {formatDateTime(item.scheduledFor)}
          </span>
        );
      case "eventType":
        return REMINDER_EVENT_LABELS[item.eventType];
      case "contract":
        return (
          <Link
            href={`/alquileres/${item.contract.id}`}
            className="font-medium text-primary hover:underline"
            onClick={(event) => event.stopPropagation()}
          >
            {item.contract.internalNumber}
          </Link>
        );
      case "recipients": {
        const names = item.recipients
          .map((recipient) => recipient.name)
          .filter((name): name is string => Boolean(name));
        const compact = formatRecipientsLabel(item.recipients);
        return (
          <p className="line-clamp-2 max-w-48 text-sm" title={names.join(", ")}>
            {names.length ? compact : "—"}
          </p>
        );
      }
      case "concepts":
        return (
          <p
            className="line-clamp-1"
            title={item.conceptDetails
              .map((c) => c.conceptName)
              .filter(Boolean)
              .join(", ")}
          >
            {formatConceptsLabel(item.concepts)}
          </p>
        );
      case "channels":
        return (
          <span className="inline-flex items-center gap-1.5">
            {item.channels.map((channel) => (
              <span key={channel} title={COMMUNICATION_CHANNEL_LABELS[channel]}>
                <SystemIcon
                  name={channelIcon[channel]}
                  className="size-4 text-muted"
                />
              </span>
            ))}
            {item.channels.length === 0 ? "—" : null}
          </span>
        );
      case "status": {
        const summary = buildDispatchStatusSummary(item.deliveries);
        const full = item.deliveries
          .map(
            (delivery) =>
              `${COMMUNICATION_CHANNEL_LABELS[delivery.channel]}: ${COMMUNICATION_DELIVERY_STATUS_LABELS[delivery.status]}`,
          )
          .join(" · ");
        return (
          <Badge variant={summary.variant} title={full || summary.label}>
            {summary.label}
          </Badge>
        );
      }
      case "responses":
        return item.responsesCount > 0 ? (
          <span className="inline-flex items-center gap-1">
            <span aria-hidden="true">💬</span>
            {item.responsesCount}
            {item.responsesPending ? (
              <span className="text-xs text-muted">pend.</span>
            ) : null}
          </span>
        ) : (
          <span className="text-muted">—</span>
        );
      case "actions":
        return (
          <AdminTableActions onClick={(event) => event.stopPropagation()}>
            <DropdownMenu
              ariaLabel={`Acciones del aviso ${item.contract.internalNumber}`}
              trigger={<span aria-hidden="true">⋯</span>}
              items={columnMenuItems(item)}
            />
          </AdminTableActions>
        );
    }
  }

  const colSpan = renderedColumns.length;

  return (
    <div className="space-y-4" aria-busy={isPending || undefined}>
      <FilterBar
        search={
          <Input
            aria-label="Buscar por contrato o destinatario"
            placeholder="Buscar por contrato o destinatario..."
            value={searchDraft}
            leftIcon={<SystemIcon name="search" className="size-4" />}
            onChange={(event) => setSearchDraft(event.target.value)}
          />
        }
        filters={
          <>
            <div className="w-44">
              <Select
                value={rawStatus ?? "ALL"}
                options={STATUS_OPTIONS}
                onChange={(value) =>
                  navigate({ status: value === "ALL" ? undefined : value })
                }
              />
            </div>
            <div className="w-44">
              <Select
                value={rawChannel ?? "ALL"}
                options={CHANNEL_OPTIONS}
                onChange={(value) =>
                  navigate({ channel: value === "ALL" ? undefined : value })
                }
              />
            </div>
            <div className="w-48">
              <Select
                value={rawEventType ?? "ALL"}
                options={EVENT_OPTIONS}
                onChange={(value) =>
                  navigate({ eventType: value === "ALL" ? undefined : value })
                }
              />
            </div>
            <DatePicker
              value={(firstParam(searchParams, "scheduledFrom") ?? "").slice(
                0,
                10,
              )}
              placeholder="Desde"
              max={
                (firstParam(searchParams, "scheduledTo") ?? "").slice(0, 10) ||
                undefined
              }
              onChange={(value) =>
                navigate({ scheduledFrom: value || undefined })
              }
            />
            <DatePicker
              value={(firstParam(searchParams, "scheduledTo") ?? "").slice(
                0,
                10,
              )}
              placeholder="Hasta"
              min={
                (firstParam(searchParams, "scheduledFrom") ?? "").slice(
                  0,
                  10,
                ) || undefined
              }
              onChange={(value) =>
                navigate({ scheduledTo: value || undefined })
              }
            />
            <div className="w-44">
              <DropdownMenu
                ariaLabel="Seleccionar columnas"
                header="Columnas visibles"
                selectLike
                trigger={<span>Columnas</span>}
                items={HISTORY_COLUMNS.filter((column) => !column.locked).map(
                  (column) => ({
                    id: column.key,
                    label: column.label,
                    checked: visibleSet.has(column.key),
                    keepOpen: true,
                    onSelect: () => toggleColumn(column.key),
                  }),
                )}
              />
            </div>
          </>
        }
        activeFilters={activeFilters}
        onClearAll={activeFilters.length ? clearAllFilters : undefined}
      />

      <AdminTable variant="integrated" className="min-w-[720px]">
        <AdminTableHead>
          <AdminTableRow>
            {renderedColumns.map((column) =>
              column.sortable ? (
                <AdminTableHeader
                  key={column.key}
                  className={column.className}
                  direction={sortDirection(column.sortable)}
                  onSort={() => toggleSort(column.sortable!)}
                >
                  {column.label}
                </AdminTableHeader>
              ) : (
                <AdminTableHeader key={column.key} className={column.className}>
                  {column.label}
                </AdminTableHeader>
              ),
            )}
          </AdminTableRow>
        </AdminTableHead>
        <AdminTableBody>
          {result.items.length === 0 ? (
            <AdminTableState
              colSpan={colSpan}
              state="empty"
              title="Sin avisos registrados"
              description="Cuando se planifiquen avisos de alquiler aparecerán aquí con su estado por canal."
            />
          ) : (
            result.items.map((item) => (
              <AdminTableRow
                key={item.dispatchId}
                className="cursor-pointer"
                onClick={() => setSelected(item)}
              >
                {renderedColumns.map((column) => (
                  <AdminTableCell key={column.key} className={column.className}>
                    {renderCell(item, column.key)}
                  </AdminTableCell>
                ))}
              </AdminTableRow>
            ))
          )}
        </AdminTableBody>
      </AdminTable>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-muted" aria-live="polite">
          Mostrando {result.total > 0 ? (page - 1) * pageSize + 1 : 0}–
          {Math.min(page * pageSize, result.total)} de {result.total}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted">Por pág.:</span>
          <Select
            value={String(pageSize)}
            options={PAGE_SIZE_OPTIONS.map((size) => ({
              value: String(size),
              label: String(size),
            }))}
            onChange={(value) => navigate({ pageSize: value })}
            className="min-w-[5rem]"
          />
          <Pagination
            page={page}
            totalPages={result.totalPages}
            total={result.total}
            pageSize={pageSize}
            showSummary={false}
            disabled={isPending}
            onPageChange={(nextPage) =>
              navigate({ page: nextPage }, { resetPage: false })
            }
          />
        </div>
      </div>

      {selected ? (
        <CommunicationsHistoryPanel
          item={selected}
          canManage={canManage}
          onClose={() => setSelected(null)}
          onRequestRetry={(delivery) => setRetryDelivery(delivery)}
        />
      ) : null}

      <Modal
        open={Boolean(retryDelivery)}
        onClose={() => (retrying ? undefined : setRetryDelivery(null))}
      >
        <ModalHeader>
          <ModalTitle>Reintentar envío</ModalTitle>
        </ModalHeader>
        <ModalContent>
          <p>{RETRY_COPY}</p>
          {retryDelivery ? (
            <p className="mt-2 text-sm text-muted">
              {COMMUNICATION_CHANNEL_LABELS[retryDelivery.channel]} hacia{" "}
              {retryDelivery.destination}
            </p>
          ) : null}
        </ModalContent>
        <ModalFooter>
          <Button
            variant="secondary"
            onClick={() => setRetryDelivery(null)}
            disabled={retrying}
          >
            Cancelar
          </Button>
          <Button variant="primary" onClick={confirmRetry} loading={retrying}>
            Reintentar
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
