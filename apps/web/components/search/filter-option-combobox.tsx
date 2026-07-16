"use client";

import type { LucideIcon } from "lucide-react";
import { Check } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

export type FilterOption = {
  value: string;
  label: string;
  icon?: LucideIcon;
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

const OPTION_BASE =
  "flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors";
const OPTION_IDLE = "text-text-primary hover:bg-surface-alt";
const OPTION_SELECTED = "bg-brand-green/10 font-medium text-brand-green";

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
  const isClearSelected = allowClear && !value;

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
          role="listbox"
          className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-border-default bg-surface-card py-1 shadow-lg"
        >
          {allowClear ? (
            <li role="option" aria-selected={isClearSelected}>
              <button
                type="button"
                className={`${OPTION_BASE} ${
                  isClearSelected ? OPTION_SELECTED : "text-muted hover:bg-surface-alt"
                }`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange("");
                  setQuery("");
                  setOpen(false);
                }}
              >
                <span>{clearLabel}</span>
                {isClearSelected ? (
                  <Check size={16} strokeWidth={2} className="shrink-0" aria-hidden />
                ) : null}
              </button>
            </li>
          ) : null}
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted">Sin resultados</li>
          ) : (
            filtered.map((option) => {
              const isSelected = option.value === value;
              const OptionIcon = option.icon;

              return (
                <li
                  key={option.value || option.label}
                  role="option"
                  aria-selected={isSelected}
                >
                  <button
                    type="button"
                    className={`${OPTION_BASE} ${
                      isSelected ? OPTION_SELECTED : OPTION_IDLE
                    }`}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      onChange(option.value);
                      setQuery(option.label);
                      setOpen(false);
                    }}
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      {OptionIcon ? (
                        <OptionIcon
                          size={16}
                          strokeWidth={1.75}
                          className="shrink-0"
                          aria-hidden
                        />
                      ) : null}
                      <span className="truncate">{option.label}</span>
                    </span>
                    {isSelected ? (
                      <Check size={16} strokeWidth={2} className="shrink-0" aria-hidden />
                    ) : null}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      ) : null}
    </div>
  );
}
