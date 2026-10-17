import Link from "next/link";
import { Banknote, ShoppingBag, Clock, PackageCheck, Users, AlertTriangle, Plus, LayoutDashboard } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SalesChart } from "@/components/reports/sales-chart";
import { getDashboardData } from "@/server/dashboard";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { orderStatusLabels, orderStatusColors } from "@/lib/labels";
import { TrendingUp } from "lucide-react";

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <div>
      <PageHeader icon={LayoutDashboard}
        title="لوحة التحكم"
        description="نظرة عامة على نشاط المحل اليوم"
        action={
          <Link href="/orders/new">
            <Button>
              <Plus className="size-4" />
              فاتورة جديدة
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="مبيعات اليوم" value={formatCurrency(data.todaySalesTotal)} icon={Banknote} tone="teal" highlight />
        <StatCard label="فواتير اليوم" value={String(data.todayOrdersCount)} icon={ShoppingBag} tone="navy" />
        <StatCard label="قيد التجهيز" value={String(data.pendingCount)} icon={Clock} tone="amber" />
        <StatCard label="جاهزة للاستلام" value={String(data.readyCount)} icon={PackageCheck} tone="green" />
        <StatCard label="رصيد الخزنة اليوم" value={formatCurrency(data.cashBalance)} icon={Banknote} tone="navy" highlight />
        <StatCard label="إجمالي العملاء" value={String(data.customersCount)} icon={Users} tone="teal" />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="size-4" />
            اتجاه المبيعات خلال آخر 7 أيام
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SalesChart data={data.salesTrend} />
        </CardContent>
      </Card>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>أحدث الفواتير</CardTitle>
            <Link href="/orders" className="text-xs font-medium text-brand-teal hover:underline">
              عرض الكل
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {data.recentOrders.length === 0 ? (
              <div className="p-5">
                <EmptyState icon={ShoppingBag} title="لا توجد فواتير بعد" />
              </div>
            ) : (
              <div className="divide-y divide-border">
                {data.recentOrders.map((order) => (
                  <Link
                    key={order.id}
                    href={`/orders/${order.id}`}
                    className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-background"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {order.customer?.name ?? "بدون اسم"}
                      </p>
                      <p className="text-xs text-muted">
                        #{order.receiptNumber} · {formatDateTime(order.createdAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-sm font-semibold text-foreground">
                        {formatCurrency(order.totalAmount)}
                      </span>
                      <Badge color={orderStatusColors[order.status]}>{orderStatusLabels[order.status]}</Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>عملاء عليهم مبالغ متبقية</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {data.debtors.length === 0 ? (
                <p className="p-5 text-sm text-muted">لا توجد مبالغ متبقية حالياً</p>
              ) : (
                <div className="divide-y divide-border">
                  {data.debtors.map((o) => (
                    <Link
                      key={o.id}
                      href={`/orders/${o.id}`}
                      className="flex items-center justify-between px-5 py-3 text-sm hover:bg-background"
                    >
                      <span className="truncate text-foreground">{o.customer?.name ?? "بدون اسم"}</span>
                      <span className="font-semibold text-red-600">{formatCurrency(o.remaining)}</span>
                    </Link>
                  ))}
                </div>
              )}
              {data.totalOutstanding > 0 && (
                <div className="flex items-center justify-between border-t border-border px-5 py-3 text-sm font-semibold">
                  <span>الإجمالي</span>
                  <span className="text-red-600">{formatCurrency(data.totalOutstanding)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="size-4 text-amber-600" />
                أصناف أوشكت على النفاذ
              </CardTitle>
              <Link href="/inventory" className="text-xs font-medium text-brand-teal hover:underline">
                المخزون
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {data.lowStock.length === 0 ? (
                <p className="p-5 text-sm text-muted">لا توجد أصناف منخفضة المخزون</p>
              ) : (
                <div className="divide-y divide-border">
                  {data.lowStock.slice(0, 6).map((p) => (
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
    </div>
  );
}
