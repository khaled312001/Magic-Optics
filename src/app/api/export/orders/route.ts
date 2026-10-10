import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildWorkbookBuffer, excelResponse } from "@/lib/excel";
import { orderStatusLabels, orderTypeLabels } from "@/lib/labels";
import { dateRangeFilter } from "@/lib/utils";
import type { Prisma, OrderStatus } from "@prisma/client";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const q = searchParams.get("q");
  const createdAt = dateRangeFilter(searchParams.get("from") ?? undefined, searchParams.get("to") ?? undefined);

  const where: Prisma.OrderWhereInput = {
    ...(status ? { status: status as OrderStatus } : {}),
    ...(createdAt ? { createdAt } : {}),
    ...(q
      ? {
          OR: [
            { receiptNumber: { contains: q } },
            { customer: { name: { contains: q } } },
            { customer: { phone: { contains: q } } },
            { customer: { phone2: { contains: q } } },
          ],
        }
      : {}),
  };

  const orders = await prisma.order.findMany({
    where,
    include: { customer: true },
    orderBy: { createdAt: "desc" },
  });

  const rows = orders.map((o) => {
    const remaining = Number(o.totalAmount) - Number(o.paidAmount);
    return [
      o.receiptNumber,
      o.customer?.name ?? "",
      o.customer?.phone ?? "",
      orderTypeLabels[o.type],
      orderStatusLabels[o.status],
      Number(o.totalAmount),
      Number(o.paidAmount),
      remaining,
      o.createdAt.toLocaleDateString("ar-EG-u-nu-latn"),
    ];
  });

  const buffer = buildWorkbookBuffer(
    "الفواتير",
    ["رقم الإيصال", "العميل", "الهاتف", "النوع", "الحالة", "الإجمالي", "المدفوع", "المتبقي", "التاريخ"],
    rows
  );

  return excelResponse(buffer, `فواتير-${new Date().toISOString().slice(0, 10)}.xlsx`);
}
