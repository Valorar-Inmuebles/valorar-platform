"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getCountries, getCountryCallingCode, type CountryCode } from "libphonenumber-js";

// ── Data ──────────────────────────────────────────────────────────────────────

const PRIORITY_ISOS: CountryCode[] = [
  "AR", "BR", "UY", "CL", "PY", "BO", "US", "ES", "MX",
];

const displayNames = new Intl.DisplayNames(["es"], { type: "region" });

type CountryOption = {
  iso: CountryCode;
  name: string;
  callingCode: string;
};

function toOption(iso: CountryCode): CountryOption {
  return {
    iso,
    name: displayNames.of(iso) ?? iso,
    callingCode: getCountryCallingCode(iso),
  };
}

const PRIORITY_OPTIONS: CountryOption[] = PRIORITY_ISOS.map(toOption);

const OTHER_OPTIONS: CountryOption[] = (getCountries() as CountryCode[])
  .filter((iso) => !PRIORITY_ISOS.includes(iso))
  .map(toOption)
  .sort((a, b) => a.name.localeCompare(b.name, "es"));

function filterList(list: CountryOption[], q: string): CountryOption[] {
  const norm = q.toLowerCase().replace(/^\+/, "");
  return list.filter(
    (o) =>
      o.iso.toLowerCase().includes(norm) ||
      o.name.toLowerCase().includes(norm) ||
      o.callingCode.includes(norm),
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

type Props = {
  value: string;
  onChange: (iso: string) => void;
};

export function PhoneCountrySelect({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, close]);

  // Auto-focus search input when dropdown opens
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, [open]);

  const selected = toOption((value || "AR") as CountryCode);

  const q = query.trim();
  const filteredPriority = q ? filterList(PRIORITY_OPTIONS, q) : PRIORITY_OPTIONS;
  const filteredOthers = filterList(OTHER_OPTIONS, q);
  const showSeparator = filteredPriority.length > 0 && filteredOthers.length > 0;
  const isEmpty = filteredPriority.length === 0 && filteredOthers.length === 0;

  return (
    <div ref={rootRef} className="relative">

      {/* Trigger */}
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((p) => !p)}
        onKeyDown={(e) => {
          if (["Enter", " ", "ArrowDown"].includes(e.key)) {
            e.preventDefault();
            setOpen(true);
          }
          if (e.key === "Escape") close();
          if (e.key === "Tab") close();
        }}
        className="
        flex
  h-8
  w-full
  items-center
  justify-between
  gap-1.5
  rounded-l-lg
  rounded-r-none
  border
  border-zinc-200
  bg-white
  px-2.5
  text-sm
  text-zinc-900
  outline-none
        "
      >
        <span className="whitespace-nowrap">
          {selected.iso} +{selected.callingCode}
        </span>
        <Chevron open={open} />
      </button>

      {/* Dropdown — fixed width, independent of trigger */}
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1.5 w-64 rounded-xl border border-zinc-200/90 bg-white/95 shadow-xl shadow-zinc-900/[0.08] ring-1 ring-zinc-900/[0.04] backdrop-blur-md">

          {/* Search */}
          <div className="border-b border-zinc-100 px-2 py-2">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar país o código…"
              aria-label="Buscar país"
              className="h-7 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none placeholder:text-zinc-400 transition-all duration-150 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500/10"
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.stopPropagation();
                  close();
                }
              }}
            />
          </div>

          {/* Options */}
          <div role="listbox" className="max-h-56 overflow-y-auto py-1.5">

            {isEmpty && (
              <p className="px-3 py-2 text-sm text-zinc-400">Sin resultados</p>
            )}

            {filteredPriority.map((o) => (
              <OptionRow
                key={o.iso}
                option={o}
                selected={o.iso === value}
                onSelect={(iso) => { onChange(iso); close(); }}
              />
            ))}

            {showSeparator && (
              <div aria-hidden className="mx-3 my-1 border-t border-zinc-100" />
            )}

            {filteredOthers.map((o) => (
              <OptionRow
                key={o.iso}
                option={o}
                selected={o.iso === value}
                onSelect={(iso) => { onChange(iso); close(); }}
              />
            ))}

          </div>
        </div>
      )}

    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function OptionRow({
  option,
  selected,
  onSelect,
}: {
  option: CountryOption;
  selected: boolean;
  onSelect: (iso: string) => void;
}) {
  return (
    <div
      role="option"
      aria-selected={selected}
      onMouseDown={(e) => {
        e.preventDefault();
        onSelect(option.iso);
      }}
      className={`mx-1 flex cursor-pointer select-none items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-100 ${
        selected
          ? "bg-zinc-50 text-zinc-900"
          : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
      }`}
    >
      <span className="truncate">{option.name}</span>
      <span className="shrink-0 text-xs text-zinc-400">
        {option.iso} +{option.callingCode}
      </span>
    </div>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden
      className={`size-3.5 shrink-0 text-zinc-400 transition-transform duration-150 ${
        open ? "rotate-180" : ""
      }`}
    >
      <path d="m4 6 4 4 4-4" />
    </svg>
  );
}
