"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { useToast } from "@/components/ui/toast";
import { settingsApi } from "@/lib/settings-api";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { getSafeErrorMessage } from "@/lib/safe-error";
import { SETTINGS_QUERY_KEY } from "@/constants/query-keys";
import {
  useUiPrefsStore,
  MIN_PAGE_SIZE,
  MAX_PAGE_SIZE,
  clampPageSize,
} from "@/store/ui-prefs-store";

const PLATFORM_SETTINGS_QUERY_KEY = [SETTINGS_QUERY_KEY, "platform"] as const;

const schema = z.object({
  appName: z.string().min(1, "App name is required"),
  supportEmail: z.string().email("Enter a valid email"),
  defaultTimezone: z.string(),
  defaultCurrency: z.string().length(3, "Enter a 3-letter currency code"),
  pageSize: z
    .number()
    .int()
    .min(MIN_PAGE_SIZE, `Minimum is ${MIN_PAGE_SIZE}`)
    .max(MAX_PAGE_SIZE, `Maximum is ${MAX_PAGE_SIZE}`),
});

type FormValues = z.infer<typeof schema>;

export function SuperAdminSettingsForm() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const pageSize = useUiPrefsStore((s) => s.pageSize);
  const setPageSize = useUiPrefsStore((s) => s.setPageSize);

  const {
    data: res,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: PLATFORM_SETTINGS_QUERY_KEY,
    queryFn: settingsApi.getPlatform,
  });

  const settings = res?.data;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      appName: "",
      supportEmail: "",
      defaultTimezone: "UTC",
      defaultCurrency: "USD",
      pageSize,
    },
  });

  useEffect(() => {
    if (!settings) return;
    reset({
      appName: settings.appName ?? "",
      supportEmail: settings.supportEmail ?? "",
      defaultTimezone: settings.defaultTimezone || "UTC",
      defaultCurrency: settings.defaultCurrency || "USD",
      pageSize,
    });
  }, [settings, pageSize, reset]);

  const update = useApiMutation(
    (data: FormValues) =>
      settingsApi.updatePlatform({
        appName: data.appName,
        supportEmail: data.supportEmail,
        defaultTimezone: data.defaultTimezone,
        defaultCurrency: data.defaultCurrency,
      }),
    {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: PLATFORM_SETTINGS_QUERY_KEY });
        toast({
          title: "Settings saved",
          description: "Platform preferences were updated.",
          variant: "success",
        });
      },
      onError: (err) => {
        toast({
          title: "Could not save settings",
          description: getSafeErrorMessage(err),
          variant: "error",
        });
      },
    }
  );

  async function onSubmit(data: FormValues) {
    setPageSize(clampPageSize(data.pageSize));
    await update.mutateAsync(data);
  }

  if (isLoading) {
    return (
      <div className="max-w-lg space-y-4 rounded-xl border border-slate-200 bg-white p-6">
        <LoadingSkeleton className="h-8 w-48" />
        <LoadingSkeleton className="h-10 w-full" />
        <LoadingSkeleton className="h-10 w-full" />
        <LoadingSkeleton className="h-10 w-2/3" />
      </div>
    );
  }

  if (isError || !settings) {
    return (
      <ErrorState
        title="Failed to load settings"
        description="We couldn't fetch platform settings."
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="max-w-lg space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <FormField label="App Name" error={errors.appName?.message} required>
            <Input {...register("appName")} />
          </FormField>
          <FormField label="Support Email" error={errors.supportEmail?.message} required>
            <Input type="email" {...register("supportEmail")} />
          </FormField>
          <FormField label="Default Timezone" error={errors.defaultTimezone?.message}>
            <Input {...register("defaultTimezone")} />
          </FormField>
          <FormField label="Default Currency" error={errors.defaultCurrency?.message}>
            <Input maxLength={3} placeholder="USD" {...register("defaultCurrency")} />
          </FormField>

          <FormField label="Table page size" error={errors.pageSize?.message} required>
            <Input type="number" {...register("pageSize", { valueAsNumber: true })} />
            <p className="text-xs text-slate-400">
              How many rows to show per page on all tables (min {MIN_PAGE_SIZE}, max {MAX_PAGE_SIZE}
              ).
            </p>
          </FormField>

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" disabled={isSubmitting || update.isPending || !isDirty}>
              {(isSubmitting || update.isPending) && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Settings
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
