"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { useActionForm } from "@/components/ui/use-action-form";
import { addPayment } from "@/server/orders";
import { formatCurrency } from "@/lib/utils";

export function AddPaymentDialog({ orderId, remaining }: { orderId: number; remaining: number }) {
  const [open, setOpen] = useState(false);

  const { onSubmit, isPending } = useActionForm(addPayment, {
    successMessage: "تم تسجيل الدفعة",
    onSuccess: () => setOpen(false),
  });

  if (remaining <= 0.01) return null;

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="size-3.5" />
        تسجيل دفعة
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} title="تسجيل دفعة جديدة" maxWidth="max-w-sm">
        <form onSubmit={onSubmit} className="space-y-4">
          <input type="hidden" name="orderId" value={orderId} />
          <p className="text-sm text-muted">المبلغ المتبقي: {formatCurrency(remaining)}</p>
          <div>
            <Label htmlFor="amount">المبلغ *</Label>
            <Input id="amount" name="amount" type="number" min={0.01} step="0.01" max={remaining} required autoFocus />
          </div>
          <div>
            <Label htmlFor="note">ملاحظة</Label>
            <Textarea id="note" name="note" rows={2} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit" loading={isPending}>
              حفظ
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
