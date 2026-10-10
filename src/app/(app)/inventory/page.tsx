import { Glasses } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchBox } from "@/components/ui/search-box";
import { CategoryTabs } from "@/components/inventory/category-tabs";
import { ExportButton } from "@/components/ui/export-button";
import { ProductFormDialog } from "@/components/inventory/product-form-dialog";
import { StockAdjustDialog } from "@/components/inventory/stock-adjust-dialog";
import { DeleteButton } from "@/components/ui/delete-button";
import { deleteProduct } from "@/server/products";
import { formatCurrency } from "@/lib/utils";
import { productCategoryShortLabels } from "@/lib/labels";
import type { Prisma, ProductCategory } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  const { category, q } = await searchParams;
  const session = await getServerSession(authOptions);
  const isAdmin = session?.user?.role === "ADMIN";

  const where: Prisma.ProductWhereInput = {
    active: true,
    ...(category ? { category: category as ProductCategory } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q } },
            { code: { contains: q } },
            { factoryCode: { contains: q } },
          ],
        }
      : {}),
  };

  const rawProducts = await prisma.product.findMany({ where, orderBy: [{ category: "asc" }, { name: "asc" }] });
  // تحويل Decimal إلى رقم عادي قبل تمريرها لمكوّنات العميل (Client Components لا تقبل كائنات Decimal)
  const products = rawProducts.map((p) => ({
    ...p,
    costPrice: Number(p.costPrice),
    sellPrice: Number(p.sellPrice),
  }));

  const exportParams = new URLSearchParams();
  if (category) exportParams.set("category", category);
  if (q) exportParams.set("q", q);

  return (
    <div>
      <PageHeader
        title="المخزون"
        description={`${products.length} صنف`}
        action={
          <div className="flex items-center gap-2">
            <ExportButton href={`/api/export/inventory?${exportParams.toString()}`} />
            <ProductFormDialog defaultCategory={category} isAdmin={isAdmin} />
          </div>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CategoryTabs />
        <SearchBox placeholder="ابحث بالاسم أو كود المحل أو كود المصنع..." />
      </div>

      {products.length === 0 ? (
        <EmptyState icon={Glasses} title="لا توجد أصناف" description="أضف أول صنف لهذه الفئة" />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-right text-xs text-muted">
                <th className="px-4 py-3 font-medium">الكود</th>
                <th className="px-4 py-3 font-medium">كود المصنع</th>
                <th className="px-4 py-3 font-medium">الاسم</th>
                <th className="px-4 py-3 font-medium">الفئة</th>
                {isAdmin && <th className="px-4 py-3 font-medium">التكلفة</th>}
                <th className="px-4 py-3 font-medium">سعر البيع</th>
                <th className="px-4 py-3 font-medium">الكمية</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-background">
                  <td className="px-4 py-3 text-muted">{p.code || "-"}</td>
                  <td className="px-4 py-3 text-muted">{p.factoryCode || "-"}</td>
                  <td className="px-4 py-3 font-medium text-foreground">{p.name}</td>
                  <td className="px-4 py-3 text-muted">{productCategoryShortLabels[p.category]}</td>
                  {isAdmin && <td className="px-4 py-3 text-muted">{formatCurrency(p.costPrice)}</td>}
                  <td className="px-4 py-3 font-medium text-foreground">{formatCurrency(p.sellPrice)}</td>
                  <td className="px-4 py-3">
                    <Badge color={p.quantity === 0 ? "red" : p.quantity <= p.minQuantity ? "amber" : "green"}>
                      {p.quantity}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <StockAdjustDialog product={p} />
                      <ProductFormDialog product={p} isAdmin={isAdmin} />
                      {isAdmin && <DeleteButton action={deleteProduct.bind(null, p.id)} confirmMessage={`حذف "${p.name}" نهائياً؟`} />}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
