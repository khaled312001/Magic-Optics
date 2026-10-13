"use client";

import { useState } from "react";
import { Plus, Pencil } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, FieldError } from "@/components/ui/input";
import { useActionForm } from "@/components/ui/use-action-form";
import { createUser, updateUser } from "@/server/users";
import { roleLabels } from "@/lib/labels";
import type { User } from "@prisma/client";

export function UserFormDialog({ user }: { user?: User }) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<"ADMIN" | "EMPLOYEE">(user?.role ?? "EMPLOYEE");
  const isEdit = Boolean(user);

  const { onSubmit, isPending, fieldErrors } = useActionForm(
    (fd) => (isEdit ? updateUser(user!.id, fd) : createUser(fd)),
    {
      successMessage: isEdit ? "تم تحديث المستخدم" : "تم إضافة المستخدم",
      onSuccess: () => setOpen(false),
    }
  );

  return (
    <>
      {isEdit ? (
        <Button variant="ghost" size="icon" onClick={() => setOpen(true)} title="تعديل">
          <Pencil className="size-4" />
        </Button>
      ) : (
        <Button onClick={() => setOpen(true)}>
          <Plus className="size-4" />
          مستخدم جديد
        </Button>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} title={isEdit ? "تعديل المستخدم" : "إضافة مستخدم جديد"} maxWidth="max-w-sm">
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">الاسم *</Label>
            <Input id="name" name="name" defaultValue={user?.name} required />
            <FieldError>{fieldErrors.name}</FieldError>
          </div>

          <div>
            <Label htmlFor="username">اسم المستخدم (دخول) *</Label>
            <Input id="username" name="username" dir="ltr" className="text-right" defaultValue={user?.username} required />
            <FieldError>{fieldErrors.username}</FieldError>
          </div>

          <div>
            <Label htmlFor="password">{isEdit ? "كلمة مرور جديدة (اتركها فارغة للإبقاء عليها)" : "كلمة المرور *"}</Label>
            <Input id="password" name="password" type="password" dir="ltr" required={!isEdit} />
            <FieldError>{fieldErrors.password}</FieldError>
          </div>

          <div>
            <Label htmlFor="role">الصلاحية</Label>
            <Select id="role" name="role" value={role} onChange={(e) => setRole(e.target.value as "ADMIN" | "EMPLOYEE")}>
              {Object.entries(roleLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>

          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="hidden" name="active" value="false" />
            <input type="checkbox" name="active" value="true" defaultChecked={user?.active ?? true} className="size-4 rounded" />
            حساب مفعّل
          </label>

          {role === "EMPLOYEE" && (
            <div className="space-y-2 rounded-lg border border-border bg-background p-3">
              <p className="text-xs font-medium text-muted">صلاحيات الموظف</p>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input type="hidden" name="canEditInventory" value="false" />
                <input
                  type="checkbox"
                  name="canEditInventory"
                  value="true"
                  defaultChecked={user?.canEditInventory ?? true}
                  className="size-4 rounded"
                />
                السماح بتعديل/إضافة أصناف المخزون وتسوية الكميات
              </label>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input type="hidden" name="canManageExpenses" value="false" />
                <input
                  type="checkbox"
                  name="canManageExpenses"
                  value="true"
                  defaultChecked={user?.canManageExpenses ?? true}
                  className="size-4 rounded"
                />
                السماح بتسجيل حركات المنصرف بالخزنة (مصروفات/مشتريات/سحب)
              </label>
            </div>
          )}

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
