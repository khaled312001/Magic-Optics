"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, User, Receipt } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, FieldError } from "@/components/ui/input";
import { Combobox, type ComboboxItem } from "@/components/ui/combobox";
import { useActionForm } from "@/components/ui/use-action-form";
import { createPrescription } from "@/server/customers";
import { orderTypeLabels } from "@/lib/labels";
import { formatCurrency } from "@/lib/utils";
import { DateField, todayIso } from "@/components/ui/date-field";
import { RxTable } from "@/components/customers/rx-table";

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
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);
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
    refresh: !!customerId && totalAmount <= 0,
  });

  const customerItems: ComboboxItem[] = (customers ?? []).map((c) => ({ id: c.id, label: c.name, sublabel: c.phone ?? undefined }));

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setTotalAmount(0);
          setPaidAmount(0);
          setOpen(true);
        }}
      >
        <Plus className="size-3.5" />
        كشف جديد
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} title="إضافة كشف نظر" maxWidth="max-w-4xl">
        <form onSubmit={onSubmit} className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-12">
            {customerId ? (
              <input type="hidden" name="customerId" value={customerId} />
            ) : selectedCustomer ? (
              <div className="col-span-2 sm:col-span-9">
                <Label>العميل</Label>
                <div className="flex h-10 items-center justify-between gap-3 rounded-lg border border-brand-teal/50 bg-brand-teal/10 px-3">
                  <input type="hidden" name="customerId" value={selectedCustomer.id} />
                  <div className="flex min-w-0 items-center gap-2 text-sm">
                    <User className="size-4 shrink-0 text-brand-teal-dark" />
                    <span className="truncate font-semibold text-foreground">{selectedCustomer.name}</span>
                    {selectedCustomer.phone && (
                      <span className="text-muted" dir="ltr">
                        {selectedCustomer.phone}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedCustomer(null)}
                    className="shrink-0 text-xs font-semibold text-brand-navy hover:underline"
                  >
                    تغيير
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="col-span-2 sm:col-span-3">
                  <Label htmlFor="newCustomerName">اسم العميل *</Label>
                  <Input id="newCustomerName" name="newCustomerName" required />
                </div>
                <div className="col-span-1 sm:col-span-3">
                  <Label htmlFor="newCustomerPhone">رقم التليفون</Label>
                  <Input id="newCustomerPhone" name="newCustomerPhone" inputMode="tel" dir="ltr" className="text-right" />
                </div>
                <div className="col-span-1 sm:col-span-3">
                  <Label>أو عميل مسجل</Label>
                  <Combobox
                    items={customerItems}
                    placeholder="ابحث بالاسم أو التليفون..."
                    onSelect={(item) => {
                      const c = (customers ?? []).find((x) => x.id === item.id);
                      if (c) setSelectedCustomer(c);
                    }}
                  />
                </div>
              </>
            )}
            <div className="col-span-2 sm:col-span-3">
              <Label htmlFor="p-date">التاريخ</Label>
              <DateField id="p-date" name="date" defaultValue={todayIso()} className="w-full" />
            </div>
            {fieldErrors.customerId && (
              <div className="col-span-2 sm:col-span-12">
                <FieldError>{fieldErrors.customerId}</FieldError>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border bg-background p-2">
            <RxTable />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <Label htmlFor="p-doctor">اسم الطبيب</Label>
              <Input id="p-doctor" name="doctorName" />
            </div>
            <div>
              <Label htmlFor="p-frame">الفريم</Label>
              <Input id="p-frame" name="frame" />
            </div>
            <div>
              <Label htmlFor="p-lens">نوع العدسات</Label>
              <Input id="p-lens" name="lensType" />
            </div>
            <div>
              <Label htmlFor="p-notes">ملاحظات</Label>
              <Input id="p-notes" name="notes" />
            </div>
          </div>

          <div className="rounded-xl border border-dashed border-brand-teal/50 bg-brand-teal/5 px-3 py-2.5">
            <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Receipt className="size-4 text-brand-teal-dark" />
              الطلب / الفاتورة
              <span className="text-xs font-normal text-muted">(اكتب القيمة لعمل فاتورة مع الكشف)</span>
            </p>

            <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-5">
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
                <Label htmlFor="deliveryDate">موعد التسليم</Label>
                <DateField id="deliveryDate" name="deliveryDate" className="w-full" />
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
                <Label htmlFor="paidAmount">المدفوع</Label>
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
              <div className="col-span-2 sm:col-span-1">
                <Label>الباقي</Label>
                <div className="flex h-10 items-center justify-center rounded-lg bg-red-50 text-sm font-bold text-red-600">
                  {formatCurrency(remaining)}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
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
