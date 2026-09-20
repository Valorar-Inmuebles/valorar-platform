"use client";

import Link from "next/link";
import { useState } from "react";
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
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { RentalFulfillmentPanel } from "@/components/rental/rental-fulfillment-panel";
import type { RentalOccurrence } from "@/lib/api/types/rental";
import {
  formatDateOnly,
  OCCURRENCE_STATUS_LABELS,
} from "@/lib/rental/rental-ui";

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
  const [items, setItems] = useState(initialOccurrences);
  const [selected, setSelected] = useState<RentalOccurrence | null>(null);
  const update = (value: RentalOccurrence) => {
    setItems((current) =>
      current.map((item) => (item.id === value.id ? value : item)),
    );
    setSelected(value);
  };
  return (
    <>
      <AdminTable className="min-w-[760px]">
        <AdminTableHead>
          <tr>
            {showContract ? (
              <AdminTableHeader>Contrato</AdminTableHeader>
            ) : null}
            <AdminTableHeader>Concepto</AdminTableHeader>
            <AdminTableHeader>Período</AdminTableHeader>
            <AdminTableHeader>Vencimiento</AdminTableHeader>
            <AdminTableHeader>Importe</AdminTableHeader>
            <AdminTableHeader>Estado</AdminTableHeader>
            <AdminTableHeader className="text-right">Acción</AdminTableHeader>
          </tr>
        </AdminTableHead>
        <AdminTableBody>
          {items.length ? (
            items.map((item) => {
              const contract = item.obligation.contract;
              const canOpen =
                item.status === "FULFILLED" ||
                (item.status === "PENDING" &&
                  ((canFulfill && item.actions.canFulfill) ||
                    (canManage &&
                      (item.actions.canSetAmount ||
                        item.actions.canSetDueDate))));
              return (
                <AdminTableRow key={item.id}>
                  {showContract ? (
                    <AdminTableCell>
                      <Link
                        className="font-medium text-primary hover:underline"
                        href={`/alquileres/${contract.id}`}
                      >
                        {contract.internalNumber}
                      </Link>
                      <p className="text-xs text-muted">
                        {contract.propertyAddressSnapshot}
                      </p>
                    </AdminTableCell>
                  ) : null}
                  <AdminTableCell className="font-medium">
                    {item.obligation.concept.name}
                  </AdminTableCell>
                  <AdminTableCell>
                    {item.periodKey === "ONE_TIME"
                      ? "Pago puntual"
                      : item.periodKey}
                  </AdminTableCell>
                  <AdminTableCell>
                    {item.dueDatePending
                      ? "Fecha pendiente"
                      : formatDateOnly(item.dueDate)}
                  </AdminTableCell>
                  <AdminTableCell>
                    {item.amount == null
                      ? "Importe pendiente"
                      : formatPrice(item.amount, item.currency)}
                  </AdminTableCell>
                  <AdminTableCell>
                    <Badge
                      variant={
                        item.operationalStatus === "OVERDUE"
                          ? "danger"
                          : item.operationalStatus === "FULFILLED"
                            ? "success"
                            : item.operationalStatus === "CANCELLED"
                              ? "neutral"
                              : "warning"
                      }
                    >
                      {OCCURRENCE_STATUS_LABELS[item.operationalStatus]}
                    </Badge>
                  </AdminTableCell>
                  <AdminTableCell className="text-right">
                    {canOpen ? (
                      <Button
                        size="sm"
                        variant={
                          item.status === "PENDING"
                            ? "outline-primary"
                            : "secondary"
                        }
                        onClick={() => setSelected(item)}
                      >
                        {item.status === "FULFILLED"
                          ? "Ver"
                          : item.dueDatePending
                            ? "Cargar fecha"
                            : item.amount == null
                              ? "Cargar valor"
                              : "Registrar"}
                      </Button>
                    ) : null}
                  </AdminTableCell>
                </AdminTableRow>
              );
            })
          ) : (
            <AdminTableState
              colSpan={showContract ? 7 : 6}
              state="empty"
              title="Sin vencimientos"
              description="No hay vencimientos para mostrar."
            />
          )}
        </AdminTableBody>
      </AdminTable>
      <RentalFulfillmentPanel
        occurrence={selected}
        open={Boolean(selected)}
        canManage={canManage}
        canFulfill={canFulfill}
        canReverse={canReverse}
        onClose={() => setSelected(null)}
        onChange={update}
      />
    </>
  );
}
