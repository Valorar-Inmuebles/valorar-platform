"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { PropertyType } from "@repo/shared-types";
import {
  ApartmentIcon,
  AreaIcon,
  BuildingIcon,
  GarageIcon,
  HouseIcon,
} from "@/components/icons";
import { SEARCH_PROPERTY_TYPE_OPTIONS } from "@/lib/format/labels";

type PropertyTypeDropdownProps = {
  value: PropertyType | "";
  onChange: (value: PropertyType | "") => void;
  disabled?: boolean;
  className?: string;
};

type PanelPosition = {
  top: number;
  left: number;
  width: number;
};

function ChevronDownIcon({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className={`h-4 w-4 shrink-0 text-text-secondary transition-transform ${open ? "rotate-180" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function PropertyTypeIcon({
  propertyType,
}: {
  propertyType: PropertyType | "";
}) {
  const iconProps = { size: 20, className: "shrink-0 text-text-secondary" as const };

  switch (propertyType) {
    case "HOUSE":
    case "COUNTRY_HOUSE":
    case "PH":
      return <HouseIcon {...iconProps} />;
    case "APARTMENT":
      return <ApartmentIcon {...iconProps} />;
    case "GARAGE":
      return <GarageIcon {...iconProps} />;
    case "LAND":
    case "FIELD":
      return <AreaIcon {...iconProps} />;
    case "OFFICE":
    case "COMMERCIAL":
      return <BuildingIcon {...iconProps} />;
    default:
      return <BuildingIcon {...iconProps} />;
  }
}

export function PropertyTypeDropdown({
  value,
  onChange,
  disabled = false,
  className = "",
}: PropertyTypeDropdownProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [panelPosition, setPanelPosition] = useState<PanelPosition | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listboxId = useId();

  const selectedLabel =
    SEARCH_PROPERTY_TYPE_OPTIONS.find((option) => option.value === value)?.label ??
    "Todos los tipos";

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePanelPosition = () => {
    const trigger = triggerRef.current;

    if (!trigger) {
      return;
    }

    const rect = trigger.getBoundingClientRect();

    setPanelPosition({
      top: rect.bottom + 8,
      left: rect.left,
      width: rect.width,
    });
  };

  useLayoutEffect(() => {
    if (!open) {
      return;
    }

    updatePanelPosition();

    const handleReposition = () => {
      updatePanelPosition();
    };

    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);

    return () => {
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;

      if (
        containerRef.current?.contains(target) ||
        document.getElementById(listboxId)?.contains(target)
      ) {
        return;
      }

      setOpen(false);
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
  }, [open, listboxId]);

  const panel =
    open && panelPosition && mounted ? (
      <ul
        id={listboxId}
        role="listbox"
        aria-label="Tipo de propiedad"
        style={{
          top: panelPosition.top,
          left: panelPosition.left,
          width: panelPosition.width,
        }}
        className="property-type-dropdown-panel fixed z-[200] max-h-72 overflow-y-auto rounded-2xl border border-border-default bg-surface-card py-2 shadow-sm"
      >
        {SEARCH_PROPERTY_TYPE_OPTIONS.map((option) => {
          const isSelected = option.value === value;

          return (
            <li key={option.label} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-text-primary transition hover:bg-surface-alt md:text-base ${
                  isSelected ? "bg-surface-alt" : ""
                }`}
              >
                <PropertyTypeIcon propertyType={option.value} />
                <span>{option.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    ) : null;

  return (
    <>
      <div ref={containerRef} className={`relative ${className}`}>
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listboxId}
          onClick={() => {
            setOpen((current) => !current);
          }}
          className="flex h-14 w-full items-center justify-between gap-3 rounded-2xl border border-border-default bg-surface-card px-4 text-left text-sm font-normal text-text-primary transition hover:border-brand-green/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-accent disabled:cursor-not-allowed disabled:opacity-50 md:px-5 md:text-base"
        >
          <span className="flex min-w-0 items-center gap-3">
            <PropertyTypeIcon propertyType={value} />
            <span className="truncate">{selectedLabel}</span>
          </span>
          <ChevronDownIcon open={open} />
        </button>
      </div>

      {mounted && panel ? createPortal(panel, document.body) : null}

      <style jsx global>{`
        .property-type-dropdown-panel {
          scrollbar-width: thin;
          scrollbar-color: var(--border-default) transparent;
        }

        .property-type-dropdown-panel::-webkit-scrollbar {
          width: 6px;
        }

        .property-type-dropdown-panel::-webkit-scrollbar-track {
          background: transparent;
        }

        .property-type-dropdown-panel::-webkit-scrollbar-thumb {
          background-color: var(--border-default);
          border-radius: 9999px;
        }

        .property-type-dropdown-panel::-webkit-scrollbar-button {
          display: none;
          height: 0;
          width: 0;
        }
      `}</style>
    </>
  );
}
