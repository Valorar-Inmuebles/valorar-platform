"use client";

import { useEffect, useId, useRef, useState } from "react";

export type FilterOption = {
  value: string;
  label: string;
};

type FilterOptionComboboxProps = {
  value: string;
  onChange: (value: string) => void;
  options: FilterOption[];
  allowClear?: boolean;
  clearLabel?: string;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  ariaLabel?: string;
};

export function FilterOptionCombobox({
  value,
  onChange,
  options,
  allowClear = true,
  clearLabel = "Cualquiera",
  disabled = false,
  placeholder = "Seleccionar…",
  className = "",
  inputClassName = "",
  ariaLabel,
}: FilterOptionComboboxProps) {
  const listId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    setQuery(selected?.label ?? "");
  }, [selected?.label]);

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
    ? options.filter((option) =>
        option.label.toLowerCase().includes(normalizedQuery),
      )
    : options;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <input
        type="text"
        value={query}
        placeholder={placeholder}
        disabled={disabled}
        aria-label={ariaLabel}
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
                {clearLabel}
              </button>
            </li>
          ) : null}
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted">Sin resultados</li>
          ) : (
            filtered.map((option) => (
              <li key={option.value || option.label}>
                <button
                  type="button"
                  className="flex w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-surface-alt"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    onChange(option.value);
                    setQuery(option.label);
                    setOpen(false);
                  }}
                >
                  {option.label}
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
