"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, User, UserPlus, Receipt } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea, FieldError } from "@/components/ui/input";
import { Combobox, type ComboboxItem } from "@/components/ui/combobox";
import { useActionForm } from "@/components/ui/use-action-form";
import { createPrescription } from "@/server/customers";
import { orderTypeLabels } from "@/lib/labels";
import { formatCurrency } from "@/lib/utils";

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
  const [withOrder, setWithOrder] = useState(false);
  const [totalAmount, setTotalAmount] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const remaining = Math.max(0, totalAmount - paidAmount);

  const { onSubmit, isPending, fieldErrors, error } = useActionForm(createPrescription, {
    successMessage: "تم حفظ الكشف الطبي",
    onSuccess: (data) => {
      setOpen(false);
      const result = data as { id: number; orderId?: number };
      if (result.orderId) router.push(`/orders/${result.orderId}/receipt?auto=1`);
      else if (!customerId) router.push(`/prescriptions/${result.id}`);
    },
    refresh: !!customerId && !withOrder,
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

          <div className="w-40">
            <Label htmlFor="p-date">التاريخ</Label>
            <Input id="p-date" name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] border-collapse text-sm">
              <thead>
                <tr className="text-xs text-muted">
                  <th className="w-16 text-right"></th>
                  <th colSpan={3} className="pb-2 text-center font-semibold text-brand-navy">
                    العين اليمنى (Right)
                  </th>
                  <th className="w-20 pb-2 text-center font-semibold text-foreground">IPD</th>
                  <th colSpan={3} className="pb-2 text-center font-semibold text-brand-teal-dark">
                    العين اليسرى (Left)
                  </th>
                </tr>
                <tr className="text-xs text-muted">
                  <th></th>
                  <th className="pb-2 font-normal">SPH</th>
                  <th className="pb-2 font-normal">CYL</th>
                  <th className="pb-2 font-normal">AXIS</th>
                  <th></th>
                  <th className="pb-2 font-normal">AXIS</th>
                  <th className="pb-2 font-normal">CYL</th>
                  <th className="pb-2 font-normal">SPH</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="py-1 pl-2 text-xs font-medium text-foreground">بعيد (D)</td>
                  <RxCell name="rightSphFar" />
                  <RxCell name="rightCylFar" />
                  <RxCell name="rightAxisFar" />
                  <td rowSpan={2} className="px-0.5 py-1">
                    <Input id="ipd" name="ipd" type="number" step="0.5" className="h-9 px-2 text-center" />
                  </td>
                  <RxCell name="leftAxisFar" />
                  <RxCell name="leftCylFar" />
                  <RxCell name="leftSphFar" />
                </tr>
                <tr>
                  <td className="py-1 pl-2 text-xs font-medium text-foreground">قريب (R)</td>
                  <RxCell name="rightSphNear" />
                  <RxCell name="rightCylNear" />
                  <RxCell name="rightAxisNear" />
                  <RxCell name="leftAxisNear" />
                  <RxCell name="leftCylNear" />
                  <RxCell name="leftSphNear" />
                </tr>
              </tbody>
            </table>
          </div>

          <div>
            <Label htmlFor="p-notes">ملاحظات</Label>
            <Textarea id="p-notes" name="notes" rows={2} />
          </div>

          <div className="rounded-lg border border-dashed border-brand-teal/40 bg-brand-teal/5 p-3">
            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <input
                type="checkbox"
                checked={withOrder}
                onChange={(e) => setWithOrder(e.target.checked)}
                className="size-4 rounded"
              />
              <Receipt className="size-4 text-brand-teal-dark" />
              إضافة طلب/فاتورة مرتبطة بهذا الكشف
            </label>

            {withOrder && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="orderType">نوع الطلب</Label>
                  <Select id="orderType" name="orderType" defaultValue="MEDICAL">
                    {Object.entries(orderTypeLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="deliveryDate">ميعاد الاستلام</Label>
                  <Input id="deliveryDate" name="deliveryDate" type="date" />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="orderDescription">اسم الصنف / تفاصيل الطلب</Label>
                  <Input id="orderDescription" name="orderDescription" placeholder="مثال: نظارة طبية + عدسات سيلفر" />
                </div>
                <div>
                  <Label htmlFor="totalAmount">القيمة</Label>
                  <Input
                    id="totalAmount"
                    name="totalAmount"
                    type="number"
                    min={0}
                    step="0.01"
                    value={totalAmount || ""}
                    onChange={(e) => setTotalAmount(Number(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label htmlFor="paidAmount">الدفعة</Label>
                  <Input
                    id="paidAmount"
                    name="paidAmount"
                    type="number"
                    min={0}
                    max={totalAmount}
                    step="0.01"
                    value={paidAmount || ""}
                    onChange={(e) => setPaidAmount(Number(e.target.value) || 0)}
                  />
                </div>
                <div className="col-span-2 flex items-center justify-between rounded-lg bg-background px-3 py-2 text-sm">
                  <span className="text-muted">الباقي</span>
                  <span className="font-bold text-red-600">{formatCurrency(remaining)}</span>
                </div>
              </div>
            )}
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
