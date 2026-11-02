import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getShopSettings } from "@/server/settings";
import { PrintButton } from "@/components/orders/print-button";
import { AutoPrint } from "@/components/orders/auto-print";
import { ForceLight } from "@/components/layout/force-light";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { frameCodeOf, isFrameCategory, orderTypeLabels, paymentMethodLabels } from "@/lib/labels";
import { SlipAmount, SlipBar, SlipFooter, SlipHeader, SlipInfo, SlipPaper, SlipRxTable } from "@/components/print/slip";

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
      include: { customer: true, prescription: true, items: { include: { product: true } }, payments: true, createdBy: true },
    }),
    getShopSettings(),
  ]);

  if (!order) notFound();

  const remaining = Number(order.totalAmount) - Number(order.paidAmount);

  const discountAmount = Number(order.discountAmount);
  const itemsSubtotal = order.items.reduce((s, i) => s + Number(i.subtotal), 0);
  const taxAmount = Number(order.taxAmount);
  const beforeTax = Number(order.totalAmount) - taxAmount;
  const taxPercent = beforeTax > 0 ? Math.round((taxAmount / beforeTax) * 100) : 0;
  const methods = [...new Set(order.payments.map((p) => paymentMethodLabels[p.method]))].join(" + ");
  const hasFrames = order.items.some((i) => isFrameCategory(i.product?.category));

  // بيانات الكشف المرتبط - تاريخه يظهر فقط لو مختلف عن يوم الفاتورة (كشف قديم مسجل بتاريخه)
  const rx = order.prescription;
  const rxDate = rx ? formatDate(rx.date) : null;
  const rxRows = rx
    ? (
        [
          ["تاريخ الكشف", rxDate !== formatDate(order.createdAt) ? rxDate : null],
          ["اسم الطبيب", rx.doctorName],
          ["الفريم", rx.frame],
          ["نوع العدسات", rx.lensType],
          ["ملاحظات", rx.notes],
        ] as [string, string | null][]
      ).filter((row): row is [string, string] => !!row[1])
    : [];

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

        {rx && (
          <>
            <SlipBar title="كشف نظر" number={`#${rx.id}`} />
            <SlipRxTable rx={rx} />
            {rxRows.length > 0 && <SlipInfo rows={rxRows} />}
          </>
        )}

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
            {order.items.map((item) => {
              const frameCode = frameCodeOf(item.product);
              return (
                <tr key={item.id}>
                  <td className="font-bold">
                    {item.description}
                    {frameCode && <div>كود: {frameCode}</div>}
                  </td>
                  <td className="text-center">{item.quantity}</td>
                  <td className="text-center">{formatCurrency(item.unitPrice).replace(" ج.م", "")}</td>
                  <td className="text-center">{formatCurrency(item.subtotal).replace(" ج.م", "")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="mt-1">
          {discountAmount > 0 && (
            <>
              <SlipAmount label="المجموع" value={formatCurrency(itemsSubtotal)} />
              <SlipAmount
                label={`خصم الشنابر${order.discountPercent ? ` ${Number(order.discountPercent)}%` : ""}`}
                value={`-${formatCurrency(discountAmount)}`}
              />
            </>
          )}
          {taxAmount > 0 && (
            <>
              <SlipAmount label="المبلغ قبل الضريبة" value={formatCurrency(beforeTax)} />
              <SlipAmount label={`ضريبة القيمة المضافة ${taxPercent}%`} value={formatCurrency(taxAmount)} />
            </>
          )}
          <SlipAmount label={taxAmount > 0 ? "الإجمالي شامل الضريبة" : "الإجمالي"} value={formatCurrency(order.totalAmount)} strong />
          <SlipAmount label={methods ? `المدفوع (${methods})` : "المدفوع"} value={formatCurrency(order.paidAmount)} />
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
