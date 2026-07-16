"use client";

import type { PropertyType } from "@repo/shared-types";
import { FILTER_PROPERTY_TYPE_OPTIONS } from "@/lib/format/labels";
import {
  FilterOptionSelect,
  type FilterSelectOption,
} from "./filter-option-select";
import { PROPERTY_TYPE_ICONS } from "@repo/icons";

export { PROPERTY_TYPE_ICONS } from "@repo/icons";

export const PROPERTY_TYPE_SELECT_TRIGGER_CLASS =
  "h-11 w-full rounded-xl bg-white px-3 text-sm outline-none ring-1 ring-border-default/80 transition placeholder:text-muted focus:ring-brand-green/40";

export const PROPERTY_TYPE_SELECT_OPTIONS: FilterSelectOption[] =
  FILTER_PROPERTY_TYPE_OPTIONS.filter((option) => option.value).map(
    (option) => ({
      value: option.value,
      label: option.label,
      icon: PROPERTY_TYPE_ICONS[option.value as PropertyType],
    }),
  );

type PropertyTypeSelectProps = {
  value: PropertyType | "";
  onChange: (value: PropertyType | "") => void;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
};

/** Shared "Tipo de propiedad" select for Home, Propiedades and other filters. */
export function PropertyTypeSelect({
  value,
  onChange,
  disabled = false,
  className = "",
  triggerClassName = PROPERTY_TYPE_SELECT_TRIGGER_CLASS,
}: PropertyTypeSelectProps) {
  return (
    <FilterOptionSelect
      value={value}
      onChange={(next) => onChange(next as PropertyType | "")}
      options={PROPERTY_TYPE_SELECT_OPTIONS}
      clearLabel="Todos los tipos"
      placeholder="Seleccionar tipo"
      disabled={disabled}
      className={className}
      triggerClassName={triggerClassName}
      ariaLabel="Tipo de propiedad"
    />
  );
}
