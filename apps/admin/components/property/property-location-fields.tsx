"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FormField, Label } from "@repo/ui/form-field";
import { Select } from "@repo/ui/select";
import type { GeoProvince } from "@repo/shared-types";
import {
  getLocalitiesByProvince,
  getNeighborhoodsByLocality,
  getProvinces,
} from "@/lib/api/geo-client";
import { GeoAutocomplete } from "@/components/geo/geo-autocomplete";

export type PropertyLocationValue = {
  provinceId: string;
  provinceName: string;
  localityId: string;
  localityName: string;
  neighborhoodId: string;
  neighborhoodName: string;
};

type PropertyLocationFieldsProps = {
  value: PropertyLocationValue;
  disabled?: boolean;
  onChange: (value: PropertyLocationValue) => void;
};

const emptyLocationValue = (): PropertyLocationValue => ({
  provinceId: "",
  provinceName: "",
  localityId: "",
  localityName: "",
  neighborhoodId: "",
  neighborhoodName: "",
});

export function PropertyLocationFields({
  value,
  disabled = false,
  onChange,
}: PropertyLocationFieldsProps) {
  const [provinces, setProvinces] = useState<GeoProvince[]>([]);
  const [loadingProvinces, setLoadingProvinces] = useState(true);

  useEffect(() => {
    let cancelled = false;

    getProvinces()
      .then((items) => {
        if (!cancelled) {
          setProvinces(items);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingProvinces(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const provinceOptions = useMemo(
    () =>
      provinces.map((province) => ({
        value: province.id,
        label: province.name,
      })),
    [provinces],
  );

  const handleProvinceChange = (provinceId: string) => {
    const province = provinces.find((item) => item.id === provinceId);
    onChange({
      ...emptyLocationValue(),
      provinceId,
      provinceName: province?.name ?? "",
    });
  };

  const searchLocalities = useCallback(
    async (query: string) => {
      if (!value.provinceId) {
        return [];
      }

      const localities = await getLocalitiesByProvince(value.provinceId, query);
      return localities.map((locality) => ({
        value: locality.id,
        label: locality.name,
        description: locality.postalCode
          ? `CP ${locality.postalCode}`
          : undefined,
      }));
    },
    [value.provinceId],
  );

  const searchNeighborhoods = useCallback(
    async (query: string) => {
      if (!value.localityId) {
        return [];
      }

      const neighborhoods = await getNeighborhoodsByLocality(
        value.localityId,
        query,
      );

      return neighborhoods.map((neighborhood) => ({
        value: neighborhood.id,
        label: neighborhood.name,
      }));
    },
    [value.localityId],
  );

  return (
    <>
      <FormField>
        <Label required>Provincia</Label>
        <Select
          value={value.provinceId}
          onChange={handleProvinceChange}
          options={provinceOptions}
          placeholder={loadingProvinces ? "Cargando provincias…" : "Seleccionar provincia"}
          disabled={disabled || loadingProvinces}
        />
      </FormField>

      <GeoAutocomplete
        label="Localidad"
        required
        placeholder="Escribí para buscar localidad"
        value={value.localityId}
        displayValue={value.localityName}
        disabled={disabled || !value.provinceId}
        emptyMessage={
          value.provinceId
            ? "No se encontraron localidades"
            : "Seleccioná una provincia primero"
        }
        onQuery={searchLocalities}
        onChange={(option) => {
          if (!option) {
            onChange({
              ...value,
              localityId: "",
              localityName: "",
              neighborhoodId: "",
              neighborhoodName: "",
            });
            return;
          }

          onChange({
            ...value,
            localityId: option.value,
            localityName: option.label,
            neighborhoodId: "",
            neighborhoodName: "",
          });
        }}
      />

      <GeoAutocomplete
        label="Barrio"
        placeholder="Opcional — buscar barrio o zona"
        value={value.neighborhoodId}
        displayValue={value.neighborhoodName}
        disabled={disabled || !value.localityId}
        emptyMessage={
          value.localityId
            ? "No hay barrios cargados para esta localidad"
            : "Seleccioná una localidad primero"
        }
        onQuery={searchNeighborhoods}
        onChange={(option) => {
          onChange({
            ...value,
            neighborhoodId: option?.value ?? "",
            neighborhoodName: option?.label ?? "",
          });
        }}
      />
    </>
  );
}
