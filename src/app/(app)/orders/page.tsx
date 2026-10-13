import Link from "next/link";
import { Receipt, Plus } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchBox } from "@/components/ui/search-box";
import { ExportButton } from "@/components/ui/export-button";
import { DateRangeFilter } from "@/components/ui/date-range-filter";
import { StatusTabs } from "@/components/orders/status-tabs";
import { DeleteButton } from "@/components/ui/delete-button";
import { deleteOrder } from "@/server/orders";
import { formatCurrency, formatDateTime, dateRangeFilter } from "@/lib/utils";
import { orderStatusLabels, orderStatusColors, orderTypeLabels } from "@/lib/labels";
import type { Prisma, OrderStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const RESULT_LIMIT = 300;

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; from?: string; to?: string }>;
}) {
  const { status, q, from, to } = await searchParams;
  const session = await getServerSession(authOptions);
  const isAdmin = session?.user?.role === "ADMIN";

  const createdAt = dateRangeFilter(from, to);

  const where: Prisma.OrderWhereInput = {
    ...(status ? { status: status as OrderStatus } : {}),
    ...(createdAt ? { createdAt } : {}),
    ...(q
      ? {
          OR: [
            { receiptNumber: { contains: q } },
            { customer: { name: { contains: q } } },
            { customer: { phone: { contains: q } } },
            { customer: { phone2: { contains: q } } },
          ],
        }
      : {}),
  };

  const [orders, totalCount] = await Promise.all([
    prisma.order.findMany({
      where,
      include: { customer: true },
      orderBy: { createdAt: "desc" },
      take: RESULT_LIMIT,
    }),
    prisma.order.count({ where }),
  ]);

  const exportParams = new URLSearchParams();
  if (status) exportParams.set("status", status);
  if (q) exportParams.set("q", q);
  if (from) exportParams.set("from", from);
  if (to) exportParams.set("to", to);

  return (
    <div>
      <PageHeader
        title="الفواتير"
        description={
          totalCount > orders.length
            ? `عرض ${orders.length} من ${totalCount} فاتورة - ضيّق البحث لرؤية الباقي`
            : `${totalCount} فاتورة`
        }
        action={
          <div className="flex items-center gap-2">
            <ExportButton href={`/api/export/orders?${exportParams.toString()}`} />
            <Link href="/orders/new">
              <Button>
                <Plus className="size-4" />
                فاتورة جديدة
              </Button>
            </Link>
          </div>
        }
      />

      <div className="mb-4 flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <StatusTabs />
          <SearchBox placeholder="ابحث برقم الإيصال أو اسم العميل أو الهاتف..." />
        </div>
        <DateRangeFilter />
      </div>

      {orders.length === 0 ? (
        <EmptyState icon={Receipt} title="لا توجد فواتير" />
      ) : (
        <Card className="overflow-hidden">
          <div className="divide-y divide-border">
            {orders.map((o) => {
              const remaining = Number(o.totalAmount) - Number(o.paidAmount);
              return (
                <div key={o.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 hover:bg-background">
                  <Link href={`/orders/${o.id}`} className="min-w-0 flex-1">
                    <p className="font-medium text-foreground">{o.customer?.name ?? "بدون اسم"}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      #{o.receiptNumber} · {orderTypeLabels[o.type]} · {formatDateTime(o.createdAt)}
                    </p>
                  </Link>
                  <div className="flex items-center gap-4">
                    <Link href={`/orders/${o.id}`} className="text-left">
                      <p className="text-sm font-semibold text-foreground">{formatCurrency(o.totalAmount)}</p>
                      {remaining > 0.01 && <p className="text-xs text-red-600">متبقي {formatCurrency(remaining)}</p>}
                    </Link>
                    <Badge color={orderStatusColors[o.status]}>{orderStatusLabels[o.status]}</Badge>
                    {isAdmin && (
                      <DeleteButton
                        action={deleteOrder.bind(null, o.id)}
                        confirmMessage={`حذف الفاتورة #${o.receiptNumber} نهائياً؟`}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
