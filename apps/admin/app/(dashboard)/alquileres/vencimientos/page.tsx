import { redirect } from "next/navigation";
import {
  RentalDueDatesView,
  type RentalDueFilters,
} from "@/components/rental/rental-due-dates-view";
import { RentalModuleNav } from "@/components/rental/rental-module-nav";
import { PageShell } from "@/components/shared/page-shell";
import { SuperAdminTenantEmptyState } from "@/components/shared/super-admin-tenant-empty-state";
import { listRentalConcepts, listRentalOccurrences } from "@/lib/api/rental";
import type { RentalOccurrenceStatus } from "@/lib/api/types/rental";
import { getActiveTenantId } from "@/lib/auth/active-tenant";
import { resolveActiveTenantGate } from "@/lib/auth/require-active-tenant";
import { getSession } from "@/lib/auth/session";
import { sessionHasPermission } from "@/lib/auth/types";

const CATEGORIES = ["ALL", "RENT", "OTHER", "OVERDUE"] as const;
const STATUSES: RentalOccurrenceStatus[] = [
  "PENDING",
  "OVERDUE",
  "FULFILLED",
  "CANCELLED",
];
const SORTS = [
  "dueDate",
  "internalNumber",
  "concept",
  "amount",
  "status",
] as const;

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

export default async function RentalDueDatesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [session, activeTenantId, query] = await Promise.all([
    getSession(),
    getActiveTenantId(),
    searchParams,
  ]);
  if (!session) redirect("/login");
  if (!sessionHasPermission(session.user, "rental.read")) redirect("/");
  const gate = resolveActiveTenantGate(session.user, activeTenantId);
  if (!gate.ok)
    return (
      <PageShell title="Vencimientos">
        <SuperAdminTenantEmptyState />
      </PageShell>
    );

  const value = (key: string) =>
    typeof query[key] === "string" ? query[key] : undefined;
  const month = /^\d{4}-\d{2}$/.test(value("month") ?? "")
    ? value("month")!
    : currentMonth();
  const requestedCategory = value("category")?.toUpperCase();
  const category = CATEGORIES.includes(
    requestedCategory as (typeof CATEGORIES)[number],
  )
    ? (requestedCategory as RentalDueFilters["category"])
    : "ALL";
  const requestedStatus = value("status")?.toUpperCase() as
    | RentalOccurrenceStatus
    | undefined;
  const requestedSort = value("sortBy") as RentalDueFilters["sortBy"];
  const page = Math.max(1, Number(value("page")) || 1);
  const pageSize = [10, 20, 50].includes(Number(value("pageSize")))
    ? Number(value("pageSize"))
    : 10;
  const filters: RentalDueFilters = {
    month,
    category,
    status:
      requestedStatus && STATUSES.includes(requestedStatus)
        ? requestedStatus
        : undefined,
    conceptId: value("conceptId"),
    search: value("search")?.trim() || undefined,
    sortBy:
      requestedSort && SORTS.includes(requestedSort)
        ? requestedSort
        : "dueDate",
    sortOrder: value("sortOrder") === "desc" ? "desc" : "asc",
    page,
    pageSize,
  };

  const base = { month, pageSize: 1 } as const;
  const [result, all, rent, other, overdue, concepts] = await Promise.all([
    listRentalOccurrences(filters),
    listRentalOccurrences({ ...base, category: "ALL" }),
    listRentalOccurrences({ ...base, category: "RENT" }),
    listRentalOccurrences({ ...base, category: "OTHER" }),
    listRentalOccurrences({ ...base, category: "OVERDUE" }),
    listRentalConcepts(),
  ]);

  return (
    <PageShell
      title="Vencimientos"
      subNav={<RentalModuleNav />}
      description="Seguimiento mensual de alquileres, servicios y otras obligaciones."
      breadcrumbs={[
        { label: "Inicio", href: "/" },
        { label: "Gestión de alquileres", href: "/alquileres" },
        { label: "Vencimientos" },
      ]}
    >
      <RentalDueDatesView
        result={result}
        filters={filters}
        totals={{
          ALL: all.total,
          RENT: rent.total,
          OTHER: other.total,
          OVERDUE: overdue.total,
        }}
        concepts={concepts}
        canManage={sessionHasPermission(
          session.user,
          "rental.obligation.manage",
        )}
        canFulfill={sessionHasPermission(
          session.user,
          "rental.fulfillment.manage",
        )}
        canReverse={["SUPER_ADMIN", "TENANT_ADMIN", "MANAGER"].includes(
          session.user.role,
        )}
      />
    </PageShell>
  );
}
