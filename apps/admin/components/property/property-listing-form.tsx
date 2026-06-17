"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@repo/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@repo/ui/card";
import {
  ErrorMessage,
  FormField,
  HelperText,
  Label,
} from "@repo/ui/form-field";
import { Input } from "@repo/ui/input";
import { Select } from "@repo/ui/select";
import { useToast } from "@repo/ui/toast";
import { PropertyListingStatusBadge } from "@/components/property/property-listing-status-badge";
import { PublicationChecklistError } from "@/components/property/publication-checklist-error";
import type { PublicationCheckKey } from "@repo/property-rules";
import {
  createPropertyListingAction,
  updatePropertyListingAction,
} from "@/lib/api/property-listing-actions";
import type { AdminPropertyListing } from "@/lib/api/types/property-listing";
import {
  CURRENCY_OPTIONS,
  getListingStatusOptions,
  getListingTypeLabel,
  LISTING_TYPE_OPTIONS,
} from "@/lib/format/listing-labels";
import {
  emptyListingFormValues,
  formValuesToCreatePayload,
  formValuesToUpdatePayload,
  listingToFormValues,
  validateListingCreateValues,
  validateListingEditValues,
} from "@/lib/property/listing-form";
import type { PropertyListingFormValues } from "@/lib/api/types/property-listing";

type PropertyListingFormProps = {
  propertyId: string;
  mode: "create" | "edit";
  listing?: AdminPropertyListing;
};

export function PropertyListingForm({
  propertyId,
  mode,
  listing,
}: PropertyListingFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [values, setValues] = useState<PropertyListingFormValues>(() =>
    listing ? listingToFormValues(listing) : emptyListingFormValues(),
  );
  const [error, setError] = useState<string | null>(null);
  const [checklistError, setChecklistError] = useState<{
    message: string;
    missing: PublicationCheckKey[];
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const updateField = <K extends keyof PropertyListingFormValues>(
    key: K,
    value: PropertyListingFormValues[K],
  ) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setChecklistError(null);

    const validationError =
      mode === "create"
        ? validateListingCreateValues(values)
        : validateListingEditValues(values);

    if (validationError) {
      setError(validationError);
      return;
    }

    startTransition(async () => {
      if (mode === "create") {
        const result = await createPropertyListingAction(
          propertyId,
          formValuesToCreatePayload(values),
        );

        if (!result.ok) {
          if (result.code === "PUBLICATION_CHECKLIST_INCOMPLETE" && result.missing) {
            setChecklistError({
              message: result.error,
              missing: result.missing,
            });
            setError(null);
          } else {
            setError(result.error);
            setChecklistError(null);
          }
          toast.error(result.error);
          return;
        }

        if (!result.id) {
          const message = "La publicación se creó pero no se recibió el ID.";
          setError(message);
          toast.error(message);
          return;
        }

        toast.success("Publicación creada correctamente.");
        router.push(
          `/propiedades/${propertyId}/publicaciones/${result.id}`,
        );
        router.refresh();
        return;
      }

      if (!listing) return;

      const result = await updatePropertyListingAction(
        propertyId,
        listing.id,
        formValuesToUpdatePayload(values, listing.status),
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
          setError(null);
        } else {
          setError(result.error);
          setChecklistError(null);
        }
        toast.error(result.error);
        return;
      }

      toast.success("Publicación actualizada correctamente.");
      router.refresh();
    });
  };

  const statusOptions = listing
    ? getListingStatusOptions(listing.status)
    : [];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Datos comerciales</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {mode === "create" ? (
            <FormField className="md:col-span-2">
              <Label required>Tipo de operación</Label>
              <Select
                value={values.listingType || undefined}
                onChange={(value) =>
                  updateField(
                    "listingType",
                    value as PropertyListingFormValues["listingType"],
                  )
                }
                placeholder="Seleccionar operación"
                disabled={isPending}
                options={LISTING_TYPE_OPTIONS}
              />
              <HelperText>
                Solo puede existir una publicación por tipo (venta, alquiler,
                temporario).
              </HelperText>
            </FormField>
          ) : listing ? (
            <FormField className="md:col-span-2">
              <Label>Tipo de operación</Label>
              <p className="text-sm font-medium text-foreground">
                {getListingTypeLabel(listing.listingType)}
              </p>
            </FormField>
          ) : null}

          <FormField>
            <Label>Expensas</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={values.expensesAmount}
              onChange={(event) =>
                updateField("expensesAmount", event.target.value)
              }
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

          <FormField className="md:col-span-2">
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
        </CardContent>
      </Card>

      {mode === "edit" && listing ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Estado</CardTitle>
              <PropertyListingStatusBadge status={listing.status} />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField>
              <Label required>Cambiar estado</Label>
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
                Activar requiere propiedad activa, al menos una imagen con
                portada y precio principal. Cerrar la publicación usa el estado
                CLOSED.
              </HelperText>
            </FormField>
          </CardContent>
        </Card>
      ) : null}

      {checklistError ? (
        <FormField state="error">
          <PublicationChecklistError
            message={checklistError.message}
            missing={checklistError.missing}
            propertyId={propertyId}
            listingId={listing?.id}
          />
        </FormField>
      ) : error ? (
        <FormField state="error">
          <ErrorMessage>{error}</ErrorMessage>
        </FormField>
      ) : null}

      <CardFooter className="flex justify-end gap-2 px-0">
        <Link href={`/propiedades/${propertyId}/publicaciones`}>
          <Button type="button" variant="secondary" disabled={isPending}>
            Cancelar
          </Button>
        </Link>
        <Button type="submit" loading={isPending}>
          {mode === "create" ? "Crear publicación" : "Guardar cambios"}
        </Button>
      </CardFooter>
    </form>
  );
}
