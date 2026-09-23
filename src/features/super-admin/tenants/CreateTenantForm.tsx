"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api-error";
import { tenantsApi } from "@/lib/tenants-api";
import { TENANTS_QUERY_KEY } from "@/constants/query-keys";

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .regex(/^[a-z0-9-]+$/, "Slug: lowercase letters, numbers, and hyphens only"),
  currency: z.enum(["PKR", "USD"]),
  subdomain: z.string().optional(),
  domain: z.string().optional(),
  ownerFirstName: z.string().min(1, "Owner first name is required"),
  ownerLastName: z.string().min(1, "Owner last name is required"),
  ownerEmail: z.string().email("Enter a valid owner email"),
});

type FormValues = z.infer<typeof schema>;

export function CreateTenantForm() {
  const router = useRouter();
  const qc = useQueryClient();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { currency: "PKR" },
  });

  async function onSubmit(data: FormValues) {
    try {
      const res = await tenantsApi.create({
        name: data.name,
        slug: data.slug,
        currency: data.currency,
        timezone: "Asia/Karachi",
        subdomain: data.subdomain?.trim() || undefined,
        domain: data.domain?.trim() || undefined,
        ownerEmail: data.ownerEmail.trim().toLowerCase(),
        ownerFirstName: data.ownerFirstName.trim(),
        ownerLastName: data.ownerLastName.trim(),
      });
      qc.invalidateQueries({ queryKey: [TENANTS_QUERY_KEY] });
      const ownerEmail = res.data?.owner?.email ?? data.ownerEmail;
      const tenantId = res.data?.id;
      toast({
        title: "Tenant created (Pending)",
        description: `Owner ${ownerEmail} was onboarded. If they did not get the email, open the tenant and use Resend invite.`,
        variant: "success",
      });
      router.push(tenantId ? `/super-admin/tenants/${tenantId}` : "/super-admin/tenants");
    } catch (err) {
      setError("root", {
        message: err instanceof ApiError ? err.message : "Failed to create tenant.",
      });
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <form onSubmit={handleSubmit(onSubmit)} className="max-w-lg space-y-5">
        {errors.root && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {errors.root.message}
          </div>
        )}

        <div>
          <h3 className="mb-3 text-sm font-semibold text-slate-900">Workspace</h3>
          <div className="space-y-5">
            <FormField label="Tenant Name" error={errors.name?.message} required>
              <Input placeholder="Acme Corporation" {...register("name")} />
            </FormField>

            <FormField label="Slug" error={errors.slug?.message} required>
              <Input placeholder="acme-corp" {...register("slug")} />
              <p className="text-xs text-slate-400">
                Used in URLs. Lowercase letters, numbers, and hyphens only.
              </p>
            </FormField>

            <FormField label="Currency" error={errors.currency?.message} required>
              <Select {...register("currency")}>
                <option value="PKR">PKR — Pakistani Rupee</option>
                <option value="USD">USD — US Dollar</option>
              </Select>
            </FormField>

            <FormField label="Subdomain" error={errors.subdomain?.message}>
              <Input placeholder="acme (optional)" {...register("subdomain")} />
            </FormField>

            <FormField label="Custom Domain" error={errors.domain?.message}>
              <Input placeholder="app.acme.com (optional)" {...register("domain")} />
            </FormField>

            <FormField label="Timezone">
              <Input value="Asia/Karachi" disabled className="bg-slate-50 text-slate-500" />
            </FormField>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-5">
          <h3 className="mb-1 text-sm font-semibold text-slate-900">Owner account</h3>
          <p className="mb-3 text-xs text-slate-500">
            This person receives an invite email and becomes Tenant Owner. The workspace stays
            Pending until you Activate it — then they can use the dashboard.
          </p>
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="First Name" error={errors.ownerFirstName?.message} required>
                <Input placeholder="Jane" {...register("ownerFirstName")} />
              </FormField>
              <FormField label="Last Name" error={errors.ownerLastName?.message} required>
                <Input placeholder="Doe" {...register("ownerLastName")} />
              </FormField>
            </div>
            <FormField label="Owner Email" error={errors.ownerEmail?.message} required>
              <Input
                type="email"
                placeholder="owner@acme.com"
                autoComplete="off"
                {...register("ownerEmail")}
              />
            </FormField>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Create &amp; Invite Owner
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
