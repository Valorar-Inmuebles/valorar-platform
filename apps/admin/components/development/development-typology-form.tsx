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
import { Input } from "@repo/ui/input";
import { Select } from "@repo/ui/select";
import { useToast } from "@repo/ui/toast";
import {
  createDevelopmentTypologyAction,
  updateDevelopmentTypologyAction,
} from "@/lib/api/development-typology-actions";
import type { AdminDevelopmentTypology } from "@/lib/api/types/development-typology";
import type { DevelopmentTypologyFormValues } from "@/lib/api/types/development-typology";
import type { AdminPropertyFeature } from "@/lib/api/types/property-feature";
import type { AdminDevelopmentTypologyFeatureAssignment } from "@/lib/api/types/development-typology-feature";
import { DevelopmentTypologyFeatureManager } from "@/components/development/development-typology-feature-manager";
import { CURRENCY_OPTIONS } from "@/lib/format/listing-labels";
import {
  emptyTypologyFormValues,
  formValuesToCreatePayload,
  formValuesToUpdatePayload,
  typologyToFormValues,
  validateTypologyFormValues,
} from "@/lib/development/typology-form";

const TEXTAREA_CLASS =
  "min-h-24 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition-all duration-150 placeholder:text-zinc-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500/10 disabled:cursor-not-allowed disabled:bg-zinc-50";

type DevelopmentTypologyFormProps = {
  developmentId: string;
  mode: "create" | "edit";
  typology?: AdminDevelopmentTypology;
  sortOrder?: number;
  featureCatalog?: AdminPropertyFeature[];
  featureAssignments?: AdminDevelopmentTypologyFeatureAssignment[];
  onSuccess: () => void;
  onCancel: () => void;
};

export function DevelopmentTypologyForm({
  developmentId,
  mode,
  typology,
  sortOrder,
  featureCatalog = [],
  featureAssignments = [],
  onSuccess,
  onCancel,
}: DevelopmentTypologyFormProps) {
  const { toast } = useToast();
  const [values, setValues] = useState<DevelopmentTypologyFormValues>(() =>
    typology ? typologyToFormValues(typology) : emptyTypologyFormValues(),
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setValues(
      typology ? typologyToFormValues(typology) : emptyTypologyFormValues(),
    );
    setError(null);
  }, [typology, mode]);

  const updateField = <K extends keyof DevelopmentTypologyFormValues>(
    key: K,
    value: DevelopmentTypologyFormValues[K],
  ) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const validationError = validateTypologyFormValues(values);
    if (validationError) {
      setError(validationError);
      return;
    }

    startTransition(async () => {
      if (mode === "create") {
        const result = await createDevelopmentTypologyAction(
          formValuesToCreatePayload(developmentId, values, sortOrder),
        );

        if (!result.ok) {
          setError(result.error);
          toast.error(result.error);
          return;
        }

        toast.success("Unidad creada correctamente.");
        onSuccess();
        return;
      }

      if (!typology) return;

      const result = await updateDevelopmentTypologyAction(
        developmentId,
        typology.id,
        formValuesToUpdatePayload(values),
      );

      if (!result.ok) {
        setError(result.error);
        toast.error(result.error);
        return;
      }

      toast.success("Unidad actualizada correctamente.");
      onSuccess();
    });
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField>
          <Label required>Nombre</Label>
          <Input
            value={values.name}
            onChange={(event) => updateField("name", event.target.value)}
            disabled={isPending}
            placeholder="2 ambientes"
          />
        </FormField>

        <FormField>
          <Label required>Descripción</Label>
          <textarea
            value={values.description}
            onChange={(event) => updateField("description", event.target.value)}
            disabled={isPending}
            rows={4}
            className={TEXTAREA_CLASS}
            placeholder="Descripción comercial de la unidad"
          />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField>
            <Label>Cantidad total</Label>
            <Input
              type="number"
              min={1}
              value={values.totalCount}
              onChange={(event) => updateField("totalCount", event.target.value)}
              disabled={isPending}
            />
            <HelperText>Opcional.</HelperText>
          </FormField>

          <FormField>
            <Label>Cantidad disponibles</Label>
            <Input
              type="number"
              min={0}
              value={values.availableCount}
              onChange={(event) =>
                updateField("availableCount", event.target.value)
              }
              disabled={isPending}
            />
            <HelperText>Opcional.</HelperText>
          </FormField>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField>
            <Label>Superficie desde (m²)</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={values.surfaceFrom}
              onChange={(event) => updateField("surfaceFrom", event.target.value)}
              disabled={isPending}
            />
            <HelperText>Opcional.</HelperText>
          </FormField>

          <FormField>
            <Label>Superficie hasta (m²)</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={values.surfaceTo}
              onChange={(event) => updateField("surfaceTo", event.target.value)}
              disabled={isPending}
            />
            <HelperText>Opcional.</HelperText>
          </FormField>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField>
            <Label>Precio desde</Label>
            <CurrencyInput
              value={values.priceFrom}
              onChange={(value) => updateField("priceFrom", value)}
              disabled={isPending}
              placeholder="0"
            />
            <HelperText>Opcional.</HelperText>
          </FormField>

          <FormField>
            <Label>Moneda</Label>
            <Select
              value={values.currency || undefined}
              onChange={(value) =>
                updateField(
                  "currency",
                  (value ?? "") as DevelopmentTypologyFormValues["currency"],
                )
              }
              placeholder="Seleccionar moneda"
              disabled={isPending}
              options={CURRENCY_OPTIONS.map((option) => ({
                value: option.value,
                label: option.label,
              }))}
            />
            <HelperText>Opcional.</HelperText>
          </FormField>
        </div>

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
            {mode === "create" ? "Crear unidad" : "Guardar cambios"}
          </Button>
        </div>
      </form>

      {mode === "edit" && typology ? (
        <DevelopmentTypologyFeatureManager
          typologyId={typology.id}
          developmentId={developmentId}
          catalog={featureCatalog}
          assignments={featureAssignments}
        />
      ) : null}
    </div>
  );
}
