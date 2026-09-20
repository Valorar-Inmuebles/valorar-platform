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
import { Badge, type BadgeVariant } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { DropdownMenu } from "@repo/ui/dropdown-menu";
import { FilterBar, type ActiveFilter } from "@repo/ui/filter-bar";
import { Input } from "@repo/ui/input";
import { Pagination } from "@repo/ui/pagination";
import { Select } from "@repo/ui/select";
import { GeoAutocomplete } from "@/components/geo/geo-autocomplete";
import {
  getLocalitiesByProvince,
  getNeighborhoodsByLocality,
} from "@/lib/api/geo-client";
import type {
  PaginatedResponse,
  RentalContractListItem,
  RentalContractListQuery,
  RentalContractStatus,
} from "@/lib/api/types/rental";
import {
  CONTRACT_STATUS_LABELS,
  formatDateOnly,
  isEndingSoon,
} from "@/lib/rental/rental-ui";

type Filters = RentalContractListQuery & {
  provinceName?: string;
  localityName?: string;
  neighborhoodName?: string;
};

type Props = {
  result: PaginatedResponse<RentalContractListItem>;
  filters: Filters;
  provinceOptions: Array<{ value: string; label: string }>;
};

const STATUS_VARIANTS: Record<RentalContractStatus, BadgeVariant> = {
  DRAFT: "neutral",
  ACTIVE: "success",
  ENDED: "info",
  CANCELLED: "danger",
};

const SORTABLE = {
  internalNumber: "internalNumber",
  propertyAddress: "propertyAddress",
  startsOn: "startsOn",
  endsOn: "endsOn",
  status: "status",
} as const;

function partyNames(
  contract: RentalContractListItem,
  role: "RENTER" | "LANDLORD",
) {
  return contract.parties
    .filter((party) => party.role === role)
    .map((party) => party.contact.name);
}

function PartySummary({ names }: { names: string[] }) {
  if (names.length === 0)
    return <span className="text-muted">Sin asignar</span>;
  return (
    <div>
      <p className="font-medium text-foreground">{names[0]}</p>
      {names.length > 1 ? (
        <p className="text-xs text-muted">+{names.length - 1} más</p>
      ) : null}
    </div>
  );
}

