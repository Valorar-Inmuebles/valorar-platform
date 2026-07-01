"use client";

import { useEffect, useId, useRef, useState } from "react";
import { FormField, Label } from "@repo/ui/form-field";
import { Input } from "@repo/ui/input";

export type GeoAutocompleteOption = {
  value: string;
  label: string;
  description?: string;
};

type GeoAutocompleteProps = {
  label: string;
  placeholder?: string;
  value: string;
  displayValue: string;
  disabled?: boolean;
  required?: boolean;
  emptyMessage?: string;
  onQuery: (query: string) => Promise<GeoAutocompleteOption[]>;
  onChange: (option: GeoAutocompleteOption | null) => void;
};

export function GeoAutocomplete({
  label,
  placeholder = "Buscar…",
  value,
  displayValue,
  disabled = false,
  required = false,
  emptyMessage = "Sin resultados",
  onQuery,
  onChange,
}: GeoAutocompleteProps) {
  const listId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState(displayValue);
  const [options, setOptions] = useState<GeoAutocompleteOption[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setQuery(displayValue);
  }, [displayValue, value]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (!open || query.trim().length < 2) {
      setOptions([]);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const nextOptions = await onQuery(query.trim());
        if (!cancelled) {
          setOptions(nextOptions);
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
  }, [open, onQuery, query]);

  return (
    <FormField>
      <Label required={required}>{label}</Label>
      <div ref={containerRef} className="relative">
        <Input
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
        />

        {open && query.trim().length >= 2 ? (
          <ul
            id={listId}
            className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-zinc-200 bg-white py-1 shadow-lg"
          >
            {loading ? (
              <li className="px-3 py-2 text-sm text-zinc-400">Buscando…</li>
            ) : options.length === 0 ? (
              <li className="px-3 py-2 text-sm text-zinc-400">{emptyMessage}</li>
            ) : (
              options.map((option) => (
                <li key={option.value}>
                  <button
                    type="button"
                    className={
                      option.value === value
                        ? "flex w-full flex-col items-start bg-indigo-50 px-3 py-2 text-left text-sm text-indigo-700 hover:bg-indigo-50"
                        : "flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-zinc-50"
                    }
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      onChange(option);
                      setQuery(option.label);
                      setOpen(false);
                    }}
                  >
                    <span className="font-medium text-zinc-900">{option.label}</span>
                    {option.description ? (
                      <span className="text-xs text-zinc-500">{option.description}</span>
                    ) : null}
                  </button>
                </li>
              ))
            )}
          </ul>
        ) : null}
      </div>
    </FormField>
  );
}
