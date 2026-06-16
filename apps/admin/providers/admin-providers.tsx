"use client";

import type { ReactNode } from "react";
import { ToastProvider } from "@repo/ui/toast";

type AdminProvidersProps = {
  children: ReactNode;
};

export function AdminProviders({ children }: AdminProvidersProps) {
  return <ToastProvider>{children}</ToastProvider>;
}
