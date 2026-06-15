"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { useFormFieldCtx, type FieldState } from "@/components/ui/form-field";
import { IconSearch } from "@/components/ui/icons";
import { useFloatingPanel } from "@/components/ui/use-floating-panel";

// ── Types ─────────────────────────────────────────────────────────────────────

export type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

// ── Shared styles ─────────────────────────────────────────────────────────────

const triggerBase =
  "flex w-full items-center gap-2 rounded-lg border bg-white text-sm outline-none transition-all duration-150";

const closedStyles: Record<FieldState, string> = {
  default: "border-zinc-200 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500/10",
  error:   "border-red-300   focus:border-red-400    focus:ring-2 focus:ring-red-500/10",
  success: "border-emerald-300 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/10",
};

const openedStyles: Record<FieldState, string> = {
  default: "border-indigo-300  ring-2 ring-indigo-500/10",
  error:   "border-red-400     ring-2 ring-red-500/10",
  success: "border-emerald-400 ring-2 ring-emerald-500/10",
};

const floatingPanelBase =
  "rounded-xl border border-zinc-200/90 bg-white/95 shadow-xl shadow-zinc-900/[0.08] ring-1 ring-zinc-900/[0.04] backdrop-blur-md";

// ── Internal shared components ────────────────────────────────────────────────

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden="true"
      className={`size-3.5 shrink-0 text-zinc-400 transition-transform duration-150 ${
        open ? "rotate-180" : ""
      }`}
    >
      <path d="m4 6 4 4 4-4" />
    </svg>
  );
}

function Checkmark() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
      className="size-3.5 shrink-0 text-indigo-600"
    >
      <path
        fillRule="evenodd"
        d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return <p className="px-3 py-2 text-sm text-zinc-400">{children}</p>;
}

function OptionItem({
  option,
  selected,
  active,
  onSelect,
}: {
  option: SelectOption;
  selected: boolean;
  active: boolean;
  onSelect: (v: string) => void;
}) {
  return (
    <div
      role="option"
      aria-selected={selected}
      aria-disabled={option.disabled || undefined}
      onMouseDown={(e) => {
        e.preventDefault(); // keep focus on trigger
        if (!option.disabled) onSelect(option.value);
      }}
      className={`mx-1 flex cursor-pointer select-none items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-100 ${
        option.disabled
          ? "cursor-not-allowed text-zinc-300"
          : active
          ? "bg-zinc-50 text-zinc-900"
          : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
      }`}
    >
      <span className="truncate">{option.label}</span>
      {selected && <Checkmark />}
    </div>
  );
}

type SelectFloatingPanelProps = {
  open: boolean;
  onClose: () => void;
  triggerRef: RefObject<HTMLElement | null>;
  panelId: string;
  ariaLabelledBy: string;
  className?: string;
  children: ReactNode;
  role?: "listbox";
  ariaMultiselectable?: boolean;
};

function SelectFloatingPanel({
  open,
  onClose,
  triggerRef,
  panelId,
  ariaLabelledBy,
  className = "",
  children,
  role,
  ariaMultiselectable,
}: SelectFloatingPanelProps) {
  const { panelRef, panelStyle } = useFloatingPanel({
    open,
    onClose,
    triggerRef,
  });

  if (!open || panelStyle === null) return null;

  return createPortal(
    <div
      ref={panelRef}
      id={panelId}
      role={role}
      aria-labelledby={ariaLabelledBy}
      aria-multiselectable={ariaMultiselectable}
      style={panelStyle}
      className={`${floatingPanelBase} ${className}`}
    >
      {children}
    </div>,
    document.body,
  );
}

function resolveState(
  stateProp: FieldState | undefined,
  ctxState: FieldState | undefined,
): FieldState {
  return stateProp ?? ctxState ?? "default";
}

// ── Select ────────────────────────────────────────────────────────────────────

export type SelectProps = {
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  state?: FieldState;
  id?: string;
  className?: string;
};

