"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { useFormFieldCtx } from "./form-field";
import { useFloatingPanel } from "./hooks/use-floating-panel";
import { Input, type InputProps } from "./input";
import {
  addDays,
  addMonths,
  buildCalendarMonth,
  daysInMonth,
  formatDateOnly,
  isDateOnlyInRange,
  parseIsoDateOnly,
  parseLocalizedDate,
  todayDateOnly,
  toIsoDateOnly,
  type DateOnlyParts,
} from "./lib/date-only";
import { cn } from "./lib/cn";

const WEEKDAYS = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];

export type DatePickerProps = Omit<
  InputProps,
  "value" | "onChange" | "type" | "min" | "max"
> & {
  value: string;
  onChange: (isoDate: string) => void;
  min?: string;
  max?: string;
  containerClassName?: string;
};

function monthLabel(parts: DateOnlyParts): string {
  const label = new Intl.DateTimeFormat("es-AR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(parts.year, parts.month - 1, 1)));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function CalendarIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
      className="size-4"
    >
      <path d="M5.5 2.5v3M14.5 2.5v3M3 7.5h14M4.5 4h11A1.5 1.5 0 0 1 17 5.5v10a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 15.5v-10A1.5 1.5 0 0 1 4.5 4Z" />
    </svg>
  );
}

function Chevron({ direction }: { direction: "previous" | "next" }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden="true"
      className={cn("size-4", direction === "next" && "rotate-180")}
    >
      <path d="m10 3-5 5 5 5" />
    </svg>
  );
}

