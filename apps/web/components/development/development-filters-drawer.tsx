"use client";

import { useEffect, useId } from "react";
import { DevelopmentFilters } from "./development-filters";

type DevelopmentFiltersDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function DevelopmentFiltersDrawer({
  isOpen,
  onClose,
}: DevelopmentFiltersDrawerProps) {
  const panelId = useId();

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener("keydown", handleEscape);
    }

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 bg-black/40 lg:hidden"
        aria-label="Cerrar filtros"
        onClick={onClose}
      />
      <div
        id={panelId}
        className="fixed inset-x-0 bottom-0 z-50 max-h-[90vh] overflow-y-auto rounded-t-2xl bg-background p-4 shadow-2xl lg:hidden"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Filtros</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar filtros"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-foreground/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <DevelopmentFilters onApplied={onClose} className="border-0 p-0 shadow-none" />
      </div>
    </>
  );
}