export function Select({
  options,
  value,
  onChange,
  placeholder = "Select…",
  disabled = false,
  state: stateProp,
  id: idProp,
  className = "",
}: SelectProps) {
  const ctx = useFormFieldCtx();
  const genId = useId();
  const id = idProp ?? ctx?.id ?? genId;
  const listId = `${id}-list`;
  const state = resolveState(stateProp, ctx?.state);

  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setActiveIdx(-1);
  }, []);

  const selected = options.find((o) => o.value === value);

  function openWith(startValue?: string) {
    if (disabled) return;
    const idx = startValue
      ? options.findIndex((o) => o.value === startValue && !o.disabled)
      : options.findIndex((o) => !o.disabled);
    setActiveIdx(idx >= 0 ? idx : -1);
    setOpen(true);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;

    if (!open) {
      if (["Enter", " ", "ArrowDown", "ArrowUp"].includes(e.key)) {
        e.preventDefault();
        openWith(value);
      }
      return;
    }

    switch (e.key) {
      case "Escape":
        e.preventDefault();
        close();
        break;
      case "ArrowDown": {
        e.preventDefault();
        let next = activeIdx + 1;
        while (next < options.length && options[next]?.disabled) next++;
        if (next < options.length) setActiveIdx(next);
        break;
      }
      case "ArrowUp": {
        e.preventDefault();
        let prev = activeIdx - 1;
        while (prev >= 0 && options[prev]?.disabled) prev--;
        if (prev >= 0) setActiveIdx(prev);
        break;
      }
      case "Enter":
      case " ": {
        e.preventDefault();
        const opt = options[activeIdx];
        if (opt && !opt.disabled) {
          onChange?.(opt.value);
          close();
        }
        break;
      }
      case "Tab":
        close();
        break;
    }
  }

  return (
    <div className={className}>
      <button
        ref={triggerRef}
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => (open ? close() : openWith(value))}
        onKeyDown={handleKeyDown}
        className={`${triggerBase} h-8 w-full justify-between px-3 text-left disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-400 ${
          open ? openedStyles[state] : closedStyles[state]
        }`}
      >
        <span className={`truncate ${selected ? "text-zinc-900" : "text-zinc-400"}`}>
          {selected?.label ?? placeholder}
        </span>
        <Chevron open={open} />
      </button>

      <SelectFloatingPanel
        open={open}
        onClose={close}
        triggerRef={triggerRef}
        panelId={listId}
        ariaLabelledBy={id}
        role="listbox"
        className="max-h-56 overflow-y-auto py-1.5"
      >
        {options.length === 0 ? (
          <EmptyState>No options available</EmptyState>
        ) : (
          options.map((opt, i) => (
            <OptionItem
              key={opt.value}
              option={opt}
              selected={opt.value === value}
              active={i === activeIdx}
              onSelect={(v) => {
                onChange?.(v);
                close();
              }}
            />
          ))
        )}
      </SelectFloatingPanel>
    </div>
  );
}

// ── SearchableSelect ──────────────────────────────────────────────────────────

export type SearchableSelectProps = SelectProps;

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Select…",
  disabled = false,
  state: stateProp,
  id: idProp,
  className = "",
}: SearchableSelectProps) {
  const ctx = useFormFieldCtx();
  const genId = useId();
  const id = idProp ?? ctx?.id ?? genId;
  const listId = `${id}-list`;
  const state = resolveState(stateProp, ctx?.state);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
  }, []);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, [open]);

  const filtered = query
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  const selected = options.find((o) => o.value === value);

  return (
    <div className={className}>
      <button
        ref={triggerRef}
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => !disabled && setOpen((p) => !p)}
        onKeyDown={(e) => {
          if (["Enter", " ", "ArrowDown"].includes(e.key)) {
            e.preventDefault();
            if (!disabled) setOpen(true);
          }
          if (e.key === "Escape") close();
          if (e.key === "Tab") close();
        }}
        className={`${triggerBase} h-8 w-full justify-between px-3 text-left disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-400 ${
          open ? openedStyles[state] : closedStyles[state]
        }`}
      >
        <span className={`truncate ${selected ? "text-zinc-900" : "text-zinc-400"}`}>
          {selected?.label ?? placeholder}
        </span>
        <Chevron open={open} />
      </button>

      <SelectFloatingPanel
        open={open}
        onClose={close}
        triggerRef={triggerRef}
        panelId={`${id}-panel`}
        ariaLabelledBy={id}
      >
        <div className="border-b border-zinc-100 px-2 py-2">
          <div className="relative">
            <IconSearch className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-zinc-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              aria-label="Search options"
              className="h-7 w-full rounded-lg border border-zinc-200 bg-white pl-8 pr-3 text-sm outline-none placeholder:text-zinc-400 transition-all duration-150 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500/10"
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.stopPropagation();
                  close();
                }
              }}
            />
          </div>
        </div>

        <div
          id={listId}
          role="listbox"
          aria-labelledby={id}
          className="max-h-48 overflow-y-auto py-1.5"
        >
          {filtered.length === 0 ? (
            <EmptyState>No results for &ldquo;{query}&rdquo;</EmptyState>
          ) : (
            filtered.map((opt) => (
              <OptionItem
                key={opt.value}
                option={opt}
                selected={opt.value === value}
                active={false}
                onSelect={(v) => {
                  onChange?.(v);
                  close();
                }}
              />
            ))
          )}
        </div>
      </SelectFloatingPanel>
    </div>
  );
}

