"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import type {
  PropertyListResponse,
  PropertyListItem,
  PropertyListingType,
  PropertyType,
} from "@repo/shared-types";
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
import { DropdownMenu } from "@repo/ui/dropdown-menu";
import { FilterBar, type ActiveFilter } from "@repo/ui/filter-bar";
import { FormField, Label } from "@repo/ui/form-field";
import { Input } from "@repo/ui/input";
import { Pagination } from "@repo/ui/pagination";
import { Select } from "@repo/ui/select";
import { GeoAutocomplete } from "@/components/geo/geo-autocomplete";
import { PropertyRowActions } from "@/components/property/property-row-actions";
import { PropertyStatusBadge } from "@/components/property/property-status-badge";
import {
  getLocalitiesByProvince,
  getNeighborhoodsByLocality,
} from "@/lib/api/geo-client";
import { getPropertyTypeLabel } from "@/lib/format/property-labels";
import { getListingTypeLabel } from "@/lib/format/listing-labels";
import { formatPropertyPriceLabel } from "@/lib/format/price";
import { buildPublicPropertyUrl } from "@/lib/property/publishability";
import {
  PROPERTY_ATTENTION_FILTER_LABELS,
  PROPERTY_COMMERCIAL_FILTER_LABELS,
} from "@/lib/property/property-list";
import {
  createPropertySearchDebounce,
  type PropertyListFilters,
  type PropertyListSort,
  updatePropertyListParams,
} from "@/lib/property/property-list-query";

type Props = {
  result: PropertyListResponse;
  filters: PropertyListFilters;
  provinceOptions: Array<{ value: string; label: string }>;
  provinceError?: string;
  canCreate: boolean;
};

const PROPERTY_TYPES: PropertyType[] = [
  "FIELD",
  "HOUSE",
  "COUNTRY_HOUSE",
  "GARAGE",
  "APARTMENT",
  "WAREHOUSE",
  "INDUSTRIAL",
  "COMMERCIAL",
  "OFFICE",
  "OTHER",
  "PH",
  "LAND",
];
const LISTING_TYPES: PropertyListingType[] = ["SALE", "RENT", "TEMPORARY_RENT"];
const ATTENTION_FILTERS = Object.entries(
  PROPERTY_ATTENTION_FILTER_LABELS,
) as Array<[keyof typeof PROPERTY_ATTENTION_FILTER_LABELS, string]>;
type Column =
  | "property"
  | "type"
  | "location"
  | "listing"
  | "status"
  | "creator"
  | "actions";
const COLUMNS: Array<{
  key: Column;
  label: string;
  sort?: PropertyListSort;
  locked?: boolean;
}> = [
  { key: "property", label: "Propiedad", sort: "title", locked: true },
  { key: "type", label: "Tipo", sort: "propertyType" },
  { key: "location", label: "Ubicación", sort: "location" },
  { key: "listing", label: "Comercialización" },
  { key: "status", label: "Estado comercial", sort: "commercialStatus" },
  { key: "creator", label: "Creada por", sort: "createdBy" },
  { key: "actions", label: "Acciones", locked: true },
];

function creatorLabel(creator: PropertyListItem["createdBy"]): string {
  return creator?.name.trim() || creator?.email.trim() || "—";
}

