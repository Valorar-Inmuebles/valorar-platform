"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@repo/ui/button";
import {
  SidePanel,
  SidePanelContent,
  SidePanelDescription,
  SidePanelHeader,
  SidePanelTitle,
} from "@repo/ui/side-panel";
import { PropertyEmptyState } from "@/components/property/property-empty-state";
import { PropertyPriceForm } from "@/components/property/property-price-form";
import { PropertyPriceTable } from "@/components/property/property-price-table";
import type { AdminPropertyPrice } from "@/lib/api/types/property-price";
import type { PropertyListingStatus } from "@/lib/api/types/property-listing";

type PanelMode = "create" | "edit" | null;

type PropertyPriceManagerProps = {
  propertyId: string;
  listingId: string;
  listingStatus: PropertyListingStatus;
  prices: AdminPropertyPrice[];
};

export function PropertyPriceManager({
  propertyId,
  listingId,
  listingStatus,
  prices,
}: PropertyPriceManagerProps) {
  const router = useRouter();
  const [panelMode, setPanelMode] = useState<PanelMode>(null);
  const [editingPrice, setEditingPrice] = useState<AdminPropertyPrice | null>(
    null,
  );
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const closePanel = () => {
    setPanelMode(null);
    setEditingPrice(null);
  };

  const openCreate = () => {
    setEditingPrice(null);
    setPanelMode("create");
  };

  const openEdit = (price: AdminPropertyPrice) => {
    setEditingPrice(price);
    setPanelMode("edit");
  };

  const handleFormSuccess = () => {
    closePanel();
    router.refresh();
  };

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={openCreate}>Agregar precio</Button>
      </div>

      {prices.length === 0 ? (
        <PropertyEmptyState
          title="Sin precios"
          description="Agregá al menos un precio para poder publicar esta operación. El primero será principal automáticamente."
          action={<Button onClick={openCreate}>Agregar precio</Button>}
        />
      ) : (
        <PropertyPriceTable
          propertyId={propertyId}
          listingId={listingId}
          listingStatus={listingStatus}
          prices={prices}
          onEdit={openEdit}
          pendingActionId={pendingActionId}
          setPendingActionId={setPendingActionId}
          isPending={isPending}
          startTransition={startTransition}
        />
      )}

      <SidePanel open={panelMode != null} onClose={closePanel} width="sm">
        <SidePanelHeader>
          <SidePanelTitle>
            {panelMode === "create" ? "Nuevo precio" : "Editar precio"}
          </SidePanelTitle>
          <SidePanelDescription>
            {panelMode === "create"
              ? "Completá el monto y la moneda del precio."
              : "Modificá los datos del precio seleccionado."}
          </SidePanelDescription>
        </SidePanelHeader>

        <SidePanelContent>
          {panelMode ? (
            <PropertyPriceForm
              propertyId={propertyId}
              listingId={listingId}
              mode={panelMode}
              price={editingPrice ?? undefined}
              isFirstPrice={prices.length === 0}
              onSuccess={handleFormSuccess}
              onCancel={closePanel}
            />
          ) : null}
        </SidePanelContent>
      </SidePanel>
    </>
  );
}
