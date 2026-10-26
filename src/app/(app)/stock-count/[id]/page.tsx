import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { ClipboardCheck, ChevronRight } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { StockCountSheet } from "@/components/stock-count/stock-count-sheet";
import { getStockCount } from "@/server/stock-utils";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function StockCountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [count, session] = await Promise.all([getStockCount(Number(id)), getServerSession(authOptions)]);
  if (session?.user?.role !== "ADMIN") redirect("/dashboard");
  if (!count) notFound();

  const isAdmin = session?.user?.role === "ADMIN";
  const canEditInventory = isAdmin || session?.user?.canEditInventory === true;
  const open = count.status === "OPEN";

  return (
    <div>
      <Link href="/stock-count" className="no-print mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
        <ChevronRight className="size-4" />
        جرد البضاعة
      </Link>
      <PageHeader
        icon={ClipboardCheck}
        title={count.title}
        description={`بدأ ${formatDateTime(count.createdAt)}${count.createdBy ? ` بواسطة ${count.createdBy.name}` : ""}${
          count.approvedAt ? ` · اعتُمد ${formatDateTime(count.approvedAt)}` : ""
        }`}
        action={<Badge color={open ? "amber" : "green"}>{open ? "جاري العد - اكتب العدد الفعلي ثم احفظ" : "معتمد - تمت تسوية المخزون"}</Badge>}
      />

      <StockCountSheet
        countId={count.id}
        editable={open && canEditInventory}
        canApprove={isAdmin}
        items={count.items.map((it) => ({
          id: it.id,
          name: it.name,
          code: it.code,
          category: it.category,
          systemQty: it.systemQty,
          countedQty: it.countedQty,
          costPrice: Number(it.costPrice),
        }))}
      />
    </div>
  );
}
