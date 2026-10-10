"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, User, UserPlus } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea, FieldError } from "@/components/ui/input";
import { Combobox, type ComboboxItem } from "@/components/ui/combobox";
import { useActionForm } from "@/components/ui/use-action-form";
import { createPrescription } from "@/server/customers";

type CustomerOption = { id: number; name: string; phone: string | null };

export function PrescriptionFormDialog({
  customerId,
  customers,
}: {
  customerId?: number;
  customers?: CustomerOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [customerMode, setCustomerMode] = useState<"existing" | "new">("existing");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);

  const { onSubmit, isPending, fieldErrors, error } = useActionForm(createPrescription, {
    successMessage: "تم حفظ الكشف الطبي",
    onSuccess: (data) => {
      setOpen(false);
      if (!customerId) router.push(`/prescriptions/${(data as { id: number }).id}`);
    },
    refresh: !!customerId,
  });

  const customerItems: ComboboxItem[] = (customers ?? []).map((c) => ({ id: c.id, label: c.name, sublabel: c.phone ?? undefined }));

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus className="size-3.5" />
        كشف جديد
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} title="إضافة كشف نظر" maxWidth="max-w-2xl">
        <form onSubmit={onSubmit} className="space-y-5">
          {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

          {customerId ? (
            <input type="hidden" name="customerId" value={customerId} />
          ) : (
            <div>
              <div className="mb-2 flex gap-1 rounded-lg bg-background p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setCustomerMode("existing")}
                  className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 font-medium ${customerMode === "existing" ? "bg-surface shadow-sm text-foreground" : "text-muted"}`}
                >
                  <User className="size-3.5" /> عميل حالي
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCustomerMode("new");
                    setSelectedCustomer(null);
                  }}
                  className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 font-medium ${customerMode === "new" ? "bg-surface shadow-sm text-foreground" : "text-muted"}`}
                >
                  <UserPlus className="size-3.5" /> عميل جديد
                </button>
              </div>

              {customerMode === "existing" ? (
                <div>
                  {selectedCustomer && <input type="hidden" name="customerId" value={selectedCustomer.id} />}
                  <Label>اختر العميل</Label>
                  <Combobox
                    items={customerItems}
                    placeholder="ابحث بالاسم أو الهاتف..."
                    selectedLabel={selectedCustomer?.name}
                    onSelect={(item) => {
                      const c = (customers ?? []).find((x) => x.id === item.id);
                      if (c) setSelectedCustomer(c);
                    }}
                  />
                  <FieldError>{fieldErrors.customerId}</FieldError>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="newCustomerName">اسم العميل *</Label>
                    <Input id="newCustomerName" name="newCustomerName" required />
                  </div>
                  <div>
                    <Label htmlFor="newCustomerPhone">رقم الهاتف</Label>
                    <Input id="newCustomerPhone" name="newCustomerPhone" dir="ltr" className="text-right" />
                  </div>
                </div>
              )}
            </div>
          )}

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
