"use client";

import type { LucideIcon } from "lucide-react";
import { Check, ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

export type FilterSelectOption = {
  value: string;
  label: string;
  icon?: LucideIcon;
};

type FilterOptionSelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: FilterSelectOption[];
  allowClear?: boolean;
  clearLabel?: string;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  ariaLabel?: string;
};

const OPTION_BASE =
  "flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors";
const OPTION_IDLE = "text-text-primary hover:bg-surface-alt";
const OPTION_SELECTED = "bg-brand-green/10 font-medium text-brand-green";

export function FilterOptionSelect({
  value,
  onChange,
  options,
  allowClear = true,
  clearLabel = "Cualquiera",
  disabled = false,
  placeholder = "Seleccionar…",
  className = "",
  triggerClassName = "",
  ariaLabel,
}: FilterOptionSelectProps) {
  const listId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const selected = options.find((option) => option.value === value);
  const isClearSelected = allowClear && !value;
  const displayLabel = selected?.label ?? (isClearSelected ? clearLabel : placeholder);
  const SelectedIcon = selected?.icon;

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((current) => !current)}
        className={`flex items-center justify-between gap-2 text-left ${triggerClassName}`}
      >
        <span className="flex min-w-0 items-center gap-2.5">
          {SelectedIcon ? (
            <SelectedIcon
              size={16}
              strokeWidth={1.75}
              className="shrink-0 text-text-secondary"
              aria-hidden
            />
          ) : null}
          <span
            className={`truncate ${
              selected || isClearSelected ? "text-text-primary" : "text-muted"
            }`}
          >
            {displayLabel}
          </span>
        </span>
        <ChevronDown
          size={16}
          strokeWidth={2}
          aria-hidden
          className={`shrink-0 text-text-secondary transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

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
                onClick={() => {
                  onChange("");
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
          {options.map((option) => {
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
                  onClick={() => {
                    onChange(option.value);
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
          })}
        </ul>
      ) : null}
    </div>
  );
}
