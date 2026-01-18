"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Suspense } from "react";

import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner"

const AUTH_ROUTES = ["/sign-in", "/sign-up"];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const hideSidebar = AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  if (hideSidebar) {
    return <>{children}</>;
  }

  return (
    <SidebarProvider>
      <Suspense fallback={null}>
        <AppSidebar />
        <SidebarInset>
          {children}
        </SidebarInset>
      </Suspense>
      <Toaster />
    </SidebarProvider>
  );
}
