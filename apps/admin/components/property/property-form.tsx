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
import {
  createPropertyAction,
  updatePropertyAction,
} from "@/lib/api/property-actions";
import type { AdminProperty } from "@/lib/api/types/property";
import {
  PROPERTY_CONDITION_OPTIONS,
  PROPERTY_TYPE_OPTIONS,
} from "@/lib/format/property-labels";
import {
  emptyPropertyFormValues,
  formValuesToCreatePayload,
  formValuesToUpdatePayload,
  propertyToFormValues,
  slugifyTitle,
  validatePropertyFormValues,
} from "@/lib/property/form";
import type { PropertyFormValues } from "@/lib/api/types/property";

type PropertyFormProps = {
  mode: "create" | "edit";
  property?: AdminProperty;
};

export function PropertyForm({ mode, property }: PropertyFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [values, setValues] = useState<PropertyFormValues>(() =>
    property ? propertyToFormValues(property) : emptyPropertyFormValues(),
  );
  const [error, setError] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [isPending, startTransition] = useTransition();

  const updateField = <K extends keyof PropertyFormValues>(
    key: K,
    value: PropertyFormValues[K],
  ) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const handleTitleChange = (title: string) => {
    setValues((current) => ({
      ...current,
      title,
      slug: slugTouched ? current.slug : slugifyTitle(title),
    }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const validationError = validatePropertyFormValues(values);
    if (validationError) {
      setError(validationError);
      return;
    }

    startTransition(async () => {
      if (mode === "create") {
        const result = await createPropertyAction(
          formValuesToCreatePayload(values),
        );

        if (!result.ok) {
          setError(result.error);
          toast.error(result.error);
          return;
        }

        if (!result.id) {
          const message = "La propiedad se creó pero no se recibió el identificador.";
          setError(message);
          toast.error(message);
          return;
        }

        toast.success("Propiedad creada correctamente.");
        router.push(`/propiedades/${result.id}`);
        router.refresh();
        return;
      }

      if (!property) return;

      const result = await updatePropertyAction(
        property.id,
        formValuesToUpdatePayload(values),
      );

      if (!result.ok) {
        setError(result.error);
        toast.error(result.error);
        return;
      }

      toast.success("Propiedad actualizada correctamente.");
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Identificación</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <FormField className="md:col-span-2">
            <Label required>Título</Label>
            <Input
              value={values.title}
              onChange={(event) => handleTitleChange(event.target.value)}
              placeholder="Departamento en Palermo"
              disabled={isPending}
            />
          </FormField>

          <FormField>
            <Label required>Slug</Label>
            <Input
              value={values.slug}
              onChange={(event) => {
                setSlugTouched(true);
                updateField("slug", event.target.value);
              }}
              placeholder="departamento-palermo"
              disabled={isPending}
            />
            <HelperText>URL pública: /propiedades/{values.slug || "..."}</HelperText>
          </FormField>

          <FormField>
            <Label required>Tipo</Label>
            <Select
              value={values.propertyType || undefined}
              onChange={(value) =>
                updateField("propertyType", value as PropertyFormValues["propertyType"])
              }
              placeholder="Seleccionar tipo"
              disabled={isPending}
              options={PROPERTY_TYPE_OPTIONS}
            />
          </FormField>

          <FormField>
            <Label>Código interno</Label>
            <Input
              value={values.internalCode}
              onChange={(event) => updateField("internalCode", event.target.value)}
              disabled={isPending}
            />
          </FormField>

          <FormField>
            <Label>Condición</Label>
            <Select
              value={values.condition || undefined}
              onChange={(value) =>
                updateField("condition", value as PropertyFormValues["condition"])
              }
              placeholder="Seleccionar condición"
              disabled={isPending}
              options={PROPERTY_CONDITION_OPTIONS}
            />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ubicación</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <FormField>
            <Label required>Ciudad</Label>
            <Input
              value={values.city}
              onChange={(event) => updateField("city", event.target.value)}
              disabled={isPending}
            />
          </FormField>

          <FormField>
            <Label>Barrio</Label>
            <Input
              value={values.neighborhood}
              onChange={(event) => updateField("neighborhood", event.target.value)}
              disabled={isPending}
            />
          </FormField>

          <FormField>
            <Label>Calle</Label>
            <Input
              value={values.street}
              onChange={(event) => updateField("street", event.target.value)}
              disabled={isPending}
            />
          </FormField>

          <FormField>
            <Label>Número</Label>
            <Input
              value={values.streetNumber}
              onChange={(event) => updateField("streetNumber", event.target.value)}
              disabled={isPending}
            />
          </FormField>

          <FormField>
            <Label>Provincia</Label>
            <Input
              value={values.province}
              onChange={(event) => updateField("province", event.target.value)}
              disabled={isPending}
            />
          </FormField>

          <FormField>
            <Label>Código postal</Label>
            <Input
              value={values.postalCode}
              onChange={(event) => updateField("postalCode", event.target.value)}
              disabled={isPending}
            />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Características</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <FormField>
            <Label>Dormitorios</Label>
            <Input
              type="number"
              min={0}
              value={values.bedrooms}
              onChange={(event) => updateField("bedrooms", event.target.value)}
              disabled={isPending}
            />
          </FormField>

          <FormField>
            <Label>Baños</Label>
            <Input
              type="number"
              min={0}
              value={values.bathrooms}
              onChange={(event) => updateField("bathrooms", event.target.value)}
              disabled={isPending}
            />
          </FormField>

          <FormField>
            <Label>Superficie total (m²)</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={values.totalArea}
              onChange={(event) => updateField("totalArea", event.target.value)}
              disabled={isPending}
            />
          </FormField>

          <FormField>
            <Label>Superficie cubierta (m²)</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={values.coveredArea}
              onChange={(event) => updateField("coveredArea", event.target.value)}
              disabled={isPending}
            />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Descripción</CardTitle>
        </CardHeader>
        <CardContent>
          <FormField>
            <Label>Descripción</Label>
            <textarea
              value={values.description}
              onChange={(event) => updateField("description", event.target.value)}
              disabled={isPending}
              rows={5}
              className="min-h-32 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition-all duration-150 placeholder:text-zinc-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500/10 disabled:cursor-not-allowed disabled:bg-zinc-50"
              placeholder="Descripción comercial del inmueble"
            />
          </FormField>
        </CardContent>
      </Card>

      {mode === "edit" ? (
        <Card>
          <CardHeader>
            <CardTitle>Estado</CardTitle>
          </CardHeader>
          <CardContent>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={values.isActive}
                onChange={(event) => updateField("isActive", event.target.checked)}
                disabled={isPending}
                className="size-4 rounded border-border"
              />
              Propiedad activa
            </label>
            <HelperText>
              Desactivá solo si querés restaurar una propiedad archivada. Para
              archivar usá el botón del listado.
            </HelperText>
          </CardContent>
        </Card>
      ) : null}

      {error ? (
        <FormField state="error">
          <ErrorMessage>{error}</ErrorMessage>
        </FormField>
      ) : null}

      <CardFooter className="flex justify-end gap-2 px-0">
        <Link href={mode === "edit" && property ? `/propiedades/${property.id}` : "/propiedades"}>
          <Button type="button" variant="secondary" disabled={isPending}>
            Cancelar
          </Button>
        </Link>
        <Button type="submit" loading={isPending}>
          {mode === "create" ? "Crear propiedad" : "Guardar cambios"}
        </Button>
      </CardFooter>
    </form>
  );
}
