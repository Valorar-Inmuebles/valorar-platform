"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavLinkProps = {
  href: string;
  label: string;
  onNavigate?: () => void;
  className?: string;
  icon?: ReactNode;
  variant?: "desktop" | "mobile";
};

export function NavLink({
  href,
  label,
  onNavigate,
  className = "",
  icon,
  variant = "desktop",
}: NavLinkProps) {
  const pathname = usePathname();
  const isActive =
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
  const isMobile = variant === "mobile" || className.includes("block");

  const focusRing =
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green";

  const desktopClasses = !isMobile
    ? `relative inline-flex py-1 text-sm font-medium text-text-secondary transition-colors hover:text-brand-green ${focusRing} ${
        isActive
          ? "text-brand-green after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-brand-orange"
          : ""
      }`
    : "";

  const mobileClasses = isMobile
    ? `transition-all duration-200 ${focusRing} ${
        isActive
          ? "bg-brand-green font-semibold text-white"
          : "font-medium text-text-primary hover:bg-surface-alt hover:text-brand-green active:bg-[#F5FAF6] active:text-brand-green"
      }`
    : "";

  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={isActive ? "page" : undefined}
      className={`${desktopClasses} ${mobileClasses} ${className}`}
    >
      {icon ? (
        <span className="inline-flex shrink-0 items-center justify-center" aria-hidden>
          {icon}
        </span>
      ) : null}
      {label}
    </Link>
  );
}
