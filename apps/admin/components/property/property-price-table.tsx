"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { Card, CardContent } from "@repo/ui/card";
import { ConfirmModal } from "@repo/ui/modal";
import { useToast } from "@repo/ui/toast";
import {
  deletePropertyPriceAction,
  markPropertyPricePrimaryAction,
} from "@/lib/api/property-price-actions";
import type { AdminPropertyPrice } from "@/lib/api/types/property-price";
import type { PropertyListingStatus } from "@/lib/api/types/property-listing";
import { formatPrice } from "@/lib/format/price";
import {
  canDeletePrice,
  getDeleteBlockedReason,
} from "@/lib/property/price-form";

type PropertyPriceTableProps = {
  propertyId: string;
  listingId: string;
  listingStatus: PropertyListingStatus;
  prices: AdminPropertyPrice[];
  onEdit: (price: AdminPropertyPrice) => void;
  pendingActionId: string | null;
  setPendingActionId: (id: string | null) => void;
  isPending: boolean;
  startTransition: (callback: () => void) => void;
};

type DeleteTarget = {
  price: AdminPropertyPrice;
  willPromoteOther: boolean;
};

export function PropertyPriceTable({
  propertyId,
  listingId,
  listingStatus,
  prices,
  onEdit,
  pendingActionId,
  setPendingActionId,
  isPending,
  startTransition,
}: PropertyPriceTableProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const handleMarkPrimary = (price: AdminPropertyPrice) => {
    if (price.isPrimary) return;

    setPendingActionId(price.id);
    startTransition(async () => {
      const result = await markPropertyPricePrimaryAction(
        propertyId,
        listingId,
        price.id,
      );
      setPendingActionId(null);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success("Precio marcado como principal.");
      router.refresh();
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;

    setPendingActionId(deleteTarget.price.id);
    startTransition(async () => {
      const result = await deletePropertyPriceAction(
        propertyId,
        listingId,
        deleteTarget.price.id,
      );
      setPendingActionId(null);
      setDeleteTarget(null);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success("Precio eliminado correctamente.");
      router.refresh();
    });
  };

  const openDeleteModal = (price: AdminPropertyPrice) => {
    const blockedReason = getDeleteBlockedReason(prices.length, listingStatus);
    if (!canDeletePrice(prices.length, listingStatus)) {
      toast.error(blockedReason ?? "No se puede eliminar este precio.");
      return;
    }

    setDeleteTarget({
      price,
      willPromoteOther: price.isPrimary && prices.length > 1,
    });
  };

  return (
    <>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-4 py-3 font-medium">Moneda</th>
                  <th className="px-4 py-3 font-medium">Precio</th>
                  <th className="px-4 py-3 font-medium">Principal</th>
                  <th className="px-4 py-3 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {prices.map((price) => {
                  const deleteBlocked = !canDeletePrice(
                    prices.length,
                    listingStatus,
                  );
                  const deleteTitle = getDeleteBlockedReason(
                    prices.length,
                    listingStatus,
                  );
                  const rowPending = isPending && pendingActionId === price.id;

                  return (
                    <tr
                      key={price.id}
                      className="border-b border-border last:border-b-0 hover:bg-zinc-50/80"
                    >
                      <td className="px-4 py-3 font-medium text-foreground">
                        {price.currency}
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <span className="font-medium text-foreground">
                            {formatPrice(price.amount, price.currency)}
                          </span>
                          {price.label ? (
                            <p className="mt-0.5 text-xs text-muted">
                              {price.label}
                            </p>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {price.isPrimary ? (
                          <Badge variant="info">⭐ Principal</Badge>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={rowPending}
                            onClick={() => onEdit(price)}
                          >
                            Editar
                          </Button>
                          {!price.isPrimary ? (
                            <Button
                              variant="outline-secondary"
                              size="sm"
                              disabled={rowPending}
                              onClick={() => handleMarkPrimary(price)}
                            >
                              Marcar principal
                            </Button>
                          ) : null}
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            disabled={rowPending || deleteBlocked}
                            title={deleteBlocked ? (deleteTitle ?? undefined) : undefined}
                            onClick={() => openDeleteModal(price)}
                          >
                            Eliminar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <ConfirmModal
        open={deleteTarget != null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Eliminar precio"
        description={
          deleteTarget ? (
            <>
              ¿Eliminar el precio{" "}
              <strong>
                {formatPrice(
                  deleteTarget.price.amount,
                  deleteTarget.price.currency,
                )}
              </strong>
              ?
              {deleteTarget.willPromoteOther ? (
                <>
                  {" "}
                  Se promoverá automáticamente otro precio como principal.
                </>
              ) : null}
            </>
          ) : null
        }
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        loading={isPending && pendingActionId === deleteTarget?.price.id}
      />
    </>
  );
}
