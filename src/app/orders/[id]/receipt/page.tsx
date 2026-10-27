import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getShopSettings } from "@/server/settings";
import { PrintButton } from "@/components/orders/print-button";
import { AutoPrint } from "@/components/orders/auto-print";
import { ForceLight } from "@/components/layout/force-light";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { orderTypeLabels } from "@/lib/labels";
import { SlipAmount, SlipBar, SlipFooter, SlipHeader, SlipInfo, SlipPaper } from "@/components/print/slip";

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
    <div className="min-h-dvh bg-background py-8 print:min-h-0 print:bg-white print:py-0">
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

      <SlipPaper>
        <SlipHeader shop={shop} />
        <SlipBar title="فاتورة مبيعات" number={order.receiptNumber} />
        <SlipInfo
          rows={[
            ["التاريخ", formatDateTime(order.createdAt)],
            ["العميل", order.customer?.name ?? "-"],
            ...(order.customer?.phone ? [["الهاتف", <span key="p" dir="ltr">{order.customer.phone}</span>] as [string, React.ReactNode]] : []),
            ["نوع الطلب", orderTypeLabels[order.type]],
            ...(order.deliveryDate ? [["موعد الاستلام", formatDate(order.deliveryDate)] as [string, string]] : []),
            ...(order.createdBy ? [["الموظف", order.createdBy.name] as [string, string]] : []),
          ]}
        />

        <table className="slip-table">
          <thead>
            <tr>
              <th className="text-right">الصنف</th>
              <th className="w-8 text-center">الكمية</th>
              <th className="w-14 text-center">السعر</th>
              <th className="w-14 text-center">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id}>
                <td className="font-bold">{item.description}</td>
                <td className="text-center">{item.quantity}</td>
                <td className="text-center">{formatCurrency(item.unitPrice).replace(" ج.م", "")}</td>
                <td className="text-center">{formatCurrency(item.subtotal).replace(" ج.م", "")}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-1">
          {discountAmount > 0 && (
            <>
              <SlipAmount label="المجموع" value={formatCurrency(itemsSubtotal)} />
              <SlipAmount
                label={`خصم الشنابر${discountPercent > 0 ? ` ${discountPercent}%` : ""}`}
                value={`-${formatCurrency(discountAmount)}`}
              />
            </>
          )}
          <SlipAmount label="الإجمالي" value={formatCurrency(order.totalAmount)} strong />
          <SlipAmount label="المدفوع" value={formatCurrency(order.paidAmount)} />
          <SlipAmount label="المتبقي" value={formatCurrency(remaining)} />
        </div>

        <SlipFooter>
          {discountAmount > 0 && hasFrames && <p>الخصم على الشنابر فقط - لا يشمل العدسات</p>}
          <p>شكراً لتعاملكم مع Magic Optics</p>
        </SlipFooter>
      </SlipPaper>
    </div>
  );
}
