"use client";

import type { ReactNode } from "react";
import { SidebarProvider } from "@/components/layout/sidebar-context";
import Header from "@/components/layout/MainHeader";
import Sidebar from "@/components/layout/MainSidebar";
import { ActivityProvider } from "@/components/providers/activity-provider";
import { GlobalActivityBar } from "@/components/ui/global-activity-bar";

export type MainLayoutCurrentUser = {
  id: string;
  name: string;
  email: string;
  has_foto: boolean;
};

export default function MainLayout({
  children,
  currentUser,
  isSuperUsuario = false,
  roles = [],
  viewTenantId = null,
}: {
  children: ReactNode;
  currentUser?: MainLayoutCurrentUser;
  isSuperUsuario?: boolean;
  roles?: string[];
  viewTenantId?: string | null;
}) {
  return (
    <ActivityProvider>
      <SidebarProvider isSuperUsuario={isSuperUsuario} roles={roles}>
        <div className="flex min-h-screen text-zinc-900 antialiased">
          <Sidebar />

          <div className="flex min-w-0 flex-1 flex-col">
            <div className="sticky top-0 z-40 bg-white/75 backdrop-blur-xl supports-[backdrop-filter]:bg-white/65">
              <Header
                currentUser={currentUser}
                isSuperUsuario={isSuperUsuario}
                viewTenantId={viewTenantId}
              />
              <GlobalActivityBar />
            </div>

            <main className="min-h-[calc(100vh-3.75rem)] px-5 py-6 sm:px-6 lg:px-8 lg:py-8">
              {children}
            </main>
          </div>
        </div>
      </SidebarProvider>
    </ActivityProvider>
  );
}