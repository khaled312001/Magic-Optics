import Link from "next/link";
import { getServerSession } from "next-auth";
import { ClipboardCheck, ChevronLeft, Boxes } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { DeleteButton } from "@/components/ui/delete-button";
import { StartStockCountButton } from "@/components/stock-count/start-stock-count-button";
import { getStockValuation, listStockCounts } from "@/server/stock-utils";
import { deleteStockCount } from "@/server/stockCount";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { productCategoryLabels } from "@/lib/labels";

export const dynamic = "force-dynamic";

export default async function StockCountPage() {
  const session = await getServerSession(authOptions);
  const isAdmin = session?.user?.role === "ADMIN";
  const canEditInventory = isAdmin || session?.user?.canEditInventory === true;

  const [valuation, counts] = await Promise.all([getStockValuation(), listStockCounts()]);
  const openCount = counts.find((c) => c.status === "OPEN");

  return (
    <div>
      <PageHeader
        icon={ClipboardCheck}
        title="جرد البضاعة"
        description="عدّ البضاعة الموجودة فى المحل ومقارنتها بالسيستم"
        action={
          openCount ? (
            <Link href={`/stock-count/${openCount.id}`}>
              <Button>
                استكمال {openCount.title}
                <ChevronLeft className="size-4" />
              </Button>
            </Link>
          ) : (
            canEditInventory && <StartStockCountButton />
          )
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
          <p className="text-xs text-muted">عدد الأصناف</p>
          <p className="mt-1 text-xl font-extrabold text-foreground">{valuation.items}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
          <p className="text-xs text-muted">عدد القطع فى المحل</p>
          <p className="mt-1 text-xl font-extrabold text-foreground">{valuation.quantity}</p>
        </div>
        <div className="rounded-xl border-2 border-brand-navy bg-brand-navy p-4 text-white shadow-md shadow-brand-navy/20">
          <p className="text-xs text-white/80">قيمة البضاعة بسعر التكلفة</p>
          <p className="mt-1 text-xl font-extrabold">{formatCurrency(valuation.costValue)}</p>
        </div>
        <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 p-4 shadow-sm">
          <p className="text-xs font-medium text-emerald-700">قيمة البضاعة بسعر البيع</p>
          <p className="mt-1 text-xl font-extrabold text-emerald-700">{formatCurrency(valuation.sellValue)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Boxes className="size-4 text-brand-teal-dark" />
              البضاعة حسب الفئة
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-right text-xs text-muted">
                  <th className="px-5 py-2.5 font-medium">الفئة</th>
                  <th className="px-5 py-2.5 font-medium">القطع</th>
                  <th className="px-5 py-2.5 font-medium">بالتكلفة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {valuation.byCategory.map((c) => (
                  <tr key={c.category}>
                    <td className="px-5 py-3 text-foreground">{productCategoryLabels[c.category as keyof typeof productCategoryLabels]}</td>
                    <td className="px-5 py-3 text-muted">{c.quantity}</td>
                    <td className="px-5 py-3 font-medium text-foreground">{formatCurrency(c.costValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>سجل الجرد</CardTitle>
            <p className="text-xs text-muted">يُنصح بعمل جرد كل آخر شهر قبل الإقفال</p>
          </CardHeader>
          <CardContent className="p-0">
            {counts.length === 0 ? (
              <div className="p-5">
                <EmptyState icon={ClipboardCheck} title="لم يتم عمل جرد بعد" description="ابدأ أول جرد للبضاعة الموجودة فى المحل" />
              </div>
            ) : (
              <div className="divide-y divide-border">
                {counts.map((c) => (
                  <div key={c.id} className="flex items-center gap-2 px-5 py-3">
                    <Link href={`/stock-count/${c.id}`} className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 font-medium text-foreground">
                          {c.title}
                          <Badge color={c.status === "OPEN" ? "amber" : "green"}>{c.status === "OPEN" ? "جاري العد" : "معتمد"}</Badge>
                        </p>
                        <p className="text-xs text-muted">
                          {formatDateTime(c.createdAt)}
                          {c.createdBy && ` · ${c.createdBy.name}`} · تم عد {c.counted} من {c.total}
                        </p>
                      </div>
                      <div className="flex gap-3 text-xs">
                        <span className="text-red-600">عجز {formatCurrency(c.shortageValue)}</span>
                        <span className="text-emerald-600">زيادة {formatCurrency(c.excessValue)}</span>
                      </div>
                    </Link>
                    {isAdmin && c.status === "OPEN" && (
                      <DeleteButton action={deleteStockCount.bind(null, c.id)} confirmMessage={`حذف "${c.title}"؟ لن يتغير المخزون.`} />
                    )}
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
