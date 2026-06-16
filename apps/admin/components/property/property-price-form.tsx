"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import { Button } from "@repo/ui/button";
import {
  ErrorMessage,
  FormField,
  HelperText,
  Label,
} from "@repo/ui/form-field";
import { Input } from "@repo/ui/input";
import { Select } from "@repo/ui/select";
import { useToast } from "@repo/ui/toast";
import {
  createPropertyPriceAction,
  updatePropertyPriceAction,
} from "@/lib/api/property-price-actions";
import type { AdminPropertyPrice } from "@/lib/api/types/property-price";
import { CURRENCY_OPTIONS } from "@/lib/format/listing-labels";
import {
  emptyPriceFormValues,
  formValuesToCreatePayload,
  formValuesToUpdatePayload,
  priceToFormValues,
  validatePriceFormValues,
} from "@/lib/property/price-form";
import type { PropertyPriceFormValues } from "@/lib/api/types/property-price";

type PropertyPriceFormProps = {
  propertyId: string;
  listingId: string;
  mode: "create" | "edit";
  price?: AdminPropertyPrice;
  isFirstPrice: boolean;
  onSuccess: () => void;
  onCancel: () => void;
};

export function PropertyPriceForm({
  propertyId,
  listingId,
  mode,
  price,
  isFirstPrice,
  onSuccess,
  onCancel,
}: PropertyPriceFormProps) {
  const { toast } = useToast();
  const [values, setValues] = useState<PropertyPriceFormValues>(() =>
    price ? priceToFormValues(price) : emptyPriceFormValues(),
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setValues(price ? priceToFormValues(price) : emptyPriceFormValues());
    setError(null);
  }, [price, mode]);

  const updateField = <K extends keyof PropertyPriceFormValues>(
    key: K,
    value: PropertyPriceFormValues[K],
  ) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const validationError = validatePriceFormValues(values);
    if (validationError) {
      setError(validationError);
      return;
    }

    startTransition(async () => {
      if (mode === "create") {
        const result = await createPropertyPriceAction(
          propertyId,
          listingId,
          formValuesToCreatePayload(values),
        );

        if (!result.ok) {
          setError(result.error);
          toast.error(result.error);
          return;
        }

        toast.success("Precio agregado correctamente.");
        onSuccess();
        return;
      }

      if (!price) return;

      const result = await updatePropertyPriceAction(
        propertyId,
        listingId,
        price.id,
        formValuesToUpdatePayload(values),
      );

      if (!result.ok) {
        setError(result.error);
        toast.error(result.error);
        return;
      }

      toast.success("Precio actualizado correctamente.");
      onSuccess();
    });
  };

  return (
    <form id="property-price-form" onSubmit={handleSubmit} className="space-y-4">
      <FormField>
        <Label required>Monto</Label>
        <Input
          type="number"
          min={0.01}
          step="0.01"
          value={values.amount}
          onChange={(event) => updateField("amount", event.target.value)}
          disabled={isPending}
          placeholder="0"
        />
      </FormField>

      <FormField>
        <Label required>Moneda</Label>
        <Select
          value={values.currency || undefined}
          onChange={(value) =>
            updateField(
              "currency",
              value as PropertyPriceFormValues["currency"],
            )
          }
          placeholder="Seleccionar moneda"
          disabled={isPending}
          options={[...CURRENCY_OPTIONS]}
        />
      </FormField>

      <FormField>
        <Label>Etiqueta</Label>
        <Input
          value={values.label}
          onChange={(event) => updateField("label", event.target.value)}
          disabled={isPending}
          placeholder="Ej. Contado, Financiado"
        />
        <HelperText>
          Opcional. Recomendado si hay varios precios en la misma moneda.
        </HelperText>
      </FormField>

      {mode === "create" && isFirstPrice ? (
        <p className="text-xs text-muted">
          El primer precio de la publicación se marcará como principal
          automáticamente.
        </p>
      ) : null}

      {error ? (
        <FormField state="error">
          <ErrorMessage>{error}</ErrorMessage>
        </FormField>
      ) : null}

      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="secondary"
          disabled={isPending}
          onClick={onCancel}
        >
          Cancelar
        </Button>
        <Button type="submit" loading={isPending}>
          {mode === "create" ? "Agregar precio" : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}
