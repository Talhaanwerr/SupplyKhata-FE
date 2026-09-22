"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Loader2, ShieldCheck, ShieldOff, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { useToast } from "@/components/ui/toast";
import { useAuthStore } from "@/store/auth-store";
import { authApi } from "@/lib/auth";
import { getSafeErrorMessage } from "@/lib/safe-error";

// ─── Types ────────────────────────────────────────────────────────────────────

type Step =
  | "idle" // initial: TOTP disabled, showing "Enable" button
  | "setup-loading" // calling /auth/totp/setup
  | "scan" // showing QR code + manual secret + code input
  | "enabling" // calling /auth/totp/enable
  | "enabled" // TOTP is active, showing "Disable" button
  | "disable-form" // showing code input to confirm disable
  | "disabling"; // calling /auth/totp/disable

// ─── Component ───────────────────────────────────────────────────────────────

export function TotpSection() {
  const user = useAuthStore((s) => s.user);
  const { toast } = useToast();

  // Determine initial step from user state (totpEnabled comes from /auth/me)
  const initialStep: Step = (user as unknown as { totpEnabled?: boolean })?.totpEnabled
    ? "enabled"
    : "idle";

  const [step, setStep] = useState<Step>(initialStep);
  const [secret, setSecret] = useState("");
  const [otpAuthUri, setOtpAuthUri] = useState("");
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const [copied, setCopied] = useState(false);

  // ── Setup ─────────────────────────────────────────────────────────────────

  async function handleSetup() {
    setStep("setup-loading");
    try {
      const res = await authApi.totpSetup();
      const data = res?.data;
      if (!data) throw new Error("No data returned");
      setSecret(data.secret);
      setOtpAuthUri(data.otpAuthUri);
      setCode("");
      setCodeError("");
      setStep("scan");
    } catch (err) {
      toast({ title: "Setup failed", description: getSafeErrorMessage(err), variant: "error" });
      setStep("idle");
    }
  }

  async function handleEnable() {
    if (code.length !== 6) {
      setCodeError("Enter the 6-digit code from your app");
      return;
    }
    setCodeError("");
    setStep("enabling");
    try {
      await authApi.totpEnable(code);
      toast({
        title: "Two-factor authentication enabled",
        description: "Your account is now protected with 2FA.",
        variant: "success",
      });
      setCode("");
      setStep("enabled");
    } catch (err) {
      setCodeError(getSafeErrorMessage(err));
      setStep("scan");
    }
  }

  // ── Disable ───────────────────────────────────────────────────────────────

  async function handleDisable() {
    if (code.length !== 6) {
      setCodeError("Enter the 6-digit code from your app");
      return;
    }
    setCodeError("");
    setStep("disabling");
    try {
      await authApi.totpDisable(code);
      toast({
        title: "Two-factor authentication disabled",
        description: "2FA has been removed from your account.",
        variant: "success",
      });
      setCode("");
      setStep("idle");
    } catch (err) {
      setCodeError(getSafeErrorMessage(err));
      setStep("disable-form");
    }
  }

  // ── Copy secret ───────────────────────────────────────────────────────────

  function handleCopy() {
    navigator.clipboard.writeText(secret).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  const isEnabled = step === "enabled" || step === "disable-form" || step === "disabling";

  return (
    <div className="max-w-lg rounded-xl border border-slate-200 bg-white p-6">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        {isEnabled ? (
          <ShieldCheck className="h-5 w-5 text-emerald-500" />
        ) : (
          <ShieldOff className="h-5 w-5 text-slate-400" />
        )}
        <div>
          <h3 className="font-semibold text-slate-900">Two-Factor Authentication</h3>
          <p className="text-sm text-slate-500">
            {isEnabled
              ? "2FA is enabled — your account is extra secure."
              : "Add a second layer of security to your login."}
          </p>
        </div>
        {isEnabled && (
          <span className="ms-auto rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
            Active
          </span>
        )}
      </div>

      {/* ── Idle: show Enable button ── */}
      {step === "idle" && (
        <Button onClick={handleSetup} variant="outline" size="sm">
          Enable 2FA
        </Button>
      )}

      {/* ── Loading ── */}
      {step === "setup-loading" && (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Generating your secret…
        </div>
      )}

      {/* ── Scan step: QR + secret + code input ── */}
      {step === "scan" && (
        <div className="space-y-5">
          <p className="text-sm text-slate-600">
            Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.), then
            enter the 6-digit code below to confirm.
          </p>

          {/* QR code */}
          <div className="flex justify-start">
            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <QRCodeSVG value={otpAuthUri} size={180} level="M" />
            </div>
          </div>

          {/* Manual entry */}
          <div>
            <p className="mb-1 text-xs font-medium text-slate-500">
              Can&#39;t scan? Enter this key manually:
            </p>
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <code className="flex-1 font-mono text-xs break-all text-slate-700">{secret}</code>
              <button
                type="button"
                onClick={handleCopy}
                aria-label="Copy secret"
                className="shrink-0 text-slate-400 hover:text-slate-700"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Code input */}
          <FormField label="Verification code" error={codeError} required>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              inputMode="numeric"
              autoComplete="one-time-code"
              className="font-mono tracking-[0.35em]"
            />
          </FormField>

          <div className="flex gap-2">
            <Button onClick={handleEnable} disabled={code.length !== 6}>
              Confirm &amp; Enable
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setStep("idle");
                setCode("");
                setCodeError("");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* ── Enabling spinner ── */}
      {step === "enabling" && (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Verifying code…
        </div>
      )}

      {/* ── Enabled: show Disable button ── */}
      {step === "enabled" && (
        <Button
          variant="outline"
          size="sm"
          className="border-red-200 text-red-600 hover:bg-red-50"
          onClick={() => {
            setStep("disable-form");
            setCode("");
            setCodeError("");
          }}
        >
          Disable 2FA
        </Button>
      )}

      {/* ── Disable confirmation form ── */}
      {step === "disable-form" && (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Enter your current 6-digit code to confirm disabling 2FA.
          </p>
          <FormField label="Authenticator code" error={codeError} required>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              inputMode="numeric"
              autoComplete="one-time-code"
              className="font-mono tracking-[0.35em]"
            />
          </FormField>
          <div className="flex gap-2">
            <Button
              onClick={handleDisable}
              disabled={code.length !== 6}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Disable 2FA
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setStep("enabled");
                setCode("");
                setCodeError("");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* ── Disabling spinner ── */}
      {step === "disabling" && (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Disabling 2FA…
        </div>
      )}
    </div>
  );
}
