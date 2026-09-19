"use client";

import { useState, useTransition, type FormEvent } from "react";
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
  createRentalObligationAction,
  materializeRentalObligationAction,
  updateRentalObligationAction,
} from "@/lib/api/rental-actions";
import type {
  RentalConcept,
  RentalContract,
  RentalObligation,
  RentalOccurrence,
} from "@/lib/api/types/rental";
import { RentalOccurrenceTable } from "./rental-occurrence-table";

export function RentalObligationManager({
  contract,
  concepts,
  initialObligations,
  initialOccurrences,
  canManage,
  canFulfill,
  canReverse,
}: {
  contract: RentalContract;
  concepts: RentalConcept[];
  initialObligations: RentalObligation[];
  initialOccurrences: RentalOccurrence[];
  canManage: boolean;
  canFulfill: boolean;
  canReverse: boolean;
}) {
  const { toast } = useToast();
  const [obligations, setObligations] = useState(initialObligations);
  const [pending, startTransition] = useTransition();
  const [conceptId, setConceptId] = useState("");
  const [kind, setKind] = useState<"RECURRING" | "ONE_TIME">("RECURRING");
  const [amountMode, setAmountMode] = useState<"FIXED" | "VARIABLE">("FIXED");
  const [currency, setCurrency] = useState<"ARS" | "USD">("ARS");
  const [amount, setAmount] = useState("");
  const [startsOn, setStartsOn] = useState(contract.startsOn.slice(0, 10));
  const [endsOn, setEndsOn] = useState(contract.endsOn?.slice(0, 10) ?? "");
  const [oneTimeDueDate, setOneTimeDueDate] = useState("");
  const [recurrenceMonths, setRecurrenceMonths] = useState("1");
  const [dueDay, setDueDay] = useState("10");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const parsedAmount = amount ? Number(amount) : undefined;
    if (!conceptId || !startsOn || (amountMode === "FIXED" && !parsedAmount))
      return toast.error("Completá los campos obligatorios de la obligación.");
    startTransition(async () => {
      const result = await createRentalObligationAction({
        contractId: contract.id,
        conceptId,
        kind,
        recurrenceMonths:
          kind === "RECURRING" ? Number(recurrenceMonths) : null,
        dueDay: kind === "RECURRING" ? Number(dueDay) : null,
        amountMode,
        defaultAmount: amountMode === "FIXED" ? parsedAmount : null,
        currency,
        startsOn,
        endsOn: endsOn || null,
        oneTimeDueDate: kind === "ONE_TIME" ? oneTimeDueDate : null,
      });
      if (!result.ok) return toast.error(result.error);
      setObligations((current) => [...current, result.value]);
      toast.success("Obligación creada y vencimientos actualizados.");
      window.location.reload();
    });
  };
  const toggle = (obligation: RentalObligation) =>
    startTransition(async () => {
      const result = await updateRentalObligationAction(
        obligation.id,
        contract.id,
        { isActive: !obligation.isActive },
      );
      if (!result.ok) return toast.error(result.error);
      setObligations((current) =>
        current.map((item) =>
          item.id === obligation.id ? result.value : item,
        ),
      );
    });
  const materialize = (obligation: RentalObligation) =>
    startTransition(async () => {
      const result = await materializeRentalObligationAction(
        obligation.id,
        contract.id,
      );
      if (!result.ok) return toast.error(result.error);
      toast.success("Vencimientos actualizados sin duplicados.");
      window.location.reload();
    });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Obligaciones del contrato</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!obligations.length ? (
            <p className="text-sm text-zinc-500">
              Agregá primero la obligación Alquiler para poder activar el
              contrato.
            </p>
          ) : null}
          {obligations.map((item) => (
            <div
              key={item.id}
              className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 ${item.concept.systemCode === "RENT" ? "border-indigo-300 bg-indigo-50/70 shadow-sm" : "border-zinc-200"}`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{item.concept.name}</span>
                  {item.concept.systemCode === "RENT" ? (
                    <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-medium text-white">
                      Obligación principal
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-zinc-600">
                  {item.kind === "RECURRING"
                    ? item.recurrenceMonths === 1
                      ? `Mensual · vence el día ${item.dueDay}`
                      : `Cada ${item.recurrenceMonths} meses · vence el día ${item.dueDay}`
                    : "Pago puntual"}{" "}
                  ·{" "}
                  {item.amountMode === "VARIABLE" && item.defaultAmount == null
                    ? "Importe variable"
                    : formatPrice(item.defaultAmount ?? 0, item.currency)}{" "}
                  · {item.isActive ? "Activa" : "Inactiva"}
                </p>
              </div>
              {canManage &&
              !["ENDED", "CANCELLED"].includes(contract.status) ? (
                <div className="flex gap-2">
                  {item.isActive ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => materialize(item)}
                      disabled={pending}
                    >
                      Actualizar vencimientos
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => toggle(item)}
                    disabled={pending}
                  >
                    {item.isActive ? "Desactivar" : "Activar"}
                  </Button>
                </div>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>
      {canManage && !["ENDED", "CANCELLED"].includes(contract.status) ? (
        <Card>
          <CardHeader>
            <CardTitle>Agregar obligación</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={submit}
              className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
            >
              <FormField>
                <Label required>Concepto</Label>
                <Select
                  value={conceptId}
                  onChange={setConceptId}
                  placeholder="Seleccionar concepto"
                  options={concepts
                    .filter((item) => item.isActive)
                    .map((item) => ({ value: item.id, label: item.name }))}
                />
              </FormField>
              <FormField>
                <Label required>Tipo</Label>
                <Select
                  value={kind}
                  onChange={(value) => setKind(value as typeof kind)}
                  options={[
                    { value: "RECURRING", label: "Recurrente" },
                    { value: "ONE_TIME", label: "Pago puntual" },
                  ]}
                />
              </FormField>
              <FormField>
                <Label required>Modalidad del importe</Label>
                <Select
                  value={amountMode}
                  onChange={(value) =>
                    setAmountMode(value as typeof amountMode)
                  }
                  options={[
                    { value: "FIXED", label: "Importe fijo" },
                    { value: "VARIABLE", label: "Importe variable" },
                  ]}
                />
              </FormField>
              <FormField>
                <Label required>Moneda</Label>
                <Select
                  value={currency}
                  onChange={(value) => setCurrency(value as typeof currency)}
                  options={[
                    { value: "ARS", label: "Pesos argentinos ($)" },
                    { value: "USD", label: "Dólares estadounidenses (USD)" },
                  ]}
                />
              </FormField>
              {amountMode === "FIXED" ? (
                <FormField>
                  <Label required>Importe</Label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-3 z-10 flex items-center text-sm text-zinc-500">
                      {currency === "ARS" ? "$" : "USD"}
                    </span>
                    <CurrencyInput
                      allowDecimals
                      className="pl-12"
                      value={amount}
                      onChange={setAmount}
                      placeholder="1.000.000,00"
                    />
                  </div>
                  <HelperText>
                    Formato argentino, con hasta dos decimales.
                  </HelperText>
                </FormField>
              ) : null}
              <FormField>
                <Label required>Desde</Label>
                <DatePicker value={startsOn} onChange={setStartsOn} />
              </FormField>
              <FormField>
                <Label>Hasta</Label>
                <DatePicker value={endsOn} onChange={setEndsOn} />
              </FormField>
              {kind === "RECURRING" ? (
                <>
                  <FormField>
                    <Label required>Periodicidad</Label>
                    <Select
                      value={recurrenceMonths}
                      onChange={setRecurrenceMonths}
                      options={[
                        { value: "1", label: "Mensual" },
                        { value: "2", label: "Bimestral" },
                        { value: "3", label: "Trimestral" },
                        { value: "6", label: "Semestral" },
                        { value: "12", label: "Anual" },
                      ]}
                    />
                  </FormField>
                  <FormField>
                    <Label required>Día de vencimiento</Label>
                    <Input
                      type="number"
                      min="1"
                      max="31"
                      value={dueDay}
                      onChange={(event) => setDueDay(event.target.value)}
                    />
                  </FormField>
                </>
              ) : (
                <FormField>
                  <Label required>Fecha de vencimiento</Label>
                  <DatePicker
                    value={oneTimeDueDate}
                    onChange={setOneTimeDueDate}
                  />
                </FormField>
              )}
              <div className="md:col-span-2 lg:col-span-3">
                <Button type="submit" loading={pending}>
                  Agregar obligación
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Vencimientos</CardTitle>
        </CardHeader>
        <CardContent>
          <RentalOccurrenceTable
            initialOccurrences={initialOccurrences}
            canManage={canManage}
            canFulfill={canFulfill}
            canReverse={canReverse}
          />
        </CardContent>
      </Card>
    </div>
  );
}
