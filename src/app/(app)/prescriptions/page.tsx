import Link from "next/link";
import { Eye } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Toolbar } from "@/components/ui/toolbar";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchBox } from "@/components/ui/search-box";
import { DateRangeFilter } from "@/components/ui/date-range-filter";
import { PrescriptionFormDialog } from "@/components/customers/prescription-form-dialog";
import { DeleteButton } from "@/components/ui/delete-button";
import { getPrescriptions } from "@/server/prescriptions";
import { deletePrescription } from "@/server/customers";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

function v(n: number | null | undefined) {
  if (n === null || n === undefined) return "-";
  return n > 0 ? `+${n}` : String(n);
}

export default async function PrescriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; from?: string; to?: string }>;
}) {
  const { q, from, to } = await searchParams;
  const session = await getServerSession(authOptions);
  const isAdmin = session?.user?.role === "ADMIN";

  const [{ prescriptions, totalCount }, customers, products] = await Promise.all([
    getPrescriptions(q, from, to),
    prisma.customer.findMany({ select: { id: true, name: true, phone: true }, orderBy: { name: "asc" } }),
    prisma.product.findMany({
      where: { active: true, category: { in: ["FRAME_MEDICAL", "FRAME_SUNGLASSES", "LENS", "LENS_CONTRACT"] } },
      select: { id: true, name: true, code: true, sellPrice: true, quantity: true, category: true },
      orderBy: { name: "asc" },
    }),
  ]);
  const rxProducts = products.map((p) => ({ ...p, sellPrice: Number(p.sellPrice) }));

  return (
    <div>
      <PageHeader icon={Eye}
        title="كشوفات النظر"
        description={
          totalCount > prescriptions.length
            ? `عرض ${prescriptions.length} من ${totalCount} كشف - ضيّق البحث لرؤية الباقي`
            : `${totalCount} كشف نظر`
        }
        action={<PrescriptionFormDialog customers={customers} products={rxProducts} />}
      />

      <Toolbar>
        <SearchBox placeholder="ابحث باسم العميل أو رقم الهاتف..." />
        <DateRangeFilter />
      </Toolbar>

      {prescriptions.length === 0 ? (
        <EmptyState icon={Eye} title="لا توجد كشوفات نظر" description="ابدأ بإضافة أول كشف نظر لعميل" />
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-background text-xs text-muted">
                  <th className="px-4 py-3 text-right font-medium">العميل</th>
                  <th className="px-4 py-3 text-right font-medium">التاريخ</th>
                  <th className="px-3 py-3 text-center font-medium text-brand-navy">SPH يمين (بعيد)</th>
                  <th className="px-3 py-3 text-center font-medium text-brand-teal-dark">SPH يسار (بعيد)</th>
                  <th className="px-3 py-3 text-center font-medium">IPD</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {prescriptions.map((p) => (
                  <tr key={p.id} className="hover:bg-background">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{p.customer.name}</p>
                      {p.customer.phone && <p className="text-xs text-muted">{p.customer.phone}</p>}
                    </td>
                    <td className="px-4 py-3 text-muted">{formatDate(p.date)}</td>
                    <td className="px-3 py-3 text-center" dir="ltr">
                      {v(p.rightSphFar)}
                    </td>
                    <td className="px-3 py-3 text-center" dir="ltr">
                      {v(p.leftSphFar)}
                    </td>
                    <td className="px-3 py-3 text-center">{p.ipdFar ?? p.ipdNear ?? "-"}</td>
                    <td className="px-4 py-3 text-left">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/prescriptions/${p.id}`}
                          className="inline-flex h-8 items-center gap-1 rounded-lg border border-border bg-surface px-3 text-xs font-medium text-foreground transition-colors hover:bg-background"
                        >
                          <Eye className="size-3.5" />
                          عرض
                        </Link>
                        {isAdmin && (
                          <DeleteButton
                            action={deletePrescription.bind(null, p.id, p.customerId)}
                            confirmMessage="هل تريد حذف هذا الكشف نهائياً؟"
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
