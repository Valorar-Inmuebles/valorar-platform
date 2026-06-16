"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ── Date utilities ─────────────────────────────────────────────────────────────

const DATE_LOCALE = "es-AR";

/** Lunes … domingo (semana ISO). Base: 1 ene 2024 = lunes. */
const WEEKDAYS = Array.from({ length: 7 }, (_, i) => {
  const label = new Intl.DateTimeFormat(DATE_LOCALE, { weekday: "short" }).format(
    new Date(2024, 0, 1 + i),
  );
  return label.replace(/\.$/, "");
});

function formatMonthYear(year: number, month: number): string {
  const label = new Intl.DateTimeFormat(DATE_LOCALE, {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month, 1));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

// Returns 0=Mon … 6=Sun (ISO week start)
function getFirstISOWeekday(year: number, month: number): number {
  return (new Date(year, month, 1).getDay() + 6) % 7;
}

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

function formatDate(date: Date): string {
  return date.toLocaleDateString(DATE_LOCALE, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatRange(from?: Date, to?: Date): string | undefined {
  if (!from) return undefined;
  if (!to) return formatDate(from);
  const sameYear = from.getFullYear() === to.getFullYear();
  const sameMonth = sameYear && from.getMonth() === to.getMonth();
  if (sameMonth) {
    return `${from.toLocaleDateString(DATE_LOCALE, { month: "short", day: "numeric" })} – ${to.getDate()}, ${to.getFullYear()}`;
  }
  if (sameYear) {
    return `${from.toLocaleDateString(DATE_LOCALE, { month: "short", day: "numeric" })} – ${to.toLocaleDateString(DATE_LOCALE, { month: "short", day: "numeric" })}, ${to.getFullYear()}`;
  }
  return `${formatDate(from)} – ${formatDate(to)}`;
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

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

// ── Shared trigger styles ─────────────────────────────────────────────────────

const triggerBase =
  "flex w-full items-center justify-between gap-2 rounded-lg border bg-white text-sm outline-none transition-all duration-150 h-8 px-3 text-left disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-400";
const closedStyle =
  "border-zinc-200 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500/10";
const openedStyle = "border-indigo-300 ring-2 ring-indigo-500/10";

// ── Icons ─────────────────────────────────────────────────────────────────────

function CalendarIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-3.5 shrink-0 text-zinc-400"
      aria-hidden="true"
    >
      <rect x="2" y="3" width="12" height="11" rx="1.5" />
      <path d="M5 1.5v2.5M11 1.5v2.5M2 7h12" />
    </svg>
  );
}

function ChevronLeft() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      className="size-3.5"
      aria-hidden="true"
    >
      <path d="m10 4-4 4 4 4" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      className="size-3.5"
      aria-hidden="true"
    >
      <path d="m6 4 4 4-4 4" />
    </svg>
  );
}

// ── Dropdown panel ─────────────────────────────────────────────────────────────

export function DropdownPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute left-0 top-full z-50 mt-1.5 rounded-xl border border-zinc-200/90 bg-white/95 shadow-xl shadow-zinc-900/[0.08] ring-1 ring-zinc-900/[0.04] backdrop-blur-md">
      {children}
    </div>
  );
}

// ── Calendar month grid ────────────────────────────────────────────────────────

type RenderDayFn = (date: Date) => React.ReactNode;

type CalendarMonthProps = {
  year: number;
  month: number;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  renderDay: RenderDayFn;
};

