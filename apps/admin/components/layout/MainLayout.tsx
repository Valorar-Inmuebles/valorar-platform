"use client";

import type { ReactNode } from "react";
import { MainHeader } from "@/components/layout/MainHeader";
import { MainSidebar } from "@/components/layout/MainSidebar";
import { SidebarProvider } from "@/components/layout/sidebar-context";
import { sessionToNavContext } from "@/lib/auth/nav-context";
import type { AdminSession } from "@/lib/auth/types";

type MainLayoutProps = {
  children: ReactNode;
  session: AdminSession;
  activeTenantId: string | null;
};

export function MainLayout({
  children,
  session,
  activeTenantId,
}: MainLayoutProps) {
  const navContext = sessionToNavContext(session.user);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-background text-foreground antialiased">
        <MainSidebar
          navContext={navContext}
          user={session.user}
          activeTenantId={activeTenantId}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70">
            <MainHeader
              user={session.user}
              activeTenantId={activeTenantId}
            />
          </div>

          <main className="min-h-[calc(100vh-3.25rem)] flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