export function DatePicker({
  value,
  onChange,
  onBlur,
  onFocus,
  min,
  max,
  disabled,
  id: idProp,
  className,
  containerClassName,
  ...props
}: DatePickerProps) {
  const field = useFormFieldCtx();
  const generatedId = useId();
  const id = idProp ?? field?.id ?? generatedId;
  const panelId = `${id}-calendar`;
  const triggerRef = useRef<HTMLDivElement>(null);
  const calendarButtonRef = useRef<HTMLButtonElement>(null);
  const editingRef = useRef(false);
  const [display, setDisplay] = useState(() => formatDateOnly(value));
  const [open, setOpen] = useState(false);
  const selected = parseIsoDateOnly(value);
  const today = toIsoDateOnly(todayDateOnly());
  const baseIso = value || today;
  const initialIso =
    min && baseIso < min ? min : max && baseIso > max ? max : baseIso;
  const initial = parseIsoDateOnly(initialIso) ?? todayDateOnly();
  const [visibleMonth, setVisibleMonth] = useState<DateOnlyParts>({
    ...initial,
    day: 1,
  });
  const [activeDate, setActiveDate] = useState(selected ? value : initialIso);
  const { panelRef, panelStyle } = useFloatingPanel({
    open,
    onClose: () => setOpen(false),
    triggerRef,
  });

  useEffect(() => {
    if (!editingRef.current) setDisplay(formatDateOnly(value));
    const parts = parseIsoDateOnly(value);
    if (parts) {
      setVisibleMonth({ ...parts, day: 1 });
      setActiveDate(value);
    }
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      panelRef.current
        ?.querySelector<HTMLButtonElement>(`[data-date="${activeDate}"]`)
        ?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [activeDate, open, panelRef, visibleMonth]);

  const days = useMemo(
    () => buildCalendarMonth(visibleMonth.year, visibleMonth.month),
    [visibleMonth],
  );

  function selectDate(iso: string) {
    if (!isDateOnlyInRange(iso, min, max)) return;
    onChange(iso);
    setDisplay(formatDateOnly(iso));
    setOpen(false);
  }

  function moveActive(amount: number) {
    const current = parseIsoDateOnly(activeDate) ?? initial;
    const next = addDays(current, amount);
    const iso = toIsoDateOnly(next);
    if (!isDateOnlyInRange(iso, min, max)) return;
    setActiveDate(iso);
    setVisibleMonth({ ...next, day: 1 });
  }

  function handleCalendarKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const movements: Partial<Record<string, number>> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
    };
    const movement = movements[event.key];
    if (movement !== undefined) {
      event.preventDefault();
      moveActive(movement);
      return;
    }
    if (event.key === "PageUp" || event.key === "PageDown") {
      event.preventDefault();
      const current = parseIsoDateOnly(activeDate) ?? initial;
      const next = addMonths(current, event.key === "PageUp" ? -1 : 1);
      const iso = toIsoDateOnly(next);
      if (isDateOnlyInRange(iso, min, max)) {
        setActiveDate(iso);
        setVisibleMonth({ ...next, day: 1 });
      }
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectDate(activeDate);
    }
  }

  const canShowMonth = (parts: DateOnlyParts) => {
    const start = toIsoDateOnly({ ...parts, day: 1 });
    const end = toIsoDateOnly({
      ...parts,
      day: daysInMonth(parts.year, parts.month),
    });
    return (!min || end >= min) && (!max || start <= max);
  };

  const changeMonth = (amount: number) => {
    const next = addMonths(visibleMonth, amount);
    if (!canShowMonth(next)) return;
    setVisibleMonth({ ...next, day: 1 });
    const candidate = toIsoDateOnly({
      ...next,
      day: Math.min(
        parseIsoDateOnly(activeDate)?.day ?? 1,
        new Date(Date.UTC(next.year, next.month, 0)).getUTCDate(),
      ),
    });
    if (isDateOnlyInRange(candidate, min, max)) setActiveDate(candidate);
  };

  return (
    <div ref={triggerRef} className={cn("relative", containerClassName)}>
      <Input
        {...props}
        id={id}
        type="text"
        inputMode="numeric"
        placeholder="DD/MM/AAAA"
        value={display}
        maxLength={10}
        disabled={disabled}
        className={cn("pr-10", className)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        onChange={(event) => {
          const digits = event.target.value.replace(/\D/g, "").slice(0, 8);
          const formatted = [
            digits.slice(0, 2),
            digits.slice(2, 4),
            digits.slice(4, 8),
          ]
            .filter(Boolean)
            .join("/");
          setDisplay(formatted);
          const iso = parseLocalizedDate(formatted);
          onChange(iso && isDateOnlyInRange(iso, min, max) ? iso : "");
        }}
        onFocus={(event) => {
          editingRef.current = true;
          onFocus?.(event);
        }}
        onBlur={(event) => {
          editingRef.current = false;
          setDisplay(formatDateOnly(value));
          onBlur?.(event);
        }}
      />
      <button
        ref={calendarButtonRef}
        type="button"
        disabled={disabled}
        aria-label="Abrir calendario"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          if (!disabled) setOpen((current) => !current);
        }}
        className="absolute inset-y-0 right-0 flex w-9 items-center justify-center rounded-r-lg text-muted outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <CalendarIcon />
      </button>

      {open && panelStyle
        ? createPortal(
            <div
              ref={panelRef}
              id={panelId}
              role="dialog"
              aria-label="Elegir fecha"
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.stopPropagation();
                  setOpen(false);
                  requestAnimationFrame(() =>
                    calendarButtonRef.current?.focus(),
                  );
                }
              }}
              style={{
                ...panelStyle,
                left: Math.max(
                  8,
                  Math.min(
                    Number(panelStyle.left ?? 0),
                    window.innerWidth - 304,
                  ),
                ),
                width: 296,
              }}
              className="rounded-xl border border-border bg-surface p-3 text-foreground shadow-xl"
            >
              <div className="mb-3 flex items-center justify-between">
                <button
                  type="button"
                  aria-label="Mes anterior"
                  disabled={!canShowMonth(addMonths(visibleMonth, -1))}
                  onClick={() => changeMonth(-1)}
                  className="flex size-8 items-center justify-center rounded-md text-muted hover:bg-surface-alt hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <Chevron direction="previous" />
                </button>
                <p aria-live="polite" className="text-sm font-semibold">
                  {monthLabel(visibleMonth)}
                </p>
                <button
                  type="button"
                  aria-label="Mes siguiente"
                  disabled={!canShowMonth(addMonths(visibleMonth, 1))}
                  onClick={() => changeMonth(1)}
                  className="flex size-8 items-center justify-center rounded-md text-muted hover:bg-surface-alt hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <Chevron direction="next" />
                </button>
              </div>
              <div className="grid grid-cols-7" aria-hidden="true">
                {WEEKDAYS.map((weekday) => (
                  <span
                    key={weekday}
                    className="py-1 text-center text-xs font-medium text-muted"
                  >
                    {weekday}
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-7" role="grid">
                {days.map((day) => {
                  const unavailable = !isDateOnlyInRange(day.iso, min, max);
                  const isSelected = day.iso === value;
                  const isActive = day.iso === activeDate;
                  return (
                    <button
                      key={day.iso}
                      type="button"
                      role="gridcell"
                      data-date={day.iso}
                      tabIndex={isActive ? 0 : -1}
                      disabled={unavailable}
                      aria-selected={isSelected}
                      aria-label={formatDateOnly(day.iso)}
                      onFocus={() => setActiveDate(day.iso)}
                      onClick={() => selectDate(day.iso)}
                      onKeyDown={handleCalendarKeyDown}
                      className={cn(
                        "flex size-9 items-center justify-center rounded-md text-sm outline-none hover:bg-surface-alt focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-30",
                        !day.inCurrentMonth && "text-muted",
                        isSelected &&
                          "bg-primary text-primary-foreground hover:bg-primary",
                      )}
                    >
                      {day.day}
                    </button>
                  );
                })}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
