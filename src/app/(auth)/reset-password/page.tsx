"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { resetPasswordSchema, type ResetPasswordInput } from "@/schemas/auth";
import { authApi } from "@/lib/auth";
import { ApiError } from "@/lib/api-error";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [succeeded, setSucceeded] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
  });

  if (!token) {
    return (
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
          <AlertCircle className="h-6 w-6 text-red-600" />
        </div>
        <h2 className="text-lg font-semibold text-slate-900">Invalid link</h2>
        <p className="text-sm text-slate-500">
          This password reset link is missing or expired. Please request a new one.
        </p>
        <Link href="/forgot-password" className="text-primary text-sm hover:underline">
          Request new link
        </Link>
      </div>
    );
  }

  if (succeeded) {
    const isInvite = searchParams.get("invite") === "1";
    return (
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <CheckCircle2 className="h-6 w-6 text-green-600" />
        </div>
        <h2 className="text-lg font-semibold text-slate-900">
          {isInvite ? "Welcome — password set" : "Password updated"}
        </h2>
        <p className="text-sm text-slate-500">
          {isInvite
            ? "Your account is ready. Sign in to open your workspace."
            : "Your password has been reset successfully."}
        </p>
        <Link href="/login" className="text-primary text-sm hover:underline">
          Sign in
        </Link>
      </div>
    );
  }

  async function onSubmit(data: ResetPasswordInput) {
    try {
      await authApi.resetPassword(token!, data.password);
      setSucceeded(true);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Something went wrong. Please try again.";
      setError("root", { message });
    }
  }

  return (
    <div>
      <div className="mb-6 text-center">
        <h2 className="text-xl font-semibold text-slate-900">
          {searchParams.get("invite") === "1" ? "Set your password" : "Set new password"}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Must be at least 8 characters with one uppercase letter and one number.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {errors.root && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
          >
            {errors.root.message}
          </div>
        )}

        <FormField label="New password" error={errors.password?.message} required>
          <Input
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            aria-invalid={!!errors.password}
            {...register("password")}
          />
        </FormField>

        <FormField label="Confirm password" error={errors.confirmPassword?.message} required>
          <Input
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            aria-invalid={!!errors.confirmPassword}
            {...register("confirmPassword")}
          />
        </FormField>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Updating…
            </>
          ) : (
            "Reset password"
          )}
        </Button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-10">
          <Loader2 className="text-primary h-6 w-6 animate-spin" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
