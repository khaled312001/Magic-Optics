"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { useActionForm } from "@/components/ui/use-action-form";
import { updatePrescription } from "@/server/customers";
import { DateField } from "@/components/ui/date-field";
import { RxTable, type RxValues } from "@/components/customers/rx-table";

export type EditablePrescription = RxValues & {
  id: number;
  date: string;
  doctorName: string | null;
  frame: string | null;
  lensType: string | null;
  notes: string | null;
};

/** تعديل كشف نظر محفوظ (القياسات وبيانات الورقة) - الفاتورة المرتبطة لا تتغير */
export function PrescriptionEditDialog({ prescription, size = "sm" }: { prescription: EditablePrescription; size?: "sm" | "md" }) {
  const [open, setOpen] = useState(false);
  const { onSubmit, isPending, error } = useActionForm(updatePrescription.bind(null, prescription.id), {
    successMessage: "تم تعديل الكشف",
    onSuccess: () => setOpen(false),
    refresh: true,
  });

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          size === "sm"
            ? "inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium text-brand-navy hover:bg-background"
            : "inline-flex h-8 items-center gap-1 rounded-lg border border-border bg-surface px-3 text-xs font-medium text-foreground transition-colors hover:bg-background"
        }
      >
        <Pencil className="size-3.5" />
        تعديل
      </button>

      <Dialog open={open} onClose={() => setOpen(false)} title="تعديل كشف النظر" maxWidth="max-w-4xl">
        <form onSubmit={onSubmit} className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>}

          <div className="w-48">
            <Label htmlFor={`e-date-${prescription.id}`}>التاريخ</Label>
            <DateField id={`e-date-${prescription.id}`} name="date" defaultValue={prescription.date} className="w-full" />
          </div>

          <RxTable defaultValues={prescription} />

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <Label htmlFor={`e-doctor-${prescription.id}`}>اسم الطبيب</Label>
              <Input id={`e-doctor-${prescription.id}`} name="doctorName" defaultValue={prescription.doctorName ?? ""} />
            </div>
            <div>
              <Label htmlFor={`e-frame-${prescription.id}`}>الفريم</Label>
              <Input id={`e-frame-${prescription.id}`} name="frame" defaultValue={prescription.frame ?? ""} />
            </div>
            <div>
              <Label htmlFor={`e-lens-${prescription.id}`}>نوع العدسات</Label>
              <Input id={`e-lens-${prescription.id}`} name="lensType" defaultValue={prescription.lensType ?? ""} />
            </div>
            <div>
              <Label htmlFor={`e-notes-${prescription.id}`}>ملاحظات</Label>
              <Input id={`e-notes-${prescription.id}`} name="notes" defaultValue={prescription.notes ?? ""} />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit" loading={isPending}>
              حفظ التعديل
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
