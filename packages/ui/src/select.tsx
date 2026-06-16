"use client";

import {
  useCallback,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { useFormFieldCtx, type FieldState } from "./form-field";
import { useFloatingPanel } from "./hooks/use-floating-panel";
import { cn } from "./lib/cn";

export type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

const triggerBase =
  "flex w-full items-center gap-2 rounded-lg border bg-white text-sm outline-none transition-all duration-150";

const closedStyles: Record<FieldState, string> = {
  default:
    "border-zinc-200 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500/10",
  error: "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-500/10",
  success:
    "border-emerald-300 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/10",
};

const openedStyles: Record<FieldState, string> = {
  default: "border-indigo-300 ring-2 ring-indigo-500/10",
  error: "border-red-400 ring-2 ring-red-500/10",
  success: "border-emerald-400 ring-2 ring-emerald-500/10",
};

const floatingPanelBase =
  "rounded-xl border border-zinc-200/90 bg-white/95 shadow-xl shadow-zinc-900/[0.08] ring-1 ring-zinc-900/[0.04] backdrop-blur-md";

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden="true"
      className={cn(
        "size-3.5 shrink-0 text-zinc-400 transition-transform duration-150",
        open && "rotate-180",
      )}
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
  onSelect: (value: string) => void;
}) {
  return (
    <div
      role="option"
      aria-selected={selected}
      aria-disabled={option.disabled || undefined}
      onMouseDown={(e) => {
        e.preventDefault();
        if (!option.disabled) onSelect(option.value);
      }}
      className={cn(
        "mx-1 flex cursor-pointer select-none items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-100",
        option.disabled
          ? "cursor-not-allowed text-zinc-300"
          : active
            ? "bg-zinc-50 text-zinc-900"
            : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900",
      )}
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
};

function SelectFloatingPanel({
  open,
  onClose,
  triggerRef,
  panelId,
  ariaLabelledBy,
  className,
  children,
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
      role="listbox"
      aria-labelledby={ariaLabelledBy}
      style={panelStyle}
      className={cn(floatingPanelBase, className)}
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
  placeholder = "Seleccionar…",
  disabled = false,
  state: stateProp,
  id: idProp,
  className,
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
        className={cn(
          triggerBase,
          "h-8 w-full justify-between px-3 text-left disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-400",
          open ? openedStyles[state] : closedStyles[state],
        )}
      >
        <span
          className={cn(
            "truncate",
            selected ? "text-zinc-900" : "text-zinc-400",
          )}
        >
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
        className="max-h-56 overflow-y-auto py-1.5"
      >
        {options.length === 0 ? (
          <EmptyState>Sin opciones disponibles</EmptyState>
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
