"use client";

import { useEffect, useState } from "react";
import { formatPrice } from "@repo/shared-types/format-money";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { ConfirmModal } from "@repo/ui/modal";
import { CurrencyInput } from "@repo/ui/currency-input";
import { DatePicker } from "@repo/ui/date-picker";
import { FormField, HelperText, Label } from "@repo/ui/form-field";
import {
  SidePanel,
  SidePanelContent,
  SidePanelDescription,
  SidePanelFooter,
  SidePanelHeader,
  SidePanelTitle,
} from "@repo/ui/side-panel";
import { Textarea } from "@repo/ui/textarea";
import { useToast } from "@repo/ui/toast";
import {
  recordRentalFulfillmentAction,
  reverseRentalFulfillmentAction,
  updateRentalOccurrenceAmountAction,
  updateRentalOccurrenceDueDateAction,
} from "@/lib/api/rental-actions";
import type { RentalOccurrence } from "@/lib/api/types/rental";
import { formatDateOnly } from "@/lib/rental/rental-ui";

function localToday() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function RentalFulfillmentPanel({
  occurrence,
  open,
  canManage,
  canFulfill,
  canReverse,
  onClose,
  onChange,
}: {
  occurrence: RentalOccurrence | null;
  open: boolean;
  canManage: boolean;
  canFulfill: boolean;
  canReverse: boolean;
  onClose: () => void;
  onChange: (occurrence: RentalOccurrence) => void;
}) {
  const { toast } = useToast();
  const [dueDate, setDueDate] = useState("");
  const [expectedAmount, setExpectedAmount] = useState("");
  const [fulfilledAmount, setFulfilledAmount] = useState("");
  const [fulfilledOn, setFulfilledOn] = useState(localToday());
  const [notes, setNotes] = useState("");
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [confirmReverse, setConfirmReverse] = useState(false);

  useEffect(() => {
    if (!occurrence) return;
    setDueDate(occurrence.dueDate?.slice(0, 10) ?? "");
    setExpectedAmount(occurrence.amount?.toString() ?? "");
    setFulfilledAmount(
      (
        occurrence.fulfillmentSummary?.amount ?? occurrence.amount
      )?.toString() ?? "",
    );
    setFulfilledOn(
      occurrence.fulfillmentSummary?.fulfilledOn.slice(0, 10) ?? localToday(),
    );
    setNotes(occurrence.fulfillmentSummary?.notes ?? "");
    setReason("");
    setDirty(false);
  }, [occurrence, open]);

  if (!occurrence) return null;
  const contract = occurrence.obligation.contract;
  const currentFulfillment = occurrence.fulfillments.find(
    (item) => item.status === "RECORDED",
  );
  const isPending = occurrence.status === "PENDING";
  const canSetDueDate = canManage && occurrence.actions.canSetDueDate;
  const canSetAmount = canManage && occurrence.actions.canSetAmount;
  const canRecord =
    canFulfill &&
    occurrence.actions.canFulfill &&
    !occurrence.dueDatePending &&
    occurrence.amount != null;
  const canUndo = canReverse && occurrence.actions.canReverseFulfillment;
  const requestClose = () => {
    if (dirty && !pending) setConfirmClose(true);
    else onClose();
  };
  const parseAmount = (value: string) => {
    const parsed = Number(value);
    return value && Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  };

  const save = async (fulfill: boolean) => {
    const amount = parseAmount(expectedAmount);
    const paid = parseAmount(fulfilledAmount);
    if (occurrence.dueDatePending && canSetDueDate && !dueDate)
      return toast.error("Seleccioná la fecha de vencimiento.");
    if (occurrence.amount == null && canSetAmount && amount == null)
      return toast.error("Ingresá el importe esperado.");
    if (fulfill && !fulfilledOn)
      return toast.error("Seleccioná la fecha de cumplimiento.");
    if (fulfill && paid == null)
      return toast.error("Ingresá el importe cumplido total.");

    setPending(true);
    try {
      let updated = occurrence;
      if (occurrence.dueDatePending && canSetDueDate) {
        const result = await updateRentalOccurrenceDueDateAction(
          occurrence.id,
          contract.id,
          dueDate,
        );
        if (!result.ok) return toast.error(result.error);
        updated = result.value;
      }
      if (occurrence.amount == null && canSetAmount && amount != null) {
        const result = await updateRentalOccurrenceAmountAction(
          occurrence.id,
          contract.id,
          amount,
        );
        if (!result.ok) return toast.error(result.error);
        updated = result.value;
      }
      if (fulfill) {
        const result = await recordRentalFulfillmentAction(
          occurrence.id,
          contract.id,
          { fulfilledOn, amount: paid, notes: notes.trim() || null },
        );
        if (!result.ok) return toast.error(result.error);
        updated = result.value.occurrence;
        toast.success("Cumplimiento registrado.");
      } else {
        toast.success("Vencimiento actualizado.");
      }
      setDirty(false);
      onChange(updated);
      onClose();
    } finally {
      setPending(false);
    }
  };

  const reverse = async () => {
    if (!currentFulfillment || !reason.trim()) {
      toast.error("Ingresá el motivo de la reversión.");
      return;
    }
    setPending(true);
    try {
      const result = await reverseRentalFulfillmentAction(
        currentFulfillment.id,
        contract.id,
        reason.trim(),
      );
      if (!result.ok) return toast.error(result.error);
      onChange(result.value);
      setConfirmReverse(false);
      setDirty(false);
      toast.success("Cumplimiento revertido.");
      onClose();
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <SidePanel
        open={open}
        onClose={requestClose}
        width="md"
        closeOnOverlay={!pending}
      >
        <SidePanelHeader>
          <SidePanelTitle>
            {isPending ? "Registrar cumplimiento" : "Detalle del cumplimiento"}
          </SidePanelTitle>
          <SidePanelDescription>
            {occurrence.obligation.concept.name} ·{" "}
            {occurrence.periodKey === "ONE_TIME"
              ? "Pago puntual"
              : occurrence.periodKey}
          </SidePanelDescription>
        </SidePanelHeader>
        <SidePanelContent className="space-y-5">
          <section className="rounded-xl bg-primary/5 p-4">
            <p className="font-semibold text-foreground">
              {contract.internalNumber}
            </p>
            <p className="mt-1 text-sm text-muted">
              {contract.propertyAddressSnapshot}
            </p>
            <p className="mt-1 text-sm text-muted">
              {contract.parties.map((party) => party.contact.name).join(", ") ||
                "Sin inquilino"}
            </p>
          </section>

          <div className="grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted">Vencimiento</p>
              <p className="font-medium text-foreground">
                {occurrence.dueDatePending
                  ? "Fecha pendiente"
                  : formatDateOnly(occurrence.dueDate)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted">Estado actual</p>
              <Badge
                variant={
                  occurrence.operationalStatus === "OVERDUE"
                    ? "danger"
                    : occurrence.status === "FULFILLED"
                      ? "success"
                      : "warning"
                }
              >
                {occurrence.operationalStatus === "OVERDUE"
                  ? "Vencido"
                  : occurrence.status === "FULFILLED"
                    ? "Cumplido"
                    : "Pendiente"}
              </Badge>
            </div>
          </div>

          {isPending && occurrence.dueDatePending && canSetDueDate ? (
            <FormField>
              <Label required>Fecha de vencimiento</Label>
              <DatePicker
                value={dueDate}
                onChange={(value) => {
                  setDueDate(value);
                  setDirty(true);
                }}
              />
            </FormField>
          ) : null}

          <section className="rounded-xl bg-surface-alt p-4">
            <p className="text-xs text-muted">Importe esperado</p>
            {occurrence.amount == null && isPending && canManage ? (
              <div className="mt-2">
                <CurrencyInput
                  allowDecimals
                  value={expectedAmount}
                  onChange={(value) => {
                    setExpectedAmount(value);
                    setDirty(true);
                  }}
                  placeholder="Importe pendiente"
                />
              </div>
            ) : (
              <p className="mt-1 text-xl font-semibold text-foreground">
                {occurrence.amount == null
                  ? "Importe pendiente"
                  : formatPrice(occurrence.amount, occurrence.currency)}
              </p>
            )}
          </section>

          {isPending && canRecord ? (
            <>
              <FormField>
                <Label required>Importe cumplido</Label>
                <CurrencyInput
                  allowDecimals
                  value={fulfilledAmount}
                  onChange={(value) => {
                    setFulfilledAmount(value);
                    setDirty(true);
                  }}
                  placeholder="0,00"
                />
                <HelperText>
                  Se registra el cumplimiento total; no se admiten pagos
                  parciales.
                </HelperText>
              </FormField>
              <FormField>
                <Label required>Fecha de cumplimiento</Label>
                <DatePicker
                  value={fulfilledOn}
                  onChange={(value) => {
                    setFulfilledOn(value);
                    setDirty(true);
                  }}
                />
              </FormField>
              <FormField>
                <Label>Observación</Label>
                <Textarea
                  rows={4}
                  maxLength={4000}
                  value={notes}
                  onChange={(event) => {
                    setNotes(event.target.value);
                    setDirty(true);
                  }}
                  placeholder="Ej.: transferencia recibida y verificada."
                />
              </FormField>
            </>
          ) : null}

          {!isPending && currentFulfillment ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted">Importe cumplido</p>
                  <p className="font-medium text-foreground">
                    {currentFulfillment.amount == null
                      ? "Sin importe"
                      : formatPrice(
                          currentFulfillment.amount,
                          occurrence.currency,
                        )}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted">Fecha</p>
                  <p className="font-medium text-foreground">
                    {formatDateOnly(currentFulfillment.fulfilledOn)}
                  </p>
                </div>
              </div>
              {currentFulfillment.notes ? (
                <div>
                  <p className="text-xs text-muted">Observación</p>
                  <p className="mt-1 text-foreground">
                    {currentFulfillment.notes}
                  </p>
                </div>
              ) : null}
              {canUndo ? (
                <FormField>
                  <Label>Motivo de reversión</Label>
                  <Textarea
                    rows={3}
                    maxLength={500}
                    value={reason}
                    onChange={(event) => {
                      setReason(event.target.value);
                      setDirty(true);
                    }}
                  />
                </FormField>
              ) : null}
            </>
          ) : null}
        </SidePanelContent>
        <SidePanelFooter className="justify-between">
          <Button variant="secondary" onClick={requestClose} disabled={pending}>
            Cerrar
          </Button>
          {isPending && canRecord ? (
            <Button onClick={() => void save(true)} loading={pending}>
              Registrar cumplimiento
            </Button>
          ) : isPending &&
            canManage &&
            (occurrence.dueDatePending || occurrence.amount == null) ? (
            <Button onClick={() => void save(false)} loading={pending}>
              Guardar vencimiento
            </Button>
          ) : !isPending && currentFulfillment && canUndo ? (
            <Button
              variant="secondary"
              onClick={() => setConfirmReverse(true)}
              disabled={pending}
            >
              Revertir cumplimiento
            </Button>
          ) : null}
        </SidePanelFooter>
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
        description="Los cambios sin guardar se perderán."
        confirmLabel="Descartar"
      />
      <ConfirmModal
        open={confirmReverse}
        onClose={() => setConfirmReverse(false)}
        onConfirm={() => void reverse()}
        title="Revertir cumplimiento"
        description="La reversión quedará registrada de forma auditable y el vencimiento volverá a estar pendiente."
        confirmLabel="Revertir"
        loading={pending}
      />
    </>
  );
}
