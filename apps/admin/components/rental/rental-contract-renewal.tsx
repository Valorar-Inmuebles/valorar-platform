"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatPrice } from "@repo/shared-types/format-money";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import { useToast } from "@repo/ui/toast";
import { renewRentalContractAction } from "@/lib/api/rental-actions";
import type { RentalContractGeneral } from "@/lib/api/types/rental";
import { CONTRACT_STATUS_LABELS, formatDateOnly } from "@/lib/rental/rental-ui";

function nextDay(value: string | null) {
  if (!value) return null;
  const date = new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

function renterSummary(contract: RentalContractGeneral) {
  const renters = contract.parties.filter((party) => party.role === "RENTER");
  if (!renters.length) return "Sin inquilinos";
  const primary =
    renters.find((party) => party.isPrimary)?.contact.name ??
    renters[0]?.contact.name;
  return renters.length > 1
    ? `${primary} + ${renters.length - 1} más`
    : (primary ?? "Sin inquilinos");
}

function DetailRow({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <div className="border-t border-border py-4 first:border-t-0 first:pt-0 last:pb-0">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-0.5 font-medium text-foreground">{value}</p>
      {helper ? <p className="mt-0.5 text-xs text-muted">{helper}</p> : null}
    </div>
  );
}

export function RentalContractRenewal({
  contract,
}: {
  contract: RentalContractGeneral;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const renewal = contract.renewedContract;
  const suggestedStart = nextDay(contract.endsOn);
  const renters = renterSummary(contract);

  async function createRenewal() {
    if (pending || renewal) return;
    setPending(true);
    setError(null);
    try {
      const result = await renewRentalContractAction(contract.id);
      if (!result.ok) {
        setError(result.error);
        toast.error(result.error);
        if (/already renewed|ya existe.*renovaci/i.test(result.error)) {
          router.refresh();
        }
        return;
      }
      toast.success(`Renovación ${result.value.internalNumber} creada.`);
      router.push(`/alquileres/${result.value.id}/editar`);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      {renewal ? (
        <div
          role="status"
          className="rounded-xl border border-primary/20 bg-primary/5 p-4"
        >
          <p className="font-semibold text-foreground">
            Ya existe una renovación en preparación
          </p>
          <p className="mt-1 text-sm text-muted">
            Este contrato ya está relacionado con {renewal.internalNumber}. No
            se creará otro sucesor.
          </p>
        </div>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
        </div>
      ) : null}

      <div className="grid items-stretch gap-4 lg:grid-cols-[minmax(0,1fr)_3rem_minmax(0,1fr)]">
        <Card className="overflow-hidden">
          <CardHeader className="bg-primary/5">
            <CardTitle>Contrato actual</CardTitle>
            <Badge
              variant={contract.status === "ACTIVE" ? "success" : "warning"}
            >
              {CONTRACT_STATUS_LABELS[contract.status]}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-1 py-6">
            <p className="mb-5 text-2xl font-semibold text-foreground">
              {contract.internalNumber}
            </p>
            <DetailRow
              label="Dirección contractual"
              value={contract.propertyAddressSnapshot}
              helper={[
                contract.propertyNeighborhoodSnapshot,
                contract.propertyLocalitySnapshot,
                contract.propertyPostalCodeSnapshot
                  ? `CP ${contract.propertyPostalCodeSnapshot}`
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            />
            <DetailRow
              label="Vigencia"
              value={`${formatDateOnly(contract.startsOn)} — ${formatDateOnly(contract.endsOn)}`}
            />
            <DetailRow
              label="Alquiler vigente"
              value={
                contract.currentRent?.amount == null
                  ? "Importe pendiente"
                  : formatPrice(
                      contract.currentRent.amount,
                      contract.currentRent.currency,
                    )
              }
              helper="Mensual"
            />
            <DetailRow label="Inquilinos" value={renters} />
          </CardContent>
        </Card>

        <div
          aria-hidden="true"
          className="flex items-center justify-center text-3xl text-primary lg:rotate-0"
        >
          <span className="rotate-90 lg:rotate-0">→</span>
        </div>

        <Card className="overflow-hidden border-primary/25">
          <CardHeader className="bg-blue-50/60">
            <CardTitle>Nuevo contrato</CardTitle>
            <Badge variant={renewal?.status === "DRAFT" ? "neutral" : "info"}>
              {renewal
                ? CONTRACT_STATUS_LABELS[renewal.status]
                : "En preparación"}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-1 py-6">
            <div className="mb-5">
              <p className="text-lg font-semibold text-foreground">
                {renewal?.internalNumber ?? "Número de contrato"}
              </p>
              <p className="text-sm text-muted">
                {renewal
                  ? "Nuevo contrato relacionado"
                  : "Se asignará al continuar"}
              </p>
            </div>
            <DetailRow
              label="Dirección contractual precargada"
              value={contract.propertyAddressSnapshot}
              helper={[
                contract.propertyNeighborhoodSnapshot,
                contract.propertyLocalitySnapshot,
                contract.propertyPostalCodeSnapshot
                  ? `CP ${contract.propertyPostalCodeSnapshot}`
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            />
            <DetailRow
              label="Inicio de vigencia sugerido"
              value={
                suggestedStart
                  ? formatDateOnly(suggestedStart)
                  : "Se definirá en el wizard"
              }
              helper={
                suggestedStart
                  ? "Día siguiente a la finalización del contrato actual"
                  : undefined
              }
            />
            <DetailRow label="Fin de vigencia" value="A definir" />
            <DetailRow
              label="Inquilinos"
              value={renters}
              helper="Se precargarán las partes permitidas para la renovación"
            />
          </CardContent>
        </Card>
      </div>

      <div className="rounded-xl border border-primary/15 bg-primary/5 p-5">
        <p className="font-medium text-foreground">
          Se precargarán los datos del contrato actual para que puedas
          revisarlos y modificarlos.
        </p>
        <p className="mt-1 text-sm text-muted">
          El contrato actual y todo su historial se conservarán sin
          modificaciones. El nuevo borrador se editará en el mismo wizard de
          contratos antes de activarlo.
        </p>
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
        <Link href={`/alquileres/${contract.id}`}>
          <Button variant="secondary" className="w-full sm:w-auto">
            Cancelar
          </Button>
        </Link>
        {renewal ? (
          <Link
            href={
              renewal.status === "DRAFT"
                ? `/alquileres/${renewal.id}/editar`
                : `/alquileres/${renewal.id}`
            }
          >
            <Button className="w-full sm:w-auto">
              {renewal.status === "DRAFT"
                ? `Continuar ${renewal.internalNumber}`
                : `Ver ${renewal.internalNumber}`}
            </Button>
          </Link>
        ) : (
          <Button
            className="w-full sm:w-auto"
            onClick={() => void createRenewal()}
            loading={pending}
            disabled={pending}
          >
            Continuar con renovación
          </Button>
        )}
      </div>
    </div>
  );
}
