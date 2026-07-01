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
import type { AssignableUserOption } from "@/lib/api/types/organization";
import type { AdminProperty } from "@/lib/api/types/property";
import {
  ORIENTATION_OPTIONS,
  PROPERTY_BRIGHTNESS_OPTIONS,
  PROPERTY_CONDITION_OPTIONS,
  PROPERTY_LAYOUT_OPTIONS,
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
import {
  PropertyLocationFields,
  type PropertyLocationValue,
} from "@/components/property/property-location-fields";

type PropertyFormProps = {
  mode: "create" | "edit";
  property?: AdminProperty;
  assignableUsers?: AssignableUserOption[];
};

export function PropertyForm({
  mode,
  property,
  assignableUsers = [],
}: PropertyFormProps) {
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

  const updateLocation = (location: PropertyLocationValue) => {
    setValues((current) => ({
      ...current,
      countryId: current.countryId,
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

          {assignableUsers.length > 0 ? (
            <FormField className="md:col-span-2">
              <Label>Responsable comercial</Label>
              <Select
                value={values.assignedToId || undefined}
                onChange={(value) => updateField("assignedToId", value ?? "")}
                placeholder="Sin asignar"
                disabled={isPending}
                options={[
                  { value: "", label: "Sin asignar (usa el creador)" },
                  ...assignableUsers.map((user) => ({
                    value: user.id,
                    label: user.name,
                  })),
                ]}
              />
              <HelperText>
                Si está vacío, el creador de la propiedad es el responsable operativo.
              </HelperText>
            </FormField>
          ) : null}

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
            <Label>Piso</Label>
            <Input
              value={values.floor}
              onChange={(event) => updateField("floor", event.target.value)}
              disabled={isPending}
            />
          </FormField>

          <FormField>
            <Label>Departamento</Label>
            <Input
              value={values.apartment}
              onChange={(event) => updateField("apartment", event.target.value)}
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

      <Card>
        <CardHeader>
          <CardTitle>Distribución</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <FormField>
            <Label>Ambientes</Label>
            <Input
              type="number"
              min={0}
              value={values.rooms}
              onChange={(event) => updateField("rooms", event.target.value)}
              disabled={isPending}
            />
          </FormField>

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
            <Label>Toilettes</Label>
            <Input
              type="number"
              min={0}
              value={values.halfBathrooms}
              onChange={(event) => updateField("halfBathrooms", event.target.value)}
              disabled={isPending}
            />
          </FormField>

          <FormField>
            <Label>Cocheras</Label>
            <Input
              type="number"
              min={0}
              value={values.parkingSpaces}
              onChange={(event) => updateField("parkingSpaces", event.target.value)}
              disabled={isPending}
            />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Superficies y características</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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

          <FormField>
            <Label>Superficie descubierta (m²)</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={values.uncoveredArea}
              onChange={(event) => updateField("uncoveredArea", event.target.value)}
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
            <Label>Frente (m)</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={values.lotFront}
              onChange={(event) => updateField("lotFront", event.target.value)}
              disabled={isPending}
            />
          </FormField>

          <FormField>
            <Label>Fondo (m)</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={values.lotDepth}
              onChange={(event) => updateField("lotDepth", event.target.value)}
              disabled={isPending}
            />
          </FormField>

          <FormField>
            <Label>Año de construcción</Label>
            <Input
              type="number"
              min={1800}
              max={2100}
              value={values.yearBuilt}
              onChange={(event) => updateField("yearBuilt", event.target.value)}
              disabled={isPending}
            />
          </FormField>

          <FormField>
            <Label>Orientación</Label>
            <Select
              value={values.orientation || undefined}
              onChange={(value) =>
                updateField("orientation", value as PropertyFormValues["orientation"])
              }
              placeholder="Seleccionar orientación"
              disabled={isPending}
              options={ORIENTATION_OPTIONS}
            />
          </FormField>

          <FormField>
            <Label>Disposición</Label>
            <Select
              value={values.layout || undefined}
              onChange={(value) =>
                updateField("layout", value as PropertyFormValues["layout"])
              }
              placeholder="Seleccionar disposición"
              disabled={isPending}
              options={PROPERTY_LAYOUT_OPTIONS}
            />
          </FormField>

          <FormField>
            <Label>Luminosidad</Label>
            <Select
              value={values.brightness || undefined}
              onChange={(value) =>
                updateField("brightness", value as PropertyFormValues["brightness"])
              }
              placeholder="Seleccionar luminosidad"
              disabled={isPending}
              options={PROPERTY_BRIGHTNESS_OPTIONS}
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
