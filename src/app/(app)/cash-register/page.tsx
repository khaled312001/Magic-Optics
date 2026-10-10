import { getServerSession } from "next-auth";
import { Wallet } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { DeleteButton } from "@/components/ui/delete-button";
import { DateNav } from "@/components/cash-register/date-nav";
import { AddCashEntryDialog } from "@/components/cash-register/add-cash-entry-dialog";
import { ExportButton } from "@/components/ui/export-button";
import { getOrCreateCashDay, deleteCashEntry } from "@/server/cashRegister";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { cashCategoryLabels } from "@/lib/labels";

export const dynamic = "force-dynamic";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default async function CashRegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  const selectedDate = date || todayStr();
  const session = await getServerSession(authOptions);
  const isAdmin = session?.user?.role === "ADMIN";

  const day = await getOrCreateCashDay(selectedDate);

  const cashIn = day.entries.filter((e) => e.type === "IN").reduce((s, e) => s + Number(e.amount), 0);
  const cashOut = day.entries.filter((e) => e.type === "OUT").reduce((s, e) => s + Number(e.amount), 0);
  const closingBalance = Number(day.openingBalance) + cashIn - cashOut;

  return (
    <div>
      <PageHeader
        title="الخزنة اليومية"
        description="متابعة الوارد والمنصرف يومياً"
        action={
          <div className="flex items-center gap-2">
            <ExportButton href={`/api/export/cash-register?date=${selectedDate}`} />
            <AddCashEntryDialog date={selectedDate} />
          </div>
        }
      />

      <div className="mb-4">
        <DateNav date={selectedDate} />
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-xs text-muted">رصيد أول اليوم</p>
          <p className="mt-1 text-lg font-bold text-foreground">{formatCurrency(day.openingBalance)}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-xs text-muted">إجمالي الوارد</p>
          <p className="mt-1 text-lg font-bold text-emerald-600">{formatCurrency(cashIn)}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-xs text-muted">إجمالي المنصرف</p>
          <p className="mt-1 text-lg font-bold text-red-600">{formatCurrency(cashOut)}</p>
        </div>
        <div className="rounded-xl border border-border bg-brand-navy p-4 text-white">
          <p className="text-xs text-white/70">رصيد آخر اليوم</p>
          <p className="mt-1 text-lg font-bold">{formatCurrency(closingBalance)}</p>
        </div>
      </div>

      {day.entries.length === 0 ? (
        <EmptyState icon={Wallet} title="لا توجد حركات في هذا اليوم" />
      ) : (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-right text-xs text-muted">
                  <th className="px-5 py-2.5 font-medium">البند</th>
                  <th className="px-5 py-2.5 font-medium">المبلغ</th>
                  <th className="px-5 py-2.5 font-medium">ملاحظة</th>
                  <th className="px-5 py-2.5 font-medium">الوقت</th>
                  <th className="px-5 py-2.5 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {day.entries.map((e) => (
                  <tr key={e.id}>
                    <td className="px-5 py-3">
                      <Badge color={e.type === "IN" ? "green" : "red"}>{cashCategoryLabels[e.category]}</Badge>
                    </td>
                    <td className={`px-5 py-3 font-medium ${e.type === "IN" ? "text-emerald-600" : "text-red-600"}`}>
                      {e.type === "IN" ? "+" : "-"}
                      {formatCurrency(e.amount)}
                    </td>
                    <td className="px-5 py-3 text-muted">{e.note || "-"}</td>
                    <td className="px-5 py-3 text-xs text-muted">{formatDateTime(e.createdAt)}</td>
                    <td className="px-5 py-3">
                      {isAdmin && <DeleteButton action={deleteCashEntry.bind(null, e.id)} confirmMessage="حذف هذه الحركة؟" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
