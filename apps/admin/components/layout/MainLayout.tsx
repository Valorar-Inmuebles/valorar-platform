"use client";

import type { ReactNode } from "react";
import { MainHeader } from "@/components/layout/MainHeader";
import { MainSidebar } from "@/components/layout/MainSidebar";
import { SidebarProvider } from "@/components/layout/sidebar-context";

type MainLayoutProps = {
  children: ReactNode;
};

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-background text-foreground antialiased">
        <MainSidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70">
            <MainHeader />
          </div>

          <main className="min-h-[calc(100vh-3.25rem)] flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
