"use client";

import type { ReactNode } from "react";

type AdminProvidersProps = {
  children: ReactNode;
};

/**
 * Root client providers for apps/admin.
 * Toast, auth session, and sidebar context will be added in later phases.
 */
export function AdminProviders({ children }: AdminProvidersProps) {
  return children;
}
