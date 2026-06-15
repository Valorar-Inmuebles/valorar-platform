"use client";

import { useState } from "react";

type PropertyDescriptionProps = {
  description: string | null;
};

export function PropertyDescription({ description }: PropertyDescriptionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!description?.trim()) {
    return null;
  }

  return (
    <section className="mt-10">
      <h2 className="text-2xl font-semibold tracking-tight text-foreground">
        Descripción
      </h2>
      <div className="mt-4">
        <p
          className={`whitespace-pre-line text-base leading-7 text-foreground/90 ${
            isExpanded ? "" : "line-clamp-6 md:line-clamp-none"
          }`}
        >
          {description}
        </p>
        <button
          type="button"
          onClick={() => setIsExpanded((value) => !value)}
          className="mt-3 text-sm font-medium text-primary md:hidden"
        >
          {isExpanded ? "Leer menos" : "Leer más"}
        </button>
      </div>
    </section>
  );
}
