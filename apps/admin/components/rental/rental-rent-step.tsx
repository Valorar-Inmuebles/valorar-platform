"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import { formatPrice } from "@repo/shared-types/format-money";
import { Button } from "@repo/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import { CurrencyInput } from "@repo/ui/currency-input";
import { DatePicker } from "@repo/ui/date-picker";
import { FormField, HelperText, Label } from "@repo/ui/form-field";
import { Input } from "@repo/ui/input";
import { Select } from "@repo/ui/select";
import { useToast } from "@repo/ui/toast";
import {
  createRentAdjustmentAction,
  createRentalObligationAction,
  updateRentalObligationAction,
} from "@/lib/api/rental-actions";
import type {
  RentalConcept,
  RentalContract,
  RentalObligation,
} from "@/lib/api/types/rental";

export type RentalRentStepHandle = {
  save: (requireComplete: boolean) => Promise<boolean>;
};

type Props = {
  contract: RentalContract;
  concepts: RentalConcept[];
  rent: RentalObligation | null;
  currentAmount: number | null;
  disabled?: boolean;
  onDirtyChange: (dirty: boolean) => void;
  onSaved: (rent: RentalObligation, currentAmount: number | null) => void;
};

function addMonthsClamped(iso: string, months: number) {
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return null;
  const target = new Date(Date.UTC(year, month - 1 + months, 1));
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  return new Date(
    Date.UTC(
      target.getUTCFullYear(),
      target.getUTCMonth(),
      Math.min(day, lastDay),
    ),
  )
    .toISOString()
    .slice(0, 10);
}

function formatDate(iso: string | null) {
  if (!iso) return "Pendiente de configurar";
  return new Intl.DateTimeFormat("es-AR", { timeZone: "UTC" }).format(
    new Date(`${iso.slice(0, 10)}T00:00:00Z`),
  );
}

