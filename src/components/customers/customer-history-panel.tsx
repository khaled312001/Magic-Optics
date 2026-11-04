"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, ExternalLink, FileText, History, Receipt } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { loadCustomerHistory } from "@/server/customers";
import type { CustomerHistory } from "@/server/prescriptions";
import { orderStatusColors, orderStatusLabels } from "@/lib/labels";
import { formatCurrency, formatDate } from "@/lib/utils";

/** سجل العميل المسجل عند اختياره فى النموذج: كل كشوفاته وفواتيره، والروابط تفتح فى تبويب جديد حتى لا يضيع ما كُتب */
export function CustomerHistoryPanel({ customerId }: { customerId: number }) {
  const [result, setResult] = useState<{ id: number; history: CustomerHistory | null } | null>(null);

  useEffect(() => {
    let current = true;
    loadCustomerHistory(customerId)
      .then((history) => {
        if (current) setResult({ id: customerId, history });
      })
      .catch(() => {
        if (current) setResult({ id: customerId, history: null });
      });
    return () => {
      current = false;
    };
  }, [customerId]);

  // نتيجة عميل سابق لا تُعرض أثناء تحميل العميل الجديد
  if (!result || result.id !== customerId) {
    return <p className="rounded-xl border border-border bg-background px-3 py-2 text-xs text-muted">جاري تحميل سجل العميل...</p>;
  }
  if (!result.history) {
    return <p className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">تعذر تحميل سجل العميل - حدّث الصفحة وحاول مرة أخرى</p>;
  }
  return <CustomerHistoryView customerId={customerId} history={result.history} />;
}

export function CustomerHistoryView({ customerId, history }: { customerId: number; history: CustomerHistory }) {
  const [open, setOpen] = useState(true);
  const { prescriptions, orders } = history;
  const outstanding = orders
    .filter((o) => o.status !== "CANCELLED")
    .reduce((s, o) => s + Math.max(0, o.totalAmount - o.paidAmount), 0);

  return (
    <div className="rounded-xl border border-brand-teal/40 bg-background">
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
        <p className="flex flex-wrap items-center gap-2 font-semibold text-foreground">
          <History className="size-4 text-brand-teal-dark" />
          سجل العميل
          <span className="text-xs font-normal text-muted">
            {prescriptions.length} كشف · {orders.length} فاتورة
          </span>
          {outstanding > 0.01 && <span className="text-xs font-bold text-red-600">متبقي عليه {formatCurrency(outstanding)}</span>}
        </p>
        <div className="flex items-center gap-3 text-xs font-semibold text-brand-navy">
          <Link href={`/customers/${customerId}`} target="_blank" className="inline-flex items-center gap-1 hover:underline">
            <ExternalLink className="size-3.5" />
            ملف العميل
          </Link>
          <button type="button" onClick={() => setOpen(!open)} className="inline-flex items-center gap-1 hover:underline">
            {open ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
            {open ? "إخفاء" : "عرض"}
          </button>
        </div>
      </div>

      {open && (
        <div className="grid grid-cols-1 gap-3 border-t border-border p-3 lg:grid-cols-2">
          <div>
            <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <FileText className="size-3.5" />
              الكشوفات
            </p>
            {prescriptions.length === 0 ? (
              <p className="text-xs text-muted">لا توجد كشوفات مسجلة</p>
            ) : (
              <div className="max-h-52 space-y-2 overflow-y-auto">
                {prescriptions.map((p) => (
                  <RxCard key={p.id} rx={p} />
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Receipt className="size-3.5" />
              الفواتير
            </p>
            {orders.length === 0 ? (
              <p className="text-xs text-muted">لا توجد فواتير بعد</p>
            ) : (
              <div className="max-h-52 divide-y divide-border overflow-y-auto rounded-lg border border-border bg-surface">
                {orders.map((o) => {
                  const remaining = o.totalAmount - o.paidAmount;
                  return (
                    <Link key={o.id} href={`/orders/${o.id}`} target="_blank" className="block px-2.5 py-2 text-xs hover:bg-background">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-foreground">{formatDate(o.createdAt)}</span>
                        <Badge color={orderStatusColors[o.status]}>{orderStatusLabels[o.status]}</Badge>
                      </div>
                      <p className="mt-1 truncate text-muted">{o.items.map((i) => i.description).join(" + ")}</p>
                      <p className="mt-0.5 text-foreground">
                        {formatCurrency(o.totalAmount)}
                        {remaining > 0.01 && o.status !== "CANCELLED" && (
                          <span className="font-semibold text-red-600"> · متبقي {formatCurrency(remaining)}</span>
                        )}
                      </p>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function RxCard({ rx }: { rx: CustomerHistory["prescriptions"][number] }) {
  const details = [
    rx.doctorName && `د. ${rx.doctorName}`,
    rx.frame && `الفريم: ${rx.frame}`,
    rx.lensType && `العدسات: ${rx.lensType}`,
    rx.notes,
  ].filter(Boolean);

  return (
    <div className="rounded-lg border border-border bg-surface p-2 text-xs">
      <Link href={`/prescriptions/${rx.id}`} target="_blank" className="mb-1 block font-semibold text-foreground hover:underline">
        {formatDate(rx.date)} <span className="font-normal text-muted">· #{rx.id}</span>
      </Link>
      <table className="w-full border-collapse text-center text-[11px]">
        <thead className="text-muted">
          <tr>
            <th></th>
            <th colSpan={3} className="font-semibold text-brand-teal-dark">يسار</th>
            <th></th>
            <th colSpan={3} className="font-semibold text-brand-navy">يمين</th>
          </tr>
          <tr>
            <th></th>
            <th className="font-normal">AXIS</th>
            <th className="font-normal">CYL</th>
            <th className="font-normal">SPH</th>
            <th className="font-normal">IPD</th>
            <th className="font-normal">AXIS</th>
            <th className="font-normal">CYL</th>
            <th className="font-normal">SPH</th>
          </tr>
        </thead>
        <tbody className="font-medium text-foreground">
          <tr className="border-t border-border">
            <th className="font-semibold">D</th>
            <td dir="ltr">{v(rx.leftAxisFar)}</td>
            <td dir="ltr">{v(rx.leftCylFar)}</td>
            <td dir="ltr">{v(rx.leftSphFar)}</td>
            <td dir="ltr">{v(rx.ipdFar)}</td>
            <td dir="ltr">{v(rx.rightAxisFar)}</td>
            <td dir="ltr">{v(rx.rightCylFar)}</td>
            <td dir="ltr">{v(rx.rightSphFar)}</td>
          </tr>
          <tr className="border-t border-border">
            <th className="font-semibold">R</th>
            <td dir="ltr">{v(rx.leftAxisNear)}</td>
            <td dir="ltr">{v(rx.leftCylNear)}</td>
            <td dir="ltr">{v(rx.leftSphNear)}</td>
            <td dir="ltr">{v(rx.ipdNear)}</td>
            <td dir="ltr">{v(rx.rightAxisNear)}</td>
            <td dir="ltr">{v(rx.rightCylNear)}</td>
            <td dir="ltr">{v(rx.rightSphNear)}</td>
          </tr>
        </tbody>
      </table>
      {details.length > 0 && <p className="mt-1 text-muted">{details.join(" · ")}</p>}
    </div>
  );
}

function v(value: string | null) {
  return value?.trim() || "-";
}
