import { z } from "zod";

/** Non-negative money: digits with optional max 2 decimal places (e.g. 80, 80.5, 80.50). */
export const MONEY_RE = /^\d+(\.\d{1,2})?$/;

/** Non-negative whole number (no decimals). */
export const INT_RE = /^\d+$/;

/** Non-negative qty with optional max 3 decimal places (base units). */
export const QTY_RE = /^\d+(\.\d{1,3})?$/;

export function refineNonNegativeMoney(
  val: string | undefined,
  label: string,
  ctx: z.RefinementCtx,
  path: string,
  opts?: { required?: boolean }
) {
  if (val == null || val.trim() === "") {
    if (opts?.required) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${label} is required`,
        path: [path],
      });
    }
    return;
  }
  const trimmed = val.trim();
  const n = Number(trimmed);
  if (!Number.isFinite(n)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `${label} must be a valid amount`,
      path: [path],
    });
    return;
  }
  if (n < 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `${label} cannot be negative`,
      path: [path],
    });
    return;
  }
  if (!MONEY_RE.test(trimmed)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `${label} can have at most 2 decimal places`,
      path: [path],
    });
  }
}

export function refineNonNegativeInteger(
  val: string | undefined,
  label: string,
  ctx: z.RefinementCtx,
  path: string,
  opts?: { required?: boolean }
) {
  if (val == null || val.trim() === "") {
    if (opts?.required) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${label} is required`,
        path: [path],
      });
    }
    return;
  }
  const trimmed = val.trim();
  const n = Number(trimmed);
  if (!Number.isFinite(n)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `${label} must be a whole number`,
      path: [path],
    });
    return;
  }
  if (n < 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `${label} cannot be negative`,
      path: [path],
    });
    return;
  }
  if (!INT_RE.test(trimmed) || !Number.isInteger(n)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `${label} must be a whole number (no decimals)`,
      path: [path],
    });
  }
}

/** Validate qty string: whole if !allowFractional, else max 3 decimals. */
export function refineQuantity(
  val: string | undefined,
  label: string,
  ctx: z.RefinementCtx,
  path: string,
  opts: { allowFractional: boolean; required?: boolean }
) {
  if (val == null || val.trim() === "") {
    if (opts.required) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${label} is required`,
        path: [path],
      });
    }
    return;
  }
  const trimmed = val.trim();
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `${label} must be a non-negative number`,
      path: [path],
    });
    return;
  }
  if (!opts.allowFractional) {
    if (!INT_RE.test(trimmed) || !Number.isInteger(n)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${label} must be a whole number`,
        path: [path],
      });
    }
    return;
  }
  if (!QTY_RE.test(trimmed)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `${label} can have at most 3 decimal places`,
      path: [path],
    });
  }
}

/** Parse optional money string after Zod has already validated it. */
export function parseOptionalNumber(value?: string): number | undefined {
  if (value == null || value.trim() === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}
