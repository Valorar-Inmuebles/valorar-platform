import Link from "next/link";
import { SystemIcon, type SystemIconName } from "@repo/icons";
import { formatPrice } from "@repo/shared-types/format-money";
import {
  AdminTable,
  AdminTableBody,
  AdminTableCell,
  AdminTableHead,
  AdminTableHeader,
  AdminTableRow,
  AdminTableState,
} from "@repo/ui/admin-table";
import { Badge, type BadgeVariant } from "@repo/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import type {
  RentalContractListItem,
  RentalDashboard,
  RentalOccurrence,
} from "@/lib/api/types/rental";
import {
  contractEventLabel,
  formatDateOnly,
  formatDateTime,
  OCCURRENCE_STATUS_LABELS,
} from "@/lib/rental/rental-ui";

type Props = {
  dashboard: RentalDashboard;
  rentPending: number;
  otherPending: number;
  attention: RentalOccurrence[];
  expiringContracts: RentalContractListItem[];
  periodLabel: string;
};

const occurrenceVariants: Record<
  RentalOccurrence["operationalStatus"],
  BadgeVariant
> = {
  PENDING: "warning",
  OVERDUE: "danger",
  FULFILLED: "success",
  CANCELLED: "neutral",
};

function MetricCard({
  label,
  value,
  detail,
  icon,
  tone,
}: {
  label: string;
  value: number;
  detail: string;
  icon: SystemIconName;
  tone: "green" | "orange" | "blue" | "red";
}) {
  const colors = {
    green: "bg-emerald-50 text-emerald-700",
    orange: "bg-orange-50 text-orange-700",
    blue: "bg-blue-50 text-blue-700",
    red: "bg-red-50 text-red-700",
  };
  return (
    <Card className="min-h-36">
      <CardContent className="flex h-full gap-4 py-5">
        <div
          className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${colors[tone]}`}
        >
          <SystemIcon name={icon} className="size-6" />
        </div>
        <div className="min-w-0">
          <p className="text-3xl font-semibold tracking-tight text-foreground">
            {value}
          </p>
          <p className="mt-0.5 font-medium text-foreground">{label}</p>
          <p className="mt-4 text-xs leading-5 text-muted">{detail}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function daysUntil(value: string | null) {
  if (!value) return null;
  const now = new Date();
  const today = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  return Math.max(
    0,
    Math.ceil(
      (new Date(`${value.slice(0, 10)}T00:00:00.000Z`).getTime() - today) /
        86_400_000,
    ),
  );
}

export function RentalOverview({
  dashboard,
  rentPending,
  otherPending,
  attention,
  expiringContracts,
  periodLabel,
}: Props) {
  return (
    <div className="space-y-4">
      <section
        aria-label="Indicadores operativos"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <MetricCard
          label="Contratos activos"
          value={dashboard.contracts.ACTIVE}
          detail={`${dashboard.attention.endingSoon} finalizan en los próximos 60 días`}
          icon="document"
          tone="green"
        />
        <MetricCard
          label="Alquileres pendientes"
          value={rentPending}
          detail={`Correspondientes a ${periodLabel}`}
          icon="price"
          tone="orange"
        />
        <MetricCard
          label="Otras obligaciones pendientes"
          value={otherPending}
          detail={`Expensas, servicios y otros · ${periodLabel}`}
          icon="list"
          tone="blue"
        />
        <MetricCard
          label="Requieren atención"
          value={dashboard.attention.overdueOccurrences}
          detail="Vencimientos pendientes fuera de término"
          icon="alert"
          tone="red"
        />
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
        <Card className="overflow-hidden">
          <CardHeader>
            <div>
              <CardTitle>Requieren atención</CardTitle>
              <p className="mt-0.5 text-xs text-muted">
                Vencimientos pendientes ordenados por fecha.
              </p>
            </div>
            <Link
              href="/alquileres/vencimientos"
              className="text-sm font-medium text-primary hover:underline"
            >
              Ver todos →
            </Link>
          </CardHeader>
          <CardContent flush>
            <AdminTable variant="integrated" className="min-w-[720px]">
              <AdminTableHead>
                <tr>
                  <AdminTableHeader>Inquilino</AdminTableHeader>
                  <AdminTableHeader>Inmueble</AdminTableHeader>
                  <AdminTableHeader>Concepto</AdminTableHeader>
                  <AdminTableHeader>Importe</AdminTableHeader>
                  <AdminTableHeader>Vencimiento</AdminTableHeader>
                  <AdminTableHeader>Estado</AdminTableHeader>
                </tr>
              </AdminTableHead>
              <AdminTableBody>
                {attention.length === 0 ? (
                  <AdminTableState
                    colSpan={6}
                    state="empty"
                    title="Sin vencimientos que requieran atención"
                    description="No hay obligaciones pendientes para el período consultado."
                  />
                ) : (
                  attention.map((occurrence) => (
                    <AdminTableRow key={occurrence.id}>
                      <AdminTableCell>
                        {occurrence.obligation.contract.parties[0]?.contact
                          .name ?? "Sin inquilino"}
                      </AdminTableCell>
                      <AdminTableCell>
                        <Link
                          href={`/alquileres/${occurrence.obligation.contract.id}`}
                          className="font-medium hover:text-primary"
                        >
                          {
                            occurrence.obligation.contract
                              .propertyAddressSnapshot
                          }
                        </Link>
                        <p className="text-xs text-muted">
                          {occurrence.obligation.contract.internalNumber}
                        </p>
                      </AdminTableCell>
                      <AdminTableCell>
                        {occurrence.obligation.concept.name}
                      </AdminTableCell>
                      <AdminTableCell className="whitespace-nowrap">
                        {occurrence.amount == null
                          ? "A definir"
                          : formatPrice(occurrence.amount, occurrence.currency)}
                      </AdminTableCell>
                      <AdminTableCell className="whitespace-nowrap">
                        {occurrence.dueDatePending
                          ? "Fecha pendiente"
                          : formatDateOnly(occurrence.dueDate)}
                      </AdminTableCell>
                      <AdminTableCell>
                        <Badge
                          variant={
                            occurrenceVariants[occurrence.operationalStatus]
                          }
                        >
                          {
                            OCCURRENCE_STATUS_LABELS[
                              occurrence.operationalStatus
                            ]
                          }
                        </Badge>
                      </AdminTableCell>
                    </AdminTableRow>
                  ))
                )}
              </AdminTableBody>
            </AdminTable>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Contratos próximos a vencer</CardTitle>
              <p className="mt-0.5 text-xs text-muted">
                Finalizan en los próximos 60 días.
              </p>
            </div>
            <Link
              href="/alquileres/contratos?endingWithinDays=60"
              className="text-sm font-medium text-primary hover:underline"
            >
              Ver todos →
            </Link>
          </CardHeader>
          <CardContent className="divide-y divide-border p-0">
            {expiringContracts.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-muted">
                No hay contratos próximos a vencer.
              </p>
            ) : (
              expiringContracts.map((contract) => {
                const days = daysUntil(contract.endsOn);
                const renter = contract.parties.find(
                  (party) => party.role === "RENTER",
                );
                return (
                  <Link
                    key={contract.id}
                    href={`/alquileres/${contract.id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-surface-alt"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                      <SystemIcon name="building" className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-foreground">
                        {contract.internalNumber}
                      </span>
                      <span className="block truncate text-xs text-muted">
                        {contract.propertyAddressSnapshot}
                      </span>
                      <span className="block truncate text-xs text-muted">
                        {renter?.contact.name ?? "Sin inquilino"}
                      </span>
                    </span>
                    <Badge
                      variant={
                        days !== null && days <= 30 ? "danger" : "warning"
                      }
                    >
                      {days === null
                        ? "Sin fecha"
                        : `${days} ${days === 1 ? "día" : "días"}`}
                    </Badge>
                  </Link>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Cumplimiento disponible</CardTitle>
              <p className="mt-0.5 text-xs text-muted">
                Totales operativos registrados hasta hoy.
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                {
                  label: "Cumplidos",
                  value: dashboard.attention.fulfilledOccurrences,
                  className: "text-emerald-700 bg-emerald-50",
                },
                {
                  label: "Pendientes",
                  value: dashboard.attention.pendingOccurrences,
                  className: "text-amber-700 bg-amber-50",
                },
                {
                  label: "Vencidos",
                  value: dashboard.attention.overdueOccurrences,
                  className: "text-red-700 bg-red-50",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className={`rounded-xl p-4 ${item.className}`}
                >
                  <p className="text-2xl font-semibold">{item.value}</p>
                  <p className="mt-1 text-sm font-medium">{item.label}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-muted">
              La API actual no expone una serie mensual; por eso no se
              representa un gráfico histórico artificial.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Actividad reciente</CardTitle>
              <p className="mt-0.5 text-xs text-muted">
                Movimientos contractuales reales disponibles.
              </p>
            </div>
          </CardHeader>
          <CardContent className="divide-y divide-border p-0">
            {dashboard.activity.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-muted">
                Todavía no hay actividad contractual registrada.
              </p>
            ) : (
              dashboard.activity.slice(0, 6).map((item) => (
                <Link
                  key={item.id}
                  href={`/alquileres/${item.contractId}`}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-surface-alt"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                    <SystemIcon
                      name={item.type === "CANCELLED" ? "alert" : "check"}
                      className="size-4"
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-foreground">
                      {contractEventLabel(item.type)}
                    </span>
                    <span className="block truncate text-xs text-muted">
                      {item.contract.internalNumber}
                      {item.actor?.name ? ` · ${item.actor.name}` : ""}
                    </span>
                  </span>
                  <time
                    className="shrink-0 text-xs text-muted"
                    dateTime={item.occurredAt}
                  >
                    {formatDateTime(item.occurredAt)}
                  </time>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
