import { PageHeader } from "@/components/ui/page-header";
import { OpenDeliveryRunForm } from "@/features/tenant/delivery-runs/OpenDeliveryRunForm";

export default function NewDeliveryRunPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Open Delivery Run"
        description="Select rider, vehicle, cash, and opening stock"
      />
      <OpenDeliveryRunForm />
    </div>
  );
}
