"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import type { ActionResult } from "@/server/action-result";

export function useActionForm<T = unknown>(
  action: (formData: FormData) => Promise<ActionResult<T>>,
  options?: { successMessage?: string; onSuccess?: (data: T) => void; refresh?: boolean }
) {
  const [isPending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { show } = useToast();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await action(formData);
      if (result.ok) {
        show(options?.successMessage ?? "تم الحفظ بنجاح");
        if (options?.refresh !== false) router.refresh();
        options?.onSuccess?.(result.data);
      } else {
        setError(result.error);
        if (result.fieldErrors) setFieldErrors(result.fieldErrors);
        show(result.error, "error");
      }
    });
  };

  return { onSubmit, isPending, fieldErrors, error };
}
