"use client";

import { useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

interface FileUploaderProps {
  accept?: string;
  maxSizeMb?: number;
  onSelect?: (file: File) => void;
  onClear?: () => void;
  preview?: React.ReactNode;
  disabled?: boolean;
  className?: string;
  label?: string;
}

/**
 * Accessible file picker with size validation.
 * Does not upload — callers wire the selected File to their API.
 */
export function FileUploader({
  accept = "image/*",
  maxSizeMb = 5,
  onSelect,
  onClear,
  preview,
  disabled,
  className,
  label = "Choose file",
}: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > maxSizeMb * 1024 * 1024) {
      setError(`File must be under ${maxSizeMb} MB`);
      setFileName(null);
      e.target.value = "";
      return;
    }

    setError(null);
    setFileName(file.name);
    onSelect?.(file);
  }

  function clear() {
    setFileName(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
    onClear?.();
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-4">
        {preview}
        <div className="min-w-0 flex-1">
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="sr-only"
            id="file-uploader"
            disabled={disabled}
            onChange={handleChange}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="h-4 w-4" />
              {label}
            </Button>
            {fileName && (
              <span className="flex items-center gap-1 truncate text-xs text-slate-500">
                {fileName}
                <button
                  type="button"
                  onClick={clear}
                  className="rounded p-0.5 hover:bg-slate-100"
                  aria-label="Clear file"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-400">Max {maxSizeMb} MB</p>
        </div>
      </div>
      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
