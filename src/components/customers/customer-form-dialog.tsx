"use client";

import { useState } from "react";
import { Plus, Pencil } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea, FieldError } from "@/components/ui/input";
import { useActionForm } from "@/components/ui/use-action-form";
import { createCustomer, updateCustomer } from "@/server/customers";
import type { Customer } from "@prisma/client";

export function CustomerFormDialog({ customer }: { customer?: Customer }) {
  const [open, setOpen] = useState(false);
  const isEdit = Boolean(customer);

  const { onSubmit, isPending, fieldErrors } = useActionForm(
    (fd) => (isEdit ? updateCustomer(customer!.id, fd) : createCustomer(fd)),
    {
      successMessage: isEdit ? "تم تحديث بيانات العميل" : "تم إضافة العميل",
      onSuccess: () => setOpen(false),
    }
  );

  return (
    <>
      {isEdit ? (
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          <Pencil className="size-3.5" />
          تعديل
        </Button>
      ) : (
        <Button onClick={() => setOpen(true)}>
          <Plus className="size-4" />
          عميل جديد
        </Button>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} title={isEdit ? "تعديل بيانات العميل" : "إضافة عميل جديد"}>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">الاسم *</Label>
            <Input id="name" name="name" defaultValue={customer?.name} required />
            <FieldError>{fieldErrors.name}</FieldError>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="phone">رقم الهاتف</Label>
              <Input id="phone" name="phone" dir="ltr" className="text-right" defaultValue={customer?.phone ?? ""} />
            </div>
            <div>
              <Label htmlFor="phone2">رقم هاتف آخر</Label>
              <Input id="phone2" name="phone2" dir="ltr" className="text-right" defaultValue={customer?.phone2 ?? ""} />
            </div>
          </div>

          <div>
            <Label htmlFor="address">العنوان</Label>
            <Input id="address" name="address" defaultValue={customer?.address ?? ""} />
          </div>

          <div>
            <Label htmlFor="notes">ملاحظات</Label>
            <Textarea id="notes" name="notes" rows={3} defaultValue={customer?.notes ?? ""} />
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
