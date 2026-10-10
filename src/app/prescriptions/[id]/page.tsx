import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Printer } from "lucide-react";
import { getShopSettings } from "@/server/settings";
import { getPrescriptionById } from "@/server/prescriptions";
import { PrintButton } from "@/components/orders/print-button";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

function v(n: number | null | undefined) {
  if (n === null || n === undefined) return "-";
  return n > 0 ? `+${n}` : String(n);
}

export default async function PrescriptionPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [prescription, shop] = await Promise.all([getPrescriptionById(Number(id)), getShopSettings()]);

  if (!prescription) notFound();

  return (
    <div className="min-h-dvh bg-background py-8">
      <div className="no-print mx-auto mb-4 flex max-w-md items-center justify-center gap-3">
        <PrintButton label="طباعة الكشف" />
        <Link
          href="/prescriptions"
          className="inline-flex h-10 items-center gap-1 rounded-lg border border-border bg-surface px-4 text-sm font-medium text-foreground transition-colors hover:bg-background"
        >
          <ChevronRight className="size-4" />
          كل الكشوفات
        </Link>
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
            <span className="text-muted">التاريخ</span>
            <span className="text-foreground">{formatDate(prescription.date)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">العميل</span>
            <span className="text-foreground">{prescription.customer.name}</span>
          </div>
          {prescription.customer.phone && (
            <div className="flex justify-between">
              <span className="text-muted">الهاتف</span>
              <span className="text-foreground" dir="ltr">{prescription.customer.phone}</span>
            </div>
          )}
        </div>

        <table className="mb-3 w-full border-collapse text-center text-xs">
          <thead>
            <tr className="text-muted">
              <th className="w-14 text-right font-normal"></th>
              <th colSpan={3} className="pb-1.5 font-semibold text-brand-navy">العين اليمنى</th>
              <th colSpan={3} className="pb-1.5 font-semibold text-brand-teal-dark">العين اليسرى</th>
            </tr>
            <tr className="text-muted">
              <th></th>
              <th className="font-normal">SPH</th>
              <th className="font-normal">CYL</th>
              <th className="font-normal">AXIS</th>
              <th className="font-normal">SPH</th>
              <th className="font-normal">CYL</th>
              <th className="font-normal">AXIS</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-border">
              <td className="py-2 text-right font-medium text-foreground">بعيد</td>
              <td dir="ltr">{v(prescription.rightSphFar)}</td>
              <td dir="ltr">{v(prescription.rightCylFar)}</td>
              <td dir="ltr">{v(prescription.rightAxisFar)}</td>
              <td dir="ltr">{v(prescription.leftSphFar)}</td>
              <td dir="ltr">{v(prescription.leftCylFar)}</td>
              <td dir="ltr">{v(prescription.leftAxisFar)}</td>
            </tr>
            <tr className="border-t border-border">
              <td className="py-2 text-right font-medium text-foreground">قريب</td>
              <td dir="ltr">{v(prescription.rightSphNear)}</td>
              <td dir="ltr">{v(prescription.rightCylNear)}</td>
              <td dir="ltr">{v(prescription.rightAxisNear)}</td>
              <td dir="ltr">{v(prescription.leftSphNear)}</td>
              <td dir="ltr">{v(prescription.leftCylNear)}</td>
              <td dir="ltr">{v(prescription.leftAxisNear)}</td>
            </tr>
          </tbody>
        </table>

        {prescription.ipd && (
          <div className="mb-2 flex justify-between border-t border-dashed border-border pt-2 text-sm">
            <span className="text-muted">IPD</span>
            <span className="font-medium text-foreground">{prescription.ipd}</span>
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
