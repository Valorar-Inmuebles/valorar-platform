"use client";

import { useState } from "react";
import { DevelopmentFiltersDrawer } from "./development-filters-drawer";

export function DevelopmentMobileFiltersButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="mb-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 text-sm font-medium text-foreground shadow-sm transition hover:border-primary hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary lg:hidden"
      >
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            d="M4 7h16M7 12h10M10 17h4"
            strokeLinecap="round"
          />
        </svg>
        Filtros
      </button>
      <DevelopmentFiltersDrawer isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
