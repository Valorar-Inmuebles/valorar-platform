"use client";

import { ToastProvider } from "@repo/ui/toast";
import type { ReactNode } from "react";

type SiteProvidersProps = {
  children: ReactNode;
};

/**
 * Root client providers for apps/web.
 * Extend here when adding theme, analytics, or global client context.
 */
export function SiteProviders({ children }: SiteProvidersProps) {
  return <ToastProvider>{children}</ToastProvider>;
}
