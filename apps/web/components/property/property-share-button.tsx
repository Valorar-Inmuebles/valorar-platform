"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

type PropertyShareButtonProps = {
  title: string;
  url: string;
  className?: string;
};

export function PropertyShareButton({
  title,
  url,
  className,
}: PropertyShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // fall through to copy
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-text-primary ring-1 ring-border-default transition hover:ring-brand-green/40",
        className,
      )}
    >
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
        <path d="M16 6l-4-4-4 4" />
        <path d="M12 2v14" />
      </svg>
      {copied ? "Enlace copiado" : "Compartir"}
    </button>
  );
}
