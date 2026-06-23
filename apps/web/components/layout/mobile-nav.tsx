"use client";

import { useEffect, useId, useState } from "react";
import { MAIN_NAV_ITEMS } from "@/lib/constants/navigation";
import { NavLink } from "./nav-link";

type MobileNavProps = {
  className?: string;
};

export function MobileNav({ className = "" }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);
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
        setIsOpen(false);
      }
    };

    if (isOpen) {
      window.addEventListener("keydown", handleEscape);
    }

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const closeMenu = () => {
    setIsOpen(false);
  };

  return (
    <div className={className}>
      <button
        type="button"
        className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border-default text-text-primary hover:bg-surface-alt focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green"
        aria-expanded={isOpen}
        aria-controls={panelId}
        aria-label={isOpen ? "Cerrar menú" : "Abrir menú"}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className="sr-only">{isOpen ? "Cerrar menú" : "Abrir menú"}</span>
        {isOpen ? (
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
        ) : (
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
          </svg>
        )}
      </button>

      {isOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/40"
            aria-label="Cerrar menú"
            onClick={closeMenu}
          />
          <nav
            id={panelId}
            aria-label="Navegación móvil"
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col border-l border-border-default bg-surface-card shadow-sm"
          >
            <div className="flex items-center justify-between border-b border-border-default px-4 py-4">
              <span className="text-sm font-semibold text-text-primary">Menú</span>
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-surface-alt focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green"
                aria-label="Cerrar menú"
                onClick={closeMenu}
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
            <ul className="flex flex-col gap-1 overflow-y-auto px-4 py-6">
              {MAIN_NAV_ITEMS.map((item) => (
                <li key={item.href}>
                  <NavLink
                    href={item.href}
                    label={item.label}
                    onNavigate={closeMenu}
                    className="block rounded-md px-3 py-3 text-base"
                  />
                </li>
              ))}
            </ul>
          </nav>
        </>
      ) : null}
    </div>
  );
}
