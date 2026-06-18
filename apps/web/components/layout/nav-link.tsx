"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavLinkProps = {
  href: string;
  label: string;
  onNavigate?: () => void;
  className?: string;
};

export function NavLink({ href, label, onNavigate, className = "" }: NavLinkProps) {
  const pathname = usePathname();
  const isActive =
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
  const isBlock = className.includes("block");

  const focusRing =
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand-green,var(--color-primary,#15351d))]";

  const desktopClasses = !isBlock
    ? `relative inline-flex py-1 text-sm font-medium text-foreground/80 transition-colors hover:text-[var(--color-brand-green,var(--color-primary,#15351d))] ${focusRing} ${
        isActive
          ? "after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-[var(--color-brand-orange,#ee680f)]"
          : ""
      }`
    : "";

  const mobileClasses = isBlock
    ? `text-base font-medium transition-colors ${focusRing} ${
        isActive ? "text-foreground" : "text-foreground/80 hover:text-foreground"
      }`
    : "";

  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={isActive ? "page" : undefined}
      className={`${desktopClasses} ${mobileClasses} ${className}`}
    >
      {label}
    </Link>
  );
}
