"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@repo/ui/button";
import { Badge } from "@repo/ui/badge";
import { Card, CardContent } from "@repo/ui/card";
import { ConfirmModal } from "@repo/ui/modal";
import { useToast } from "@repo/ui/toast";
import { PropertyListingStatusBadge } from "@/components/property/property-listing-status-badge";
import { closePropertyListingAction } from "@/lib/api/property-listing-actions";
import type { AdminPropertyListing } from "@/lib/api/types/property-listing";
import type { ListingPublishability } from "@/lib/property/publishability";
import {
  getListingTypeLabel,
  LISTING_STATUS_LABELS,
} from "@/lib/format/listing-labels";
import { cn } from "@/lib/cn";

type PropertyListingTableProps = {
  propertyId: string;
  listings: AdminPropertyListing[];
  publishabilityByListingId?: Record<string, ListingPublishability>;
};

function formatExpenses(listing: AdminPropertyListing): string {
  if (listing.expensesAmount == null) return "—";
  const currency = listing.expensesCurrency ?? "";
  return `${currency} ${listing.expensesAmount.toLocaleString("es-AR")}`.trim();
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("es-AR");
}

export function PropertyListingTable({
  propertyId,
  listings,
  publishabilityByListingId = {},
}: PropertyListingTableProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [closeTarget, setCloseTarget] = useState<AdminPropertyListing | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();

  const handleClose = () => {
    if (!closeTarget) return;

    setPendingId(closeTarget.id);
    startTransition(async () => {
      const result = await closePropertyListingAction(
        propertyId,
        closeTarget.id,
      );
      setPendingId(null);
      setCloseTarget(null);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success("Publicación cerrada correctamente.");
      router.refresh();
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
                  <th className="px-4 py-3 font-medium">Operación</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Expensas</th>
                  <th className="px-4 py-3 font-medium">Destacada</th>
                  <th className="px-4 py-3 font-medium">Activada el</th>
                  <th className="px-4 py-3 font-medium">Web</th>
                  <th className="px-4 py-3 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {listings.map((listing) => {
                  const publishability = publishabilityByListingId[listing.id];

                  return (
                  <tr
                    key={listing.id}
                    className="border-b border-border last:border-b-0 hover:bg-zinc-50/80"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/propiedades/${propertyId}/publicaciones/${listing.id}`}
                        className="font-medium text-foreground hover:text-primary"
                      >
                        {getListingTypeLabel(listing.listingType)}
                      </Link>
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
                    <td className="px-4 py-3 text-muted">
                      {formatExpenses(listing)}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {listing.isFeatured ? "Sí" : "No"}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {formatDate(listing.publishedAt)}
                    </td>
                    <td className="px-4 py-3">
                      {publishability ? (
                        <div className="flex flex-col gap-1">
                          <Badge
                            variant={
                              publishability.isPublishable ? "success" : "neutral"
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
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/propiedades/${propertyId}/publicaciones/${listing.id}/precios`}
                        >
                          <Button variant="secondary" size="sm">
                            Precios
                          </Button>
                        </Link>
                        <Link
                          href={`/propiedades/${propertyId}/publicaciones/${listing.id}`}
                        >
                          <Button variant="secondary" size="sm">
                            Editar
                          </Button>
                        </Link>
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

      <ConfirmModal
        open={closeTarget != null}
        onClose={() => setCloseTarget(null)}
        onConfirm={handleClose}
        title="Cerrar publicación"
        description={
          closeTarget ? (
            <>
              ¿Cerrar la publicación de{" "}
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
