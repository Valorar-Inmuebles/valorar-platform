"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { useFormFieldCtx, type FieldState } from "./form-field";
import { useFloatingPanel } from "./hooks/use-floating-panel";
import { cn } from "./lib/cn";
import {
  firstEnabledIndex,
  lastEnabledIndex,
  nextEnabledIndex,
} from "./lib/list-navigation";

export type SearchComboboxOption = {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
};

export type SearchComboboxProps = {
  value: SearchComboboxOption | null;
  onChange: (option: SearchComboboxOption | null) => void;
  loadOptions: (
    query: string,
    signal: AbortSignal,
  ) => Promise<SearchComboboxOption[]>;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  loadingMessage?: string;
  minQueryLength?: number;
  debounceMs?: number;
  disabled?: boolean;
  clearable?: boolean;
  state?: FieldState;
  id?: string;
  className?: string;
};

function Spinner() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="size-4 animate-spin"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="42 14"
      />
    </svg>
  );
}

export function SearchCombobox({
  value,
  onChange,
  loadOptions,
  placeholder = "Buscar…",
  searchPlaceholder = "Escribí para buscar",
  emptyMessage = "Sin resultados",
  loadingMessage = "Buscando…",
  minQueryLength = 1,
  debounceMs = 300,
  disabled = false,
  clearable = true,
  state: stateProp,
  id: idProp,
  className,
}: SearchComboboxProps) {
  const field = useFormFieldCtx();
  const generatedId = useId();
  const id = idProp ?? field?.id ?? generatedId;
  const listId = `${id}-results`;
  const state = stateProp ?? field?.state ?? "default";
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value?.label ?? "");
  const [options, setOptions] = useState<SearchComboboxOption[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const { panelRef, panelStyle } = useFloatingPanel({
    open,
    onClose: () => setOpen(false),
    triggerRef: wrapperRef,
  });

  useEffect(() => {
    if (!open || query.trim().length < minQueryLength) {
      setOptions([]);
      setActiveIndex(-1);
      setLoading(false);
      setError(false);
      return;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      setLoading(true);
      setError(false);
      void loadOptions(query.trim(), controller.signal)
        .then((result) => {
          if (controller.signal.aborted) return;
          setOptions(result);
          setActiveIndex(
            firstEnabledIndex(result.map((option) => !!option.disabled)),
          );
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setOptions([]);
            setActiveIndex(-1);
            setError(true);
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, debounceMs);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [debounceMs, loadOptions, minQueryLength, open, query]);

  useEffect(() => {
    if (!open) setQuery(value?.label ?? "");
  }, [open, value]);

  const disabledOptions = options.map((option) => !!option.disabled);
  const activeOptionId =
    activeIndex >= 0 ? `${listId}-option-${activeIndex}` : undefined;

  function selectOption(option: SearchComboboxOption) {
    if (option.disabled) return;
    onChange(option);
    setQuery(option.label);
    setOpen(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (disabled) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      setActiveIndex((current) => {
        if (current < 0) {
          return event.key === "ArrowDown"
            ? firstEnabledIndex(disabledOptions)
            : lastEnabledIndex(disabledOptions);
        }
        return nextEnabledIndex(
          current,
          event.key === "ArrowDown" ? 1 : -1,
          disabledOptions,
        );
      });
      return;
    }
    if (event.key === "Enter" && open) {
      const option = options[activeIndex];
      if (option && !option.disabled) {
        event.preventDefault();
        selectOption(option);
      }
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      setQuery(value?.label ?? "");
    }
  }

  const borderState = {
    default:
      "border-border focus-within:border-primary/40 focus-within:ring-primary/10",
    error:
      "border-red-300 focus-within:border-red-400 focus-within:ring-red-500/10",
    success:
      "border-emerald-300 focus-within:border-emerald-400 focus-within:ring-emerald-500/10",
  }[state];

  return (
    <div ref={wrapperRef} className={cn("relative", className)}>
      <div
        className={cn(
          "flex h-8 items-center rounded-lg border bg-surface ring-0 transition-all focus-within:ring-2",
          borderState,
          disabled && "cursor-not-allowed bg-surface-alt opacity-60",
        )}
      >
        <input
          ref={inputRef}
          id={id}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={activeOptionId}
          aria-invalid={state === "error" || undefined}
          disabled={disabled}
          value={query}
          placeholder={placeholder}
          autoComplete="off"
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            if (value && event.target.value !== value.label) onChange(null);
            setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          className="min-w-0 flex-1 bg-transparent px-3 text-sm text-foreground outline-none placeholder:text-muted"
        />
        {loading ? (
          <span className="mr-2 text-muted" aria-label={loadingMessage}>
            <Spinner />
          </span>
        ) : null}
        {clearable && value && !disabled ? (
          <button
            type="button"
            aria-label="Limpiar selección"
            onClick={() => {
              onChange(null);
              setQuery("");
              setOptions([]);
              setOpen(true);
              inputRef.current?.focus();
            }}
            className="mr-1 flex size-6 items-center justify-center rounded text-muted hover:bg-surface-alt hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            ×
          </button>
        ) : null}
      </div>

      {open && panelStyle
        ? createPortal(
            <div
              ref={panelRef}
              id={listId}
              role="listbox"
              aria-label="Resultados de búsqueda"
              style={panelStyle}
              className="max-h-64 overflow-y-auto rounded-xl border border-border bg-surface py-1.5 shadow-xl"
            >
              {query.trim().length < minQueryLength ? (
                <p className="px-3 py-2 text-sm text-muted">
                  {searchPlaceholder}
                </p>
              ) : loading ? (
                <p className="px-3 py-2 text-sm text-muted" aria-live="polite">
                  {loadingMessage}
                </p>
              ) : error ? (
                <p className="px-3 py-2 text-sm text-red-600" role="alert">
                  No se pudo realizar la búsqueda
                </p>
              ) : options.length === 0 ? (
                <p className="px-3 py-2 text-sm text-muted">{emptyMessage}</p>
              ) : (
                options.map((option, index) => (
                  <button
                    key={option.value}
                    id={`${listId}-option-${index}`}
                    type="button"
                    role="option"
                    aria-selected={option.value === value?.value}
                    aria-disabled={option.disabled || undefined}
                    disabled={option.disabled}
                    onMouseEnter={() => setActiveIndex(index)}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectOption(option)}
                    className={cn(
                      "flex w-full flex-col gap-0.5 px-3 py-2 text-left outline-none",
                      index === activeIndex && "bg-surface-alt",
                      option.disabled
                        ? "cursor-not-allowed opacity-40"
                        : "hover:bg-surface-alt",
                    )}
                  >
                    <span className="text-sm font-medium text-foreground">
                      {option.label}
                    </span>
                    {option.description ? (
                      <span className="text-xs text-muted">
                        {option.description}
                      </span>
                    ) : null}
                  </button>
                ))
              )}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
