/**
 * Safe user-facing error messages.
 * Never surface raw stack traces or internal exception details to the UI.
 */
import { ApiError } from "./api-error";

const GENERIC = "Something went wrong. Please try again.";

export function getSafeErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    // Prefer short API message; never expose nested stack/debug payloads
    const msg = error.message?.trim();
    if (!msg) return GENERIC;
    // Truncate overly long / suspicious payloads
    if (msg.length > 200) return GENERIC;
    if (/stack|exception|prisma|sql|econnrefused/i.test(msg)) return GENERIC;
    return humanizeFileValidation(msg);
  }

  if (error instanceof Error && error.message && error.message.length < 120) {
    return humanizeFileValidation(error.message);
  }

  return GENERIC;
}

function humanizeFileValidation(message: string): string {
  if (/expected type is \/?\^?image|file type is application\//i.test(message)) {
    return "Please upload a JPEG, PNG, or WebP image.";
  }
  if (/maxFileSize|File is larger than|expected size is/i.test(message)) {
    return "Image must be 2 MB or smaller.";
  }
  return message;
}
