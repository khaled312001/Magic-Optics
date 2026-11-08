"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, User, Receipt, X } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, FieldError } from "@/components/ui/input";
import { Combobox, type ComboboxItem } from "@/components/ui/combobox";
import { useActionForm } from "@/components/ui/use-action-form";
import { createPrescription } from "@/server/customers";
import { orderStatusLabels, orderTypeLabels } from "@/lib/labels";
import { formatCurrency } from "@/lib/utils";
import { DateField, todayIso } from "@/components/ui/date-field";
import { RxTable } from "@/components/customers/rx-table";
import { PaymentMethodSelect } from "@/components/orders/payment-method-select";
import { DiscountControl } from "@/components/orders/discount-control";
import { discountOf, initialDiscount } from "@/lib/discount";
import { ProductPickerInput, type PickerProduct } from "@/components/customers/product-picker-input";
import { CustomerHistoryPanel } from "@/components/customers/customer-history-panel";

type CustomerOption = { id: number; name: string; phone: string | null };
type ExtraFrame = { key: number; text: string; productId: number | null; price: number };
export type RxProductOption = PickerProduct & { category: string };

export function PrescriptionFormDialog({
  customerId,
  customers,
  products = [],
  discountPercent = 0,
  taxPercent = 0,
}: {
  customerId?: number;
  customers?: CustomerOption[];
  products?: RxProductOption[];
  /** نسبة خصم الشنابر - تُخصم من سعر الفريم المختار من المخزون فقط */
  discountPercent?: number;
  /** ضريبة القيمة المضافة % - تُضاف على القيمة */
  taxPercent?: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);
  const [totalAmount, setTotalAmount] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [applyTax, setApplyTax] = useState(true);
  const tax = applyTax ? Math.round(totalAmount * taxPercent) / 100 : 0;
  const grandTotal = totalAmount + tax;
  const remaining = Math.max(0, grandTotal - paidAmount);
  const frames = products.filter((p) => p.category === "FRAME_MEDICAL" || p.category === "FRAME_SUNGLASSES");
  const lenses = products.filter((p) => p.category === "LENS" || p.category === "LENS_CONTRACT");

  // سعر الفريم والعدسات: يتعبى من المخزون عند الاختيار ويمكن تعديله، والقيمة = الفريم بعد الخصم + العدسات
  const [framePrice, setFramePrice] = useState(0);
  const [lensPrice, setLensPrice] = useState(0);
  const [discount, setDiscount] = useState(() => initialDiscount(discountPercent));
  // شنابر إضافية بعد الأول - الخصم على مجموع أسعار كل الشنابر
  const [extraFrames, setExtraFrames] = useState<ExtraFrame[]>([]);
  // نسخة فورية: اختيار شنبر بيغير النص والسعر فى نفس اللحظة، فالتعديل التانى لازم يبنى على الأول
  const extrasRef = useRef<ExtraFrame[]>([]);
  function setExtras(next: ExtraFrame[]) {
    extrasRef.current = next;
    setExtraFrames(next);
  }
  const framesTotal = framePrice + extraFrames.reduce((s, f) => s + f.price, 0);
  const frameDiscount = discountOf(framesTotal, discount);

  function updatePrices(nextFrame: number, nextLens: number, nextDiscount = discount, nextExtras = extrasRef.current) {
    setFramePrice(nextFrame);
    setLensPrice(nextLens);
    setDiscount(nextDiscount);
    setExtras(nextExtras);
    const frames = nextFrame + nextExtras.reduce((s, f) => s + f.price, 0);
    const sum = frames - discountOf(frames, nextDiscount) + nextLens;
    if (frames > 0 || nextLens > 0) setTotalAmount(Math.round(sum * 100) / 100);
  }

  function onPick(kind: "frame" | "lens", product: PickerProduct | null) {
    if (!product) return;
    if (kind === "frame") updatePrices(product.sellPrice, lensPrice);
    else updatePrices(framePrice, product.sellPrice);
  }

  function updateExtra(key: number, change: Partial<ExtraFrame>) {
    const next = extrasRef.current.map((f) => (f.key === key ? { ...f, ...change } : f));
    if (change.price !== undefined) updatePrices(framePrice, lensPrice, discount, next);
    else setExtras(next);
  }

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
          setFramePrice(0);
          setLensPrice(0);
          setApplyTax(true);
          setDiscount(initialDiscount(discountPercent));
          setExtras([]);
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

          {!customerId && selectedCustomer && <CustomerHistoryPanel customerId={selectedCustomer.id} />}

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
              <ProductPickerInput
                id="p-frame"
                name="frame"
                productIdName="frameProductId"
                products={frames}
                searchBy="code"
                onPick={(p) => onPick("frame", p)}
              />
              <PriceInput name="framePrice" label="سعر الفريم" value={framePrice} onChange={(v) => updatePrices(v, lensPrice)} />

              <input
                type="hidden"
                name="extraFrames"
                value={JSON.stringify(extraFrames.map((f) => ({ text: f.text, productId: f.productId, price: f.price || null })))}
              />
              {extraFrames.map((f, index) => (
                <div key={f.key} className="mt-2 border-t border-dashed border-border pt-2">
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">شنبر {index + 2}</span>
                    <button
                      type="button"
                      onClick={() => updatePrices(framePrice, lensPrice, discount, extrasRef.current.filter((x) => x.key !== f.key))}
                      className="inline-flex items-center gap-0.5 text-red-600 hover:underline"
                    >
                      <X className="size-3.5" />
                      حذف
                    </button>
                  </div>
                  <ProductPickerInput
                    id={`p-frame-${f.key}`}
                    name={`extraFrame${f.key}`}
                    productIdName={`extraFrameProductId${f.key}`}
                    products={frames}
                    searchBy="code"
                    onTextChange={(text) => updateExtra(f.key, { text })}
                    onPick={(p) => updateExtra(f.key, p ? { productId: p.id, price: p.sellPrice } : { productId: null })}
                  />
                  <PriceInput
                    name={`extraFramePrice${f.key}`}
                    label="سعر الفريم"
                    value={f.price}
                    onChange={(v) => updateExtra(f.key, { price: v })}
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={() => setExtras([...extrasRef.current, { key: Date.now(), text: "", productId: null, price: 0 }])}
                className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-brand-navy hover:underline"
              >
                <Plus className="size-3.5" />
                شنبر تاني
              </button>
            </div>
            <div>
              <Label htmlFor="p-lens">نوع العدسات</Label>
              <ProductPickerInput
                id="p-lens"
                name="lensType"
                productIdName="lensProductId"
                products={lenses}
                onPick={(p) => onPick("lens", p)}
              />
              <PriceInput name="lensPrice" label="سعر العدسات" value={lensPrice} onChange={(v) => updatePrices(framePrice, v)} />
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

            <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-6">
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
                <Label htmlFor="orderStatus">الحالة</Label>
                <Select id="orderStatus" name="orderStatus" defaultValue="PENDING">
                  {Object.entries(orderStatusLabels).map(([value, label]) => (
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
                <Label htmlFor="totalAmount">القيمة{taxPercent > 0 && applyTax ? " (قبل الضريبة)" : ""}</Label>
                <Input
                  id="totalAmount"
                  name="totalAmount"
                  type="number"
                  min={0}
                  step="0.01"
                  value={totalAmount || ""}
                  onChange={(e) => setTotalAmount(Number(e.target.value) || 0)}
                />
                {frameDiscount > 0 && (
                  <p className="mt-0.5 truncate text-[11px] text-emerald-600">
                    بعد خصم الشنابر (-{formatCurrency(frameDiscount)})
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="paidAmount">المدفوع</Label>
                <Input
                  id="paidAmount"
                  name="paidAmount"
                  type="number"
                  min={0}
                  max={grandTotal}
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

            <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
              <input type="hidden" name="applyTax" value={applyTax ? "1" : "0"} />
              <div className="flex items-center gap-2">
                <Label htmlFor="p-paymentMethod" className="mb-0 whitespace-nowrap">
                  طريقة الدفع
                </Label>
                <PaymentMethodSelect id="p-paymentMethod" className="h-9 w-36" />
              </div>
              <DiscountControl
                state={discount}
                shopPercent={discountPercent}
                onChange={(next) => updatePrices(framePrice, lensPrice, next)}
              />
              {taxPercent > 0 && (
                <label className="flex cursor-pointer items-center gap-2 text-foreground">
                  <input
                    type="checkbox"
                    checked={applyTax}
                    onChange={(e) => setApplyTax(e.target.checked)}
                    className="size-4 accent-brand-teal"
                  />
                  إضافة ضريبة {taxPercent}%
                </label>
              )}
              {tax > 0 && (
                <span className="text-muted">
                  الضريبة <b className="text-foreground">{formatCurrency(tax)}</b> · الإجمالي شامل الضريبة{" "}
                  <b className="text-brand-navy">{formatCurrency(grandTotal)}</b>
                </span>
              )}
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

/** خانة سعر صغيرة تحت الفريم/العدسات - السعر ده هو اللى بيتطبع فى الفاتورة */
function PriceInput({ name, label, value, onChange }: { name: string; label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="mt-1.5 flex items-center gap-2">
      <Label htmlFor={`p-${name}`} className="mb-0 shrink-0 text-xs text-muted">
        {label}
      </Label>
      <Input
        id={`p-${name}`}
        name={name}
        type="number"
        min={0}
        step="0.01"
        value={value || ""}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="h-8"
      />
    </div>
  );
}
