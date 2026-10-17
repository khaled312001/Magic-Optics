import Link from "next/link";
import { Glasses, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Toolbar } from "@/components/ui/toolbar";
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
  const canEditInventory = isAdmin || session?.user?.canEditInventory === true;

  const isLensCategory = category === "LENS";
  const where: Prisma.ProductWhereInput = {
    active: true,
    ...(category ? { category: category as ProductCategory } : {}),
    // العدسات تُسمى بنوعها (سيلفر/بلاتينيوم/بلوكت...) لا بكود، فالبحث فيها بالاسم، وباقي الفئات بالكود كاملاً (تطابق تام لا جزء منه)
    ...(q ? (isLensCategory ? { name: { contains: q } } : { code: { equals: q } }) : {}),
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
      <PageHeader icon={Glasses}
        title="المخزون"
        description={`${products.length} صنف`}
        action={
          <div className="flex items-center gap-2">
            <Link href="/stock-count">
              <Button variant="outline">
                <ClipboardCheck className="size-4" />
                جرد البضاعة
              </Button>
            </Link>
            <ExportButton href={`/api/export/inventory?${exportParams.toString()}`} />
            {canEditInventory && <ProductFormDialog defaultCategory={category} isAdmin={isAdmin} />}
          </div>
        }
      />

      <Toolbar>
        <CategoryTabs />
        <SearchBox placeholder={isLensCategory ? "ابحث بنوع العدسة..." : "ابحث بالكود..."} />
      </Toolbar>

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
                <th className="px-4 py-3 font-medium">سعر البيع</th>
                <th className="px-4 py-3 font-medium">الكمية</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-background">
                  <td className="px-4 py-3 font-medium text-brand-navy">{p.code || "-"}</td>
                  <td className="px-4 py-3 text-muted">{p.factoryCode || "-"}</td>
                  <td className="px-4 py-3 font-medium text-foreground">{p.name}</td>
                  <td className="px-4 py-3 text-muted">{productCategoryShortLabels[p.category]}</td>
                  <td className="px-4 py-3 font-semibold text-brand-teal-dark">{formatCurrency(p.sellPrice)}</td>
                  <td className="px-4 py-3">
                    <Badge
                      color={p.quantity === 0 ? "red" : p.quantity <= p.minQuantity ? "amber" : "green"}
                      solid={p.quantity === 0}
                    >
                      {p.quantity}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {canEditInventory && <StockAdjustDialog product={p} />}
                      {canEditInventory && <ProductFormDialog product={p} isAdmin={isAdmin} />}
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