export function CalendarMonth({
  year,
  month,
  onPrevMonth,
  onNextMonth,
  renderDay,
}: CalendarMonthProps) {
  const daysInMonth = getDaysInMonth(year, month);
  const offset = getFirstISOWeekday(year, month);

  const cells: (Date | null)[] = [
    ...Array<null>(offset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="w-64 p-3">
      {/* Month navigation */}
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={onPrevMonth}
          aria-label="Mes anterior"
          className="flex size-6 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
        >
          <ChevronLeft />
        </button>
        <span className="text-xs font-semibold text-zinc-700">
          {formatMonthYear(year, month)}
        </span>
        <button
          type="button"
          onClick={onNextMonth}
          aria-label="Mes siguiente"
          className="flex size-6 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
        >
          <ChevronRight />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="mb-1 grid grid-cols-7 text-center">
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-[10px] font-medium text-zinc-400">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells — no wrapper so renderDay controls full cell layout */}
      <div className="grid grid-cols-7">
        {cells.map((date, i) =>
          date ? (
            <div key={i}>{renderDay(date)}</div>
          ) : (
            <div key={i} className="h-8" />
          ),
        )}
      </div>
    </div>
  );
}

// ── DatePicker ─────────────────────────────────────────────────────────────────

export type DatePickerProps = {
  value?: Date;
  onChange?: (date: Date) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date…",
  disabled = false,
  className = "",
}: DatePickerProps) {
  const today = new Date();
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(value?.getFullYear() ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(value?.getMonth() ?? today.getMonth());
  const rootRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);
  useOutsideClose(rootRef, close, open);

  function prevMonth() {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((p) => !p)}
        onKeyDown={(e) => e.key === "Escape" && close()}
        className={`${triggerBase} ${open ? openedStyle : closedStyle}`}
      >
        <span className={value ? "text-zinc-900" : "text-zinc-400"}>
          {value ? formatDate(value) : placeholder}
        </span>
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
              const isSelected = value ? isSameDay(date, value) : false;
              const isCurrentDay = isToday(date);
              return (
                <div className="flex items-center justify-center py-0.5">
                  <button
                    type="button"
                    onClick={() => { onChange?.(date); close(); }}
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

// ── DateRangePicker ────────────────────────────────────────────────────────────

export type DateRange = {
  from?: Date;
  to?: Date;
};

export type DateRangePickerProps = {
  value?: DateRange;
  onChange?: (range: DateRange) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

export function DateRangePicker({
  value,
  onChange,
  placeholder = "Pick a range…",
  disabled = false,
  className = "",
}: DateRangePickerProps) {
  const today = new Date();
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(
    value?.from?.getFullYear() ?? today.getFullYear(),
  );
  const [viewMonth, setViewMonth] = useState(
    value?.from?.getMonth() ?? today.getMonth(),
  );
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setHoverDate(null);
  }, []);
  useOutsideClose(rootRef, close, open);

  // True when start is chosen and we're waiting for the end date
  const isPickingEnd = !!(value?.from && !value?.to);

  // Effective range for highlight — includes hover preview when picking end
  const displayFrom = value?.from;
  const displayTo: Date | undefined =
    value?.to ??
    (isPickingEnd && hoverDate && hoverDate >= (value!.from as Date)
      ? hoverDate
      : undefined);

  function prevMonth() {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
  }

  function handleDayClick(date: Date) {
    if (!isPickingEnd) {
      // Start a new selection
      onChange?.({ from: date, to: undefined });
    } else {
      const from = value!.from!;
      if (date < from) {
        onChange?.({ from: date, to: from });
      } else {
        onChange?.({ from, to: date });
      }
      close();
    }
  }

  const displayLabel = formatRange(value?.from, value?.to);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((p) => !p)}
        onKeyDown={(e) => e.key === "Escape" && close()}
        className={`${triggerBase} ${open ? openedStyle : closedStyle}`}
      >
        <span className={displayLabel ? "text-zinc-900" : "text-zinc-400"}>
          {displayLabel ?? placeholder}
        </span>
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
              const isStart = displayFrom ? isSameDay(date, displayFrom) : false;
              const isEnd = displayTo ? isSameDay(date, displayTo) : false;
              const hasRange = !!(displayFrom && displayTo);
              const inRange =
                hasRange ? date > displayFrom! && date < displayTo! : false;
              const isSelected = isStart || isEnd;
              const isCurrentDay = isToday(date);

              // Strip background: connects start → in-range → end
              let stripSide = "";
              if (hasRange && !isSameDay(displayFrom!, displayTo!)) {
                if (isStart) stripSide = "left-1/2 right-0";
                else if (isEnd) stripSide = "left-0 right-1/2";
                else if (inRange) stripSide = "inset-x-0";
              }

              return (
                <div
                  className="relative flex w-full items-center justify-center py-0.5"
                  onMouseEnter={() => setHoverDate(date)}
                  onMouseLeave={() => setHoverDate(null)}
                >
                  {stripSide && (
                    <div
                      className={`absolute inset-y-0.5 bg-indigo-50 ${stripSide}`}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => handleDayClick(date)}
                    className={`relative z-10 size-7 rounded-md text-xs transition-colors duration-100 ${
                      isSelected
                        ? "bg-indigo-600 font-semibold text-white"
                        : inRange
                        ? "text-zinc-900 hover:bg-indigo-100"
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
          {isPickingEnd && (
            <div className="border-t border-zinc-100 px-3 pb-2.5 pt-2 text-[11px] text-zinc-400">
              Select an end date
            </div>
          )}
        </DropdownPanel>
      )}
    </div>
  );
}
