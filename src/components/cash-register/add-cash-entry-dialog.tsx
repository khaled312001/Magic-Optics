"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Lock } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { useActionForm } from "@/components/ui/use-action-form";
import { addCashEntry } from "@/server/cashRegister";
import { cashCategoryLabels, cashCategoryDirection } from "@/lib/labels";

export function AddCashEntryDialog({ date, canManageExpenses = true }: { date: string; canManageExpenses?: boolean }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"IN" | "OUT">("IN");

  const categoryOptions = useMemo(
    () =>
      Object.entries(cashCategoryLabels).filter(
        ([value]) => cashCategoryDirection[value as keyof typeof cashCategoryDirection] === type || cashCategoryDirection[value as keyof typeof cashCategoryDirection] === "BOTH"
      ),
    [type]
  );

  useEffect(() => {
    if (!open) setType("IN");
  }, [open]);

  const { onSubmit, isPending } = useActionForm(addCashEntry, {
    successMessage: "تم تسجيل الحركة",
    onSuccess: () => setOpen(false),
  });

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        حركة جديدة
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} title="تسجيل حركة خزنة" maxWidth="max-w-sm">
        <form onSubmit={onSubmit} className="space-y-4">
          <input type="hidden" name="date" value={date} />

          <div className="flex gap-1 rounded-lg bg-background p-1 text-sm">
            <button
              type="button"
              onClick={() => setType("IN")}
              className={`flex-1 rounded-md py-1.5 font-medium ${type === "IN" ? "bg-emerald-600 text-white" : "text-muted"}`}
            >
              وارد (+)
            </button>
            <button
              type="button"
              onClick={() => canManageExpenses && setType("OUT")}
              disabled={!canManageExpenses}
              title={!canManageExpenses ? "ليس لديك صلاحية تسجيل حركات المنصرف" : undefined}
              className={`flex flex-1 items-center justify-center gap-1 rounded-md py-1.5 font-medium ${
                type === "OUT" ? "bg-red-600 text-white" : "text-muted"
              } ${!canManageExpenses ? "cursor-not-allowed opacity-50" : ""}`}
            >
              {!canManageExpenses && <Lock className="size-3" />}
              منصرف (-)
            </button>
          </div>
          <input type="hidden" name="type" value={type} />

          <div>
            <Label htmlFor="category">البند</Label>
            <Select id="category" name="category" key={type} required defaultValue="">
              <option value="" disabled>
                اختر البند
              </option>
              {categoryOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="amount">المبلغ *</Label>
            <Input id="amount" name="amount" type="number" min={0.01} step="0.01" required />
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
