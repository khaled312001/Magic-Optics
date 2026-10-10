export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export function okResult<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function errorResult(error: string, fieldErrors?: Record<string, string[]>): ActionResult<never> {
  return { ok: false, error, fieldErrors };
}

import { ZodError } from "zod";
import { UnauthorizedError } from "@/lib/auth-helpers";

export function handleActionError(err: unknown): ActionResult<never> {
  if (err instanceof ZodError) {
    return errorResult("بيانات غير صحيحة", err.flatten().fieldErrors as Record<string, string[]>);
  }
  if (err instanceof UnauthorizedError) {
    return errorResult(err.message);
  }
  if (
    err &&
    typeof err === "object" &&
    "code" in err &&
    (err as { code: string }).code === "P2002"
  ) {
    return errorResult("هذه القيمة مستخدمة بالفعل");
  }
  console.error(err);
  return errorResult("حدث خطأ غير متوقع، حاول مرة أخرى");
}
