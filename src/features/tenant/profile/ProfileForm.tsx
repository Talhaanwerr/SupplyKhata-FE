"use client";

import { useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, User, Camera } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { FormField } from "@/components/ui/form-field";
import { useToast } from "@/components/ui/toast";
import { useAuthStore } from "@/store/auth-store";
import { authApi } from "@/lib/auth";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { getSafeErrorMessage } from "@/lib/safe-error";
import { resolveAssetUrl } from "@/lib/asset-url";
import { TotpSection } from "./TotpSection";

const AVATAR_ACCEPT = new Set(["image/jpeg", "image/png", "image/webp"]);
const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Asia/Dubai",
  "Asia/Karachi",
  "Asia/Kolkata",
  "Asia/Tokyo",
  "Australia/Sydney",
];

const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  timezone: z.string().min(1, "Timezone is required"),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "At least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type ProfileValues = z.infer<typeof profileSchema>;
type PasswordValues = z.infer<typeof passwordSchema>;

export function ProfileForm() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const { toast } = useToast();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName ?? "",
      lastName: user?.lastName ?? "",
      timezone: user?.timezone ?? "UTC",
    },
  });

  const passwordForm = useForm<PasswordValues>({ resolver: zodResolver(passwordSchema) });

  const updateProfile = useApiMutation((data: ProfileValues) => authApi.updateProfile(data), {
    onSuccess: (res, data) => {
      if (user) {
        setUser({
          ...user,
          firstName: data.firstName,
          lastName: data.lastName,
          name: `${data.firstName} ${data.lastName}`.trim(),
          timezone: data.timezone ?? null,
        });
      }
      profileForm.reset(data);
      toast({ title: "Profile updated", variant: "success" });
    },
    onError: (err) => {
      profileForm.setError("root", { message: getSafeErrorMessage(err) });
    },
  });

  const changePassword = useApiMutation(
    (data: PasswordValues) =>
      authApi.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      }),
    {
      onSuccess: () => {
        passwordForm.reset();
        toast({
          title: "Password updated",
          description: "Your new password is active.",
          variant: "success",
        });
      },
      onError: (err) => {
        passwordForm.setError("root", { message: getSafeErrorMessage(err) });
      },
    }
  );

  const uploadAvatar = useApiMutation((file: File) => authApi.uploadAvatar(file), {
    onSuccess: (res) => {
      const avatarUrl = res?.data?.avatarUrl ?? null;
      if (user) {
        setUser({ ...user, avatarUrl });
      }
      toast({ title: "Avatar updated", variant: "success" });
    },
    onError: (err) => {
      toast({
        title: "Avatar upload failed",
        description: getSafeErrorMessage(err),
        variant: "error",
      });
    },
  });

  const clearAvatar = useApiMutation(() => authApi.clearAvatar(), {
    onSuccess: () => {
      if (user) {
        setUser({ ...user, avatarUrl: null });
      }
      toast({ title: "Avatar removed", variant: "success" });
    },
    onError: (err) => {
      toast({
        title: "Could not remove avatar",
        description: getSafeErrorMessage(err),
        variant: "error",
      });
    },
  });

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!AVATAR_ACCEPT.has(file.type)) {
      toast({
        title: "Avatar upload failed",
        description: "Please upload a JPEG, PNG, or WebP image.",
        variant: "error",
      });
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      toast({
        title: "Avatar upload failed",
        description: "Image must be 2 MB or smaller.",
        variant: "error",
      });
      return;
    }

    uploadAvatar.mutate(file);
  }

  async function onProfileSubmit(data: ProfileValues) {
    await updateProfile.mutateAsync(data);
  }

  async function onPasswordSubmit(data: PasswordValues) {
    await changePassword.mutateAsync(data);
  }

  const roleLabel =
    user?.roles && user.roles.length > 0
      ? user.roles.map((r) => r.name).join(", ")
      : user?.isSuperAdmin
        ? "Super Admin"
        : "—";

  const avatarSrc = resolveAssetUrl(user?.avatarUrl);

  return (
    <div className="space-y-6">
      {/* Avatar / identity card */}
      <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-6">
        <div className="relative shrink-0">
          <div className="bg-primary/10 flex h-16 w-16 items-center justify-center overflow-hidden rounded-full">
            {avatarSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarSrc}
                alt={user?.name ?? "Avatar"}
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              <User className="text-primary h-8 w-8" />
            )}
          </div>
          <button
            type="button"
            onClick={() => avatarInputRef.current?.click()}
            disabled={uploadAvatar.isPending || clearAvatar.isPending}
            aria-label="Change avatar"
            className="absolute -right-1 -bottom-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-slate-700 text-white transition-colors hover:bg-slate-900 disabled:opacity-50"
          >
            {uploadAvatar.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Camera className="h-3 w-3" />
            )}
          </button>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={handleAvatarChange}
          />
        </div>
        <div>
          <p className="font-semibold text-slate-900">{user?.name ?? "—"}</p>
          <p className="text-sm text-slate-400">{user?.email ?? "—"}</p>
          <p className="mt-1 text-xs text-slate-300">Role: {roleLabel}</p>
          <p className="mt-1 text-xs text-slate-400">Click the camera icon to change your avatar</p>
          {avatarSrc && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2"
              disabled={clearAvatar.isPending || uploadAvatar.isPending}
              onClick={() => clearAvatar.mutate(undefined)}
            >
              {clearAvatar.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Remove avatar
            </Button>
          )}
        </div>
      </div>

      {/* Personal information */}
      <div className="max-w-lg rounded-xl border border-slate-200 bg-white p-6">
        <h3 className="mb-4 font-semibold text-slate-900">Personal Information</h3>
        <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
          {profileForm.formState.errors.root && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600">
              {profileForm.formState.errors.root.message}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              label="First Name"
              error={profileForm.formState.errors.firstName?.message}
              required
            >
              <Input {...profileForm.register("firstName")} />
            </FormField>
            <FormField
              label="Last Name"
              error={profileForm.formState.errors.lastName?.message}
              required
            >
              <Input {...profileForm.register("lastName")} />
            </FormField>
          </div>

          <FormField
            label="Timezone"
            error={profileForm.formState.errors.timezone?.message}
            required
          >
            <Select {...profileForm.register("timezone")}>
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </Select>
          </FormField>

          <div className="pt-2">
            <Button
              type="submit"
              disabled={updateProfile.isPending || !profileForm.formState.isDirty}
            >
              {updateProfile.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </form>
      </div>

      {/* Two-factor authentication */}
      <TotpSection />

      {/* Change password */}
      <div className="max-w-lg rounded-xl border border-slate-200 bg-white p-6">
        <h3 className="mb-4 font-semibold text-slate-900">Change Password</h3>
        <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
          {passwordForm.formState.errors.root && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600">
              {passwordForm.formState.errors.root.message}
            </div>
          )}

          <FormField
            label="Current Password"
            error={passwordForm.formState.errors.currentPassword?.message}
            required
          >
            <Input
              type="password"
              autoComplete="current-password"
              {...passwordForm.register("currentPassword")}
            />
          </FormField>
          <FormField
            label="New Password"
            error={passwordForm.formState.errors.newPassword?.message}
            required
          >
            <Input
              type="password"
              autoComplete="new-password"
              {...passwordForm.register("newPassword")}
            />
          </FormField>
          <FormField
            label="Confirm New Password"
            error={passwordForm.formState.errors.confirmPassword?.message}
            required
          >
            <Input
              type="password"
              autoComplete="new-password"
              {...passwordForm.register("confirmPassword")}
            />
          </FormField>
          <div className="pt-2">
            <Button type="submit" disabled={changePassword.isPending}>
              {changePassword.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Update Password
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
