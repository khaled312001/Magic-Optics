import { notFound } from "next/navigation";
import Image from "next/image";
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

export const dynamic = "force-dynamic";

function v(n: number | null | undefined) {
  if (n === null || n === undefined) return "-";
  return n > 0 ? `+${n}` : String(n);
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
  const slipRows: [string, string | null][] = [
    ["اسم الطبيب", prescription.doctorName],
    ["الفريم", prescription.frame],
    ["نوع العدسات", prescription.lensType],
    ["القيمة", order ? formatCurrency(order.totalAmount) : null],
    ["المدفوع", order ? formatCurrency(order.paidAmount) : null],
    ["الباقي", order ? formatCurrency(Number(order.totalAmount) - Number(order.paidAmount)) : null],
    ["موعد التسليم", order?.deliveryDate ? formatDate(order.deliveryDate) : null],
  ];

  return (
    <div className="min-h-dvh bg-background py-8">
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

      <div className="print-area print-thermal mx-auto max-w-md rounded-xl border border-border bg-surface p-6 shadow-sm">
        <div className="mb-5 flex flex-col items-center border-b-2 border-brand-navy pb-4 text-center">
          <Image src="/logo.jpg" alt={shop.name} width={64} height={64} className="mb-2 rounded-lg" />
          <h1 className="text-lg font-bold text-foreground">{shop.name}</h1>
          <p className="text-xs text-muted">{shop.address}</p>
          <p className="text-xs text-muted">{[shop.phone, shop.phone2].filter(Boolean).join(" / ")}</p>
        </div>

        <div className="mb-4 flex items-center justify-between border-y border-dashed border-border py-2 text-sm">
          <span className="text-muted">كشف نظر</span>
          <span className="font-semibold text-foreground">#{prescription.id}</span>
        </div>

        <div className="mb-4 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted">الكود</span>
            <span className="text-foreground">#{prescription.id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">التاريخ</span>
            <span className="text-foreground">{formatDate(prescription.date)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">الاسم</span>
            <span className="text-foreground">{prescription.customer.name}</span>
          </div>
          {prescription.customer.phone && (
            <div className="flex justify-between">
              <span className="text-muted">الهاتف</span>
              <span className="text-foreground" dir="ltr">{prescription.customer.phone}</span>
            </div>
          )}
          {prescription.createdBy && (
            <div className="flex justify-between">
              <span className="text-muted">اسم الموظف</span>
              <span className="text-foreground">{prescription.createdBy.name}</span>
            </div>
          )}
        </div>

        <table className="mb-3 w-full border-collapse text-center text-xs">
          <thead>
            <tr className="text-muted">
              <th className="w-14 text-right font-normal"></th>
              <th colSpan={3} className="pb-1.5 font-semibold text-brand-teal-dark">العين اليسرى</th>
              <th className="pb-1.5 font-semibold text-foreground">IPD</th>
              <th colSpan={3} className="pb-1.5 font-semibold text-brand-navy">العين اليمنى</th>
            </tr>
            <tr className="text-muted">
              <th></th>
              <th className="font-normal">AXIS</th>
              <th className="font-normal">CYL</th>
              <th className="font-normal">SPH</th>
              <th></th>
              <th className="font-normal">AXIS</th>
              <th className="font-normal">CYL</th>
              <th className="font-normal">SPH</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-border">
              <td className="py-2 text-right font-medium text-foreground">D</td>
              <td dir="ltr">{v(prescription.leftAxisFar)}</td>
              <td dir="ltr">{v(prescription.leftCylFar)}</td>
              <td dir="ltr">{v(prescription.leftSphFar)}</td>
              <td className="font-medium text-foreground">{prescription.ipdFar ?? "-"}</td>
              <td dir="ltr">{v(prescription.rightAxisFar)}</td>
              <td dir="ltr">{v(prescription.rightCylFar)}</td>
              <td dir="ltr">{v(prescription.rightSphFar)}</td>
            </tr>
            <tr className="border-t border-border">
              <td className="py-2 text-right font-medium text-foreground">R</td>
              <td dir="ltr">{v(prescription.leftAxisNear)}</td>
              <td dir="ltr">{v(prescription.leftCylNear)}</td>
              <td dir="ltr">{v(prescription.leftSphNear)}</td>
              <td className="font-medium text-foreground">{prescription.ipdNear ?? "-"}</td>
              <td dir="ltr">{v(prescription.rightAxisNear)}</td>
              <td dir="ltr">{v(prescription.rightCylNear)}</td>
              <td dir="ltr">{v(prescription.rightSphNear)}</td>
            </tr>
          </tbody>
        </table>

        {slipRows.some(([, value]) => value) && (
          <div className="mb-2 space-y-1 border-t border-dashed border-border pt-2 text-sm">
            {slipRows
              .filter(([, value]) => value)
              .map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3">
                  <span className="text-muted">{label}</span>
                  <span className={label === "الباقي" ? "font-bold text-foreground" : "text-foreground"}>{value}</span>
                </div>
              ))}
          </div>
        )}

        {prescription.notes && (
          <div className="mb-2 border-t border-dashed border-border pt-2 text-sm">
            <p className="text-muted">ملاحظات</p>
            <p className="text-foreground">{prescription.notes}</p>
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

        <p className="mt-6 text-center text-xs text-muted">Magic Optics - مركز ماجيك للبصريات</p>
      </div>
    </div>
  );
}
