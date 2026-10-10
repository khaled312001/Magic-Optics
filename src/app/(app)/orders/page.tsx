import Link from "next/link";
import { Receipt, Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchBox } from "@/components/ui/search-box";
import { StatusTabs } from "@/components/orders/status-tabs";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { orderStatusLabels, orderStatusColors, orderTypeLabels } from "@/lib/labels";
import type { Prisma, OrderStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { status, q } = await searchParams;

  const where: Prisma.OrderWhereInput = {
    ...(status ? { status: status as OrderStatus } : {}),
    ...(q
      ? {
          OR: [
            { receiptNumber: { contains: q } },
            { customer: { name: { contains: q } } },
          ],
        }
      : {}),
  };

  const orders = await prisma.order.findMany({
    where,
    include: { customer: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <PageHeader
        title="الفواتير"
        description={`${orders.length} فاتورة`}
        action={
          <Link href="/orders/new">
            <Button>
              <Plus className="size-4" />
              فاتورة جديدة
            </Button>
          </Link>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <StatusTabs />
        <SearchBox placeholder="ابحث برقم الإيصال أو اسم العميل..." />
      </div>

      {orders.length === 0 ? (
        <EmptyState icon={Receipt} title="لا توجد فواتير" />
      ) : (
        <Card className="overflow-hidden">
          <div className="divide-y divide-border">
            {orders.map((o) => {
              const remaining = Number(o.totalAmount) - Number(o.paidAmount);
              return (
                <Link
                  key={o.id}
                  href={`/orders/${o.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 hover:bg-background"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{o.customer?.name ?? "بدون اسم"}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      #{o.receiptNumber} · {orderTypeLabels[o.type]} · {formatDateTime(o.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-left">
                      <p className="text-sm font-semibold text-foreground">{formatCurrency(o.totalAmount)}</p>
                      {remaining > 0.01 && <p className="text-xs text-red-600">متبقي {formatCurrency(remaining)}</p>}
                    </div>
                    <Badge color={orderStatusColors[o.status]}>{orderStatusLabels[o.status]}</Badge>
                  </div>
                </Link>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
