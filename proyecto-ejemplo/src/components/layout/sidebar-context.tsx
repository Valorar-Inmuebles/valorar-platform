"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getCurrentUser } from "@/lib/api/me.api";

type SidebarContextValue = {
  collapsed: boolean;
  setCollapsed: (value: boolean) => void;
  toggleCollapsed: () => void;
  isSuperUsuario: boolean;
  roles: string[];
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function SidebarProvider({
  children,
  isSuperUsuario: initialIsSuperUsuario = false,
  roles: initialRoles = [],
}: {
  children: ReactNode;
  isSuperUsuario?: boolean;
  roles?: string[];
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [isSuperUsuario, setIsSuperUsuario] = useState(initialIsSuperUsuario);
  const [roles, setRoles] = useState<string[]>(initialRoles);

  useEffect(() => {
    setIsSuperUsuario(initialIsSuperUsuario);
    setRoles(initialRoles);
  }, [initialIsSuperUsuario, initialRoles]);

  useEffect(() => {
    let cancelled = false;

    getCurrentUser()
      .then((user) => {
        if (!cancelled) {
          setIsSuperUsuario(user.is_super_usuario);
          setRoles(user.roles);
        }
      })
      .catch(() => {
        // Mantener el valor inicial del layout si /api/me falla.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((c) => !c);
  }, []);

  const value = useMemo(
    () => ({
      collapsed,
      setCollapsed,
      toggleCollapsed,
      isSuperUsuario,
      roles,
    }),
    [collapsed, toggleCollapsed, isSuperUsuario, roles],
  );

  return (
    <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) {
    throw new Error("useSidebar must be used within SidebarProvider");
  }
  return ctx;
}
