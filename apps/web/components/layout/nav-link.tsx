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
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green";

  const desktopClasses = !isBlock
    ? `relative inline-flex py-1 text-sm font-medium text-text-secondary transition-colors hover:text-brand-green ${focusRing} ${
        isActive
          ? "text-brand-green after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-brand-orange"
          : ""
      }`
    : "";

  const mobileClasses = isBlock
    ? `text-base font-medium transition-colors ${focusRing} ${
        isActive
          ? "bg-surface-alt text-brand-green"
          : "text-text-secondary hover:bg-surface-alt/60 hover:text-brand-green"
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
