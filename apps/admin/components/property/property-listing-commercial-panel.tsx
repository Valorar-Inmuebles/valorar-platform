"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import { Button } from "@repo/ui/button";
import {
  ErrorMessage,
  FormField,
  HelperText,
  Label,
} from "@repo/ui/form-field";
import { CurrencyInput } from "@repo/ui/currency-input";
import { Select } from "@repo/ui/select";
import {
  SidePanel,
  SidePanelContent,
  SidePanelDescription,
  SidePanelFooter,
  SidePanelHeader,
  SidePanelTitle,
} from "@repo/ui/side-panel";
import { ConfirmModal } from "@repo/ui/modal";
import { useToast } from "@repo/ui/toast";
import { PropertyListingStatusBadge } from "@/components/property/property-listing-status-badge";
import { PropertyPriceForm } from "@/components/property/property-price-form";
import { PublicationChecklistError } from "@/components/property/publication-checklist-error";
import type { PublicationCheckKey } from "@repo/property-rules";
import {
  deletePriceCommercializationClient,
  markPricePrimaryCommercializationClient,
  updateListingCommercializationClient,
} from "@/lib/api/commercialization-client";
import type { AdminPropertyListing } from "@/lib/api/types/property-listing";
import type { AdminPropertyPrice } from "@/lib/api/types/property-price";
import {
  CURRENCY_OPTIONS,
  getListingStatusOptions,
  getListingTypeLabel,
} from "@/lib/format/listing-labels";
import { formatPrice } from "@/lib/format/price";
import {
  canDeletePrice,
  getDeleteBlockedReason,
} from "@/lib/property/price-form";
import {
  formValuesToUpdatePayload,
  listingToFormValues,
  validateListingEditValues,
} from "@/lib/property/listing-form";
import type { PropertyListingFormValues } from "@/lib/api/types/property-listing";
import type { ListingPublishability } from "@/lib/property/publishability";

type PricePanelMode = "create" | "edit" | null;

type DeleteTarget = {
  price: AdminPropertyPrice;
  willPromoteOther: boolean;
};

export type PropertyListingCommercialPanelProps = {
  open: boolean;
  onClose: () => void;
  propertyId: string;
  propertySlug: string;
  listing: AdminPropertyListing;
  prices: AdminPropertyPrice[];
  onListingSaved: (
    listing: AdminPropertyListing,
    publishability: ListingPublishability,
  ) => void;
  onPricesUpdated: (
    listingId: string,
    prices: AdminPropertyPrice[],
    publishability: ListingPublishability,
  ) => void;
  onPricesSaved: (
    listingId: string,
    prices: AdminPropertyPrice[],
    publishability: ListingPublishability,
  ) => void;
};

