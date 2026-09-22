import { Suspense } from "react";
import { RecordPaymentForm } from "@/features/tenant/payments/RecordPaymentForm";

export default function RecordPaymentPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Loading…</p>}>
      <RecordPaymentForm />
    </Suspense>
  );
}
