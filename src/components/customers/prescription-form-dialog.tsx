"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { useActionForm } from "@/components/ui/use-action-form";
import { createPrescription } from "@/server/customers";

export function PrescriptionFormDialog({ customerId }: { customerId: number }) {
  const [open, setOpen] = useState(false);

  const { onSubmit, isPending } = useActionForm(createPrescription, {
    successMessage: "تم حفظ الكشف الطبي",
    onSuccess: () => setOpen(false),
  });

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus className="size-3.5" />
        كشف جديد
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} title="إضافة كشف نظر" maxWidth="max-w-2xl">
        <form onSubmit={onSubmit} className="space-y-5">
          <input type="hidden" name="customerId" value={customerId} />

          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr className="text-xs text-muted">
                  <th className="w-20 text-right"></th>
                  <th colSpan={3} className="pb-2 text-center font-semibold text-brand-navy">
                    العين اليمنى (Right)
                  </th>
                  <th colSpan={3} className="pb-2 text-center font-semibold text-brand-teal-dark">
                    العين اليسرى (Left)
                  </th>
                </tr>
                <tr className="text-xs text-muted">
                  <th></th>
                  <th className="pb-2 font-normal">SPH</th>
                  <th className="pb-2 font-normal">CYL</th>
                  <th className="pb-2 font-normal">AXIS</th>
                  <th className="pb-2 font-normal">SPH</th>
                  <th className="pb-2 font-normal">CYL</th>
                  <th className="pb-2 font-normal">AXIS</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="py-1 pl-2 text-xs font-medium text-foreground">بعيد (D)</td>
                  <RxCell name="rightSphFar" />
                  <RxCell name="rightCylFar" />
                  <RxCell name="rightAxisFar" />
                  <RxCell name="leftSphFar" />
                  <RxCell name="leftCylFar" />
                  <RxCell name="leftAxisFar" />
                </tr>
                <tr>
                  <td className="py-1 pl-2 text-xs font-medium text-foreground">قريب (R)</td>
                  <RxCell name="rightSphNear" />
                  <RxCell name="rightCylNear" />
                  <RxCell name="rightAxisNear" />
                  <RxCell name="leftSphNear" />
                  <RxCell name="leftCylNear" />
                  <RxCell name="leftAxisNear" />
                </tr>
              </tbody>
            </table>
          </div>

          <div className="w-32">
            <Label htmlFor="ipd">IPD</Label>
            <Input id="ipd" name="ipd" type="number" step="0.5" />
          </div>

          <div>
            <Label htmlFor="p-notes">ملاحظات</Label>
            <Textarea id="p-notes" name="notes" rows={2} />
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

function RxCell({ name }: { name: string }) {
  return (
    <td className="px-0.5 py-1">
      <Input name={name} type="number" step="0.25" className="h-9 px-2 text-center" />
    </td>
  );
}
