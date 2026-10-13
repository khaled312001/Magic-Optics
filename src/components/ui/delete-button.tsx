"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import type { ActionResult } from "@/server/action-result";

export function DeleteButton({
  action,
  confirmTitle = "تأكيد الحذف",
  confirmMessage = "هل أنت متأكد من الحذف؟ لا يمكن التراجع عن هذا الإجراء.",
  label,
  size = "icon",
  redirectTo,
}: {
  action: () => Promise<ActionResult<unknown>>;
  confirmTitle?: string;
  confirmMessage?: string;
  label?: string;
  size?: "icon" | "sm" | "md";
  /** بدل تحديث الصفحة الحالية - للحذف من صفحة تفاصيل العنصر نفسه الذي سيختفي بعد الحذف */
  redirectTo?: string;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { show } = useToast();

  const onConfirm = () => {
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        show("تم الحذف بنجاح");
        setOpen(false);
        if (redirectTo) router.push(redirectTo);
        else router.refresh();
      } else {
        show(result.error, "error");
      }
    });
  };

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size={size === "icon" ? "icon" : size}
        className="text-red-600 hover:bg-red-50"
        onClick={() => setOpen(true)}
        title="حذف"
      >
        <Trash2 className="size-4" />
        {label}
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={confirmTitle} maxWidth="max-w-sm">
        <p className="text-sm text-muted">{confirmMessage}</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            إلغاء
          </Button>
          <Button variant="danger" onClick={onConfirm} loading={isPending}>
            حذف
          </Button>
        </div>
      </Dialog>
    </>
  );
}
