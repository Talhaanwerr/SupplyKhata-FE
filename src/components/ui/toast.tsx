"use client";

import * as React from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import { X, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastVariant = "default" | "success" | "error" | "info";

interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (opts: { title: string; description?: string; variant?: ToastVariant }) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

const VARIANT_ICON: Record<ToastVariant, React.ElementType> = {
  default: Info,
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

const VARIANT_STYLES: Record<ToastVariant, string> = {
  default: "border-slate-200 bg-white",
  success: "border-green-200 bg-green-50",
  error: "border-red-200 bg-red-50",
  info: "border-blue-200 bg-blue-50",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([]);

  const toast = React.useCallback(
    ({
      title,
      description,
      variant = "default",
    }: {
      title: string;
      description?: string;
      variant?: ToastVariant;
    }) => {
      const id = crypto.randomUUID();
      setItems((prev) => [...prev, { id, title, description, variant }]);
    },
    []
  );

  function dismiss(id: string) {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      <ToastPrimitive.Provider swipeDirection="right" duration={4000}>
        {children}
        {items.map((item) => {
          const Icon = VARIANT_ICON[item.variant];
          return (
            <ToastPrimitive.Root
              key={item.id}
              open
              onOpenChange={(open) => !open && dismiss(item.id)}
              className={cn(
                "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border p-4 shadow-lg",
                "data-[state=open]:animate-in data-[state=closed]:animate-out",
                "data-[swipe=end]:animate-out data-[state=closed]:fade-out-80",
                "data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full",
                VARIANT_STYLES[item.variant]
              )}
            >
              <Icon
                className={cn(
                  "mt-0.5 h-5 w-5 shrink-0",
                  item.variant === "success" && "text-green-600",
                  item.variant === "error" && "text-red-600",
                  item.variant === "info" && "text-blue-600",
                  item.variant === "default" && "text-slate-500"
                )}
              />
              <div className="min-w-0 flex-1">
                <ToastPrimitive.Title className="text-sm font-semibold text-slate-900">
                  {item.title}
                </ToastPrimitive.Title>
                {item.description && (
                  <ToastPrimitive.Description className="mt-0.5 text-sm text-slate-500">
                    {item.description}
                  </ToastPrimitive.Description>
                )}
              </div>
              <ToastPrimitive.Close
                className="rounded p-1 text-slate-400 hover:bg-black/5 hover:text-slate-600"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </ToastPrimitive.Close>
            </ToastPrimitive.Root>
          );
        })}
        <ToastPrimitive.Viewport className="fixed right-0 bottom-0 z-[100] flex max-h-screen w-full flex-col-reverse gap-2 p-4 sm:right-4 sm:bottom-4 sm:max-w-sm sm:flex-col" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}
