"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { GeoLocalitySearchResult, GeoProvince } from "@repo/shared-types";
import { searchLocalities } from "@/lib/api/geo";
import {
  filterCoverageLocalities,
  type SearchCoverageLocality,
} from "@/lib/inventory/search-coverage.types";

export type SelectedLocality = {
  provinceId: string;
  provinceName: string;
  localityId?: string;
  localityName: string;
};

type GeoLocalitySearchProps = {
  value: SelectedLocality | null;
  onChange: (value: SelectedLocality | null) => void;
  provinceId?: string;
  /** When set, autocomplete is limited to published inventory (no geo catalog). */
  inventoryLocalities?: SearchCoverageLocality[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
};

function toSelectedLocality(
  option: SearchCoverageLocality | GeoLocalitySearchResult,
): SelectedLocality {
  if ("slug" in option) {
    return {
      provinceId: option.provinceId,
      provinceName: option.provinceName,
      localityId: option.id,
      localityName: option.name,
    };
  }

  return {
    provinceId: option.provinceId,
    provinceName: option.provinceName,
    localityId: option.localityId,
    localityName: option.name,
  };
}

function getOptionKey(
  option: SearchCoverageLocality | GeoLocalitySearchResult,
): string {
  return option.id;
}

export function GeoLocalitySearch({
  value,
  onChange,
  provinceId,
  inventoryLocalities,
  placeholder = "Buscar localidad",
  disabled = false,
  className = "",
  inputClassName = "",
}: GeoLocalitySearchProps) {
  const listId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState(value?.localityName ?? "");
  const [options, setOptions] = useState<
    Array<SearchCoverageLocality | GeoLocalitySearchResult>
  >([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const usesInventory = inventoryLocalities != null;

  const scopedInventoryLocalities = useMemo(() => {
    if (!inventoryLocalities) {
      return [];
    }

    if (!provinceId) {
      return inventoryLocalities;
    }

    return inventoryLocalities.filter(
      (locality) => locality.provinceId === provinceId,
    );
  }, [inventoryLocalities, provinceId]);

  useEffect(() => {
    setQuery(value?.localityName ?? "");
  }, [value?.localityId, value?.localityName]);

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

  useEffect(() => {
    if (!open) {
      setOptions([]);
      return;
    }

    if (usesInventory) {
      setOptions(filterCoverageLocalities(scopedInventoryLocalities, query));
      setLoading(false);
      return;
    }

    if (query.trim().length < 2) {
      setOptions([]);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const results = await searchLocalities(query.trim(), provinceId);
        if (!cancelled) {
          setOptions(results);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, provinceId, query, scopedInventoryLocalities, usesInventory]);

  const showDropdown = open && (usesInventory || query.trim().length >= 1);

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
            onChange(null);
          }
        }}
        className={inputClassName}
      />

      {showDropdown ? (
        <ul
          id={listId}
          className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-border bg-white py-1 shadow-lg"
        >
          {loading ? (
            <li className="px-3 py-2 text-sm text-muted">Buscando…</li>
          ) : options.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted">Sin resultados</li>
          ) : (
            options.map((option) => (
              <li key={getOptionKey(option)}>
                <button
                  type="button"
                  className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-slate-50"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    onChange(toSelectedLocality(option));
                    setQuery(option.name);
                    setOpen(false);
                  }}
                >
                  <span className="text-sm font-medium text-foreground">
                    {option.name}
                  </span>
                  {!provinceId && "provinceName" in option ? (
                    <span className="text-xs text-muted">{option.provinceName}</span>
                  ) : null}
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