export function PropertyListingCommercialPanel({
  open,
  onClose,
  propertyId,
  propertySlug,
  listing,
  prices,
  onListingSaved,
  onPricesUpdated,
  onPricesSaved,
}: PropertyListingCommercialPanelProps) {
  const { toast } = useToast();
  const [values, setValues] = useState<PropertyListingFormValues>(() =>
    listingToFormValues(listing),
  );
  const [selectedPrimaryId, setSelectedPrimaryId] = useState<string | null>(
    () => prices.find((price) => price.isPrimary)?.id ?? null,
  );
  const [pricePanelMode, setPricePanelMode] = useState<PricePanelMode>(null);
  const [editingPrice, setEditingPrice] = useState<AdminPropertyPrice | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checklistError, setChecklistError] = useState<{
    message: string;
    missing: PublicationCheckKey[];
  } | null>(null);
  const [pendingPriceId, setPendingPriceId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;

    setValues(listingToFormValues(listing));
    setSelectedPrimaryId(
      prices.find((price) => price.isPrimary)?.id ?? null,
    );
    setError(null);
    setChecklistError(null);
    setPricePanelMode(null);
    setEditingPrice(null);
  }, [open, listing, prices]);

  const updateField = <K extends keyof PropertyListingFormValues>(
    key: K,
    value: PropertyListingFormValues[K],
  ) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const closePricePanel = () => {
    setPricePanelMode(null);
    setEditingPrice(null);
  };

  const handlePriceFormSuccess = (
    updatedPrices: AdminPropertyPrice[],
    publishability: ListingPublishability,
  ) => {
    closePricePanel();
    onPricesSaved(listing.id, updatedPrices, publishability);
  };

  const handleDeletePrice = () => {
    if (!deleteTarget) return;

    setPendingPriceId(deleteTarget.price.id);
    startTransition(async () => {
      const result = await deletePriceCommercializationClient(
        propertyId,
        listing.id,
        deleteTarget.price.id,
        propertySlug,
      );
      setPendingPriceId(null);
      setDeleteTarget(null);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success("Precio eliminado correctamente.");
      onPricesUpdated(listing.id, result.prices, result.publishability);
    });
  };

  const openDeleteModal = (price: AdminPropertyPrice) => {
    const blockedReason = getDeleteBlockedReason(prices.length, listing.status);
    if (!canDeletePrice(prices.length, listing.status)) {
      toast.error(blockedReason ?? "No se puede eliminar este precio.");
      return;
    }

    setDeleteTarget({
      price,
      willPromoteOther: price.isPrimary && prices.length > 1,
    });
  };

  const handleSave = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setChecklistError(null);

    const validationError = validateListingEditValues(values);
    if (validationError) {
      setError(validationError);
      return;
    }

    startTransition(async () => {
      const currentPrimaryId =
        prices.find((price) => price.isPrimary)?.id ?? null;

      if (
        selectedPrimaryId &&
        selectedPrimaryId !== currentPrimaryId &&
        prices.some((price) => price.id === selectedPrimaryId)
      ) {
        const primaryResult = await markPricePrimaryCommercializationClient(
          propertyId,
          listing.id,
          selectedPrimaryId,
          propertySlug,
        );

        if (!primaryResult.ok) {
          toast.error(primaryResult.error);
          return;
        }

        onPricesUpdated(
          listing.id,
          primaryResult.prices,
          primaryResult.publishability,
        );
      }

      const result = await updateListingCommercializationClient(
        propertyId,
        listing.id,
        formValuesToUpdatePayload(values, listing.status),
        propertySlug,
      );

      if (!result.ok) {
        if (
          result.code === "PUBLICATION_CHECKLIST_INCOMPLETE" &&
          result.missing
        ) {
          setChecklistError({
            message: result.error,
            missing: result.missing,
          });
        } else {
          setError(result.error);
        }
        toast.error(result.error);
        return;
      }

      toast.success("Comercialización guardada correctamente.");
      onListingSaved(result.listing, result.publishability);
    });
  };

  const statusOptions = getListingStatusOptions(listing.status);

  return (
    <>
      <SidePanel open={open} onClose={onClose} width="lg">
        <SidePanelHeader>
          <SidePanelTitle>
            {getListingTypeLabel(listing.listingType)}
          </SidePanelTitle>
          <SidePanelDescription>
            Operación comercial, estado y precios de publicación.
          </SidePanelDescription>
        </SidePanelHeader>

        <SidePanelContent>
          <form
            id="listing-commercial-form"
            onSubmit={handleSave}
            className="space-y-6"
          >
            <FormField>
              <Label>Operación</Label>
              <p className="text-sm font-medium text-foreground">
                {getListingTypeLabel(listing.listingType)}
              </p>
            </FormField>

            <FormField>
              <div className="mb-2 flex items-center justify-between gap-2">
                <Label required>Estado</Label>
                <PropertyListingStatusBadge status={listing.status} />
              </div>
              <Select
                value={values.status || undefined}
                onChange={(value) =>
                  updateField(
                    "status",
                    value as PropertyListingFormValues["status"],
                  )
                }
                disabled={isPending}
                options={statusOptions}
              />
              <HelperText>
                Activar requiere propiedad activa, portada e imagen, y precio
                principal.
              </HelperText>
            </FormField>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField>
                <Label>Expensas</Label>
                <CurrencyInput
                  value={values.expensesAmount}
                  onChange={(value) => updateField("expensesAmount", value)}
                  disabled={isPending}
                />
              </FormField>

              <FormField>
                <Label>Moneda expensas</Label>
                <Select
                  value={values.expensesCurrency || undefined}
                  onChange={(value) =>
                    updateField(
                      "expensesCurrency",
                      value as PropertyListingFormValues["expensesCurrency"],
                    )
                  }
                  placeholder="Seleccionar moneda"
                  disabled={isPending}
                  options={[...CURRENCY_OPTIONS]}
                />
              </FormField>
            </div>

            <FormField>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={values.isFeatured}
                  onChange={(event) =>
                    updateField("isFeatured", event.target.checked)
                  }
                  disabled={isPending}
                  className="size-4 rounded border-border"
                />
                Publicación destacada
              </label>
            </FormField>

            <div className="border-t border-border pt-6">
              <div className="mb-4 flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">
                  Precios
                </h3>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={isPending}
                  onClick={() => {
                    setEditingPrice(null);
                    setPricePanelMode("create");
                  }}
                >
                  Agregar precio
                </Button>
              </div>

              {prices.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted">
                  Agregá al menos un precio para poder activar esta operación.
                </p>
              ) : (
                <ul className="space-y-3">
                  {prices.map((price) => {
                    const isSelected = selectedPrimaryId === price.id;
                    const rowPending =
                      isPending && pendingPriceId === price.id;

                    return (
                      <li
                        key={price.id}
                        className="rounded-lg border border-border bg-zinc-50/50 p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3">
                            <input
                              type="radio"
                              name={`primary-${listing.id}`}
                              checked={isSelected}
                              onChange={() => setSelectedPrimaryId(price.id)}
                              disabled={isPending}
                              className="mt-1 size-4 shrink-0"
                            />
                            <span>
                              <span className="block text-base font-semibold text-foreground">
                                {formatPrice(price.amount, price.currency)}
                              </span>
                              <span className="text-xs text-muted">
                                {price.currency}
                                {price.label ? ` · ${price.label}` : ""}
                                {isSelected ? " · Principal" : ""}
                              </span>
                            </span>
                          </label>

                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              disabled={rowPending}
                              onClick={() => {
                                setEditingPrice(price);
                                setPricePanelMode("edit");
                              }}
                            >
                              Editar
                            </Button>
                            <Button
                              type="button"
                              variant="outline-secondary"
                              size="sm"
                              disabled={rowPending}
                              onClick={() => openDeleteModal(price)}
                            >
                              Eliminar
                            </Button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {checklistError ? (
              <FormField state="error">
                <PublicationChecklistError
                  message={checklistError.message}
                  missing={checklistError.missing}
                  propertyId={propertyId}
                  listingId={listing.id}
                />
              </FormField>
            ) : error ? (
              <FormField state="error">
                <ErrorMessage>{error}</ErrorMessage>
              </FormField>
            ) : null}
          </form>
        </SidePanelContent>

        <SidePanelFooter>
          <Button
            type="button"
            variant="secondary"
            disabled={isPending}
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            form="listing-commercial-form"
            loading={isPending}
          >
            Guardar
          </Button>
        </SidePanelFooter>
      </SidePanel>

      <SidePanel
        open={pricePanelMode != null}
        onClose={closePricePanel}
        width="sm"
      >
        <SidePanelHeader>
          <SidePanelTitle>
            {pricePanelMode === "create" ? "Agregar precio" : "Editar precio"}
          </SidePanelTitle>
          <SidePanelDescription>
            {pricePanelMode === "create"
              ? "Completá el monto y la moneda."
              : "Modificá los datos del precio seleccionado."}
          </SidePanelDescription>
        </SidePanelHeader>

        <SidePanelContent>
          {pricePanelMode ? (
            <PropertyPriceForm
              propertyId={propertyId}
              listingId={listing.id}
              propertySlug={propertySlug}
              mode={pricePanelMode}
              price={editingPrice ?? undefined}
              isFirstPrice={prices.length === 0}
              onSuccess={handlePriceFormSuccess}
              onCancel={closePricePanel}
            />
          ) : null}
        </SidePanelContent>
      </SidePanel>

      <ConfirmModal
        open={deleteTarget != null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeletePrice}
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
        loading={isPending && pendingPriceId === deleteTarget?.price.id}
      />
    </>
  );
}
