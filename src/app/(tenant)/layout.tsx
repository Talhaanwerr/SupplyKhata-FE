import type { Metadata } from "next";
import { SidebarProvider } from "@/components/layout/sidebar-context";
import { TenantSidebar } from "@/components/layout/TenantSidebar";
import { TopHeader } from "@/components/layout/TopHeader";

export const metadata: Metadata = {
  title: {
    default: "Dashboard",
    template: "%s | Dashboard",
  },
};

export default function TenantLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden bg-slate-50">
        <TenantSidebar />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <TopHeader />
          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
