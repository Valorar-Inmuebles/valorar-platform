"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DateInput } from "@/components/ui/date-input";
import type { InputState } from "@/components/ui/input";
import { CalendarMonth, DropdownPanel } from "@/components/ui/date-picker";

// ── Helpers ────────────────────────────────────────────────────────────────────

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

function isoToDate(iso: string): Date | undefined {
  const [yyyy, mm, dd] = iso.split("-");
  if (!yyyy || !mm || !dd) return undefined;
  const d = new Date(+yyyy, +mm - 1, +dd);
  return isNaN(d.getTime()) ? undefined : d;
}

function dateToIso(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function useOutsideClose(
  ref: React.RefObject<HTMLElement | null>,
  close: () => void,
  enabled: boolean,
) {
  useEffect(() => {
    if (!enabled) return;
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) close();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ref, close, enabled]);
}

// ── Icon ───────────────────────────────────────────────────────────────────────

function CalendarIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-3.5 shrink-0"
      aria-hidden="true"
    >
      <rect x="2" y="3" width="12" height="11" rx="1.5" />
      <path d="M5 1.5v2.5M11 1.5v2.5M2 7h12" />
    </svg>
  );
}

// ── Component ──────────────────────────────────────────────────────────────────

/**
 * Date input with integrated calendar picker.
 *
 * Combines DateInput's manual masked entry (dd/mm/aaaa) with a clickable
 * calendar icon that opens a date picker dropdown. Both modes stay in sync.
 *
 * Display: "25/03/1985"  |  Stored value: "1985-03-25" (ISO 8601)
 *
 * Always compose with FormField + Label + ErrorMessage:
 *
 *   <FormField state={fieldState.error ? "error" : "default"}>
 *     <Label>Fecha de nacimiento</Label>
 *     <DateInputPicker value={field.value} onChange={field.onChange} onBlur={field.onBlur} />
 *     {fieldState.error && <ErrorMessage>{fieldState.error.message}</ErrorMessage>}
 *   </FormField>
 */

export type DateInputPickerProps = {
  /** ISO date string "YYYY-MM-DD". Undefined represents an empty field. */
  value?: string;
  /**
   * Emits an ISO date string when the date is complete and valid,
   * or undefined when the field is cleared.
   */
  onChange?: (value: string | undefined) => void;
  onBlur?: () => void;
  state?: InputState;
  disabled?: boolean;
  id?: string;
  className?: string;
};

export function DateInputPicker({
  value,
  onChange,
  onBlur,
  state,
  disabled,
  id,
  className = "",
}: DateInputPickerProps) {
  const today = new Date();
  const selected = value ? isoToDate(value) : undefined;

  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const rootRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useOutsideClose(rootRef, close, open);

  function openPicker() {
    if (disabled) return;
    // Navigate to the selected date's month when opening
    if (selected) {
      setViewYear(selected.getFullYear());
      setViewMonth(selected.getMonth());
    }
    setOpen((p) => !p);
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
  }

  function handleDaySelect(date: Date) {
    onChange?.(dateToIso(date));
    onBlur?.();
    close();
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      {/* !pr-8 overrides Input's default pr-3 to make room for the calendar button */}
      <DateInput
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        state={state}
        disabled={disabled}
        id={id}
        className="!pr-8"
      />

      <button
        type="button"
        tabIndex={-1}
        disabled={disabled}
        onMouseDown={(e) => e.preventDefault()}
        onClick={openPicker}
        aria-label="Abrir calendario"
        className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-zinc-400 transition-colors hover:text-zinc-600 disabled:pointer-events-none"
      >
        <CalendarIcon />
      </button>

      {open && (
        <DropdownPanel>
          <CalendarMonth
            year={viewYear}
            month={viewMonth}
            onPrevMonth={prevMonth}
            onNextMonth={nextMonth}
            renderDay={(date) => {
              const isSelected = selected ? isSameDay(date, selected) : false;
              const isCurrentDay = isToday(date);
              return (
                <div className="flex items-center justify-center py-0.5">
                  <button
                    type="button"
                    onClick={() => handleDaySelect(date)}
                    className={`size-7 rounded-md text-xs transition-colors duration-100 ${
                      isSelected
                        ? "bg-indigo-600 font-semibold text-white"
                        : isCurrentDay
                        ? "font-semibold text-indigo-600 hover:bg-zinc-100"
                        : "text-zinc-700 hover:bg-zinc-100"
                    }`}
                  >
                    {date.getDate()}
                  </button>
                </div>
              );
            }}
          />
        </DropdownPanel>
      )}
    </div>
  );
}
