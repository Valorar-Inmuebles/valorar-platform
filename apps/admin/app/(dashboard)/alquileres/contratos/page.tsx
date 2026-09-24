import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@repo/ui/button";
import { RentalContractList } from "@/components/rental/rental-contract-list";
import { RentalModuleNav } from "@/components/rental/rental-module-nav";
import { ApiErrorPanel } from "@/components/shared/api-error-panel";
import { PageShell } from "@/components/shared/page-shell";
import { SuperAdminTenantEmptyState } from "@/components/shared/super-admin-tenant-empty-state";
import { getProvinces } from "@/lib/api/geo";
import { mapUnknownError } from "@/lib/api/error-map";
import { listRentalContracts } from "@/lib/api/rental";
import type {
  RentalContractListQuery,
  RentalContractStatus,
} from "@/lib/api/types/rental";
import { getActiveTenantId } from "@/lib/auth/active-tenant";
import { resolveActiveTenantGate } from "@/lib/auth/require-active-tenant";
import { getSession } from "@/lib/auth/session";
import { sessionHasPermission } from "@/lib/auth/types";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const STATUSES = new Set(["DRAFT", "ACTIVE", "ENDED", "CANCELLED"]);
const SORT_FIELDS = new Set([
  "internalNumber",
  "startsOn",
  "endsOn",
  "status",
  "propertyAddress",
  "createdAt",
]);

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function positiveInt(value: string | undefined, fallback: number, max: number) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 && number <= max
    ? number
    : fallback;
}

export default async function RentalContractsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const raw = await searchParams;
  const [session, activeTenantId] = await Promise.all([
    getSession(),
    getActiveTenantId(),
  ]);
  if (!session) redirect("/login");
  if (!sessionHasPermission(session.user, "rental.read")) redirect("/");

  const gate = resolveActiveTenantGate(session.user, activeTenantId);
  if (!gate.ok) {
    return (
      <PageShell title="Contratos de alquiler" subNav={<RentalModuleNav />}>
        <SuperAdminTenantEmptyState />
      </PageShell>
    );
  }

  const statusValue = first(raw.status);
  const sortValue = first(raw.sortBy);
  const sortOrderValue = first(raw.sortOrder);
  const endingWithinDaysValue = first(raw.endingWithinDays);
  const query: RentalContractListQuery = {
    search: first(raw.search)?.trim() || undefined,
    status:
      statusValue && STATUSES.has(statusValue)
        ? (statusValue as RentalContractStatus)
        : undefined,
    endingWithinDays: endingWithinDaysValue
      ? positiveInt(endingWithinDaysValue, 60, 365)
      : undefined,
    provinceId: first(raw.provinceId) || undefined,
    localityId: first(raw.localityId) || undefined,
    neighborhoodId: first(raw.neighborhoodId) || undefined,
    sortBy:
      sortValue && SORT_FIELDS.has(sortValue)
        ? (sortValue as NonNullable<RentalContractListQuery["sortBy"]>)
        : "startsOn",
    sortOrder:
      sortOrderValue === "asc" || sortOrderValue === "desc"
        ? sortOrderValue
        : "desc",
    page: positiveInt(first(raw.page), 1, 1_000_000),
    pageSize: positiveInt(first(raw.pageSize), 20, 100),
  };

  try {
    const [result, provincesResult] = await Promise.all([
      listRentalContracts(query),
      getProvinces()
        .then((value) => ({ value, error: false }))
        .catch(() => ({ value: [], error: true })),
    ]);
    return (
      <PageShell
        title="Contratos de alquiler"
        description="Administrá los contratos, sus partes y próximos vencimientos."
        breadcrumbs={[
          { label: "Inicio", href: "/" },
          { label: "Gestión de alquileres", href: "/alquileres" },
          { label: "Contratos" },
        ]}
        subNav={<RentalModuleNav />}
        actions={
          sessionHasPermission(session.user, "rental.contract.create") ? (
            <Link href="/alquileres/crear">
              <Button>Nuevo contrato</Button>
            </Link>
          ) : undefined
        }
      >
        <RentalContractList
          result={result}
          filters={{
            ...query,
            provinceName: first(raw.provinceName),
            localityName: first(raw.localityName),
            neighborhoodName: first(raw.neighborhoodName),
          }}
          canUpdate={sessionHasPermission(
            session.user,
            "rental.contract.update",
          )}
          provinceOptions={provincesResult.value.map((province) => ({
            value: province.id,
            label: province.name,
          }))}
          provinceError={
            provincesResult.error
              ? "No pudimos cargar las provincias. Intentá nuevamente."
              : undefined
          }
        />
      </PageShell>
    );
  } catch (error) {
    return (
      <PageShell title="Contratos de alquiler" subNav={<RentalModuleNav />}>
        <ApiErrorPanel message={mapUnknownError(error)} />
      </PageShell>
    );
  }
}
