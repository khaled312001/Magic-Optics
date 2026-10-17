import Link from "next/link";
import { notFound } from "next/navigation";
import { Phone, MapPin, Plus, ChevronRight, FileText, Receipt, UserRound } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { CustomerFormDialog } from "@/components/customers/customer-form-dialog";
import { PrescriptionFormDialog } from "@/components/customers/prescription-form-dialog";
import { PrescriptionView } from "@/components/customers/prescription-view";
import { DeleteButton } from "@/components/ui/delete-button";
import { deleteCustomer } from "@/server/customers";
import { deleteOrder } from "@/server/orders";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { orderStatusLabels, orderStatusColors } from "@/lib/labels";

export const dynamic = "force-dynamic";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customerId = Number(id);
  const session = await getServerSession(authOptions);
  const isAdmin = session?.user?.role === "ADMIN";

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: {
      prescriptions: { orderBy: { date: "desc" }, include: { createdBy: true } },
      orders: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!customer) notFound();

  const rxProducts = (
    await prisma.product.findMany({
      where: { active: true, category: { in: ["FRAME_MEDICAL", "FRAME_SUNGLASSES", "LENS", "LENS_CONTRACT"] } },
      select: { id: true, name: true, code: true, sellPrice: true, quantity: true, category: true },
      orderBy: { name: "asc" },
    })
  ).map((p) => ({ ...p, sellPrice: Number(p.sellPrice) }));

  return (
    <div>
      <Link href="/customers" className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
        <ChevronRight className="size-4" />
        العملاء
      </Link>

      <PageHeader icon={UserRound}
        title={customer.name}
        description={
          [customer.phone, customer.address].filter(Boolean).join(" · ") || "لا توجد بيانات إضافية"
        }
        action={
          <div className="flex gap-2">
            <CustomerFormDialog customer={customer} />
            {isAdmin && (
              <DeleteButton
                action={deleteCustomer.bind(null, customer.id)}
                confirmMessage={`حذف العميل "${customer.name}" نهائياً؟ ستُحذف كشوفاته الطبية، وتبقى فواتيره بدون اسم عميل.`}
                redirectTo="/customers"
              />
            )}
            <Link href={`/orders/new?customerId=${customer.id}`}>
              <Button>
                <Plus className="size-4" />
                فاتورة جديدة
              </Button>
            </Link>
          </div>
        }
      />

      <div className="mb-6 flex flex-wrap gap-4 text-sm text-muted">
        {customer.phone && (
          <span className="flex items-center gap-1.5">
            <Phone className="size-4" /> {customer.phone}
          </span>
        )}
        {customer.address && (
          <span className="flex items-center gap-1.5">
            <MapPin className="size-4" /> {customer.address}
          </span>
        )}
      </div>

      {customer.notes && (
        <Card className="mb-6">
          <CardContent className="text-sm text-muted">{customer.notes}</CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="size-4" />
              الكشوفات الطبية
            </CardTitle>
            <PrescriptionFormDialog customerId={customer.id} products={rxProducts} />
          </CardHeader>
          <CardContent>
            {customer.prescriptions.length === 0 ? (
              <EmptyState icon={FileText} title="لا توجد كشوفات مسجلة" />
            ) : (
              <div className="space-y-3">
                {customer.prescriptions.map((p) => (
                  <PrescriptionView key={p.id} prescription={p} canDelete={isAdmin} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="size-4" />
              سجل الفواتير
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {customer.orders.length === 0 ? (
              <div className="p-5">
                <EmptyState icon={Receipt} title="لا توجد فواتير بعد" />
              </div>
            ) : (
              <div className="divide-y divide-border">
                {customer.orders.map((o) => (
                  <div key={o.id} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-background">
                    <Link href={`/orders/${o.id}`} className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">#{o.receiptNumber}</p>
                      <p className="text-xs text-muted">{formatDateTime(o.createdAt)}</p>
                    </Link>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-sm font-semibold text-foreground">{formatCurrency(o.totalAmount)}</span>
                      <Badge color={orderStatusColors[o.status]}>{orderStatusLabels[o.status]}</Badge>
                      {isAdmin && (
                        <DeleteButton
                          action={deleteOrder.bind(null, o.id)}
                          confirmMessage={`حذف الفاتورة #${o.receiptNumber} نهائياً؟`}
                        />
                      )}
                    </div>
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
