"use client";

import { useEffect, useState } from "react";
import { Input, type InputProps } from "./input";

function toDisplay(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function toIso(value: string) {
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const iso = `${match[3]}-${match[2]}-${match[1]}`;
  const date = new Date(`${iso}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === iso
    ? iso
    : null;
}

export type DatePickerProps = Omit<
  InputProps,
  "value" | "onChange" | "type"
> & {
  value: string;
  onChange: (isoDate: string) => void;
};

export function DatePicker({
  value,
  onChange,
  onBlur,
  ...props
}: DatePickerProps) {
  const [display, setDisplay] = useState(() => toDisplay(value));
  useEffect(() => setDisplay(toDisplay(value)), [value]);
  return (
    <Input
      {...props}
      type="text"
      inputMode="numeric"
      placeholder="DD/MM/AAAA"
      value={display}
      maxLength={10}
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
        const iso = toIso(formatted);
        onChange(iso ?? "");
      }}
      onBlur={onBlur}
    />
  );
}
