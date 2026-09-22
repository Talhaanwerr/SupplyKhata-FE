"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { authApi } from "@/lib/auth";
import { ApiError } from "@/lib/api-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { useToast } from "@/components/ui/toast";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

type Status = "verifying" | "success" | "error";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const { toast } = useToast();

  const [status, setStatus] = useState<Status>(token ? "verifying" : "error");
  const [errorMessage, setErrorMessage] = useState("Invalid or expired verification link.");
  const [email, setEmail] = useState("");
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  useEffect(() => {
    if (!token) return;

    authApi
      .verifyEmail(token)
      .then(() => setStatus("success"))
      .catch((err) => {
        setErrorMessage(
          err instanceof ApiError ? err.message : "Verification failed. Please try again."
        );
        setStatus("error");
      });
  }, [token]);

  async function handleResend() {
    const trimmed = email.trim();
    if (!trimmed) {
      toast({
        title: "Email required",
        description: "Enter your email address to resend the verification link.",
        variant: "error",
      });
      return;
    }

    setIsResending(true);
    setResendSuccess(false);
    try {
      await authApi.resendVerification(trimmed);
      setResendSuccess(true);
      toast({
        title: "Verification email sent",
        description: "Check your inbox for a new verification link.",
        variant: "success",
      });
    } catch (err) {
      toast({
        title: "Could not resend",
        description:
          err instanceof ApiError ? err.message : "Something went wrong. Please try again.",
        variant: "error",
      });
    } finally {
      setIsResending(false);
    }
  }

  if (status === "verifying") {
    return (
      <div className="flex flex-col items-center gap-4 py-6 text-center">
        <Loader2 className="text-primary h-8 w-8 animate-spin" />
        <p className="text-sm text-slate-500">Verifying your email…</p>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <CheckCircle2 className="h-6 w-6 text-green-600" />
        </div>
        <h2 className="text-lg font-semibold text-slate-900">Email verified!</h2>
        <p className="text-sm text-slate-500">Your email has been successfully verified.</p>
        <Link href="/login">
          <Button className="mt-2">Continue to sign in</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 py-4 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
        <AlertCircle className="h-6 w-6 text-red-600" />
      </div>
      <h2 className="text-lg font-semibold text-slate-900">Verification failed</h2>
      <p className="text-sm text-slate-500">{errorMessage}</p>

      <div className="w-full max-w-sm space-y-3 text-left">
        <FormField label="Email" description="We'll send a new verification link to this address.">
          <Input
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setResendSuccess(false);
            }}
          />
        </FormField>
        {resendSuccess && (
          <p className="text-sm text-green-600">Verification email sent. Check your inbox.</p>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button variant="outline" disabled={isResending} onClick={handleResend}>
          {isResending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Sending…
            </>
          ) : (
            "Resend verification email"
          )}
        </Button>
        <Link href="/login">
          <Button variant="ghost">Back to sign in</Button>
        </Link>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <Loader2 className="text-primary h-8 w-8 animate-spin" />
          <p className="text-sm text-slate-500">Loading…</p>
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
