"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@repo/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
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
  const [kind, setKind] = useState<"RECURRING" | "ONE_TIME">("RECURRING");
  const [amountMode, setAmountMode] = useState<"FIXED" | "VARIABLE">("FIXED");

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const defaultAmount = String(data.get("defaultAmount") ?? "").trim();
    const payload = {
      contractId: contract.id,
      conceptId: String(data.get("conceptId")),
      kind,
      recurrenceMonths:
        kind === "RECURRING" ? Number(data.get("recurrenceMonths")) : null,
      dueDay: kind === "RECURRING" ? Number(data.get("dueDay")) : null,
      amountMode,
      defaultAmount: defaultAmount ? Number(defaultAmount) : null,
      currency: String(data.get("currency")) as "ARS" | "USD",
      startsOn: String(data.get("startsOn")),
      endsOn: String(data.get("endsOn")) || null,
      oneTimeDueDate:
        kind === "ONE_TIME" ? String(data.get("oneTimeDueDate")) : null,
    };
    startTransition(async () => {
      const result = await createRentalObligationAction(payload);
      if (!result.ok) return toast.error(result.error);
      setObligations((current) => [...current, result.value]);
      toast.success("Obligación creada y vencimientos materializados.");
      window.location.reload();
    });
  };

  const toggle = (obligation: RentalObligation) =>
    startTransition(async () => {
      const result = await updateRentalObligationAction(
        obligation.id,
        contract.id,
        {
          isActive: !obligation.isActive,
        },
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
      toast.success("Horizonte de vencimientos actualizado sin duplicados.");
      window.location.reload();
    });

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Obligaciones del contrato</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {obligations.length === 0 ? (
            <p className="text-sm text-zinc-500">
              Todavía no hay obligaciones. Agregá Alquiler antes de activar el
              contrato.
            </p>
          ) : null}
          {obligations.map((item) => (
            <div
              key={item.id}
              className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 ${item.concept.systemCode === "RENT" ? "border-blue-300 bg-blue-50" : "border-zinc-200"}`}
            >
              <div>
                <div className="font-semibold">
                  {item.concept.name}
                  {item.concept.systemCode === "RENT"
                    ? " · obligación principal"
                    : ""}
                </div>
                <div className="text-sm text-zinc-600">
                  {item.kind === "RECURRING"
                    ? `Cada ${item.recurrenceMonths} mes(es), día ${item.dueDay}`
                    : "Vencimiento único"}
                  {" · "}
                  {item.amountMode === "VARIABLE" && item.defaultAmount == null
                    ? "Importe variable"
                    : `${item.currency} ${item.defaultAmount?.toLocaleString("es-AR")}`}
                  {" · "}
                  {item.isActive ? "Activa" : "Inactiva"}
                </div>
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
                      Materializar
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
            <form onSubmit={submit} className="grid gap-3 md:grid-cols-4">
              <select
                name="conceptId"
                required
                className="rounded-lg border border-zinc-200 px-3 py-2"
              >
                <option value="">Concepto</option>
                {concepts
                  .filter((item) => item.isActive)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
              </select>
              <select
                value={kind}
                onChange={(event) => setKind(event.target.value as typeof kind)}
                className="rounded-lg border border-zinc-200 px-3 py-2"
              >
                <option value="RECURRING">Recurrente</option>
                <option value="ONE_TIME">Única vez</option>
              </select>
              <select
                value={amountMode}
                onChange={(event) =>
                  setAmountMode(event.target.value as typeof amountMode)
                }
                className="rounded-lg border border-zinc-200 px-3 py-2"
              >
                <option value="FIXED">Importe fijo</option>
                <option value="VARIABLE">Importe variable</option>
              </select>
              <select
                name="currency"
                className="rounded-lg border border-zinc-200 px-3 py-2"
              >
                <option value="ARS">ARS</option>
                <option value="USD">USD</option>
              </select>
              <input
                name="defaultAmount"
                type="number"
                min="0.01"
                step="0.01"
                required={amountMode === "FIXED"}
                placeholder="Importe por defecto"
                className="rounded-lg border border-zinc-200 px-3 py-2"
              />
              <input
                name="startsOn"
                type="date"
                required
                defaultValue={contract.startsOn.slice(0, 10)}
                className="rounded-lg border border-zinc-200 px-3 py-2"
              />
              <input
                name="endsOn"
                type="date"
                defaultValue={contract.endsOn?.slice(0, 10)}
                className="rounded-lg border border-zinc-200 px-3 py-2"
              />
              {kind === "RECURRING" ? (
                <>
                  <input
                    name="recurrenceMonths"
                    type="number"
                    min="1"
                    required
                    defaultValue="1"
                    placeholder="Cada N meses"
                    className="rounded-lg border border-zinc-200 px-3 py-2"
                  />
                  <input
                    name="dueDay"
                    type="number"
                    min="1"
                    max="31"
                    required
                    defaultValue="10"
                    placeholder="Día de vencimiento"
                    className="rounded-lg border border-zinc-200 px-3 py-2"
                  />
                </>
              ) : (
                <input
                  name="oneTimeDueDate"
                  type="date"
                  required
                  className="rounded-lg border border-zinc-200 px-3 py-2"
                />
              )}
              <div className="md:col-span-4">
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
