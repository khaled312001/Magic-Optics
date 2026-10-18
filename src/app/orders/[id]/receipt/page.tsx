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
  const discountAmount = Number(order.discountAmount);
  const itemsSubtotal = order.items.reduce((s, i) => s + Number(i.subtotal), 0);
  const hasFrames = order.items.some((i) => i.product?.category === "FRAME_MEDICAL" || i.product?.category === "FRAME_SUNGLASSES");

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
          {(shop.commercialRegister || shop.taxNumber) && (
            <p className="mt-0.5 flex flex-wrap justify-center gap-x-3 text-xs font-semibold text-foreground">
              {shop.commercialRegister && (
                <span>
                  سجل تجاري: <span dir="ltr">{shop.commercialRegister}</span>
                </span>
              )}
              {shop.taxNumber && (
                <span>
                  بطاقة ضريبية: <span dir="ltr">{shop.taxNumber}</span>
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
          {discountAmount > 0 && (
            <>
              <div className="flex justify-between">
                <span className="text-muted">المجموع</span>
                <span className="text-foreground">{formatCurrency(itemsSubtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">خصم الشنابر{discountPercent > 0 ? ` ${discountPercent}%` : ""}</span>
                <span className="text-foreground">-{formatCurrency(discountAmount)}</span>
              </div>
            </>
          )}
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

        {discountAmount > 0 && hasFrames && (
          <p className="mt-3 text-center text-[11px] text-muted">الخصم على الشنابر فقط - لا يشمل العدسات</p>
        )}

        <p className="mt-4 text-center text-xs text-muted">شكراً لتعاملكم مع Magic Optics</p>
      </div>
    </div>
  );
}
