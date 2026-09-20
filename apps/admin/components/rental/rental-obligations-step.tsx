"use client";

import { useState } from "react";
import { formatPrice } from "@repo/shared-types/format-money";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import { ConfirmModal } from "@repo/ui/modal";
import { Switch } from "@repo/ui/switch";
import { useToast } from "@repo/ui/toast";
import { updateRentalObligationAction } from "@/lib/api/rental-actions";
import type {
  RentalConcept,
  RentalContract,
  RentalObligation,
} from "@/lib/api/types/rental";
import { RentalObligationPanel } from "./rental-obligation-panel";

type Props = {
  contract: RentalContract;
  concepts: RentalConcept[];
  obligations: RentalObligation[];
  currentRentAmount?: number | null;
  disabled?: boolean;
  onChange: (obligations: RentalObligation[]) => void;
  onEditRent: () => void;
};

function obligationSummary(
  item: RentalObligation,
  currentRentAmount?: number | null,
) {
  const frequency =
    item.kind === "ONE_TIME"
      ? "Puntual"
      : item.recurrenceMonths === 1
        ? "Mensual"
        : `Cada ${item.recurrenceMonths} meses`;
  const currentAmount =
    item.concept.systemCode === "RENT"
      ? (currentRentAmount ?? item.defaultAmount)
      : item.defaultAmount;
  const amount =
    item.amountMode === "VARIABLE" && currentAmount == null
      ? "Importe variable"
      : formatPrice(currentAmount ?? 0, item.currency);
  const due =
    item.kind === "ONE_TIME"
      ? "fecha propia"
      : item.dueMode === "MANUAL_PER_PERIOD"
        ? "vencimiento por período"
        : `día ${item.dueDay}`;
  return `${frequency} · ${amount} · ${due}`;
}

export function RentalObligationsStep({
  contract,
  concepts,
  obligations,
  currentRentAmount = null,
  disabled = false,
  onChange,
  onEditRent,
}: Props) {
  const { toast } = useToast();
  const rent =
    obligations.find((item) => item.concept.systemCode === "RENT") ?? null;
  const additional = obligations.filter(
    (item) => item.concept.systemCode !== "RENT",
  );
  const [panel, setPanel] = useState<RentalObligation | "new" | null>(null);
  const [deactivate, setDeactivate] = useState<RentalObligation | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const replace = (saved: RentalObligation) =>
    onChange(
      obligations.some((item) => item.id === saved.id)
        ? obligations.map((item) => (item.id === saved.id ? saved : item))
        : [...obligations, saved],
    );
  const toggle = async (item: RentalObligation, active: boolean) => {
    setPendingId(item.id);
    try {
      const result = await updateRentalObligationAction(item.id, contract.id, {
        isActive: active,
      });
      if (!result.ok) return toast.error(result.error);
      replace(result.value);
      toast.success(
        active ? "Obligación activada." : "Obligación desactivada.",
      );
    } finally {
      setPendingId(null);
      setDeactivate(null);
    }
  };

  return (
    <>
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Obligación principal</CardTitle>
          </CardHeader>
          <CardContent>
            {rent ? (
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-primary/5 p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <strong className="text-foreground">Alquiler</strong>
                    <Badge variant="success">Configurado</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {obligationSummary(rent, currentRentAmount)}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {rent.adjustmentConfigurationPending
                      ? "Frecuencia de actualización pendiente de configurar"
                      : `Próxima actualización: ${rent.nextAdjustmentDate?.slice(0, 10) ?? "sin fecha"}`}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline-primary"
                  disabled={disabled}
                  onClick={onEditRent}
                >
                  Editar alquiler →
                </Button>
              </div>
            ) : (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                Configurá el alquiler en el paso anterior antes de activar el
                contrato.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Otras obligaciones</CardTitle>
              <p className="mt-1 text-sm text-muted">
                Activá y configurá los servicios, impuestos y pagos que querés
                controlar.
              </p>
            </div>
            <Button
              type="button"
              variant="outline-primary"
              disabled={disabled}
              onClick={() => setPanel("new")}
            >
              + Agregar obligación
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {additional.map((item) => (
              <article
                key={item.id}
                className="flex flex-wrap items-center gap-4 rounded-xl border border-border p-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="text-foreground">
                      {item.concept.name}
                    </strong>
                    <Badge variant={item.isActive ? "success" : "neutral"}>
                      {item.isActive ? "Activa" : "Inactiva"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {obligationSummary(item)}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    Desde {item.startsOn.slice(0, 10)}{" "}
                    {item.endsOn
                      ? `hasta ${item.endsOn.slice(0, 10)}`
                      : "hasta el fin del contrato"}
                    .
                  </p>
                </div>
                <Switch
                  checked={item.isActive}
                  disabled={disabled || pendingId === item.id}
                  label={item.isActive ? "Activa" : "Inactiva"}
                  onChange={(active) =>
                    active ? void toggle(item, true) : setDeactivate(item)
                  }
                />
                <Button
                  type="button"
                  variant="secondary"
                  disabled={disabled || pendingId === item.id}
                  onClick={() => setPanel(item)}
                >
                  Editar
                </Button>
              </article>
            ))}
            {!additional.length ? (
              <div className="rounded-xl border border-dashed border-border px-5 py-10 text-center">
                <p className="font-medium text-foreground">
                  Aún no hay otras obligaciones
                </p>
                <p className="mt-1 text-sm text-muted">
                  Agregalas sólo cuando deban controlarse en este contrato.
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
      {panel ? (
        <RentalObligationPanel
          open
          contract={contract}
          concepts={concepts}
          obligation={panel === "new" ? null : panel}
          disabled={disabled}
          onClose={() => setPanel(null)}
          onSaved={replace}
        />
      ) : null}
      <ConfirmModal
        open={Boolean(deactivate)}
        onClose={() => setDeactivate(null)}
        onConfirm={() =>
          deactivate ? void toggle(deactivate, false) : undefined
        }
        title="Desactivar obligación"
        description="Se detendrá la generación de nuevos vencimientos. Los vencimientos e historial existentes se conservarán."
        confirmLabel="Desactivar"
      />
    </>
  );
}
