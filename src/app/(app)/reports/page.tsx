import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { TrendingUp, AlertTriangle, Users } from "lucide-react";
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
  resolveReportRange,
} from "@/server/reports";
import { formatCurrency, formatDateUTC } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") redirect("/dashboard");

  const { from, to } = await searchParams;
  const range = resolveReportRange(from, to, 30);
  const salesRange = resolveReportRange(from, to, 14);

  const [sales, topProducts, debtors, lowStock, profit] = await Promise.all([
    getSalesOverTime(salesRange),
    getTopProducts(range),
    getOutstandingBalances(),
    getLowStockReport(),
    getProfitSummary(range),
  ]);

  const totalOutstanding = debtors.reduce((s, d) => s + d.remaining, 0);
  const periodLabel =
    typeof range === "number" ? `${range} يوم` : `${formatDateUTC(range.from)} - ${formatDateUTC(range.until)}`;

  const exportParams = new URLSearchParams();
  if (from) exportParams.set("from", from);
  if (to) exportParams.set("to", to);
  const exportQuery = exportParams.toString() ? `?${exportParams.toString()}` : "";

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
                <span className="text-sm text-muted">التكلفة التقديرية</span>
                <span className="font-bold text-muted">{formatCurrency(profit.cost)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-3">
                <span className="text-sm font-medium text-foreground">صافي الربح التقديري</span>
                <span className="font-bold text-emerald-600">{formatCurrency(profit.profit)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

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
              <AlertTriangle className="size-4 text-amber-500" />
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
                    <Badge color={p.quantity === 0 ? "red" : "amber"}>متبقي {p.quantity}</Badge>
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
