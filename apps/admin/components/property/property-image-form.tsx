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
import { updatePropertyImageAction } from "@/lib/api/property-image-actions";
import type {
  AdminPropertyImage,
  PropertyImageEditFormValues,
} from "@/lib/api/types/property-image";
import {
  formValuesToUpdatePayload,
  imageToEditFormValues,
} from "@/lib/property/image-form";

type PropertyImageFormProps = {
  propertyId: string;
  image: AdminPropertyImage;
  onSuccess: () => void;
  onCancel: () => void;
};

export function PropertyImageForm({
  propertyId,
  image,
  onSuccess,
  onCancel,
}: PropertyImageFormProps) {
  const { toast } = useToast();
  const [values, setValues] = useState<PropertyImageEditFormValues>(() =>
    imageToEditFormValues(image),
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setValues(imageToEditFormValues(image));
    setError(null);
  }, [image]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
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
      <FormField>
        <Label>Vista previa</Label>
        {image.url ? (
          <div className="overflow-hidden rounded-lg border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.url}
              alt={image.altText ?? image.storageKey}
              className="aspect-[4/3] w-full object-cover"
            />
          </div>
        ) : (
          <p className="text-sm text-muted">Sin preview disponible.</p>
        )}
      </FormField>

      <FormField>
        <Label>Texto alternativo</Label>
        <Input
          value={values.altText}
          onChange={(event) =>
            setValues((current) => ({ ...current, altText: event.target.value }))
          }
          disabled={isPending}
          placeholder="Descripción de la imagen"
        />
        <HelperText>Opcional. Recomendado para accesibilidad y SEO.</HelperText>
      </FormField>

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
          Guardar cambios
        </Button>
      </div>
    </form>
  );
}
