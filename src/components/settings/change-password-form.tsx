"use client";

import { useRef } from "react";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useActionForm } from "@/components/ui/use-action-form";
import { changeOwnPassword } from "@/server/settings";

export function ChangePasswordForm() {
  const formRef = useRef<HTMLFormElement>(null);

  const { onSubmit, isPending, error } = useActionForm(changeOwnPassword, {
    successMessage: "تم تغيير كلمة المرور بنجاح",
    refresh: false,
    onSuccess: () => formRef.current?.reset(),
  });

  return (
    <form ref={formRef} onSubmit={onSubmit} className="max-w-sm space-y-4">
      {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <div>
        <Label htmlFor="currentPassword">كلمة المرور الحالية *</Label>
        <Input id="currentPassword" name="currentPassword" type="password" dir="ltr" required />
      </div>
      <div>
        <Label htmlFor="newPassword">كلمة المرور الجديدة *</Label>
        <Input id="newPassword" name="newPassword" type="password" dir="ltr" required minLength={6} />
      </div>
      <Button type="submit" loading={isPending}>
        تحديث كلمة المرور
      </Button>
    </form>
  );
}
