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
  PropertyLocationFields,
  type PropertyLocationValue,
} from "@/components/property/property-location-fields";
import {
  createDevelopmentAction,
  updateDevelopmentAction,
} from "@/lib/api/development-actions";
import type { AdminDevelopment } from "@/lib/api/types/development";
import type { DevelopmentFormValues } from "@/lib/api/types/development";
import { DEVELOPMENT_STATUS_OPTIONS } from "@/lib/development/format/development-status-labels";
import {
  developmentToFormValues,
  emptyDevelopmentFormValues,
  formValuesToCreatePayload,
  formValuesToUpdatePayload,
  slugifyTitle,
  validateDevelopmentFormValues,
} from "@/lib/development/form";

type DevelopmentFormProps = {
  mode: "create" | "edit";
  development?: AdminDevelopment;
};

export function DevelopmentForm({ mode, development }: DevelopmentFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [values, setValues] = useState<DevelopmentFormValues>(() =>
    development ? developmentToFormValues(development) : emptyDevelopmentFormValues(),
  );
  const [error, setError] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [isPending, startTransition] = useTransition();

  const updateField = <K extends keyof DevelopmentFormValues>(
    key: K,
    value: DevelopmentFormValues[K],
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

  const updateLocation = (location: PropertyLocationValue) => {
    setValues((current) => ({
      ...current,
      provinceId: location.provinceId,
      provinceName: location.provinceName,
      province: location.provinceName,
      localityId: location.localityId,
      localityName: location.localityName,
      city: location.localityName,
      neighborhoodId: location.neighborhoodId,
      neighborhoodName: location.neighborhoodName,
      neighborhood: location.neighborhoodName,
    }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const validationError = validateDevelopmentFormValues(values);
    if (validationError) {
      setError(validationError);
      return;
    }

    startTransition(async () => {
      if (mode === "create") {
        const result = await createDevelopmentAction(
          formValuesToCreatePayload(values),
        );

        if (!result.ok) {
          setError(result.error);
          toast.error(result.error);
          return;
        }

        if (!result.id) {
          const message =
            "El emprendimiento se creó pero no se recibió el identificador.";
          setError(message);
          toast.error(message);
          return;
        }

        toast.success("Emprendimiento creado correctamente.");
        router.push(`/emprendimientos/${result.id}`);
        router.refresh();
        return;
      }

      if (!development) return;

      const result = await updateDevelopmentAction(
        development.id,
        formValuesToUpdatePayload(values),
      );

      if (!result.ok) {
        setError(result.error);
        toast.error(result.error);
        return;
      }

      toast.success("Emprendimiento actualizado correctamente.");
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
              placeholder="Torre Palermo"
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
              placeholder="torre-palermo"
              disabled={isPending}
            />
            <HelperText>
              URL pública: /emprendimientos/{values.slug || "..."}
            </HelperText>
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
            <Label>Estado de obra</Label>
            <Select
              value={values.status || undefined}
              onChange={(value) =>
                updateField(
                  "status",
                  (value ?? "") as DevelopmentFormValues["status"],
                )
              }
              placeholder="Sin definir"
              disabled={isPending}
              options={[
                { value: "", label: "Sin definir" },
                ...DEVELOPMENT_STATUS_OPTIONS,
              ]}
            />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Descripción</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField>
            <Label required>Descripción corta</Label>
            <Input
              value={values.shortDescription}
              onChange={(event) =>
                updateField("shortDescription", event.target.value)
              }
              disabled={isPending}
              placeholder="Resumen comercial del emprendimiento"
            />
          </FormField>

          <FormField>
            <Label required>Descripción</Label>
            <textarea
              value={values.description}
              onChange={(event) => updateField("description", event.target.value)}
              disabled={isPending}
              rows={5}
              className="min-h-32 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition-all duration-150 placeholder:text-zinc-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500/10 disabled:cursor-not-allowed disabled:bg-zinc-50"
              placeholder="Descripción completa del emprendimiento"
            />
          </FormField>

          <FormField>
            <Label>¿Tiene cocheras?</Label>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="radio"
                  name="hasParkingSpaces"
                  checked={values.hasParkingSpaces === "yes"}
                  onChange={() => updateField("hasParkingSpaces", "yes")}
                  disabled={isPending}
                  className="size-4 border-border text-primary"
                />
                Sí
              </label>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="radio"
                  name="hasParkingSpaces"
                  checked={values.hasParkingSpaces === "no"}
                  onChange={() => {
                    updateField("hasParkingSpaces", "no");
                    updateField("parkingSpacesCount", "");
                  }}
                  disabled={isPending}
                  className="size-4 border-border text-primary"
                />
                No
              </label>
            </div>
          </FormField>

          {values.hasParkingSpaces === "yes" ? (
            <FormField>
              <Label>Cantidad de cocheras</Label>
              <Input
                type="number"
                min={1}
                step={1}
                value={values.parkingSpacesCount}
                onChange={(event) =>
                  updateField("parkingSpacesCount", event.target.value)
                }
                disabled={isPending}
              />
              <HelperText>Opcional.</HelperText>
            </FormField>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ubicación</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
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

          <PropertyLocationFields
            value={{
              provinceId: values.provinceId,
              provinceName: values.provinceName,
              localityId: values.localityId,
              localityName: values.localityName,
              neighborhoodId: values.neighborhoodId,
              neighborhoodName: values.neighborhoodName,
            }}
            disabled={isPending}
            onChange={updateLocation}
          />

          <FormField>
            <Label>Código postal</Label>
            <Input
              value={values.postalCode}
              onChange={(event) => updateField("postalCode", event.target.value)}
              disabled={isPending}
            />
          </FormField>

          <FormField>
            <Label>Latitud</Label>
            <Input
              type="number"
              step="any"
              min={-90}
              max={90}
              value={values.latitude}
              onChange={(event) => updateField("latitude", event.target.value)}
              placeholder="-34.6037"
              disabled={isPending}
            />
          </FormField>

          <FormField>
            <Label>Longitud</Label>
            <Input
              type="number"
              step="any"
              min={-180}
              max={180}
              value={values.longitude}
              onChange={(event) => updateField("longitude", event.target.value)}
              placeholder="-58.3816"
              disabled={isPending}
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
              Emprendimiento activo
            </label>
            <HelperText>
              Desactivá solo si querés restaurar un emprendimiento archivado. Para
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
        <Link
          href={
            mode === "edit" && development
              ? `/emprendimientos/${development.id}`
              : "/emprendimientos"
          }
        >
          <Button type="button" variant="secondary" disabled={isPending}>
            Cancelar
          </Button>
        </Link>
        <Button type="submit" loading={isPending}>
          {mode === "create" ? "Crear emprendimiento" : "Guardar cambios"}
        </Button>
      </CardFooter>
    </form>
  );
}
