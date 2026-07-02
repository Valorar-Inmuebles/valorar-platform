"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { GeoProvince } from "@repo/shared-types";
import { getProvinces } from "@/lib/api/geo";
import type { SearchCoverageProvince } from "@/lib/inventory/search-coverage.types";

type GeoProvinceComboboxProps = {
  value: string;
  onChange: (provinceId: string, province?: GeoProvince) => void;
  /** When set, only these provinces are shown (published inventory). */
  provinces?: SearchCoverageProvince[];
  /** Show "Todas las provincias" clear option. Default true. */
  allowClear?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
};

export function GeoProvinceCombobox({
  value,
  onChange,
  provinces: provincesProp,
  allowClear = true,
  disabled = false,
  placeholder = "Provincia",
  className = "",
  inputClassName = "",
}: GeoProvinceComboboxProps) {
  const listId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [fetchedProvinces, setFetchedProvinces] = useState<GeoProvince[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const provinces = provincesProp ?? fetchedProvinces;
  const selected = provinces.find((province) => province.id === value);

  useEffect(() => {
    if (provincesProp) {
      return;
    }

    getProvinces().then(setFetchedProvinces).catch(() => setFetchedProvinces([]));
  }, [provincesProp]);

  useEffect(() => {
    setQuery(selected?.name ?? "");
  }, [selected?.id, selected?.name]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = normalizedQuery
    ? provinces.filter(
        (province) =>
          province.name.toLowerCase().includes(normalizedQuery) ||
          province.slug.includes(normalizedQuery),
      )
    : provinces;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <input
        type="text"
        value={query}
        placeholder={placeholder}
        disabled={disabled}
        aria-autocomplete="list"
        aria-controls={listId}
        aria-expanded={open}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
          if (!event.target.value.trim()) {
            onChange("");
          }
        }}
        className={inputClassName}
      />

      {open && !disabled ? (
        <ul
          id={listId}
          className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-border-default bg-surface-card py-1 shadow-lg"
        >
          {allowClear ? (
            <li>
              <button
                type="button"
                className="flex w-full px-3 py-2 text-left text-sm text-muted hover:bg-surface-alt"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange("");
                  setQuery("");
                  setOpen(false);
                }}
              >
                Todas las provincias
              </button>
            </li>
          ) : null}
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted">Sin resultados</li>
          ) : (
            filtered.map((province) => (
              <li key={province.id}>
                <button
                  type="button"
                  className="flex w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-surface-alt"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    onChange(province.id, province);
                    setQuery(province.name);
                    setOpen(false);
                  }}
                >
                  {province.name}
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
