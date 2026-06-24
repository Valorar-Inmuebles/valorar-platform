"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { WhatsappIcon } from "@/components/icons";
import { BRAND_ASSETS } from "@/lib/constants/brand";
import { MAIN_NAV_ITEMS } from "@/lib/constants/navigation";
import { getWhatsAppUrl } from "@/lib/tenant/get-whatsapp-url";
import { NavLink } from "./nav-link";

type MobileNavProps = {
  className?: string;
  companyName: string;
  whatsapp?: string;
};

const DRAWER_TRANSITION_MS = 300;

function CloseIcon() {
  return (
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
  );
}

function MenuIcon() {
  return (
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
  );
}

export function MobileNav({
  className = "",
  companyName,
  whatsapp = "",
}: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const panelId = useId();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const whatsappUrl = getWhatsAppUrl({
    phone: whatsapp,
    message: "Hola, quisiera más información.",
  });

  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
      const frame = window.requestAnimationFrame(() => {
        setIsVisible(true);
      });

      return () => {
        window.cancelAnimationFrame(frame);
      };
    }

    setIsVisible(false);
    const timer = window.setTimeout(() => {
      setIsMounted(false);
    }, DRAWER_TRANSITION_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [isOpen]);

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

  useEffect(() => {
    if (isVisible) {
      closeButtonRef.current?.focus();
    }
  }, [isVisible]);

  const openMenu = () => {
    setIsOpen(true);
  };

  const closeMenu = () => {
    setIsOpen(false);
    window.requestAnimationFrame(() => {
      menuButtonRef.current?.focus();
    });
  };

  const drawer =
    isMounted && typeof document !== "undefined"
      ? createPortal(
          <>
            <button
              type="button"
              className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ease-out lg:hidden ${
                isVisible ? "opacity-100" : "opacity-0"
              }`}
              aria-label="Cerrar menú"
              onClick={closeMenu}
            />
            <aside
              id={panelId}
              role="dialog"
              aria-modal="true"
              aria-label="Menú de navegación"
              className={`fixed inset-y-0 left-0 z-50 flex w-[85vw] max-w-[22rem] flex-col border-r border-border-default bg-surface-card shadow-xl transition-transform duration-300 ease-out lg:hidden ${
                isVisible ? "translate-x-0" : "-translate-x-full"
              }`}
            >
              <div className="flex items-center justify-between border-b border-border-default px-5 py-4">
                <Link
                  href="/"
                  onClick={closeMenu}
                  className="inline-flex shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green"
                  aria-label={`${companyName} — Inicio`}
                >
                  <Image
                    src={BRAND_ASSETS.logo}
                    alt={companyName}
                    width={160}
                    height={48}
                    className="h-9 w-auto"
                  />
                </Link>
                <button
                  ref={closeButtonRef}
                  type="button"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-text-primary transition hover:bg-surface-alt focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green"
                  aria-label="Cerrar menú"
                  onClick={closeMenu}
                >
                  <CloseIcon />
                </button>
              </div>

              <nav aria-label="Navegación móvil" className="flex-1 overflow-y-auto px-4 py-4">
                <ul className="flex flex-col gap-1">
                  {MAIN_NAV_ITEMS.map((item) => (
                    <li key={item.href}>
                      <NavLink
                        href={item.href}
                        label={item.label}
                        onNavigate={closeMenu}
                        className="block rounded-xl px-4 py-3.5 text-[1.0625rem]"
                      />
                    </li>
                  ))}
                </ul>
              </nav>

              <div className="border-t border-border-default p-4">
                {whatsappUrl ? (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={closeMenu}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-green px-4 py-3.5 text-sm font-semibold text-white transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green"
                  >
                    <WhatsappIcon size={20} className="shrink-0" />
                    Hablar por WhatsApp
                  </a>
                ) : (
                  <Link
                    href="/contacto"
                    onClick={closeMenu}
                    className="inline-flex w-full items-center justify-center rounded-xl bg-brand-green px-4 py-3.5 text-sm font-semibold text-white transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green"
                  >
                    Contactar
                  </Link>
                )}
              </div>
            </aside>
          </>,
          document.body,
        )
      : null;

  return (
    <div className={className}>
      <button
        ref={menuButtonRef}
        type="button"
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border-default text-text-primary transition hover:bg-surface-alt focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green"
        aria-expanded={isOpen}
        aria-controls={panelId}
        aria-label="Abrir menú"
        onClick={() => (isOpen ? closeMenu() : openMenu())}
      >
        <span className="sr-only">Abrir menú</span>
        <MenuIcon />
      </button>
      {drawer}
    </div>
  );
}
