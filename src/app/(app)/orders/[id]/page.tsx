import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Printer, User, Calendar, FileText, Eye } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteButton } from "@/components/ui/delete-button";
import { AddPaymentDialog } from "@/components/orders/add-payment-dialog";
import { StatusSelect } from "@/components/orders/status-select";
import { deleteOrder } from "@/server/orders";
import { formatCurrency, formatDateTime, formatDate } from "@/lib/utils";
import { orderStatusColors, orderStatusLabels, orderTypeLabels } from "@/lib/labels";

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const orderId = Number(id);
  const session = await getServerSession(authOptions);
  const isAdmin = session?.user?.role === "ADMIN";

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      customer: true,
      prescription: true,
      items: true,
      payments: { orderBy: { createdAt: "desc" }, include: { createdBy: true } },
      createdBy: true,
    },
  });

  if (!order) notFound();

  const remaining = Number(order.totalAmount) - Number(order.paidAmount);

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/orders" className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
        <ChevronRight className="size-4" />
        الفواتير
      </Link>

      <PageHeader
        title={`فاتورة #${order.receiptNumber}`}
        description={formatDateTime(order.createdAt)}
        action={
          <div className="flex items-center gap-2">
            <Link href={`/orders/${order.id}/receipt`} target="_blank">
              <Button variant="outline">
                <Printer className="size-4" />
                طباعة
              </Button>
            </Link>
            {isAdmin && (
              <DeleteButton action={deleteOrder.bind(null, order.id)} confirmMessage="حذف هذه الفاتورة نهائياً؟" redirectTo="/orders" />
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <User className="size-5 text-brand-navy" />
            <div>
              <p className="text-xs text-muted">العميل</p>
              {order.customer ? (
                <Link href={`/customers/${order.customer.id}`} className="font-medium text-foreground hover:underline">
                  {order.customer.name}
                </Link>
              ) : (
                <p className="font-medium text-foreground">بدون اسم</p>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <Calendar className="size-5 text-brand-navy" />
            <div>
              <p className="text-xs text-muted">موعد التسليم</p>
              <p className="font-medium text-foreground">
                {order.deliveryDate ? formatDate(order.deliveryDate) : "غير محدد"}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <FileText className="size-5 text-brand-navy" />
            <div>
              <p className="text-xs text-muted">نوع الطلب</p>
              <p className="font-medium text-foreground">{orderTypeLabels[order.type]}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {order.prescription && (
        <Card className="mt-4">
          <CardContent className="flex items-center justify-between gap-3 py-4">
            <div className="flex items-center gap-3">
              <Eye className="size-5 text-brand-navy" />
              <div>
                <p className="text-xs text-muted">كشف النظر المرتبط</p>
                <p className="font-medium text-foreground">كشف بتاريخ {formatDate(order.prescription.date)}</p>
              </div>
            </div>
            <Link
              href={`/prescriptions/${order.prescription.id}`}
              className="inline-flex h-9 items-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground transition-colors hover:bg-background"
            >
              عرض / طباعة
            </Link>
          </CardContent>
        </Card>
      )}

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>حالة الفاتورة</CardTitle>
          <StatusSelect orderId={order.id} status={order.status} />
        </CardHeader>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>الأصناف</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-right text-xs text-muted">
                <th className="px-5 py-2.5 font-medium">الصنف</th>
                <th className="px-5 py-2.5 font-medium">الكمية</th>
                <th className="px-5 py-2.5 font-medium">السعر</th>
                <th className="px-5 py-2.5 font-medium">الإجمالي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {order.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-5 py-3 text-foreground">{item.description}</td>
                  <td className="px-5 py-3 text-muted">{item.quantity}</td>
                  <td className="px-5 py-3 text-muted">{formatCurrency(item.unitPrice)}</td>
                  <td className="px-5 py-3 font-medium text-foreground">{formatCurrency(item.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>الدفعات</CardTitle>
          <AddPaymentDialog orderId={order.id} remaining={remaining} />
        </CardHeader>
        <CardContent>
          <div className="mb-4 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-background p-3">
              <p className="text-xs text-muted">الإجمالي</p>
              <p className="mt-1 font-bold text-foreground">{formatCurrency(order.totalAmount)}</p>
            </div>
            <div className="rounded-lg bg-background p-3">
              <p className="text-xs text-muted">المدفوع</p>
              <p className="mt-1 font-bold text-emerald-600">{formatCurrency(order.paidAmount)}</p>
            </div>
            <div className="rounded-lg bg-background p-3">
              <p className="text-xs text-muted">المتبقي</p>
              <p className={`mt-1 font-bold ${remaining > 0.01 ? "text-red-600" : "text-foreground"}`}>
                {formatCurrency(remaining)}
              </p>
            </div>
          </div>

          {order.payments.length > 0 && (
            <div className="divide-y divide-border border-t border-border">
              {order.payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <p className="text-foreground">{formatCurrency(p.amount)}</p>
                    {p.note && <p className="text-xs text-muted">{p.note}</p>}
                  </div>
                  <p className="text-xs text-muted">{formatDateTime(p.createdAt)}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {order.notes && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>ملاحظات</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted">{order.notes}</CardContent>
        </Card>
      )}

      <div className="mt-4 flex items-center justify-between text-xs text-muted">
        <span>
          أُنشئت بواسطة: {order.createdBy?.name ?? "-"}
        </span>
        <Badge color={orderStatusColors[order.status]}>{orderStatusLabels[order.status]}</Badge>
      </div>
    </div>
  );
}
