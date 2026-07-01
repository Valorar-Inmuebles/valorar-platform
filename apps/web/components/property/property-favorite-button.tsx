"use client";

import { cn } from "@/lib/cn";

type PropertyFavoriteButtonProps = {
  className?: string;
  size?: "sm" | "md";
};

/** UI placeholder for future favorites — no persistence yet. */
export function PropertyFavoriteButton({
  className,
  size = "md",
}: PropertyFavoriteButtonProps) {
  return (
    <button
      type="button"
      disabled
      aria-label="Guardar en favoritos (próximamente)"
      title="Favoritos — próximamente"
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-white/90 text-text-secondary shadow-sm ring-1 ring-black/5 backdrop-blur transition",
        "cursor-not-allowed opacity-70",
        size === "sm" ? "h-8 w-8" : "h-9 w-9",
        className,
      )}
    >
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        className={size === "sm" ? "h-4 w-4" : "h-[18px] w-[18px]"}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M12 21s-7-4.5-7-10a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 5.5-7 10-7 10Z" />
      </svg>
    </button>
  );
}
