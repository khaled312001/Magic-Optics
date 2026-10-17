"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, User, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea, FieldError } from "@/components/ui/input";
import { Combobox, type ComboboxItem } from "@/components/ui/combobox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useActionForm } from "@/components/ui/use-action-form";
import { createOrder } from "@/server/orders";
import { formatCurrency } from "@/lib/utils";
import { orderTypeLabels, orderStatusLabels, productCategoryShortLabels } from "@/lib/labels";
import { DateField } from "@/components/ui/date-field";

type CustomerOption = { id: number; name: string; phone: string | null };
type ProductOption = {
  id: number;
  name: string;
  code: string | null;
  sellPrice: number;
  category: string;
};
type PrescriptionOption = { id: number; date: string };

type ItemRow = {
  key: string;
  productId: number | null;
  description: string;
  quantity: number;
  unitPrice: number;
};

function emptyRow(): ItemRow {
  return { key: Math.random().toString(36).slice(2), productId: null, description: "", quantity: 1, unitPrice: 0 };
}

const EXAM_FEE_DESCRIPTION = "عدسات";

export function OrderForm({
  customers,
  products,
  preselectedCustomer,
  examFee = 0,
}: {
  customers: CustomerOption[];
  products: ProductOption[];
  preselectedCustomer?: { id: number; name: string; phone: string | null; prescriptions: PrescriptionOption[] };
  /** سعر كشف نظر العدسات (من بيانات المحل) - يُقترح كصنف اختياري عند اختيار نوع الطلب "نظارة طبية" */
  examFee?: number;
}) {
  const router = useRouter();
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(preselectedCustomer ?? null);
  const [items, setItems] = useState<ItemRow[]>([emptyRow()]);
  const [orderType, setOrderType] = useState("MEDICAL");

  const hasExamFeeItem = items.some((i) => i.description === EXAM_FEE_DESCRIPTION);

  function toggleExamFee(checked: boolean) {
    if (checked) {
      setItems((rows) => {
        const withoutEmpty = rows.filter((r) => r.description.trim() || r.productId);
        return [...withoutEmpty, { key: Math.random().toString(36).slice(2), productId: null, description: EXAM_FEE_DESCRIPTION, quantity: 1, unitPrice: examFee }];
      });
    } else {
      setItems((rows) => {
        const next = rows.filter((r) => r.description !== EXAM_FEE_DESCRIPTION);
        return next.length > 0 ? next : [emptyRow()];
      });
    }
  }

  const { onSubmit, isPending, fieldErrors, error } = useActionForm(createOrder, {
    successMessage: "تم إنشاء الفاتورة",
    onSuccess: (data) => router.push(`/orders/${(data as { id: number }).id}/receipt?auto=1`),
    refresh: false,
  });

  const customerItems: ComboboxItem[] = useMemo(
    () => customers.map((c) => ({ id: c.id, label: c.name, sublabel: c.phone ?? undefined })),
    [customers]
  );

  const productItems: ComboboxItem[] = useMemo(
    () =>
      products.map((p) => ({
        id: p.id,
        label: p.name,
        sublabel: [p.code, productCategoryShortLabels[p.category as keyof typeof productCategoryShortLabels]].filter(Boolean).join(" · "),
        trailing: formatCurrency(p.sellPrice),
        keywords: p.code ?? undefined,
      })),
    [products]
  );

  const total = items.reduce((s, it) => s + it.quantity * it.unitPrice, 0);

  function updateItem(key: string, patch: Partial<ItemRow>) {
    setItems((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function removeItem(key: string) {
    setItems((rows) => (rows.length > 1 ? rows.filter((r) => r.key !== key) : rows));
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <input type="hidden" name="items" value={JSON.stringify(items.filter((i) => i.description.trim()))} />
      {selectedCustomer && <input type="hidden" name="customerId" value={selectedCustomer.id} />}

      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <Card>
        <CardHeader>
          <CardTitle>بيانات العميل</CardTitle>
        </CardHeader>
        <CardContent>
          {selectedCustomer ? (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-brand-teal/40 bg-brand-teal/5 px-3 py-2.5">
              <div className="flex min-w-0 items-center gap-2 text-sm">
                <User className="size-4 shrink-0 text-brand-teal-dark" />
                <span className="truncate font-medium text-foreground">{selectedCustomer.name}</span>
                {selectedCustomer.phone && (
                  <span className="text-muted" dir="ltr">
                    {selectedCustomer.phone}
                  </span>
                )}
              </div>
              {!preselectedCustomer && (
                <button
                  type="button"
                  onClick={() => setSelectedCustomer(null)}
                  className="shrink-0 text-xs font-medium text-brand-navy hover:underline"
                >
                  تغيير
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="newCustomerName">اسم العميل *</Label>
                  <Input id="newCustomerName" name="newCustomerName" required />
                </div>
                <div>
                  <Label htmlFor="newCustomerPhone">رقم التليفون</Label>
                  <Input id="newCustomerPhone" name="newCustomerPhone" inputMode="tel" dir="ltr" className="text-right" />
                </div>
              </div>
              {customerItems.length > 0 && (
                <div>
                  <Label className="text-xs text-muted">أو اختر عميل مسجل من قبل</Label>
                  <Combobox
                    items={customerItems}
                    placeholder="ابحث بالاسم أو التليفون..."
                    onSelect={(item) => {
                      const c = customers.find((x) => x.id === item.id);
                      if (c) setSelectedCustomer(c);
                    }}
                  />
                </div>
              )}
            </div>
          )}
          <FieldError>{fieldErrors.customerId}</FieldError>

          {preselectedCustomer && preselectedCustomer.prescriptions.length > 0 && (
            <div className="mt-4">
              <Label htmlFor="prescriptionId">الكشف الطبي المرتبط (اختياري)</Label>
              <Select id="prescriptionId" name="prescriptionId" defaultValue="">
                <option value="">بدون كشف</option>
                {preselectedCustomer.prescriptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    كشف {p.date}
                  </option>
                ))}
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>تفاصيل الفاتورة</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="type">نوع الطلب</Label>
              <Select id="type" name="type" value={orderType} onChange={(e) => setOrderType(e.target.value)}>
                {Object.entries(orderTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="status">الحالة</Label>
              <Select id="status" name="status" defaultValue="PENDING">
                {Object.entries(orderStatusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {orderType === "MEDICAL" && (
            <label className="flex items-center gap-2 rounded-lg border border-dashed border-brand-teal/40 bg-brand-teal/5 px-3 py-2.5 text-sm text-foreground">
              <input
                type="checkbox"
                checked={hasExamFeeItem}
                onChange={(e) => toggleExamFee(e.target.checked)}
                className="size-4 rounded"
              />
              <Eye className="size-4 text-brand-teal-dark" />
              إضافة كشف نظر عدسات على الفاتورة ({formatCurrency(examFee)})
            </label>
          )}

          <div>
            <Label htmlFor="deliveryDate">موعد التسليم</Label>
            <DateField id="deliveryDate" name="deliveryDate" className="w-48" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>الأصناف</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={() => setItems((r) => [...r, emptyRow()])}>
            <Plus className="size-3.5" />
            إضافة صنف
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <FieldError>{fieldErrors.items}</FieldError>
          {items.map((row) => (
            <div key={row.key} className="grid grid-cols-12 items-start gap-2 rounded-lg border border-border p-3">
              <div className="col-span-12 sm:col-span-5">
                <Combobox
                  items={productItems}
                  placeholder="ابحث بالكود أو الاسم..."
                  selectedLabel={row.productId ? products.find((p) => p.id === row.productId)?.name : undefined}
                  onSelect={(item) => {
                    const p = products.find((x) => x.id === item.id);
                    if (p) updateItem(row.key, { productId: p.id, description: p.name, unitPrice: Number(p.sellPrice) });
                  }}
                />
              </div>
              <div className="col-span-12 sm:col-span-3">
                <Input
                  placeholder="وصف الصنف *"
                  value={row.description}
                  onChange={(e) => updateItem(row.key, { description: e.target.value, productId: null })}
                />
              </div>
              <div className="col-span-4 sm:col-span-1">
                <Input
                  type="number"
                  min={1}
                  placeholder="الكمية"
                  value={row.quantity}
                  onChange={(e) => updateItem(row.key, { quantity: Number(e.target.value) || 1 })}
                />
              </div>
              <div className="col-span-5 sm:col-span-2">
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="السعر"
                  value={row.unitPrice}
                  onChange={(e) => updateItem(row.key, { unitPrice: Number(e.target.value) || 0 })}
                />
              </div>
              <div className="col-span-3 flex items-center justify-between gap-1 sm:col-span-1">
                <span className="text-xs font-medium text-muted">{formatCurrency(row.quantity * row.unitPrice)}</span>
                <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(row.key)}>
                  <Trash2 className="size-4 text-red-500" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>الدفع</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center justify-between rounded-lg bg-background px-4 py-3">
            <span className="text-sm font-medium text-foreground">الإجمالي</span>
            <span className="text-lg font-bold text-brand-navy">{formatCurrency(total)}</span>
          </div>
          <div className="max-w-xs">
            <Label htmlFor="paidAmount">المبلغ المدفوع الآن</Label>
            <Input id="paidAmount" name="paidAmount" type="number" min={0} step="0.01" defaultValue={0} max={total} />
          </div>
          <div className="mt-4">
            <Label htmlFor="notes">ملاحظات</Label>
            <Textarea id="notes" name="notes" rows={2} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          إلغاء
        </Button>
        <Button type="submit" loading={isPending} size="lg">
          حفظ الفاتورة
        </Button>
      </div>
    </form>
  );
}
