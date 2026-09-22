import type { Metadata } from "next";
import { SidebarProvider } from "@/components/layout/sidebar-context";
import { SuperAdminSidebar } from "@/components/layout/SuperAdminSidebar";
import { TopHeader } from "@/components/layout/TopHeader";

export const metadata: Metadata = {
  title: {
    default: "Super Admin",
    template: "%s | Super Admin",
  },
};

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden bg-slate-50">
        <SuperAdminSidebar />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <TopHeader />
          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
