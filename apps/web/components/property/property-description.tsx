"use client";

import { useState } from "react";
import { PropertyDetailSection } from "./property-detail-section";

type PropertyDescriptionProps = {
  description: string | null;
};

export function PropertyDescription({ description }: PropertyDescriptionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!description?.trim()) {
    return null;
  }

  return (
    <PropertyDetailSection title="Descripción">
      <p
        className={`whitespace-pre-line text-base leading-8 text-text-primary/90 ${
          isExpanded ? "" : "line-clamp-6 md:line-clamp-none"
        }`}
      >
        {description}
      </p>
      <button
        type="button"
        onClick={() => setIsExpanded((value) => !value)}
        className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-green transition hover:text-brand-green/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green md:hidden"
      >
        {isExpanded ? "Leer menos" : "Ver más"}
        <span aria-hidden>{isExpanded ? "↑" : "↓"}</span>
      </button>
    </PropertyDetailSection>
  );
}
