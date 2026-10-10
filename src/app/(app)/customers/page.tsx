import Link from "next/link";
import { Users, Phone, MapPin, ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchBox } from "@/components/ui/search-box";
import { CustomerFormDialog } from "@/components/customers/customer-form-dialog";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  const customers = await prisma.customer.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q } },
            { phone: { contains: q } },
            { phone2: { contains: q } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { orders: true } } },
  });

  return (
    <div>
      <PageHeader
        title="العملاء"
        description={`${customers.length} عميل`}
        action={<CustomerFormDialog />}
      />

      <div className="mb-4">
        <SearchBox placeholder="ابحث بالاسم أو رقم الهاتف..." />
      </div>

      {customers.length === 0 ? (
        <EmptyState icon={Users} title="لا يوجد عملاء" description="ابدأ بإضافة أول عميل في المحل" />
      ) : (
        <Card className="overflow-hidden">
          <div className="divide-y divide-border">
            {customers.map((c) => (
              <Link
                key={c.id}
                href={`/customers/${c.id}`}
                className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-background"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground">{c.name}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                    {c.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="size-3" /> {c.phone}
                      </span>
                    )}
                    {c.address && (
                      <span className="flex items-center gap-1">
                        <MapPin className="size-3" /> {c.address}
                      </span>
                    )}
                    <span>منذ {formatDate(c.createdAt)}</span>
                    <span>{c._count.orders} فاتورة</span>
                  </div>
                </div>
                <ChevronLeft className="size-4 shrink-0 text-muted" />
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
