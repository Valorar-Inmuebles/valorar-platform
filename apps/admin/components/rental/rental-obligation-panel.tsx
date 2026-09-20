"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@repo/ui/button";
import { CurrencyInput } from "@repo/ui/currency-input";
import { DatePicker } from "@repo/ui/date-picker";
import { FormField, HelperText, Label } from "@repo/ui/form-field";
import { ConfirmModal } from "@repo/ui/modal";
import { Input } from "@repo/ui/input";
import { Select } from "@repo/ui/select";
import {
  SidePanel,
  SidePanelContent,
  SidePanelDescription,
  SidePanelFooter,
  SidePanelHeader,
  SidePanelTitle,
} from "@repo/ui/side-panel";
import { useToast } from "@repo/ui/toast";
import {
  createRentalObligationAction,
  updateRentalObligationAction,
} from "@/lib/api/rental-actions";
import type {
  RentalConcept,
  RentalContract,
  RentalObligation,
} from "@/lib/api/types/rental";

type Props = {
  open: boolean;
  contract: RentalContract;
  concepts: RentalConcept[];
  obligation: RentalObligation | null;
  disabled?: boolean;
  onClose: () => void;
  onSaved: (obligation: RentalObligation) => void;
};

export function RentalObligationPanel({
  open,
  contract,
  concepts,
  obligation,
  disabled = false,
  onClose,
  onSaved,
}: Props) {
  const { toast } = useToast();
  const [conceptId, setConceptId] = useState("");
  const [kind, setKind] = useState<"RECURRING" | "ONE_TIME">("RECURRING");
  const [recurrence, setRecurrence] = useState("1");
  const [customRecurrence, setCustomRecurrence] = useState("");
  const [startsOn, setStartsOn] = useState(contract.startsOn.slice(0, 10));
  const [endMode, setEndMode] = useState<"CONTRACT" | "CUSTOM">("CONTRACT");
  const [endsOn, setEndsOn] = useState(contract.endsOn?.slice(0, 10) ?? "");
  const [oneTimeDueDate, setOneTimeDueDate] = useState("");
  const [amountMode, setAmountMode] = useState<"FIXED" | "VARIABLE">("FIXED");
  const [currency, setCurrency] = useState<"ARS" | "USD">("ARS");
  const [amount, setAmount] = useState("");
  const [dueMode, setDueMode] = useState<"FIXED_DAY" | "MANUAL_PER_PERIOD">(
    "FIXED_DAY",
  );
  const [dueDay, setDueDay] = useState("10");
  const [pending, setPending] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);

  useEffect(() => {
    setConceptId(obligation?.conceptId ?? "");
    setKind(obligation?.kind ?? "RECURRING");
    const months = String(obligation?.recurrenceMonths ?? 1);
    setRecurrence(months);
    setCustomRecurrence(
      ["1", "2", "3", "4", "6", "12"].includes(months) ? "" : months,
    );
    setStartsOn(
      obligation?.startsOn.slice(0, 10) ?? contract.startsOn.slice(0, 10),
    );
    setEndMode(
      obligation?.endsOn &&
        obligation.endsOn.slice(0, 10) !== contract.endsOn?.slice(0, 10)
        ? "CUSTOM"
        : "CONTRACT",
    );
    setEndsOn(
      obligation?.endsOn?.slice(0, 10) ?? contract.endsOn?.slice(0, 10) ?? "",
    );
    setOneTimeDueDate("");
    setAmountMode(obligation?.amountMode ?? "FIXED");
    setCurrency(obligation?.currency ?? "ARS");
    setAmount(
      obligation?.defaultAmount == null ? "" : String(obligation.defaultAmount),
    );
    setDueMode(obligation?.dueMode ?? "FIXED_DAY");
    setDueDay(String(obligation?.dueDay ?? 10));
    setDirty(false);
  }, [contract, obligation, open]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const months = Number(recurrence);
    const parsedAmount = amount ? Number(amount) : null;
    const parsedDay = Number(dueDay);
    if (!conceptId) return toast.error("Seleccioná un concepto.");
    if (
      kind === "RECURRING" &&
      (!Number.isInteger(months) || months < 1 || months > 12)
    )
      return toast.error("La frecuencia debe estar entre 1 y 12 meses.");
    if (amountMode === "FIXED" && (!parsedAmount || parsedAmount <= 0))
      return toast.error("Ingresá un importe fijo mayor que cero.");
    if (
      kind === "RECURRING" &&
      dueMode === "FIXED_DAY" &&
      (!Number.isInteger(parsedDay) || parsedDay < 1 || parsedDay > 31)
    )
      return toast.error("Elegí un día de vencimiento entre 1 y 31.");
    if (kind === "ONE_TIME" && !obligation && !oneTimeDueDate)
      return toast.error("Indicá la fecha del pago puntual.");

    setPending(true);
    const common = {
      conceptId,
      recurrenceMonths: kind === "RECURRING" ? months : null,
      dueMode: kind === "RECURRING" ? dueMode : ("FIXED_DAY" as const),
      dueDay:
        kind === "RECURRING" && dueMode === "FIXED_DAY" ? parsedDay : null,
      amountMode,
      defaultAmount: amountMode === "FIXED" ? parsedAmount : null,
      currency,
      startsOn,
      endsOn:
        kind === "RECURRING"
          ? endMode === "CONTRACT"
            ? (contract.endsOn?.slice(0, 10) ?? null)
            : endsOn || null
          : null,
    };
    try {
      const result = obligation
        ? await updateRentalObligationAction(obligation.id, contract.id, common)
        : await createRentalObligationAction({
            contractId: contract.id,
            kind,
            ...common,
            oneTimeDueDate: kind === "ONE_TIME" ? oneTimeDueDate : null,
            includeInNotice: false,
            showAmount: false,
            isActive: true,
          });
      if (!result.ok) return toast.error(result.error);
      onSaved(result.value);
      setDirty(false);
      toast.success(
        obligation ? "Obligación actualizada." : "Obligación agregada.",
      );
      onClose();
    } finally {
      setPending(false);
    }
  };

  const requestClose = () => {
    if (dirty && !pending) setConfirmClose(true);
    else onClose();
  };

  const editableConcepts = concepts.filter(
    (item) =>
      item.systemCode !== "RENT" &&
      (item.isActive || item.id === obligation?.conceptId),
  );

  return (
    <>
      <SidePanel
        open={open}
        onClose={requestClose}
        width="lg"
        closeOnOverlay={!pending}
      >
        <SidePanelHeader>
          <SidePanelTitle>
            {obligation
              ? `Configurar ${obligation.concept.name}`
              : "Agregar obligación"}
          </SidePanelTitle>
          <SidePanelDescription>
            Definí cómo se controlará esta obligación en el contrato.
          </SidePanelDescription>
        </SidePanelHeader>
        <form
          onSubmit={submit}
          onChangeCapture={() => setDirty(true)}
          onClickCapture={() => setDirty(true)}
          className="contents"
        >
          <SidePanelContent className="space-y-6">
            <FormField>
              <Label required>Concepto</Label>
              <Select
                value={conceptId}
                disabled={disabled || pending || Boolean(obligation)}
                onChange={setConceptId}
                placeholder="Seleccionar concepto"
                options={editableConcepts.map((item) => ({
                  value: item.id,
                  label: item.name,
                }))}
              />
            </FormField>
            <fieldset className="space-y-2">
              <legend className="font-semibold text-foreground">
                Tipo de obligación
              </legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {(
                  [
                    ["RECURRING", "Recurrente", "Se repite en el tiempo."],
                    ["ONE_TIME", "Puntual", "Un único pago en una fecha."],
                  ] as const
                ).map(([value, label, text]) => (
                  <Button
                    key={value}
                    type="button"
                    variant={kind === value ? "outline-primary" : "secondary"}
                    disabled={disabled || pending || Boolean(obligation)}
                    onClick={() => setKind(value)}
                    className="h-auto justify-start py-3 text-left"
                  >
                    <span>
                      <strong className="block">{label}</strong>
                      <span className="text-xs font-normal text-muted">
                        {text}
                      </span>
                    </span>
                  </Button>
                ))}
              </div>
            </fieldset>

            {kind === "RECURRING" ? (
              <>
                <FormField>
                  <Label required>Frecuencia</Label>
                  <Select
                    value={customRecurrence ? "CUSTOM" : recurrence}
                    onChange={(value) => {
                      if (value === "CUSTOM") {
                        const next = recurrence || "1";
                        setCustomRecurrence(next);
                        setRecurrence(next);
                      } else {
                        setCustomRecurrence("");
                        setRecurrence(value);
                      }
                    }}
                    options={[
                      { value: "1", label: "Mensual" },
                      { value: "2", label: "Bimestral" },
                      { value: "3", label: "Trimestral" },
                      { value: "4", label: "Cada 4 meses" },
                      { value: "6", label: "Semestral" },
                      { value: "12", label: "Anual" },
                      { value: "CUSTOM", label: "Otra frecuencia" },
                    ]}
                    disabled={disabled || pending}
                  />
                  {customRecurrence ? (
                    <Input
                      type="number"
                      min="1"
                      max="12"
                      className="mt-2"
                      value={customRecurrence}
                      onChange={(event) => {
                        setCustomRecurrence(event.target.value);
                        setRecurrence(event.target.value);
                      }}
                      aria-label="Frecuencia personalizada en meses"
                    />
                  ) : null}
                </FormField>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField>
                    <Label required>Fecha de inicio</Label>
                    <DatePicker
                      value={startsOn}
                      min={contract.startsOn.slice(0, 10)}
                      max={contract.endsOn?.slice(0, 10)}
                      disabled={disabled || pending}
                      onChange={setStartsOn}
                    />
                  </FormField>
                  <FormField>
                    <Label>Fecha de finalización</Label>
                    <Select
                      value={endMode}
                      disabled={disabled || pending}
                      onChange={(value) => setEndMode(value as typeof endMode)}
                      options={[
                        { value: "CONTRACT", label: "Hasta fin del contrato" },
                        { value: "CUSTOM", label: "Definir fecha" },
                      ]}
                    />
                    {endMode === "CUSTOM" ? (
                      <DatePicker
                        value={endsOn}
                        min={startsOn}
                        max={contract.endsOn?.slice(0, 10)}
                        disabled={disabled || pending}
                        onChange={setEndsOn}
                      />
                    ) : null}
                  </FormField>
                </div>
              </>
            ) : (
              <FormField>
                <Label required>Fecha del pago puntual</Label>
                {obligation ? (
                  <HelperText>
                    La fecha original se conserva. Para modificarla, gestioná el
                    vencimiento correspondiente.
                  </HelperText>
                ) : (
                  <DatePicker
                    value={oneTimeDueDate}
                    min={contract.startsOn.slice(0, 10)}
                    max={contract.endsOn?.slice(0, 10)}
                    disabled={disabled || pending}
                    onChange={setOneTimeDueDate}
                  />
                )}
              </FormField>
            )}

            <fieldset className="space-y-3 border-t border-border pt-5">
              <legend className="font-semibold text-foreground">Importe</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                <Button
                  type="button"
                  variant={
                    amountMode === "FIXED" ? "outline-primary" : "secondary"
                  }
                  disabled={disabled || pending}
                  onClick={() => setAmountMode("FIXED")}
                >
                  Importe fijo
                </Button>
                <Button
                  type="button"
                  variant={
                    amountMode === "VARIABLE" ? "outline-primary" : "secondary"
                  }
                  disabled={disabled || pending}
                  onClick={() => setAmountMode("VARIABLE")}
                >
                  Importe variable
                </Button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField>
                  <Label required>Moneda</Label>
                  <Select
                    value={currency}
                    disabled={disabled || pending}
                    onChange={(value) => setCurrency(value as typeof currency)}
                    options={[
                      { value: "ARS", label: "ARS - Peso argentino" },
                      { value: "USD", label: "USD - Dólar estadounidense" },
                    ]}
                  />
                </FormField>
                {amountMode === "FIXED" ? (
                  <FormField>
                    <Label required>Importe</Label>
                    <CurrencyInput
                      allowDecimals
                      value={amount}
                      disabled={disabled || pending}
                      onChange={setAmount}
                      placeholder="85.000,00"
                    />
                  </FormField>
                ) : (
                  <p className="self-end rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
                    El importe se completará en cada vencimiento.
                  </p>
                )}
              </div>
            </fieldset>

            {kind === "RECURRING" ? (
              <fieldset className="space-y-3 border-t border-border pt-5">
                <legend className="font-semibold text-foreground">
                  Vencimiento
                </legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Button
                    type="button"
                    variant={
                      dueMode === "FIXED_DAY" ? "outline-primary" : "secondary"
                    }
                    disabled={disabled || pending}
                    onClick={() => setDueMode("FIXED_DAY")}
                  >
                    Día fijo de cada mes
                  </Button>
                  <Button
                    type="button"
                    variant={
                      dueMode === "MANUAL_PER_PERIOD"
                        ? "outline-primary"
                        : "secondary"
                    }
                    disabled={disabled || pending}
                    onClick={() => setDueMode("MANUAL_PER_PERIOD")}
                  >
                    Definir en cada período
                  </Button>
                </div>
                {dueMode === "FIXED_DAY" ? (
                  <FormField>
                    <Label required>Día de vencimiento</Label>
                    <Select
                      value={dueDay}
                      disabled={disabled || pending}
                      onChange={setDueDay}
                      options={Array.from({ length: 31 }, (_, index) => ({
                        value: String(index + 1),
                        label: String(index + 1),
                      }))}
                    />
                    <HelperText>
                      Si el mes no tiene ese día, se toma el último día
                      calendario.
                    </HelperText>
                  </FormField>
                ) : (
                  <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
                    Cada período se generará con fecha pendiente hasta que un
                    administrador la defina.
                  </p>
                )}
              </fieldset>
            ) : null}
          </SidePanelContent>
          <SidePanelFooter className="justify-between">
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={requestClose}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={pending} disabled={disabled}>
              {obligation ? "Guardar cambios" : "Guardar obligación"}
            </Button>
          </SidePanelFooter>
        </form>
      </SidePanel>
      <ConfirmModal
        open={confirmClose}
        onClose={() => setConfirmClose(false)}
        onConfirm={() => {
          setDirty(false);
          setConfirmClose(false);
          onClose();
        }}
        title="Descartar cambios"
        description="Los cambios de esta obligación que todavía no guardaste se perderán."
        confirmLabel="Descartar"
      />
    </>
  );
}