export function RentalContractList({
  result,
  filters,
  provinceOptions,
}: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState(filters.search ?? "");
  const [advancedOpen, setAdvancedOpen] = useState(
    Boolean(filters.provinceId || filters.localityId || filters.neighborhoodId),
  );

  useEffect(() => setSearch(filters.search ?? ""), [filters.search]);

  const navigate = useCallback(
    (
      updates: Record<string, string | number | undefined>,
      resetPage = true,
    ) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value === undefined || value === "") params.delete(key);
        else params.set(key, String(value));
      });
      if (resetPage) params.delete("page");
      startTransition(() => {
        router.replace(
          params.size ? `${pathname}?${params.toString()}` : pathname,
          { scroll: false },
        );
      });
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    const normalized = search.trim();
    if (normalized === (filters.search ?? "")) return;
    const timer = window.setTimeout(
      () => navigate({ search: normalized || undefined }),
      350,
    );
    return () => window.clearTimeout(timer);
  }, [filters.search, navigate, search]);

  const clearAll = () => {
    setSearch("");
    startTransition(() => router.replace(pathname, { scroll: false }));
  };

  const activeFilters = useMemo<ActiveFilter[]>(() => {
    const items: ActiveFilter[] = [];
    if (filters.search) {
      items.push({
        id: "search",
        label: `Búsqueda: ${filters.search}`,
        onRemove: () => {
          setSearch("");
          navigate({ search: undefined });
        },
      });
    }
    if (filters.status) {
      items.push({
        id: "status",
        label: `Estado: ${CONTRACT_STATUS_LABELS[filters.status]}`,
        onRemove: () => navigate({ status: undefined }),
      });
    }
    if (filters.endingWithinDays) {
      items.push({
        id: "ending",
        label: `Finalizan en ${filters.endingWithinDays} días`,
        onRemove: () => navigate({ endingWithinDays: undefined }),
      });
    }
    if (filters.provinceId) {
      items.push({
        id: "province",
        label: `Provincia: ${filters.provinceName ?? "seleccionada"}`,
        onRemove: () =>
          navigate({
            provinceId: undefined,
            provinceName: undefined,
            localityId: undefined,
            localityName: undefined,
            neighborhoodId: undefined,
            neighborhoodName: undefined,
          }),
      });
    }
    if (filters.localityId) {
      items.push({
        id: "locality",
        label: `Localidad: ${filters.localityName ?? "seleccionada"}`,
        onRemove: () =>
          navigate({
            localityId: undefined,
            localityName: undefined,
            neighborhoodId: undefined,
            neighborhoodName: undefined,
          }),
      });
    }
    if (filters.neighborhoodId) {
      items.push({
        id: "neighborhood",
        label: `Barrio: ${filters.neighborhoodName ?? "seleccionado"}`,
        onRemove: () =>
          navigate({ neighborhoodId: undefined, neighborhoodName: undefined }),
      });
    }
    return items;
  }, [filters, navigate]);

  const sort = (
    field: (typeof SORTABLE)[keyof typeof SORTABLE],
    direction?: SortDirection | null,
  ) =>
    navigate({
      sortBy: field,
      sortOrder: direction === "asc" ? "desc" : "asc",
    });

  const directionFor = (
    field: (typeof SORTABLE)[keyof typeof SORTABLE],
  ): SortDirection | null =>
    filters.sortBy === field ? (filters.sortOrder ?? "asc") : null;

  const hasFilters = activeFilters.length > 0;

  return (
    <div className="space-y-4" aria-busy={pending || undefined}>
      <FilterBar
        search={
          <Input
            aria-label="Buscar contratos"
            placeholder="Contrato, inquilino, propietario o dirección…"
            value={search}
            leftIcon={<SystemIcon name="search" className="size-4" />}
            onChange={(event) => setSearch(event.target.value)}
          />
        }
        filters={
          <>
            <div className="w-40">
              <Select
                value={filters.status ?? "ALL"}
                options={[
                  { value: "ALL", label: "Todos los estados" },
                  { value: "ACTIVE", label: "Activos" },
                  { value: "DRAFT", label: "Borradores" },
                  { value: "ENDED", label: "Finalizados" },
                  { value: "CANCELLED", label: "Cancelados" },
                ]}
                onChange={(value) =>
                  navigate({
                    status:
                      value === "ALL"
                        ? undefined
                        : (value as RentalContractStatus),
                  })
                }
              />
            </div>
            <Button
              variant={filters.endingWithinDays ? "primary" : "secondary"}
              onClick={() =>
                navigate({
                  endingWithinDays: filters.endingWithinDays ? undefined : 60,
                })
              }
            >
              Por vencer
            </Button>
          </>
        }
        moreFilters={
          <Button
            variant="outline-primary"
            onClick={() => setAdvancedOpen((current) => !current)}
          >
            Más filtros
            {[
              filters.provinceId,
              filters.localityId,
              filters.neighborhoodId,
            ].filter(Boolean).length ? (
              <span className="rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">
                {
                  [
                    filters.provinceId,
                    filters.localityId,
                    filters.neighborhoodId,
                  ].filter(Boolean).length
                }
              </span>
            ) : null}
          </Button>
        }
        actions={
          hasFilters ? (
            <button
              type="button"
              className="text-sm font-medium text-primary hover:underline"
              onClick={clearAll}
            >
              Limpiar filtros
            </button>
          ) : null
        }
        activeFilters={activeFilters}
        onClearAll={clearAll}
        clearLabel="Limpiar todo"
      />

      {advancedOpen ? (
        <section
          aria-label="Filtros avanzados"
          className="grid gap-3 rounded-xl border border-border bg-surface p-4 md:grid-cols-3"
        >
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted">Provincia</p>
            <Select
              value={filters.provinceId ?? ""}
              placeholder="Todas"
              options={[{ value: "", label: "Todas" }, ...provinceOptions]}
              onChange={(value) => {
                const label = provinceOptions.find(
                  (option) => option.value === value,
                )?.label;
                navigate({
                  provinceId: value || undefined,
                  provinceName: label,
                  localityId: undefined,
                  localityName: undefined,
                  neighborhoodId: undefined,
                  neighborhoodName: undefined,
                });
              }}
            />
          </div>
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
                (item) => ({
                  value: item.id,
                  label: item.name,
                  description: item.postalCode
                    ? `CP ${item.postalCode}`
                    : undefined,
                }),
              )
            }
            onChange={(option) =>
              navigate({
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
              ).map((item) => ({ value: item.id, label: item.name }))
            }
            onChange={(option) =>
              navigate({
                neighborhoodId: option?.value,
                neighborhoodName: option?.label,
              })
            }
          />
        </section>
      ) : null}

      <AdminTable className="min-w-[1100px]">
        <AdminTableHead>
          <tr>
            <AdminTableHeader
              direction={directionFor(SORTABLE.internalNumber)}
              onSort={() =>
                sort(
                  SORTABLE.internalNumber,
                  directionFor(SORTABLE.internalNumber),
                )
              }
            >
              Número interno
            </AdminTableHeader>
            <AdminTableHeader
              direction={directionFor(SORTABLE.propertyAddress)}
              onSort={() =>
                sort(
                  SORTABLE.propertyAddress,
                  directionFor(SORTABLE.propertyAddress),
                )
              }
            >
              Inmueble / Dirección
            </AdminTableHeader>
            <AdminTableHeader>Inquilino/s</AdminTableHeader>
            <AdminTableHeader className="hidden xl:table-cell">
              Propietario/s
            </AdminTableHeader>
            <AdminTableHeader
              className="hidden lg:table-cell"
              direction={directionFor(SORTABLE.startsOn)}
              onSort={() =>
                sort(SORTABLE.startsOn, directionFor(SORTABLE.startsOn))
              }
            >
              Inicio
            </AdminTableHeader>
            <AdminTableHeader
              className="hidden lg:table-cell"
              direction={directionFor(SORTABLE.endsOn)}
              onSort={() =>
                sort(SORTABLE.endsOn, directionFor(SORTABLE.endsOn))
              }
            >
              Fin
            </AdminTableHeader>
            <AdminTableHeader className="hidden md:table-cell">
              Próximo vencimiento
            </AdminTableHeader>
            <AdminTableHeader
              direction={directionFor(SORTABLE.status)}
              onSort={() =>
                sort(SORTABLE.status, directionFor(SORTABLE.status))
              }
            >
              Estado
            </AdminTableHeader>
            <AdminTableHeader className="text-right">Acciones</AdminTableHeader>
          </tr>
        </AdminTableHead>
        <AdminTableBody>
          {result.items.length === 0 ? (
            <AdminTableState
              colSpan={9}
              state="empty"
              title={hasFilters ? "Sin resultados" : "Sin contratos todavía"}
              description={
                hasFilters
                  ? "No hay contratos que coincidan con la búsqueda o los filtros."
                  : "Creá el primer borrador para comenzar."
              }
              action={
                hasFilters ? (
                  <Button variant="secondary" onClick={clearAll}>
                    Limpiar filtros
                  </Button>
                ) : undefined
              }
            />
          ) : (
            result.items.map((contract) => {
              const renters = partyNames(contract, "RENTER");
              const landlords = partyNames(contract, "LANDLORD");
              const endingSoon = isEndingSoon(contract.status, contract.endsOn);
              return (
                <AdminTableRow key={contract.id}>
                  <AdminTableCell>
                    <Link
                      href={`/alquileres/${contract.id}`}
                      className="font-semibold text-foreground hover:text-primary"
                    >
                      {contract.internalNumber}
                    </Link>
                  </AdminTableCell>
                  <AdminTableCell>
                    <p className="max-w-64 font-medium text-foreground">
                      {contract.propertyAddressSnapshot}
                    </p>
                    {contract.property?.title ? (
                      <p className="mt-0.5 max-w-64 truncate text-xs text-muted">
                        {contract.property.title}
                      </p>
                    ) : null}
                  </AdminTableCell>
                  <AdminTableCell>
                    <PartySummary names={renters} />
                  </AdminTableCell>
                  <AdminTableCell className="hidden xl:table-cell">
                    <PartySummary names={landlords} />
                  </AdminTableCell>
                  <AdminTableCell className="hidden whitespace-nowrap lg:table-cell">
                    {formatDateOnly(contract.startsOn)}
                  </AdminTableCell>
                  <AdminTableCell className="hidden whitespace-nowrap lg:table-cell">
                    {formatDateOnly(contract.endsOn)}
                  </AdminTableCell>
                  <AdminTableCell className="hidden md:table-cell">
                    {contract.nextDueOccurrence ? (
                      <div>
                        <p className="whitespace-nowrap font-medium">
                          {contract.nextDueOccurrence.dueDatePending
                            ? "Fecha pendiente"
                            : formatDateOnly(
                                contract.nextDueOccurrence.dueDate,
                              )}
                        </p>
                        <p className="text-xs text-muted">
                          {contract.nextDueOccurrence.concept.name}
                        </p>
                      </div>
                    ) : (
                      <span className="text-muted">Sin pendientes</span>
                    )}
                  </AdminTableCell>
                  <AdminTableCell>
                    <Badge
                      variant={
                        endingSoon
                          ? "warning"
                          : STATUS_VARIANTS[contract.status]
                      }
                    >
                      {endingSoon
                        ? "Por vencer"
                        : CONTRACT_STATUS_LABELS[contract.status]}
                    </Badge>
                  </AdminTableCell>
                  <AdminTableCell>
                    <AdminTableActions>
                      <DropdownMenu
                        ariaLabel={`Acciones de ${contract.internalNumber}`}
                        trigger={
                          <span className="flex size-8 items-center justify-center rounded-md text-lg text-muted hover:bg-surface-alt hover:text-foreground">
                            ⋯
                          </span>
                        }
                        items={[
                          {
                            id: "view",
                            label: "Ver contrato",
                            onSelect: () =>
                              router.push(`/alquileres/${contract.id}`),
                          },
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
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <Pagination
            page={result.page}
            pageSize={result.pageSize}
            total={result.total}
            totalPages={result.totalPages}
            disabled={pending}
            className="flex-1"
            onPageChange={(page) => navigate({ page }, false)}
          />
          <div className="flex items-center gap-2 text-sm text-muted">
            <span>Filas por página</span>
            <div className="w-20">
              <Select
                value={String(result.pageSize)}
                options={[10, 20, 50].map((size) => ({
                  value: String(size),
                  label: String(size),
                }))}
                onChange={(value) =>
                  navigate({ pageSize: Number(value), page: undefined })
                }
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
