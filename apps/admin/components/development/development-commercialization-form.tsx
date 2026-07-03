"use client";

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
import { CurrencyInput } from "@repo/ui/currency-input";
import {
  ErrorMessage,
  FormField,
  HelperText,
  Label,
} from "@repo/ui/form-field";
import { Select } from "@repo/ui/select";
import { useToast } from "@repo/ui/toast";
import { updateDevelopmentAction } from "@/lib/api/development-actions";
import type {
  AdminDevelopment,
  DevelopmentCommercializationFormValues,
} from "@/lib/api/types/development";
import { CURRENCY_OPTIONS } from "@/lib/format/listing-labels";
import {
  commercializationFormValuesToUpdatePayload,
  developmentToCommercializationFormValues,
  validateDevelopmentCommercializationFormValues,
} from "@/lib/development/form";

type DevelopmentCommercializationFormProps = {
  development: AdminDevelopment;
};

export function DevelopmentCommercializationForm({
  development,
}: DevelopmentCommercializationFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [values, setValues] = useState<DevelopmentCommercializationFormValues>(
    () => developmentToCommercializationFormValues(development),
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const updateField = <K extends keyof DevelopmentCommercializationFormValues>(
    key: K,
    value: DevelopmentCommercializationFormValues[K],
  ) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const validationError = validateDevelopmentCommercializationFormValues(values);
    if (validationError) {
      setError(validationError);
      return;
    }

    startTransition(async () => {
      const result = await updateDevelopmentAction(
        development.id,
        commercializationFormValuesToUpdatePayload(values),
      );

      if (!result.ok) {
        setError(result.error);
        toast.error(result.error);
        return;
      }

      toast.success("Comercialización actualizada correctamente.");
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Precio</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <FormField>
            <Label>Precio desde</Label>
            <CurrencyInput
              value={values.priceFrom}
              onChange={(value) => updateField("priceFrom", value)}
              disabled={isPending}
              placeholder="0"
            />
            <HelperText>Opcional. Precio mínimo de publicación del emprendimiento.</HelperText>
          </FormField>

          <FormField>
            <Label>Moneda</Label>
            <Select
              value={values.currency || undefined}
              onChange={(value) =>
                updateField(
                  "currency",
                  (value ?? "") as DevelopmentCommercializationFormValues["currency"],
                )
              }
              placeholder="Seleccionar moneda"
              disabled={isPending}
              options={CURRENCY_OPTIONS.map((option) => ({
                value: option.value,
                label: option.label,
              }))}
            />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Financiación</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField>
            <Label>¿Ofrece financiación?</Label>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="radio"
                  name="hasFinancing"
                  checked={values.hasFinancing === "yes"}
                  onChange={() => updateField("hasFinancing", "yes")}
                  disabled={isPending}
                  className="size-4 border-border text-primary"
                />
                Sí
              </label>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="radio"
                  name="hasFinancing"
                  checked={values.hasFinancing === "no"}
                  onChange={() => updateField("hasFinancing", "no")}
                  disabled={isPending}
                  className="size-4 border-border text-primary"
                />
                No
              </label>
            </div>
          </FormField>

          {values.hasFinancing === "yes" ? (
            <FormField>
              <Label required>Descripción de financiación</Label>
              <textarea
                value={values.financingDescription}
                onChange={(event) =>
                  updateField("financingDescription", event.target.value)
                }
                disabled={isPending}
                rows={4}
                className="min-h-28 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition-all duration-150 placeholder:text-zinc-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500/10 disabled:cursor-not-allowed disabled:bg-zinc-50"
                placeholder="Detalle de planes, cuotas u opciones de financiación"
              />
            </FormField>
          ) : null}
        </CardContent>
      </Card>

      {error ? (
        <FormField state="error">
          <ErrorMessage>{error}</ErrorMessage>
        </FormField>
      ) : null}

      <CardFooter className="flex justify-end gap-2 px-0">
        <Button type="submit" loading={isPending}>
          Guardar comercialización
        </Button>
      </CardFooter>
    </form>
  );
}
