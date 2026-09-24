"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { formatPrice } from "@repo/shared-types/format-money";
import { Badge, type BadgeVariant } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { Tabs } from "@repo/ui/tabs";
import type {
  RentalContractGeneral,
  RentalContractParty,
  RentalObligation,
} from "@/lib/api/types/rental";
import {
  CONTRACT_STATUS_LABELS,
  formatDateOnly,
  OCCURRENCE_STATUS_LABELS,
} from "@/lib/rental/rental-ui";

const STATUS_VARIANT: Record<RentalContractGeneral["status"], BadgeVariant> = {
  DRAFT: "neutral",
  ACTIVE: "success",
  ENDED: "warning",
  CANCELLED: "danger",
};
function durationLabel(start: string, end: string | null) {
  if (!end) return "Sin fecha de finalización";
  const a = new Date(`${start.slice(0, 10)}T00:00:00Z`);
  const b = new Date(`${end.slice(0, 10)}T00:00:00Z`);
  const months =
    (b.getUTCFullYear() - a.getUTCFullYear()) * 12 +
    b.getUTCMonth() -
    a.getUTCMonth();
  return months >= 12 && months % 12 === 0
    ? `${months / 12} ${months === 12 ? "año" : "años"}`
    : `${Math.max(months, 1)} meses`;
}
function point(party: RentalContractParty, type: "EMAIL" | "PHONE") {
  return (
    party.contact.contactPoints.find(
      (item) => item.type === type && item.isActive && item.isDefault,
    ) ??
    party.contact.contactPoints.find(
      (item) => item.type === type && item.isActive,
    )
  );
}
function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-surface p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-semibold text-foreground">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
function PartyCard({ party }: { party: RentalContractParty }) {
  const email = point(party, "EMAIL");
  const phone = point(party, "PHONE");
  return (
    <article className="rounded-xl border border-border p-4">
      <div className="flex gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-alt font-semibold text-primary">
          {party.contact.name
            .split(/\s+/)
            .slice(0, 2)
            .map((item) => item[0])
            .join("")
            .toUpperCase()}
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold">{party.contact.name}</p>
            {party.role === "RENTER" && party.isPrimary ? (
              <Badge variant="success">Referente</Badge>
            ) : null}
          </div>
          <p className="text-sm text-muted">
            {party.contact.documentType && party.contact.documentNumber
              ? `${party.contact.documentType} ${party.contact.documentNumber}`
              : "Sin documento informado"}
          </p>
          {email ? (
            <p className="mt-2 truncate text-sm text-muted">{email.value}</p>
          ) : null}
          {phone ? (
            <p className="truncate text-sm text-muted">{phone.value}</p>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function RentalContractGeneralView({
  contract,
  obligations,
  canUpdate,
  canManageObligations,
}: {
  contract: RentalContractGeneral;
  obligations: RentalObligation[];
  canUpdate: boolean;
  canManageObligations: boolean;
}) {
  const renters = contract.parties.filter((item) => item.role === "RENTER");
  const landlords = contract.parties.filter((item) => item.role === "LANDLORD");
  const rent = obligations.find((item) => item.concept.systemCode === "RENT");
  const others = obligations.filter(
    (item) => item.concept.systemCode !== "RENT",
  );
  const routes = renters.flatMap((party) =>
    party.notificationRoutes
      .filter((route) => route.isEnabled)
      .map((route) => ({ party, route })),
  );
  return (
    <div className="space-y-4">
      <div className="grid gap-4 rounded-xl border border-border bg-surface p-4 sm:grid-cols-2 xl:grid-cols-4">
        <div>
          <p className="text-xs text-muted">Dirección contractual</p>
          <p className="font-semibold">{contract.propertyAddressSnapshot}</p>
          <p className="text-sm text-muted">
            {[
              contract.propertyNeighborhoodSnapshot,
              contract.propertyLocalitySnapshot,
            ]
              .filter(Boolean)
              .join(", ") || "Ubicación no informada"}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted">Inquilinos</p>
          <p className="font-semibold">{renters.length || "Sin inquilinos"}</p>
          <p className="text-sm text-muted">
            {renters.find((item) => item.isPrimary)?.contact.name ??
              renters[0]?.contact.name ??
              "Sin referente"}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted">Propietarios</p>
          <p className="font-semibold">
            {landlords.length || "Sin propietarios"}
          </p>
          <p className="text-sm text-muted">
            {landlords[0]?.contact.name ?? "Opcional"}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted">Vigencia</p>
          <p className="font-semibold">
            {formatDateOnly(contract.startsOn)} —{" "}
            {formatDateOnly(contract.endsOn)}
          </p>
          <p className="text-sm text-muted">
            {durationLabel(contract.startsOn, contract.endsOn)}
          </p>
        </div>
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.75fr]">
        <div className="space-y-4">
          <Section
            title="Alquiler actual"
            action={
              canManageObligations && rent ? (
                <Link href={`/alquileres/${contract.id}/editar?paso=3`}>
                  <Button size="sm" variant="outline-primary">
                    Actualizar valor
                  </Button>
                </Link>
              ) : undefined
            }
          >
            {contract.currentRent ? (
              <>
                <p className="text-2xl font-semibold">
                  {contract.currentRent.amount == null
                    ? "Importe pendiente"
                    : formatPrice(
                        contract.currentRent.amount,
                        contract.currentRent.currency,
                      )}
                </p>
                <div className="mt-4 grid gap-4 border-t border-border pt-4 sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-muted">Vencimiento mensual</p>
                    <p className="font-medium">
                      {rent?.dueDay ? `Día ${rent.dueDay}` : "Fecha pendiente"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">Actualización</p>
                    <p className="font-medium">
                      {contract.currentRent.adjustmentIntervalMonths
                        ? `Cada ${contract.currentRent.adjustmentIntervalMonths} meses`
                        : "Frecuencia pendiente"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">Próxima actualización</p>
                    <p className="font-medium">
                      {contract.currentRent.nextAdjustmentDate
                        ? formatDateOnly(
                            contract.currentRent.nextAdjustmentDate,
                          )
                        : "Sin calcular"}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted">
                El alquiler todavía no fue configurado.
              </p>
            )}
          </Section>
          <Section title="Información contractual">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-muted">Inicio</p>
                <p className="font-medium">
                  {formatDateOnly(contract.startsOn)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted">Finalización</p>
                <p className="font-medium">{formatDateOnly(contract.endsOn)}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Duración</p>
                <p className="font-medium">
                  {durationLabel(contract.startsOn, contract.endsOn)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted">Inmueble de referencia</p>
                {contract.property ? (
                  <Link
                    className="font-medium text-primary hover:underline"
                    href={`/propiedades/${contract.property.id}`}
                  >
                    {contract.property.title}
                  </Link>
                ) : (
                  <p className="font-medium">Sin inmueble registrado</p>
                )}
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs text-muted">Dirección contractual</p>
                <p className="font-medium">
                  {contract.propertyAddressSnapshot}
                </p>
                <p className="text-sm text-muted">
                  {[
                    contract.propertyNeighborhoodSnapshot,
                    contract.propertyLocalitySnapshot,
                    contract.propertyProvinceSnapshot,
                    contract.propertyPostalCodeSnapshot
                      ? `CP ${contract.propertyPostalCodeSnapshot}`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
            </div>
            {contract.previousContract || contract.renewedContract ? (
              <div className="mt-4 border-t border-border pt-4 text-sm">
                {contract.previousContract ? (
                  <Link
                    className="mr-5 text-primary hover:underline"
                    href={`/alquileres/${contract.previousContract.id}`}
                  >
                    Renovación de {contract.previousContract.internalNumber}
                  </Link>
                ) : null}
                {contract.renewedContract ? (
                  <Link
                    className="text-primary hover:underline"
                    href={`/alquileres/${contract.renewedContract.id}`}
                  >
                    Renovado como {contract.renewedContract.internalNumber}
                  </Link>
                ) : null}
              </div>
            ) : null}
          </Section>
          <div className="grid gap-4 lg:grid-cols-2">
            <Section
              title="Inquilinos"
              action={
                canUpdate ? (
                  <Link href={`/alquileres/${contract.id}/editar?paso=2`}>
                    <Button size="sm" variant="secondary">
                      Editar partes
                    </Button>
                  </Link>
                ) : undefined
              }
            >
              <div className="space-y-3">
                {renters.length ? (
                  renters.map((item) => (
                    <PartyCard key={item.id ?? item.contactId} party={item} />
                  ))
                ) : (
                  <p className="text-sm text-muted">Sin inquilinos.</p>
                )}
              </div>
            </Section>
            <Section title="Propietarios">
              <div className="space-y-3">
                {landlords.length ? (
                  landlords.map((item) => (
                    <PartyCard key={item.id ?? item.contactId} party={item} />
                  ))
                ) : (
                  <p className="text-sm text-muted">
                    Sin propietarios informados.
                  </p>
                )}
              </div>
            </Section>
          </div>
          <Section
            title="Observaciones"
            action={
              canUpdate ? (
                <Link href={`/alquileres/${contract.id}/editar?paso=1`}>
                  <Button size="sm" variant="secondary">
                    Editar
                  </Button>
                </Link>
              ) : undefined
            }
          >
            <p className="whitespace-pre-wrap text-sm text-muted">
              {contract.notes || "Sin observaciones."}
            </p>
          </Section>
        </div>
        <div className="space-y-4">
          <Section
            title="Próximos vencimientos"
            action={
              <Link
                className="text-sm font-medium text-primary hover:underline"
                href={`/alquileres/vencimientos?search=${encodeURIComponent(contract.internalNumber)}`}
              >
                Ver todos
              </Link>
            }
          >
            <div className="divide-y divide-border">
              {contract.upcomingOccurrences.length ? (
                contract.upcomingOccurrences.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div>
                      <p className="font-medium">{item.concept.name}</p>
                      <p className="text-sm text-muted">
                        {item.dueDatePending
                          ? "Fecha pendiente"
                          : formatDateOnly(item.dueDate)}{" "}
                        ·{" "}
                        {item.amount == null
                          ? "Importe pendiente"
                          : formatPrice(item.amount, item.currency)}
                      </p>
                    </div>
                    <Badge
                      variant={
                        item.operationalStatus === "OVERDUE"
                          ? "danger"
                          : item.operationalStatus === "FULFILLED"
                            ? "success"
                            : "warning"
                      }
                    >
                      {OCCURRENCE_STATUS_LABELS[item.operationalStatus]}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted">
                  No hay vencimientos próximos.
                </p>
              )}
            </div>
          </Section>
          <Section
            title="Obligaciones adicionales"
            action={
              canManageObligations ? (
                <Link href={`/alquileres/${contract.id}/editar?paso=4`}>
                  <Button size="sm" variant="outline-primary">
                    Gestionar
                  </Button>
                </Link>
              ) : undefined
            }
          >
            <div className="divide-y divide-border">
              {others.length ? (
                others.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div>
                      <p className="font-medium">{item.concept.name}</p>
                      <p className="text-xs text-muted">
                        {item.kind === "RECURRING"
                          ? item.recurrenceMonths === 1
                            ? "Mensual"
                            : `Cada ${item.recurrenceMonths} meses`
                          : "Puntual"}{" "}
                        ·{" "}
                        {item.amountMode === "VARIABLE"
                          ? "Importe variable"
                          : item.defaultAmount == null
                            ? "Importe pendiente"
                            : formatPrice(item.defaultAmount, item.currency)}
                        {" · "}
                        {item.dueMode === "FIXED_DAY" && item.dueDay
                          ? `Día ${item.dueDay}`
                          : "Fecha por período"}
                      </p>
                    </div>
                    <Badge variant={item.isActive ? "success" : "neutral"}>
                      {item.isActive ? "Activa" : "Inactiva"}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted">
                  Sin obligaciones adicionales.
                </p>
              )}
            </div>
          </Section>
          <Section
            title="Avisos configurados"
            action={
              canUpdate && canManageObligations ? (
                <Link href={`/alquileres/${contract.id}/editar?paso=5`}>
                  <Button size="sm" variant="outline-primary">
                    Configurar
                  </Button>
                </Link>
              ) : undefined
            }
          >
            <p className="mb-3 text-xs text-muted">
              Los destinatarios, canales y conceptos de este contrato se
              configuran aquí. Las reglas de cuándo avisar se administran desde
              Comunicaciones.
            </p>
            {routes.length ? (
              <div className="space-y-2">
                {renters.map((party) => {
                  const channels = party.notificationRoutes
                    .filter((route) => route.isEnabled)
                    .map((route) => route.channel);
                  return channels.length ? (
                    <p key={party.id ?? party.contactId} className="text-sm">
                      <span className="font-medium">{party.contact.name}</span>
                      <span className="text-muted">
                        {" "}
                        · {channels.join(" · ")}
                      </span>
                    </p>
                  ) : null;
                })}
                <p className="border-t border-border pt-3 text-sm text-muted">
                  Incluidos:{" "}
                  {obligations
                    .filter((item) => item.includeInNotice)
                    .map((item) => item.concept.name)
                    .join(", ") || "ningún concepto"}
                </p>
                <p className="text-sm text-muted">
                  Mostrar importe:{" "}
                  {obligations
                    .filter((item) => item.includeInNotice && item.showAmount)
                    .map((item) => item.concept.name)
                    .join(", ") || "ninguno"}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted">Sin canales configurados.</p>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}
export function RentalContractTabs({
  contractId,
  tab,
}: {
  contractId: string;
  tab: "general" | "history" | "communications";
}) {
  const router = useRouter();
  return (
    <Tabs
      ariaLabel="Secciones del contrato"
      value={tab}
      onChange={(value) =>
        router.push(
          value === "history"
            ? `/alquileres/${contractId}?tab=history`
            : value === "communications"
              ? `/alquileres/${contractId}?tab=communications`
              : `/alquileres/${contractId}`,
        )
      }
      items={[
        { value: "general", label: "General" },
        { value: "history", label: "Historial" },
        { value: "communications", label: "Comunicaciones" },
      ]}
    />
  );
}
export function RentalContractStatusBadge({
  status,
}: {
  status: RentalContractGeneral["status"];
}) {
  return (
    <Badge variant={STATUS_VARIANT[status]}>
      {CONTRACT_STATUS_LABELS[status]}
    </Badge>
  );
}
