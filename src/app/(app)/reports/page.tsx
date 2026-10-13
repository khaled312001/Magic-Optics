import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { TrendingUp, AlertTriangle, Users, Wallet, CalendarCheck, ChevronLeft } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SalesChart } from "@/components/reports/sales-chart";
import { TopProductsChart } from "@/components/reports/top-products-chart";
import { ExportButton } from "@/components/ui/export-button";
import { DateRangeFilter } from "@/components/ui/date-range-filter";
import {
  getSalesOverTime,
  getTopProducts,
  getOutstandingBalances,
  getLowStockReport,
  getProfitSummary,
  getCashExpenses,
  listMonthlyReports,
  resolveReportRange,
} from "@/server/reports";
import { getOrCreateCashDay } from "@/server/cashRegister";
import { formatCurrency, formatDateUTC } from "@/lib/utils";

export const dynamic = "force-dynamic";

function monthStartStr() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}
function todayStr() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

const monthNames = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") redirect("/dashboard");

  const { from: fromParam, to: toParam } = await searchParams;
  // الافتراضي: الشهر الحالي من بدايته حتى اليوم تلقائياً، بدون أي فلترة يدوية
  const from = fromParam || monthStartStr();
  const to = toParam || todayStr();

  const range = resolveReportRange(from, to, 30);
  const salesRange = resolveReportRange(from, to, 14);

  const todayDateStr = todayStr();
  const [sales, topProducts, debtors, lowStock, profit, expenses, monthlyHistory, cashDay] = await Promise.all([
    getSalesOverTime(salesRange),
    getTopProducts(range),
    getOutstandingBalances(),
    getLowStockReport(),
    getProfitSummary(range),
    getCashExpenses(range),
    listMonthlyReports(12),
    getOrCreateCashDay(todayDateStr),
  ]);

  const cashIn = cashDay.entries.filter((e) => e.type === "IN").reduce((s, e) => s + Number(e.amount), 0);
  const cashOut = cashDay.entries.filter((e) => e.type === "OUT").reduce((s, e) => s + Number(e.amount), 0);
  const cashBalance = Number(cashDay.openingBalance) + cashIn - cashOut;

  const netProfit = profit.profit - expenses;
  const totalOutstanding = debtors.reduce((s, d) => s + d.remaining, 0);
  const periodLabel =
    typeof range === "number" ? `${range} يوم` : `${formatDateUTC(range.from)} - ${formatDateUTC(range.until)}`;

  const exportParams = new URLSearchParams();
  exportParams.set("from", from);
  exportParams.set("to", to);
  const exportQuery = `?${exportParams.toString()}`;

  return (
    <div>
      <PageHeader
        title="التقارير"
        description={`أداء المحل خلال ${periodLabel}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <DateRangeFilter />
            <ExportButton href={`/api/export/reports${exportQuery}`} label="تصدير Excel" />
            <ExportButton href={`/api/export/reports-pdf${exportQuery}`} label="تصدير PDF" />
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="size-4" />
              المبيعات خلال {periodLabel}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SalesChart data={sales} />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardContent className="space-y-3 py-5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted">الإيرادات ({periodLabel})</span>
                <span className="font-bold text-foreground">{formatCurrency(profit.revenue)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted">تكلفة البضاعة المباعة</span>
                <span className="font-semibold text-red-600">-{formatCurrency(profit.cost)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted">مصروفات الخزنة</span>
                <span className="font-semibold text-red-600">-{formatCurrency(expenses)}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-3">
                <span className="text-sm font-semibold text-emerald-800">صافي الربح</span>
                <span className="text-lg font-extrabold text-emerald-700">{formatCurrency(netProfit)}</span>
              </div>
            </CardContent>
          </Card>

          <Link href="/cash-register">
            <Card className="border-2 border-brand-navy bg-brand-navy text-white transition-transform hover:-translate-y-0.5">
              <CardContent className="flex items-center justify-between py-5">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-white/15">
                    <Wallet className="size-5" />
                  </div>
                  <div>
                    <p className="text-xs text-white/75">رصيد الخزنة اليوم</p>
                    <p className="text-lg font-extrabold">{formatCurrency(cashBalance)}</p>
                  </div>
                </div>
                <ChevronLeft className="size-4 text-white/70" />
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarCheck className="size-4 text-brand-teal-dark" />
            التقارير الشهرية
          </CardTitle>
          <p className="text-xs text-muted">تُحفظ تلقائياً فى نهاية كل شهر</p>
        </CardHeader>
        <CardContent className="p-0">
          {monthlyHistory.length === 0 ? (
            <p className="p-5 text-sm text-muted">لم يُغلق أي شهر بعد - سيُحفظ أول تقرير شهري تلقائياً مع نهاية الشهر الحالي</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-right text-xs text-muted">
                    <th className="px-5 py-2.5 font-medium">الشهر</th>
                    <th className="px-5 py-2.5 font-medium">الإيراد</th>
                    <th className="px-5 py-2.5 font-medium">المصروفات</th>
                    <th className="px-5 py-2.5 font-medium">صافي الربح</th>
                    <th className="px-5 py-2.5 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {monthlyHistory.map((m) => {
                    const monthLastDay = new Date(Date.UTC(m.year, m.month, 0)).getUTCDate();
                    const mFrom = `${m.year}-${String(m.month).padStart(2, "0")}-01`;
                    const mTo = `${m.year}-${String(m.month).padStart(2, "0")}-${String(monthLastDay).padStart(2, "0")}`;
                    return (
                      <tr key={m.id}>
                        <td className="px-5 py-3 font-medium text-foreground">
                          {monthNames[m.month - 1]} {m.year}
                        </td>
                        <td className="px-5 py-3 text-foreground">{formatCurrency(m.revenue)}</td>
                        <td className="px-5 py-3 text-red-600">{formatCurrency(Number(m.cost) + Number(m.expenses))}</td>
                        <td className="px-5 py-3 font-bold text-emerald-700">{formatCurrency(m.netProfit)}</td>
                        <td className="px-5 py-3">
                          <div className="flex justify-end gap-2">
                            <ExportButton href={`/api/export/reports?from=${mFrom}&to=${mTo}`} label="Excel" />
                            <ExportButton href={`/api/export/reports-pdf?from=${mFrom}&to=${mTo}`} label="PDF" />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>الأكثر مبيعاً ({periodLabel})</CardTitle>
          </CardHeader>
          <CardContent>
            {topProducts.length === 0 ? (
              <p className="py-3 text-sm text-muted">لا توجد بيانات كافية</p>
            ) : (
              <TopProductsChart data={topProducts} />
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="size-4" />
              عملاء مدينون
            </CardTitle>
            {totalOutstanding > 0 && <Badge color="red">{formatCurrency(totalOutstanding)}</Badge>}
          </CardHeader>
          <CardContent className="p-0">
            {debtors.length === 0 ? (
              <p className="p-5 text-sm text-muted">لا توجد مبالغ متبقية</p>
            ) : (
              <div className="max-h-80 divide-y divide-border overflow-y-auto">
                {debtors.map((o) => (
                  <div key={o.id} className="flex items-center justify-between px-5 py-3 text-sm">
                    <span className="truncate text-foreground">{o.customer?.name ?? "-"}</span>
                    <span className="shrink-0 font-medium text-red-600">{formatCurrency(o.remaining)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-amber-600" />
              مخزون منخفض
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {lowStock.length === 0 ? (
              <p className="p-5 text-sm text-muted">كل الأصناف متوفرة</p>
            ) : (
              <div className="max-h-80 divide-y divide-border overflow-y-auto">
                {lowStock.map((p) => (
                  <div key={p.id} className="flex items-center justify-between px-5 py-3 text-sm">
                    <span className="truncate text-foreground">{p.name}</span>
                    <Badge color={p.quantity === 0 ? "red" : "amber"} solid={p.quantity === 0}>
                      متبقي {p.quantity}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