export function PropertyListView({
  result,
  filters,
  provinceOptions,
  provinceError,
  canCreate,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const url = searchParams.toString();
  const currentUrl = useRef(url);
  const desiredUrl = useRef<string | null>(null);
  const searchIsDraft = useRef(false);
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState(filters.search ?? "");
  const [advancedOpen, setAdvancedOpen] = useState(
    Boolean(
      filters.propertyType ||
      filters.listingType ||
      filters.attention ||
      filters.provinceId ||
      filters.localityId ||
      filters.neighborhoodId,
    ),
  );
  const [visibleColumns, setVisibleColumns] = useState<Column[]>(
    COLUMNS.map((column) => column.key),
  );

  const navigate = useCallback(
    (
      updates: Record<string, string | number | undefined>,
      resetPage = true,
    ) => {
      const params = updatePropertyListParams(
        currentUrl.current,
        updates,
        resetPage,
      );
      desiredUrl.current = params;
      currentUrl.current = params;
      startTransition(() =>
        router.push(params ? `${pathname}?${params}` : pathname, {
          scroll: false,
        }),
      );
    },
    [pathname, router],
  );
  const navigateRef = useRef(navigate);
  useEffect(() => {
    navigateRef.current = navigate;
  }, [navigate]);
  const [searchDebounce] = useState(() =>
    createPropertySearchDebounce((value) => {
      searchIsDraft.current = false;
      navigateRef.current({ search: value || undefined });
    }),
  );

  // Back/forward is authoritative. An in-progress search never gets overwritten by
  // a late RSC payload from a previous navigation.
  useEffect(() => {
    if (desiredUrl.current !== null && url !== desiredUrl.current) return;
    desiredUrl.current = null;
    currentUrl.current = url;
    if (!searchIsDraft.current) setSearch(filters.search ?? "");
  }, [url, filters.search]);
  useEffect(() => {
    const onPopState = () => {
      searchDebounce.cancel();
      desiredUrl.current = null;
      searchIsDraft.current = false;
      currentUrl.current = window.location.search.slice(1);
      setSearch(new URLSearchParams(currentUrl.current).get("search") ?? "");
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [searchDebounce]);
  useEffect(() => () => searchDebounce.cancel(), [searchDebounce]);

  const updateSearch = (value: string) => {
    setSearch(value);
    searchIsDraft.current = true;
    searchDebounce.schedule(value);
  };

  const change = (
    updates: Record<string, string | number | undefined>,
    resetPage = true,
  ) => {
    searchDebounce.cancel();
    if (searchIsDraft.current) {
      searchIsDraft.current = false;
      updates = {
        search: search.trim().slice(0, 160) || undefined,
        ...updates,
      };
    }
    navigate(updates, resetPage);
  };
  const clearAll = () => {
    searchDebounce.cancel();
    searchIsDraft.current = false;
    setSearch("");
    desiredUrl.current = "";
    currentUrl.current = "";
    startTransition(() => router.push(pathname, { scroll: false }));
  };

  // The API clamps pages. Canonicalize the URL without re-fetching a full inventory.
  useEffect(() => {
    if (
      filters.page > result.totalPages &&
      filters.page !== result.page &&
      !pending
    ) {
      const params = updatePropertyListParams(
        url,
        { page: result.page === 1 ? undefined : result.page },
        false,
      );
      router.replace(params ? `${pathname}?${params}` : pathname, {
        scroll: false,
      });
    }
  }, [
    filters.page,
    result.page,
    result.totalPages,
    url,
    pending,
    pathname,
    router,
  ]);

  const activeFilters: ActiveFilter[] = (() => {
    const items: ActiveFilter[] = [];
    if (filters.search)
      items.push({
        id: "search",
        label: `Búsqueda: ${filters.search}`,
        onRemove: () => {
          searchIsDraft.current = false;
          setSearch("");
          change({ search: undefined });
        },
      });
    if (filters.commercialStatus !== "all")
      items.push({
        id: "estado",
        label: `Estado: ${PROPERTY_COMMERCIAL_FILTER_LABELS[filters.commercialStatus]}`,
        onRemove: () => change({ estado: undefined }),
      });
    if (filters.propertyType)
      items.push({
        id: "propertyType",
        label: `Tipo: ${getPropertyTypeLabel(filters.propertyType)}`,
        onRemove: () => change({ propertyType: undefined }),
      });
    if (filters.listingType)
      items.push({
        id: "listingType",
        label: `Operación: ${getListingTypeLabel(filters.listingType)}`,
        onRemove: () => change({ listingType: undefined }),
      });
    if (filters.attention)
      items.push({
        id: "atencion",
        label: `Atención: ${PROPERTY_ATTENTION_FILTER_LABELS[filters.attention]}`,
        onRemove: () => change({ atencion: undefined }),
      });
    if (filters.provinceId)
      items.push({
        id: "provinceId",
        label: `Provincia: ${filters.provinceName ?? provinceOptions.find((p) => p.value === filters.provinceId)?.label ?? "seleccionada"}`,
        onRemove: () =>
          change({
            provinceId: undefined,
            provinceName: undefined,
            localityId: undefined,
            localityName: undefined,
            neighborhoodId: undefined,
            neighborhoodName: undefined,
          }),
      });
    if (filters.localityId)
      items.push({
        id: "localityId",
        label: `Localidad: ${filters.localityName ?? "seleccionada"}`,
        onRemove: () =>
          change({
            localityId: undefined,
            localityName: undefined,
            neighborhoodId: undefined,
            neighborhoodName: undefined,
          }),
      });
    if (filters.neighborhoodId)
      items.push({
        id: "neighborhoodId",
        label: `Barrio: ${filters.neighborhoodName ?? "seleccionado"}`,
        onRemove: () =>
          change({ neighborhoodId: undefined, neighborhoodName: undefined }),
      });
    return items;
  })();

  const displayedColumns = COLUMNS.filter((column) =>
    visibleColumns.includes(column.key),
  );
  const sortDirection = (key: PropertyListSort): SortDirection | null =>
    filters.sortBy === key ? filters.sortOrder : null;
  const toggleSort = (key: PropertyListSort) =>
    change({
      sortBy: key,
      sortOrder:
        filters.sortBy === key && filters.sortOrder === "asc" ? "desc" : "asc",
    });
  const hasFilters = activeFilters.length > 0;

  function cell(item: PropertyListItem, column: Column) {
    switch (column) {
      case "property":
        return (
          <div className="min-w-48">
            <Link
              href={`/propiedades/${item.id}`}
              className="font-semibold text-foreground hover:text-primary"
            >
              {item.title}
            </Link>
            {item.internalCode ? (
              <p className="mt-0.5 text-xs text-muted">{item.internalCode}</p>
            ) : null}
          </div>
        );
      case "type":
        return (
          <span className="text-muted">
            {getPropertyTypeLabel(item.propertyType)}
          </span>
        );
      case "location":
        return (
          <span className="text-muted">
            {[item.location.neighborhoodName, item.location.localityName]
              .filter(Boolean)
              .join(", ") || "—"}
          </span>
        );
      case "listing":
        return item.listingTypes.length ? (
          <div className="flex flex-col items-start gap-1.5">
            {item.listingTypes.map((type) => {
              const operation = item.publishedOperations.find(
                (operation) => operation.listingType === type,
              );
              return (
                <div
                  key={type}
                  className="flex flex-wrap items-center gap-x-2 gap-y-1"
                >
                  <Badge
                    variant={
                      type === "SALE"
                        ? "info"
                        : type === "RENT"
                          ? "success"
                          : "neutral"
                    }
                    className="shrink-0 px-1.5"
                  >
                    {getListingTypeLabel(type)}
                  </Badge>
                  {operation && (
                    <span className="whitespace-nowrap text-sm tabular-nums">
                      {formatPropertyPriceLabel(
                        operation.primaryPrice?.amount,
                        operation.primaryPrice?.currency,
                      )}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <span className="text-muted">—</span>
        );
      case "status":
        return <PropertyStatusBadge status={item.statusVariant} />;
      case "creator":
        return (
          <div
            className="flex max-w-48 items-center gap-1.5"
            title={
              item.createdBy
                ? `${creatorLabel(item.createdBy)} · ${item.createdBy.email}${item.createdBy.isActive ? "" : " · Inactivo"}`
                : undefined
            }
          >
            <span className="truncate text-muted">
              {creatorLabel(item.createdBy)}
            </span>
            {item.createdBy && !item.createdBy.isActive ? (
              <Badge
                variant="neutral"
                title="Usuario inactivo"
                className="shrink-0"
              >
                Inactivo
              </Badge>
            ) : null}
          </div>
        );
      case "actions":
        return (
          <AdminTableActions>
            <PropertyRowActions
              property={item}
              publicUrl={
                item.publicUrl ??
                (item.isAnyPublishable
                  ? buildPublicPropertyUrl(item.slug)
                  : null)
              }
              activeListingsCount={item.activeListingsCount}
              capabilities={item.capabilities}
            />
          </AdminTableActions>
        );
    }
  }

  return (
    <div className="space-y-4" aria-busy={pending || undefined}>
      <FilterBar
        search={
          <Input
            type="search"
            maxLength={160}
            aria-label="Buscar propiedades"
            placeholder="Título, código, localidad o barrio…"
            leftIcon={<SystemIcon name="search" className="size-4" />}
            value={search}
            onChange={(event) => updateSearch(event.target.value)}
          />
        }
        filters={
          <>
            <FormField className="w-48">
              <Label className="sr-only">Estado comercial</Label>
              <Select
                value={filters.commercialStatus}
                options={Object.entries(PROPERTY_COMMERCIAL_FILTER_LABELS).map(
                  ([value, label]) => ({
                    value,
                    label: `${label} (${result.commercialCounts[value === "commercial-draft" ? "commercialDraft" : (value as keyof typeof result.commercialCounts)]})`,
                  }),
                )}
                onChange={(value) =>
                  change({ estado: value === "all" ? undefined : value })
                }
              />
            </FormField>
            <FormField className="w-44">
              <Label className="sr-only">Tipo de propiedad</Label>
              <Select
                value={filters.propertyType ?? ""}
                options={[
                  { value: "", label: "Todos los tipos" },
                  ...PROPERTY_TYPES.map((value) => ({
                    value,
                    label: getPropertyTypeLabel(value),
                  })),
                ]}
                onChange={(value) =>
                  change({ propertyType: value || undefined })
                }
              />
            </FormField>
            <FormField className="w-44">
              <Label className="sr-only">Operación</Label>
              <Select
                value={filters.listingType ?? ""}
                options={[
                  { value: "", label: "Todas las operaciones" },
                  ...LISTING_TYPES.map((value) => ({
                    value,
                    label: getListingTypeLabel(value),
                  })),
                ]}
                onChange={(value) =>
                  change({ listingType: value || undefined })
                }
              />
            </FormField>
          </>
        }
        moreFilters={
          <Button
            variant={advancedOpen ? "primary" : "outline-primary"}
            onClick={() => setAdvancedOpen((open) => !open)}
            aria-expanded={advancedOpen}
          >
            Más filtros
          </Button>
        }
        actions={
          <DropdownMenu
            ariaLabel="Seleccionar columnas"
            header="Columnas visibles"
            selectLike
            trigger={<span>Columnas</span>}
            items={COLUMNS.filter((col) => !col.locked).map((col) => ({
              id: col.key,
              label: col.label,
              checked: visibleColumns.includes(col.key),
              keepOpen: true,
              onSelect: () =>
                setVisibleColumns((keys) =>
                  keys.includes(col.key)
                    ? keys.filter((key) => key !== col.key)
                    : [...keys, col.key],
                ),
            }))}
          />
        }
        activeFilters={activeFilters}
        onClearAll={hasFilters ? clearAll : undefined}
      />

      {advancedOpen ? (
        <section
          aria-label="Filtros avanzados"
          className="grid gap-3 rounded-xl border border-border bg-surface p-4 md:grid-cols-2 xl:grid-cols-4"
        >
          <FormField>
            <Label>Atención</Label>
            <Select
              value={filters.attention ?? ""}
              options={[
                { value: "", label: "Sin filtro de atención" },
                ...ATTENTION_FILTERS.map(([value, label]) => ({
                  value,
                  label,
                })),
              ]}
              onChange={(value) => change({ atencion: value || undefined })}
            />
          </FormField>
          <FormField>
            <Label>Provincia</Label>
            <Select
              value={filters.provinceId ?? ""}
              options={[{ value: "", label: "Todas" }, ...provinceOptions]}
              onChange={(value) =>
                change({
                  provinceId: value || undefined,
                  provinceName: provinceOptions.find(
                    (option) => option.value === value,
                  )?.label,
                  localityId: undefined,
                  localityName: undefined,
                  neighborhoodId: undefined,
                  neighborhoodName: undefined,
                })
              }
            />
            {provinceError ? (
              <p role="alert" className="mt-1 text-xs text-red-700">
                {provinceError}
              </p>
            ) : null}
          </FormField>
          <GeoAutocomplete
            label="Localidad"
            placeholder={
              filters.provinceId ? "Buscar localidad…" : "Elegí una provincia"
            }
            value={filters.localityId ?? ""}
            displayValue={filters.localityName ?? ""}
            disabled={!filters.provinceId}
            onQuery={async (query) =>
              (await getLocalitiesByProvince(filters.provinceId!, query)).map(
                ({ id, name }) => ({ value: id, label: name }),
              )
            }
            onChange={(option) =>
              change({
                localityId: option?.value,
                localityName: option?.label,
                neighborhoodId: undefined,
                neighborhoodName: undefined,
              })
            }
          />
          <GeoAutocomplete
            label="Barrio"
            placeholder={
              filters.localityId ? "Buscar barrio…" : "Elegí una localidad"
            }
            value={filters.neighborhoodId ?? ""}
            displayValue={filters.neighborhoodName ?? ""}
            disabled={!filters.localityId}
            onQuery={async (query) =>
              (
                await getNeighborhoodsByLocality(filters.localityId!, query)
              ).map(({ id, name }) => ({ value: id, label: name }))
            }
            onChange={(option) =>
              change({
                neighborhoodId: option?.value,
                neighborhoodName: option?.label,
              })
            }
          />
        </section>
      ) : null}

      <AdminTable className="min-w-[1040px]">
        <AdminTableHead>
          <AdminTableRow>
            {displayedColumns.map((column) => (
              <AdminTableHeader
                key={column.key}
                className={column.key === "actions" ? "text-right" : undefined}
                direction={column.sort ? sortDirection(column.sort) : undefined}
                onSort={
                  column.sort ? () => toggleSort(column.sort!) : undefined
                }
              >
                {column.label}
              </AdminTableHeader>
            ))}
          </AdminTableRow>
        </AdminTableHead>
        <AdminTableBody>
          {result.items.length ? (
            result.items.map((item) => (
              <AdminTableRow key={item.id}>
                {displayedColumns.map((column) => (
                  <AdminTableCell key={column.key}>
                    {cell(item, column.key)}
                  </AdminTableCell>
                ))}
              </AdminTableRow>
            ))
          ) : (
            <AdminTableState
              colSpan={displayedColumns.length}
              state="empty"
              title={
                result.commercialCounts.all === 0
                  ? "Sin propiedades todavía"
                  : "Sin resultados"
              }
              description={
                result.commercialCounts.all === 0
                  ? "Creá la primera propiedad para comenzar a gestionar publicaciones."
                  : "No hay propiedades que coincidan con la búsqueda o los filtros."
              }
              action={
                hasFilters ? (
                  <Button variant="secondary" onClick={clearAll}>
                    Limpiar filtros
                  </Button>
                ) : canCreate && result.commercialCounts.all === 0 ? (
                  <Link href="/propiedades/crear">
                    <Button>Nueva propiedad</Button>
                  </Link>
                ) : undefined
              }
            />
          )}
        </AdminTableBody>
      </AdminTable>

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted" aria-live="polite">
          Mostrando {result.total ? (result.page - 1) * result.pageSize + 1 : 0}
          –{Math.min(result.page * result.pageSize, result.total)} de{" "}
          {result.total} propiedades
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-muted">Por pág.:</span>
          <FormField>
            <Label className="sr-only">Filas por página</Label>
            <Select
              value={String(result.pageSize)}
              options={[20, 50, 100].map((value) => ({
                value: String(value),
                label: String(value),
              }))}
              onChange={(value) => change({ pageSize: value })}
              className="min-w-20"
            />
          </FormField>
          <Pagination
            page={result.page}
            pageSize={result.pageSize}
            total={result.total}
            totalPages={result.totalPages}
            showSummary={false}
            disabled={pending}
            onPageChange={(page) => change({ page }, false)}
          />
        </div>
      </div>
    </div>
  );
}