export const RentalRentStep = forwardRef<RentalRentStepHandle, Props>(
  function RentalRentStep(
    {
      contract,
      concepts,
      rent,
      currentAmount,
      disabled = false,
      onDirtyChange,
      onSaved,
    },
    ref,
  ) {
    const { toast } = useToast();
    const initialAmount = currentAmount ?? rent?.defaultAmount ?? null;
    const [amount, setAmount] = useState(
      initialAmount == null ? "" : String(initialAmount),
    );
    const [currency, setCurrency] = useState<"ARS" | "USD">(
      rent?.currency ?? "ARS",
    );
    const [dueDay, setDueDay] = useState(String(rent?.dueDay ?? 10));
    const [interval, setInterval] = useState(
      rent?.adjustmentIntervalMonths == null
        ? ""
        : String(rent.adjustmentIntervalMonths),
    );
    const [customInterval, setCustomInterval] = useState(
      rent?.adjustmentIntervalMonths != null &&
        ![3, 4, 6].includes(rent.adjustmentIntervalMonths)
        ? String(rent.adjustmentIntervalMonths)
        : "",
    );
    const [effectiveFrom, setEffectiveFrom] = useState("");
    const [pending, setPending] = useState(false);

    useEffect(() => {
      const value = currentAmount ?? rent?.defaultAmount ?? null;
      setAmount(value == null ? "" : String(value));
      setCurrency(rent?.currency ?? "ARS");
      setDueDay(String(rent?.dueDay ?? 10));
      setInterval(
        rent?.adjustmentIntervalMonths == null
          ? ""
          : String(rent.adjustmentIntervalMonths),
      );
      setCustomInterval(
        rent?.adjustmentIntervalMonths != null &&
          ![3, 4, 6].includes(rent.adjustmentIntervalMonths)
          ? String(rent.adjustmentIntervalMonths)
          : "",
      );
      setEffectiveFrom("");
    }, [currentAmount, rent]);

    const parsedAmount = amount ? Number(amount) : null;
    const parsedDay = Number(dueDay);
    const parsedInterval = interval ? Number(interval) : null;
    const amountChanged =
      rent != null &&
      rent.rentValueRevisions.length > 0 &&
      parsedAmount != null &&
      currentAmount != null &&
      parsedAmount !== currentAmount;
    const hasHistory = Boolean(rent?.rentValueRevisions.length);
    const lastRevisionDate = rent?.rentValueRevisions
      .at(-1)
      ?.effectiveFrom.slice(0, 10);
    const nextAdjustment = useMemo(() => {
      if (!parsedInterval) return null;
      const base = lastRevisionDate ?? contract.startsOn.slice(0, 10);
      return addMonthsClamped(base, parsedInterval);
    }, [contract.startsOn, lastRevisionDate, parsedInterval]);

    const mark = () => onDirtyChange(true);

    const save = async (requireComplete: boolean) => {
      if (!Number.isInteger(parsedDay) || parsedDay < 1 || parsedDay > 31) {
        toast.error("Elegí un día máximo de pago entre 1 y 31.");
        return false;
      }
      if (
        parsedInterval != null &&
        (!Number.isInteger(parsedInterval) ||
          parsedInterval < 1 ||
          parsedInterval > 12)
      ) {
        toast.error("La actualización debe configurarse entre 1 y 12 meses.");
        return false;
      }
      if (
        requireComplete &&
        (!parsedAmount || parsedAmount <= 0 || !parsedInterval)
      ) {
        toast.error(
          "Completá el importe y la frecuencia de actualización para continuar.",
        );
        return false;
      }
      if (parsedAmount != null && parsedAmount <= 0) {
        toast.error("El valor del alquiler debe ser mayor que cero.");
        return false;
      }
      if (hasHistory && parsedAmount == null) {
        toast.error(
          "Un alquiler con historial no puede quedar sin importe vigente.",
        );
        return false;
      }
      if (amountChanged && !effectiveFrom) {
        toast.error("Indicá desde qué fecha rige el nuevo valor del alquiler.");
        return false;
      }
      const rentConcept = concepts.find(
        (concept) => concept.systemCode === "RENT",
      );
      if (!rentConcept) {
        toast.error("No está disponible el concepto base Alquiler.");
        return false;
      }

      setPending(true);
      try {
        if (!rent) {
          const result = await createRentalObligationAction({
            contractId: contract.id,
            conceptId: rentConcept.id,
            kind: "RECURRING",
            recurrenceMonths: 1,
            dueMode: "FIXED_DAY",
            dueDay: parsedDay,
            amountMode: parsedAmount ? "FIXED" : "VARIABLE",
            defaultAmount: parsedAmount,
            adjustmentIntervalMonths: parsedInterval,
            includeInNotice: true,
            showAmount: true,
            currency,
            startsOn: contract.startsOn.slice(0, 10),
            endsOn: contract.endsOn?.slice(0, 10) ?? null,
            isActive: true,
          });
          if (!result.ok) {
            toast.error(result.error);
            return false;
          }
          onSaved(result.value, parsedAmount);
        } else {
          const result = await updateRentalObligationAction(
            rent.id,
            contract.id,
            {
              recurrenceMonths: 1,
              dueMode: "FIXED_DAY",
              dueDay: parsedDay,
              adjustmentIntervalMonths: parsedInterval,
              includeInNotice: true,
              showAmount: true,
              isActive: true,
              ...(!hasHistory
                ? {
                    amountMode: parsedAmount
                      ? ("FIXED" as const)
                      : ("VARIABLE" as const),
                    defaultAmount: parsedAmount,
                    currency,
                  }
                : {}),
            },
          );
          if (!result.ok) {
            toast.error(result.error);
            return false;
          }
          let saved = result.value;
          if (amountChanged && parsedAmount != null) {
            const adjustment = await createRentAdjustmentAction(
              rent.id,
              contract.id,
              {
                effectiveFrom,
                amount: parsedAmount,
                currency: rent.currency,
              },
            );
            if (!adjustment.ok) {
              toast.error(adjustment.error);
              return false;
            }
            saved = adjustment.value.obligation;
          }
          const today = new Date().toISOString().slice(0, 10);
          onSaved(
            saved,
            amountChanged && effectiveFrom > today
              ? currentAmount
              : parsedAmount,
          );
        }
        onDirtyChange(false);
        setEffectiveFrom("");
        toast.success(
          requireComplete
            ? "Alquiler configurado."
            : "Borrador de alquiler guardado.",
        );
        return true;
      } finally {
        setPending(false);
      }
    };

    useImperativeHandle(ref, () => ({ save }));

    return (
      <div className="space-y-4">
        <Card>
          <CardHeader className="items-start">
            <div>
              <CardTitle>Condiciones del alquiler</CardTitle>
              <p className="mt-1 text-sm text-muted">
                Definí el importe mensual, la moneda y el día máximo de pago.
              </p>
            </div>
          </CardHeader>
          <CardContent className="grid gap-5 lg:grid-cols-12">
            <FormField className="lg:col-span-3">
              <Label required>
                Valor {hasHistory ? "vigente" : "inicial"} del alquiler
              </Label>
              <div className="relative">
                <span className="absolute inset-y-0 left-3 z-10 flex items-center text-sm text-muted">
                  {currency === "ARS" ? "$" : "USD"}
                </span>
                <CurrencyInput
                  allowDecimals
                  className="pl-12"
                  value={amount}
                  disabled={disabled || pending}
                  onChange={(value) => {
                    setAmount(value);
                    mark();
                  }}
                  placeholder="850.000,00"
                />
              </div>
              <HelperText>
                Formato localizado; la API conserva el valor numérico.
              </HelperText>
            </FormField>
            <FormField className="lg:col-span-3">
              <Label required>Moneda</Label>
              <Select
                value={currency}
                disabled={disabled || pending || hasHistory}
                onChange={(value) => {
                  setCurrency(value as "ARS" | "USD");
                  mark();
                }}
                options={[
                  { value: "ARS", label: "ARS - Peso argentino" },
                  { value: "USD", label: "USD - Dólar estadounidense" },
                ]}
              />
              {hasHistory ? (
                <HelperText>
                  La moneda queda fijada al existir revisiones.
                </HelperText>
              ) : null}
            </FormField>
            <FormField className="lg:col-span-3">
              <Label required>Día máximo de pago</Label>
              <Select
                value={dueDay}
                disabled={disabled || pending}
                onChange={(value) => {
                  setDueDay(value);
                  mark();
                }}
                options={Array.from({ length: 31 }, (_, index) => ({
                  value: String(index + 1),
                  label: String(index + 1),
                }))}
              />
              <HelperText>
                Si el mes no tiene ese día, vence el último día calendario.
              </HelperText>
            </FormField>
            <div className="rounded-xl bg-primary/5 p-4 text-sm text-primary lg:col-span-3">
              <p className="font-semibold">Vencimiento mensual</p>
              <p className="mt-2">
                El alquiler se abonará cada mes hasta el día{" "}
                {dueDay || "pendiente"}.
              </p>
            </div>
            {amountChanged ? (
              <FormField className="lg:col-span-4">
                <Label required>Nuevo valor vigente desde</Label>
                <DatePicker
                  value={effectiveFrom}
                  min={contract.startsOn.slice(0, 10)}
                  max={contract.endsOn?.slice(0, 10)}
                  disabled={disabled || pending}
                  onChange={(value) => {
                    setEffectiveFrom(value);
                    mark();
                  }}
                />
                <HelperText>
                  La fecha conserva el historial y sólo recalcula períodos
                  futuros pendientes.
                </HelperText>
              </FormField>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="items-start">
            <div>
              <CardTitle>Actualización del alquiler</CardTitle>
              <p className="mt-1 text-sm text-muted">
                Definí cada cuánto se revisará el valor. La actualización es
                manual.
              </p>
            </div>
          </CardHeader>
          <CardContent className="grid gap-5 lg:grid-cols-12">
            <div className="space-y-4 lg:col-span-8">
              <FormField>
                <Label required>Actualizar valor cada</Label>
                <div className="grid gap-2 sm:grid-cols-4">
                  {[3, 4, 6].map((months) => (
                    <Button
                      key={months}
                      type="button"
                      variant={
                        interval === String(months)
                          ? "outline-primary"
                          : "secondary"
                      }
                      disabled={disabled || pending}
                      onClick={() => {
                        setInterval(String(months));
                        setCustomInterval("");
                        mark();
                      }}
                    >
                      {months} meses
                    </Button>
                  ))}
                  <Button
                    type="button"
                    variant={
                      customInterval ||
                      (interval && !["3", "4", "6"].includes(interval))
                        ? "outline-primary"
                        : "secondary"
                    }
                    disabled={disabled || pending}
                    onClick={() => {
                      const next = customInterval || interval || "1";
                      setCustomInterval(next);
                      setInterval(next);
                      mark();
                    }}
                  >
                    Otro
                  </Button>
                </div>
                {customInterval ||
                (interval && !["3", "4", "6"].includes(interval)) ? (
                  <div className="mt-3 max-w-48">
                    <Input
                      type="number"
                      min="1"
                      max="12"
                      value={customInterval || interval}
                      disabled={disabled || pending}
                      onChange={(event) => {
                        setCustomInterval(event.target.value);
                        setInterval(event.target.value);
                        mark();
                      }}
                      aria-label="Frecuencia personalizada en meses"
                    />
                  </div>
                ) : null}
                {!interval ? (
                  <HelperText className="text-amber-700">
                    Frecuencia de actualización pendiente de configurar.
                  </HelperText>
                ) : null}
              </FormField>
              <div className="rounded-xl border border-border bg-surface-alt p-4">
                <p className="font-semibold text-foreground">
                  Actualización manual
                </p>
                <p className="mt-1 text-sm text-muted">
                  Cuando corresponda, el nuevo importe se registrará con fecha
                  efectiva y conservará el historial.
                </p>
              </div>
              <p className="rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-700">
                La actualización automática por índices no está disponible en
                esta etapa.
              </p>
            </div>
            <aside className="rounded-xl bg-surface-alt p-5 lg:col-span-4">
              <p className="font-semibold text-foreground">
                Próxima actualización
              </p>
              <p className="mt-4 text-2xl font-semibold text-foreground">
                {formatDate(nextAdjustment)}
              </p>
              <p className="mt-4 border-t border-border pt-4 text-sm text-muted">
                {parsedAmount
                  ? `Valor mostrado: ${formatPrice(parsedAmount, currency)}.`
                  : "Configurá un importe inicial antes de activar el contrato."}
              </p>
            </aside>
          </CardContent>
        </Card>
      </div>
    );
  },
);

RentalRentStep.displayName = "RentalRentStep";
