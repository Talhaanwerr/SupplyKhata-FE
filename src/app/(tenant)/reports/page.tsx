import type { Metadata } from "next";
import { ReportsView } from "@/features/tenant/reports/ReportsView";

export const metadata: Metadata = { title: "Reports" };

export default function ReportsPage() {
  return <ReportsView />;
}
