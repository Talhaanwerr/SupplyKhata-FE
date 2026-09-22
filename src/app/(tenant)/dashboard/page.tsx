import type { Metadata } from "next";
import { TenantDashboard } from "@/features/tenant/dashboard/TenantDashboard";

export const metadata: Metadata = { title: "Dashboard" };

export default function TenantDashboardPage() {
  return <TenantDashboard />;
}
