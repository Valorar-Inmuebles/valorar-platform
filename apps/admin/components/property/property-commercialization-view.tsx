"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { Button } from "@repo/ui/button";
import { Badge } from "@repo/ui/badge";
import { Card, CardContent } from "@repo/ui/card";
import { ConfirmModal } from "@repo/ui/modal";
import { useToast } from "@repo/ui/toast";
import { PropertyListingCommercialPanel } from "@/components/property/property-listing-commercial-panel";
import { PropertyListingStatusBadge } from "@/components/property/property-listing-status-badge";
import { closePropertyListingAction } from "@/lib/api/property-listing-actions";
import type { AdminPropertyListing } from "@/lib/api/types/property-listing";
import type { AdminPropertyPrice } from "@/lib/api/types/property-price";
import {
  formatOtherPrices,
  summarizeListingPrices,
} from "@/lib/property/commercialization";
import type { ListingPublishability } from "@/lib/property/publishability";
import {
  getListingTypeLabel,
  LISTING_STATUS_LABELS,
} from "@/lib/format/listing-labels";
import { formatPrice } from "@/lib/format/price";
import { cn } from "@/lib/cn";

type PropertyCommercializationViewProps = {
  propertyId: string;
  propertySlug: string;
  listings: AdminPropertyListing[];
  pricesByListingId: Record<string, AdminPropertyPrice[]>;
  publishabilityByListingId: Record<string, ListingPublishability>;
};

export function PropertyCommercializationView({
  propertyId,
  propertySlug,
  listings,
  pricesByListingId,
  publishabilityByListingId,
}: PropertyCommercializationViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [editingListingId, setEditingListingId] = useState<string | null>(null);
  const [closeTarget, setCloseTarget] = useState<AdminPropertyListing | null>(
    null,
  );
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const openEdit = useCallback((listingId: string) => {
    setEditingListingId(listingId);
    const url = new URL(window.location.href);
    url.searchParams.set("edit", listingId);
    window.history.replaceState(null, "", url.toString());
  }, []);

  const closeEdit = useCallback(() => {
    setEditingListingId(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("edit");
    window.history.replaceState(null, "", url.toString());
  }, []);

  useEffect(() => {
    const editId = searchParams.get("edit");
    if (editId && listings.some((listing) => listing.id === editId)) {
      setEditingListingId(editId);
    }
  }, [searchParams, listings]);

  const handleRefresh = () => {
    router.refresh();
  };

  const handleClose = () => {
    if (!closeTarget) return;

    setPendingId(closeTarget.id);
    startTransition(async () => {
      const result = await closePropertyListingAction(
        propertyId,
        closeTarget.id,
        propertySlug,
      );
      setPendingId(null);
      setCloseTarget(null);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success("Operación cerrada correctamente.");
      router.refresh();
    });
  };

  const editingListing = editingListingId
    ? listings.find((listing) => listing.id === editingListingId)
    : null;

  return (
    <>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-4 py-3 font-medium">Operación</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Precio principal</th>
                  <th className="px-4 py-3 font-medium">Moneda</th>
                  <th className="px-4 py-3 font-medium">Otros precios</th>
                  <th className="px-4 py-3 font-medium">Visible Web</th>
                  <th className="px-4 py-3 font-medium">Destacada</th>
                  <th className="px-4 py-3 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {listings.map((listing) => {
                  const prices = pricesByListingId[listing.id] ?? [];
                  const summary = summarizeListingPrices(prices);
                  const publishability = publishabilityByListingId[listing.id];

                  return (
                    <tr
                      key={listing.id}
                      className="border-b border-border last:border-b-0 hover:bg-zinc-50/80"
                    >
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => openEdit(listing.id)}
                          className="font-medium text-foreground hover:text-primary"
                        >
                          {getListingTypeLabel(listing.listingType)}
                        </button>
                        {summary.count > 0 ? (
                          <p className="mt-0.5 text-xs text-muted">
                            {summary.count}{" "}
                            {summary.count === 1 ? "precio" : "precios"}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <PropertyListingStatusBadge status={listing.status} />
                          {listing.status === "ACTIVE" &&
                          publishability &&
                          !publishability.isPublishable ? (
                            <Badge variant="warning">Activa (no visible)</Badge>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">
                        {summary.primary
                          ? formatPrice(
                              summary.primary.amount,
                              summary.primary.currency,
                            )
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {summary.primary?.currency ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {formatOtherPrices(prices)}
                      </td>
                      <td className="px-4 py-3">
                        {publishability ? (
                          <div className="flex flex-col gap-1">
                            <Badge
                              variant={
                                publishability.isPublishable
                                  ? "success"
                                  : "neutral"
                              }
                            >
                              {publishability.isPublishable
                                ? "Visible"
                                : "No publicable"}
                            </Badge>
                            {publishability.publicWebUrl ? (
                              <Link
                                href={publishability.publicWebUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs font-medium text-primary underline-offset-2 hover:underline"
                              >
                                Ver en web
                              </Link>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {listing.isFeatured ? "Sí" : "No"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => openEdit(listing.id)}
                          >
                            Editar
                          </Button>
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            disabled={listing.status === "CLOSED" || isPending}
                            onClick={() => setCloseTarget(listing)}
                            className={cn(
                              listing.status === "CLOSED" && "opacity-50",
                            )}
                          >
                            Cerrar
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

      {editingListing ? (
        <PropertyListingCommercialPanel
          open={editingListingId != null}
          onClose={closeEdit}
          propertyId={propertyId}
          propertySlug={propertySlug}
          listing={editingListing}
          prices={pricesByListingId[editingListing.id] ?? []}
          onSaved={handleRefresh}
        />
      ) : null}

      <ConfirmModal
        open={closeTarget != null}
        onClose={() => setCloseTarget(null)}
        onConfirm={handleClose}
        title="Cerrar operación"
        description={
          closeTarget ? (
            <>
              ¿Cerrar la operación de{" "}
              <strong>{getListingTypeLabel(closeTarget.listingType)}</strong>?
              Pasará a estado {LISTING_STATUS_LABELS.CLOSED.toLowerCase()}.
            </>
          ) : null
        }
        confirmLabel="Cerrar"
        cancelLabel="Cancelar"
        loading={isPending && pendingId === closeTarget?.id}
      />
    </>
  );
}
