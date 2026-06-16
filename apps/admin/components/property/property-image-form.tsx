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
import { useToast } from "@repo/ui/toast";
import {
  createPropertyImageAction,
  updatePropertyImageAction,
} from "@/lib/api/property-image-actions";
import type {
  AdminPropertyImage,
  PropertyImageFormValues,
} from "@/lib/api/types/property-image";
import {
  emptyImageFormValues,
  formValuesToCreatePayload,
  formValuesToUpdatePayload,
  imageToFormValues,
  validateImageCreateValues,
  validateImageEditValues,
} from "@/lib/property/image-form";

type PropertyImageFormProps = {
  propertyId: string;
  mode: "create" | "edit";
  image?: AdminPropertyImage;
  isFirstImage: boolean;
  onSuccess: () => void;
  onCancel: () => void;
};

export function PropertyImageForm({
  propertyId,
  mode,
  image,
  isFirstImage,
  onSuccess,
  onCancel,
}: PropertyImageFormProps) {
  const { toast } = useToast();
  const [values, setValues] = useState<PropertyImageFormValues>(() =>
    image ? imageToFormValues(image) : emptyImageFormValues(),
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setValues(image ? imageToFormValues(image) : emptyImageFormValues());
    setError(null);
  }, [image, mode]);

  const updateField = <K extends keyof PropertyImageFormValues>(
    key: K,
    value: PropertyImageFormValues[K],
  ) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const validationError =
      mode === "create"
        ? validateImageCreateValues(values)
        : validateImageEditValues(values);

    if (validationError) {
      setError(validationError);
      return;
    }

    startTransition(async () => {
      if (mode === "create") {
        const result = await createPropertyImageAction(
          propertyId,
          formValuesToCreatePayload(values),
        );

        if (!result.ok) {
          setError(result.error);
          toast.error(result.error);
          return;
        }

        toast.success("Imagen agregada correctamente.");
        onSuccess();
        return;
      }

      if (!image) return;

      const result = await updatePropertyImageAction(
        propertyId,
        image.id,
        formValuesToUpdatePayload(values),
      );

      if (!result.ok) {
        setError(result.error);
        toast.error(result.error);
        return;
      }

      toast.success("Imagen actualizada correctamente.");
      onSuccess();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {mode === "create" ? (
        <FormField>
          <Label required>Clave de almacenamiento</Label>
          <Input
            value={values.storageKey}
            onChange={(event) => updateField("storageKey", event.target.value)}
            disabled={isPending}
            placeholder="tenant/property/uuid.jpg"
          />
          <HelperText>
            Identificador del archivo en storage (R2/S3/Supabase). Ingreso manual
            temporal hasta existir upload.
          </HelperText>
        </FormField>
      ) : image ? (
        <FormField>
          <Label>Clave de almacenamiento</Label>
          <p className="break-all text-sm font-medium text-foreground">
            {image.storageKey}
          </p>
          <HelperText>No editable después de crear la imagen.</HelperText>
        </FormField>
      ) : null}

      <FormField>
        <Label>URL de preview</Label>
        <Input
          value={values.url}
          onChange={(event) => updateField("url", event.target.value)}
          disabled={isPending}
          placeholder="https://..."
        />
        <HelperText>Opcional. Permite previsualizar la imagen en la galería.</HelperText>
      </FormField>

      <FormField>
        <Label>Texto alternativo</Label>
        <Input
          value={values.altText}
          onChange={(event) => updateField("altText", event.target.value)}
          disabled={isPending}
          placeholder="Descripción de la imagen"
        />
        <HelperText>Opcional. Recomendado para accesibilidad y SEO.</HelperText>
      </FormField>

      <FormField>
        <Label>Orden</Label>
        <Input
          type="number"
          min={0}
          step={1}
          value={values.sortOrder}
          onChange={(event) => updateField("sortOrder", event.target.value)}
          disabled={isPending}
        />
        <HelperText>Entero ≥ 0. Define el orden en la galería.</HelperText>
      </FormField>

      {mode === "create" && isFirstImage ? (
        <p className="text-xs text-muted">
          La primera imagen de la propiedad se marcará como portada
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
          {mode === "create" ? "Agregar imagen" : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}
