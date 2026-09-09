"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Button } from "@repo/ui/button";
import { useToast } from "@repo/ui/toast";
import {
  recordRentalFulfillmentAction,
  reverseRentalFulfillmentAction,
  updateRentalOccurrenceAmountAction,
} from "@/lib/api/rental-actions";
import type { RentalOccurrence } from "@/lib/api/types/rental";

const labels = {
  PENDING: "Pendiente",
  OVERDUE: "Vencido",
  FULFILLED: "Cumplido",
  CANCELLED: "Cancelado",
};

function localToday() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function RentalOccurrenceTable({
  initialOccurrences,
  canManage,
  canFulfill,
  canReverse,
  showContract = false,
}: {
  initialOccurrences: RentalOccurrence[];
  canManage: boolean;
  canFulfill: boolean;
  canReverse: boolean;
  showContract?: boolean;
}) {
  const [occurrences, setOccurrences] = useState(initialOccurrences);
  if (occurrences.length === 0) {
    return (
      <p className="text-sm text-zinc-500">No hay vencimientos para mostrar.</p>
    );
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
          <tr>
            {showContract ? <th className="px-3 py-2">Contrato</th> : null}
            <th className="px-3 py-2">Concepto</th>
            <th className="px-3 py-2">Período</th>
            <th className="px-3 py-2">Vence</th>
            <th className="px-3 py-2">Importe</th>
            <th className="px-3 py-2">Estado</th>
            <th className="px-3 py-2">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {occurrences.map((occurrence) => (
            <OccurrenceRow
              key={occurrence.id}
              occurrence={occurrence}
              canManage={canManage}
              canFulfill={canFulfill}
              canReverse={canReverse}
              showContract={showContract}
              onChange={(updated) =>
                setOccurrences((current) =>
                  current.map((item) =>
                    item.id === updated.id ? updated : item,
                  ),
                )
              }
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OccurrenceRow({
  occurrence,
  canManage,
  canFulfill,
  canReverse,
  showContract,
  onChange,
}: {
  occurrence: RentalOccurrence;
  canManage: boolean;
  canFulfill: boolean;
  canReverse: boolean;
  showContract: boolean;
  onChange: (value: RentalOccurrence) => void;
}) {
  const { toast } = useToast();
  const [amount, setAmount] = useState(occurrence.amount?.toString() ?? "");
  const [pending, startTransition] = useTransition();
  const contractId = occurrence.obligation.contract.id;
  const activeFulfillment = occurrence.fulfillments.find(
    (item) => item.status === "RECORDED",
  );

  const saveAmount = () =>
    startTransition(async () => {
      const parsed = amount.trim() ? Number(amount) : null;
      if (parsed !== null && (!Number.isFinite(parsed) || parsed <= 0)) {
        toast.error("Ingresá un importe válido.");
        return;
      }
      const result = await updateRentalOccurrenceAmountAction(
        occurrence.id,
        contractId,
        parsed,
      );
      if (!result.ok) return toast.error(result.error);
      onChange(result.value);
      toast.success("Importe actualizado.");
    });

  const fulfill = () =>
    startTransition(async () => {
      const result = await recordRentalFulfillmentAction(
        occurrence.id,
        contractId,
        localToday(),
      );
      if (!result.ok) return toast.error(result.error);
      onChange(result.value.occurrence);
      toast.success("Vencimiento marcado como cumplido.");
    });

  const reverse = () => {
    if (!activeFulfillment) return;
    const reason = window.prompt("Motivo de la reversión");
    if (!reason?.trim()) return;
    startTransition(async () => {
      const result = await reverseRentalFulfillmentAction(
        activeFulfillment.id,
        contractId,
        reason,
      );
      if (!result.ok) return toast.error(result.error);
      onChange(result.value);
      toast.success("Cumplimiento revertido.");
    });
  };

  return (
    <tr className="border-t border-zinc-200 align-top">
      {showContract ? (
        <td className="px-3 py-3">
          <Link
            className="font-medium text-blue-700 hover:underline"
            href={`/alquileres/${contractId}`}
          >
            {occurrence.obligation.contract.propertyAddressSnapshot}
          </Link>
          <div className="text-xs text-zinc-500">
            {occurrence.obligation.contract.renterContact?.name ??
              "Sin inquilino"}
          </div>
        </td>
      ) : null}
      <td className="px-3 py-3 font-medium">
        {occurrence.obligation.concept.name}
      </td>
      <td className="px-3 py-3">
        {occurrence.periodKey === "ONE_TIME" ? "Único" : occurrence.periodKey}
      </td>
      <td className="px-3 py-3">{occurrence.dueDate.slice(0, 10)}</td>
      <td className="px-3 py-3">
        {occurrence.status === "PENDING" && canManage ? (
          <div className="flex gap-2">
            <input
              className="w-28 rounded-md border border-zinc-200 px-2 py-1"
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="Variable"
            />
            <Button
              size="sm"
              variant="secondary"
              onClick={saveAmount}
              disabled={pending}
            >
              Guardar
            </Button>
          </div>
        ) : occurrence.amount == null ? (
          "A definir"
        ) : (
          `${occurrence.currency} ${occurrence.amount.toLocaleString("es-AR")}`
        )}
      </td>
      <td className="px-3 py-3">
        <span
          className={
            occurrence.operationalStatus === "OVERDUE"
              ? "font-semibold text-red-700"
              : "font-medium"
          }
        >
          {labels[occurrence.operationalStatus]}
        </span>
      </td>
      <td className="px-3 py-3">
        {occurrence.status === "PENDING" && canFulfill ? (
          <Button size="sm" onClick={fulfill} loading={pending}>
            Marcar cumplido
          </Button>
        ) : occurrence.status === "FULFILLED" &&
          canReverse &&
          activeFulfillment ? (
          <Button
            size="sm"
            variant="secondary"
            onClick={reverse}
            loading={pending}
          >
            Revertir
          </Button>
        ) : null}
      </td>
    </tr>
  );
}
