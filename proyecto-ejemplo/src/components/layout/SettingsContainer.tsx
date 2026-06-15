import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
};

/**
 * Centered container for entity settings pages (Persona, Cliente, Tenant, etc.).
 * Constrains content to a readable max-width and centers it horizontally.
 * Drop-in replacement for the full-width `div` wrapper used in list pages.
 */
export function SettingsContainer({ children, className = "" }: Props) {
  return (
    <div className={`mx-auto w-full max-w-5xl ${className}`}>{children}</div>
  );
}