// ── MultiSelect ───────────────────────────────────────────────────────────────

export type MultiSelectProps = {
  options: SelectOption[];
  value?: string[];
  onChange?: (value: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  state?: FieldState;
  id?: string;
  className?: string;
};

export function MultiSelect({
  options,
  value = [],
  onChange,
  placeholder = "Select…",
  disabled = false,
  state: stateProp,
  id: idProp,
  className = "",
}: MultiSelectProps) {
  const ctx = useFormFieldCtx();
  const genId = useId();
  const id = idProp ?? ctx?.id ?? genId;
  const listId = `${id}-list`;
  const state = resolveState(stateProp, ctx?.state);

  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  const selectedOptions = options.filter((o) => value.includes(o.value));

  function toggle(optValue: string) {
    onChange?.(
      value.includes(optValue)
        ? value.filter((v) => v !== optValue)
        : [...value, optValue],
    );
  }

  return (
    <div className={className}>
      <div
        ref={triggerRef}
        role="button"
        tabIndex={disabled ? -1 : 0}
        id={id}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-disabled={disabled || undefined}
        onClick={() => !disabled && setOpen((p) => !p)}
        onKeyDown={(e) => {
          if (["Enter", " "].includes(e.key)) {
            e.preventDefault();
            if (!disabled) setOpen((p) => !p);
          }
          if (e.key === "Escape") close();
          if (e.key === "Tab") close();
        }}
        className={`${triggerBase} min-h-8 w-full cursor-pointer flex-wrap justify-between px-2.5 py-1.5 ${
          disabled ? "cursor-not-allowed opacity-50 bg-zinc-50" : ""
        } ${open ? openedStyles[state] : closedStyles[state]}`}
      >
        <div className="flex flex-1 flex-wrap gap-1">
          {selectedOptions.length > 0 ? (
            selectedOptions.map((opt) => (
              <span
                key={opt.value}
                className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-1.5 py-0.5 text-xs font-medium text-zinc-700 ring-1 ring-zinc-200/80"
              >
                {opt.label}
                {!disabled && (
                  <button
                    type="button"
                    aria-label={`Remove ${opt.label}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onChange?.(value.filter((v) => v !== opt.value));
                    }}
                    className="ml-0.5 rounded-sm text-zinc-400 transition-colors hover:text-zinc-700"
                  >
                    <svg viewBox="0 0 12 12" fill="currentColor" className="size-2.5" aria-hidden="true">
                      <path d="M6 4.94 2.47 1.41 1.41 2.47 4.94 6 1.41 9.53l1.06 1.06L6 7.06l3.53 3.53 1.06-1.06L7.06 6l3.53-3.53-1.06-1.06L6 4.94Z" />
                    </svg>
                  </button>
                )}
              </span>
            ))
          ) : (
            <span className="text-zinc-400">{placeholder}</span>
          )}
        </div>
        <Chevron open={open} />
      </div>

      <SelectFloatingPanel
        open={open}
        onClose={close}
        triggerRef={triggerRef}
        panelId={listId}
        ariaLabelledBy={id}
        role="listbox"
        ariaMultiselectable
        className="max-h-56 overflow-y-auto py-1.5"
      >
        {options.length === 0 ? (
          <EmptyState>No options available</EmptyState>
        ) : (
          options.map((opt) => (
            <OptionItem
              key={opt.value}
              option={opt}
              selected={value.includes(opt.value)}
              active={false}
              onSelect={toggle}
            />
          ))
        )}
      </SelectFloatingPanel>
    </div>
  );
}
