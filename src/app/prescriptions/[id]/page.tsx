import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getShopSettings } from "@/server/settings";
import { getPrescriptionById } from "@/server/prescriptions";
import { deletePrescription } from "@/server/customers";
import { PrintButton } from "@/components/orders/print-button";
import { DeleteButton } from "@/components/ui/delete-button";
import { ForceLight } from "@/components/layout/force-light";
import { formatCurrency, formatDate } from "@/lib/utils";
import { paymentMethodLabels } from "@/lib/labels";
import { SlipAmount, SlipBar, SlipFooter, SlipHeader, SlipInfo, SlipPaper } from "@/components/print/slip";

export const dynamic = "force-dynamic";

function v(value: string | null | undefined) {
  return value?.trim() || "-";
}

export default async function PrescriptionPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [prescription, shop, session] = await Promise.all([
    getPrescriptionById(Number(id)),
    getShopSettings(),
    getServerSession(authOptions),
  ]);

  if (!prescription) notFound();

  const isAdmin = session?.user?.role === "ADMIN";
  // أحدث فاتورة مرتبطة بالكشف - منها القيمة والمدفوع والباقي وموعد التسليم كما فى الورقة
  const order = prescription.linkedOrders[0];
  const remaining = order ? Number(order.totalAmount) - Number(order.paidAmount) : 0;
  const taxAmount = order ? Number(order.taxAmount) : 0;
  const beforeTax = order ? Number(order.totalAmount) - taxAmount : 0;
  const taxPercent = beforeTax > 0 ? Math.round((taxAmount / beforeTax) * 100) : 0;
  const methods = order ? [...new Set(order.payments.map((p) => paymentMethodLabels[p.method]))].join(" + ") : "";

  const infoRows: [string, string][] = [
    ["التاريخ", formatDate(prescription.date)],
    ["الاسم", prescription.customer.name],
    ...(prescription.customer.phone ? [["الهاتف", prescription.customer.phone] as [string, string]] : []),
    ...(prescription.createdBy ? [["الموظف", prescription.createdBy.name] as [string, string]] : []),
  ];
  const slipRows = (
    [
      ["اسم الطبيب", prescription.doctorName],
      ["الفريم", prescription.frame],
      ["نوع العدسات", prescription.lensType],
      ["موعد التسليم", order?.deliveryDate ? formatDate(order.deliveryDate) : null],
      ["ملاحظات", prescription.notes],
    ] as [string, string | null][]
  ).filter((row): row is [string, string] => !!row[1]);

  return (
    <div className="min-h-dvh bg-background py-8 print:min-h-0 print:bg-white print:py-0">
      <ForceLight />
      <div className="no-print mx-auto mb-4 flex max-w-md items-center justify-center gap-3">
        <PrintButton label="طباعة الكشف" />
        <Link
          href="/prescriptions"
          className="inline-flex h-10 items-center gap-1 rounded-lg border border-border bg-surface px-4 text-sm font-medium text-foreground transition-colors hover:bg-background"
        >
          <ChevronRight className="size-4" />
          كل الكشوفات
        </Link>
        {isAdmin && (
          <DeleteButton
            action={deletePrescription.bind(null, prescription.id, prescription.customerId)}
            confirmMessage="هل تريد حذف هذا الكشف نهائياً؟"
            redirectTo="/prescriptions"
          />
        )}
      </div>

      <SlipPaper>
        <SlipHeader shop={shop} />
        <SlipBar title="كشف نظر" number={`#${prescription.id}`} />
        <SlipInfo rows={infoRows} />

        <table className="slip-table slip-rx">
          <thead>
            <tr>
              <th rowSpan={2}></th>
              <th colSpan={3}>العين اليسرى L</th>
              <th rowSpan={2}>IPD</th>
              <th colSpan={3}>العين اليمنى R</th>
            </tr>
            <tr>
              <th>AXIS</th>
              <th>CYL</th>
              <th>SPH</th>
              <th>AXIS</th>
              <th>CYL</th>
              <th>SPH</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th>D</th>
              <td dir="ltr">{v(prescription.leftAxisFar)}</td>
              <td dir="ltr">{v(prescription.leftCylFar)}</td>
              <td dir="ltr">{v(prescription.leftSphFar)}</td>
              <td dir="ltr">{v(prescription.ipdFar)}</td>
              <td dir="ltr">{v(prescription.rightAxisFar)}</td>
              <td dir="ltr">{v(prescription.rightCylFar)}</td>
              <td dir="ltr">{v(prescription.rightSphFar)}</td>
            </tr>
            <tr>
              <th>R</th>
              <td dir="ltr">{v(prescription.leftAxisNear)}</td>
              <td dir="ltr">{v(prescription.leftCylNear)}</td>
              <td dir="ltr">{v(prescription.leftSphNear)}</td>
              <td dir="ltr">{v(prescription.ipdNear)}</td>
              <td dir="ltr">{v(prescription.rightAxisNear)}</td>
              <td dir="ltr">{v(prescription.rightCylNear)}</td>
              <td dir="ltr">{v(prescription.rightSphNear)}</td>
            </tr>
          </tbody>
        </table>

        {slipRows.length > 0 && <SlipInfo rows={slipRows} />}

        {order && (
          <div className="mt-1">
            {taxAmount > 0 && (
              <>
                <SlipAmount label="القيمة قبل الضريبة" value={formatCurrency(beforeTax)} />
                <SlipAmount label={`ضريبة القيمة المضافة ${taxPercent}%`} value={formatCurrency(taxAmount)} />
              </>
            )}
            <SlipAmount label={taxAmount > 0 ? "الإجمالي شامل الضريبة" : "القيمة"} value={formatCurrency(order.totalAmount)} strong />
            <SlipAmount label={methods ? `المدفوع (${methods})` : "المدفوع"} value={formatCurrency(order.paidAmount)} />
            <SlipAmount label="الباقي" value={formatCurrency(remaining)} />
          </div>
        )}

        {prescription.linkedOrders.length > 0 && (
          <div className="no-print mt-4 border-t border-dashed border-border pt-3 text-sm">
            <p className="mb-1.5 text-muted">فواتير مرتبطة بهذا الكشف</p>
            <div className="flex flex-wrap gap-1.5">
              {prescription.linkedOrders.map((o) => (
                <Link
                  key={o.id}
                  href={`/orders/${o.id}`}
                  className="rounded-md bg-background px-2.5 py-1 text-xs font-medium text-brand-navy hover:bg-border"
                >
                  #{o.receiptNumber}
                </Link>
              ))}
            </div>
          </div>
        )}

        <SlipFooter>شكراً لتعاملكم مع Magic Optics</SlipFooter>
      </SlipPaper>
    </div>
  );
}
