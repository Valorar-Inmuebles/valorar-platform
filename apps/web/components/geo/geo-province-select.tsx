"use client";

import { useEffect, useState } from "react";
import type { GeoProvince } from "@repo/shared-types";
import { getProvinces } from "@/lib/api/geo";

type GeoProvinceSelectProps = {
  value: string;
  onChange: (provinceId: string) => void;
  disabled?: boolean;
  className?: string;
};

export function GeoProvinceSelect({
  value,
  onChange,
  disabled = false,
  className = "",
}: GeoProvinceSelectProps) {
  const [provinces, setProvinces] = useState<GeoProvince[]>([]);

  useEffect(() => {
    getProvinces().then(setProvinces).catch(() => setProvinces([]));
  }, []);

  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      className={className}
    >
      <option value="">Todas las provincias</option>
      {provinces.map((province) => (
        <option key={province.id} value={province.id}>
          {province.name}
        </option>
      ))}
    </select>
  );
}
