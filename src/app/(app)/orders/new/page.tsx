import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { OrderForm } from "@/components/orders/order-form";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function NewOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string }>;
}) {
  const { customerId } = await searchParams;

  const [customers, products, preselected] = await Promise.all([
    prisma.customer.findMany({ select: { id: true, name: true, phone: true }, orderBy: { name: "asc" } }),
    prisma.product.findMany({
      where: { active: true },
      select: { id: true, name: true, code: true, sellPrice: true, category: true },
      orderBy: { name: "asc" },
    }),
    customerId
      ? prisma.customer.findUnique({
          where: { id: Number(customerId) },
          select: { id: true, name: true, phone: true, prescriptions: { orderBy: { date: "desc" }, select: { id: true, date: true } } },
        })
      : null,
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/orders" className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
        <ChevronRight className="size-4" />
        الفواتير
      </Link>
      <PageHeader title="فاتورة جديدة" description="إنشاء فاتورة / طلب جديد" />

      <OrderForm
        customers={customers}
        products={products.map((p) => ({ ...p, sellPrice: Number(p.sellPrice) }))}
        preselectedCustomer={
          preselected
            ? {
                id: preselected.id,
                name: preselected.name,
                phone: preselected.phone,
                prescriptions: preselected.prescriptions.map((p) => ({ id: p.id, date: formatDate(p.date) })),
              }
            : undefined
        }
      />
    </div>
  );
}
