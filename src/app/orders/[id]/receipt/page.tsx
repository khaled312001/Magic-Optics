import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getShopSettings } from "@/server/settings";
import { PrintButton } from "@/components/orders/print-button";
import { AutoPrint } from "@/components/orders/auto-print";
import { ForceLight } from "@/components/layout/force-light";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { orderTypeLabels } from "@/lib/labels";

export const dynamic = "force-dynamic";

export default async function ReceiptPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ auto?: string }>;
}) {
  const { id } = await params;
  const { auto } = await searchParams;

  const [order, shop] = await Promise.all([
    prisma.order.findUnique({
      where: { id: Number(id) },
      include: { customer: true, items: { include: { product: true } }, payments: true, createdBy: true },
    }),
    getShopSettings(),
  ]);

  if (!order) notFound();

  const remaining = Number(order.totalAmount) - Number(order.paidAmount);

  const discountPercent = Number(shop.discountPercent);
  const frameSubtotal = order.items
    .filter((i) => i.product?.category === "FRAME_MEDICAL" || i.product?.category === "FRAME_SUNGLASSES")
    .reduce((s, i) => s + Number(i.subtotal), 0);
  const discountAmount = (frameSubtotal * discountPercent) / 100;

  return (
    <div className="min-h-dvh bg-background py-8">
      <ForceLight />
      {auto === "1" && <AutoPrint />}

      <div className="no-print mx-auto mb-4 flex max-w-md items-center justify-center gap-3">
        <PrintButton />
        <Link
          href={`/orders/${order.id}`}
          className="inline-flex h-10 items-center rounded-lg border border-border bg-surface px-4 text-sm font-medium text-foreground transition-colors hover:bg-background"
        >
          تفاصيل الفاتورة
        </Link>
      </div>

      <div className="print-area print-thermal mx-auto max-w-md rounded-xl border border-border bg-surface p-6 shadow-sm">
        <div className="mb-5 flex flex-col items-center border-b-2 border-brand-navy pb-4 text-center">
          <Image src="/logo.jpg" alt={shop.name} width={64} height={64} className="mb-2 rounded-lg" />
          <h1 className="text-lg font-bold text-foreground">{shop.name}</h1>
          <p className="text-xs text-muted">{shop.address}</p>
          <p className="text-xs text-muted">{[shop.phone, shop.phone2].filter(Boolean).join(" / ")}</p>
          {(shop.taxNumber || shop.facilityNumber) && (
            <p className="mt-0.5 flex flex-wrap justify-center gap-x-3 text-xs font-semibold text-foreground">
              {shop.taxNumber && (
                <span>
                  رقم السجل الضريبي: <span dir="ltr">{shop.taxNumber}</span>
                </span>
              )}
              {shop.facilityNumber && (
                <span>
                  رقم المنشأة: <span dir="ltr">{shop.facilityNumber}</span>
                </span>
              )}
            </p>
          )}
        </div>

        <div className="mb-4 flex items-center justify-between border-y border-dashed border-border py-2 text-sm">
          <span className="text-muted">رقم الإيصال</span>
          <span className="font-semibold text-foreground">#{order.receiptNumber}</span>
        </div>

        <div className="mb-4 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted">التاريخ</span>
            <span className="text-foreground">{formatDateTime(order.createdAt)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">العميل</span>
            <span className="text-foreground">{order.customer?.name ?? "-"}</span>
          </div>
          {order.customer?.phone && (
            <div className="flex justify-between">
              <span className="text-muted">الهاتف</span>
              <span className="text-foreground">{order.customer.phone}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted">نوع الطلب</span>
            <span className="text-foreground">{orderTypeLabels[order.type]}</span>
          </div>
          {order.deliveryDate && (
            <div className="flex justify-between">
              <span className="text-muted">موعد الاستلام</span>
              <span className="font-medium text-foreground">{formatDate(order.deliveryDate)}</span>
            </div>
          )}
          {order.createdBy && (
            <div className="flex justify-between">
              <span className="text-muted">بواسطة</span>
              <span className="text-foreground">{order.createdBy.name}</span>
            </div>
          )}
        </div>

        <table className="mb-4 w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted">
              <th className="py-1.5 text-right font-medium">الصنف</th>
              <th className="py-1.5 text-center font-medium">الكمية</th>
              <th className="py-1.5 text-left font-medium">الإجمالي</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {order.items.map((item) => (
              <tr key={item.id}>
                <td className="py-1.5 text-foreground">{item.description}</td>
                <td className="py-1.5 text-center text-muted">{item.quantity}</td>
                <td className="py-1.5 text-left text-foreground">{formatCurrency(item.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="space-y-1.5 rounded-lg border-t-2 border-brand-navy bg-background px-3 py-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted">الإجمالي</span>
            <span className="font-semibold text-foreground">{formatCurrency(order.totalAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">المدفوع</span>
            <span className="text-foreground">{formatCurrency(order.paidAmount)}</span>
          </div>
          <div className="flex justify-between border-t border-dashed border-border pt-1.5 text-base font-bold">
            <span>المتبقي</span>
            <span className={remaining > 0.01 ? "text-red-600" : ""}>{formatCurrency(remaining)}</span>
          </div>
        </div>

        {discountPercent > 0 && frameSubtotal > 0 ? (
          <div className="mt-4 space-y-1.5 rounded-lg border border-dashed border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <p className="text-center font-semibold">خصم الشنابر {discountPercent}% - لا يشمل العدسات</p>
            <div className="flex justify-between">
              <span>قبل الخصم</span>
              <span>{formatCurrency(frameSubtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>قيمة الخصم</span>
              <span>-{formatCurrency(discountAmount)}</span>
            </div>
            <div className="flex justify-between border-t border-dashed border-amber-300 pt-1 font-bold">
              <span>بعد الخصم</span>
              <span>{formatCurrency(frameSubtotal - discountAmount)}</span>
            </div>
          </div>
        ) : (
          discountPercent > 0 && (
            <div className="mt-4 rounded-lg border border-dashed border-amber-300 bg-amber-50 px-3 py-2 text-center text-xs font-medium text-amber-800">
              خصم {discountPercent}% على الشنابر فقط - لا يشمل العدسات
            </div>
          )
        )}

        <p className="mt-4 text-center text-xs text-muted">شكراً لتعاملكم مع Magic Optics</p>
      </div>
    </div>
  );
}
