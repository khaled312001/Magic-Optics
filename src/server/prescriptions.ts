import "server-only";
import { prisma } from "@/lib/prisma";
import { dateRangeFilter } from "@/lib/utils";
import type { Prisma } from "@prisma/client";

export const PRESCRIPTIONS_LIMIT = 300;

export async function getPrescriptions(query?: string, from?: string, to?: string) {
  const date = dateRangeFilter(from, to);
  const where: Prisma.PrescriptionWhereInput = {
    ...(date ? { date } : {}),
    ...(query
      ? {
          customer: {
            OR: [{ name: { contains: query } }, { phone: { contains: query } }, { phone2: { contains: query } }],
          },
        }
      : {}),
  };

  const [prescriptions, totalCount] = await Promise.all([
    prisma.prescription.findMany({
      where,
      include: { customer: true },
      orderBy: { date: "desc" },
      take: PRESCRIPTIONS_LIMIT,
    }),
    prisma.prescription.count({ where }),
  ]);

  return { prescriptions, totalCount };
}

/** الفريم المختار من المخزون محفوظ "الكود - الاسم": الكود للمحل فقط فلا يُطبع للعميل */
export async function frameWithoutCode(frame: string | null | undefined) {
  if (!frame) return null;
  // أكتر من شنبر محفوظين "الأول + التانى"
  const parts = await Promise.all(
    frame.split(" + ").map(async (part) => {
      const sep = part.indexOf(" - ");
      if (sep <= 0) return part;
      const product = await prisma.product.findFirst({
        where: { code: part.slice(0, sep), category: { in: ["FRAME_MEDICAL", "FRAME_SUNGLASSES"] } },
        select: { id: true },
      });
      return product ? part.slice(sep + 3) : part;
    })
  );
  return parts.join(" + ");
}

/** كل كشوفات وفواتير العميل، جاهزة للإرسال لمكونات الواجهة */
export async function getCustomerHistory(customerId: number) {
  const [prescriptions, orders] = await Promise.all([
    prisma.prescription.findMany({ where: { customerId }, orderBy: [{ date: "desc" }, { id: "desc" }] }),
    prisma.order.findMany({
      where: { customerId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        receiptNumber: true,
        createdAt: true,
        status: true,
        totalAmount: true,
        paidAmount: true,
        items: { select: { description: true } },
      },
    }),
  ]);
  return {
    prescriptions,
    orders: orders.map((o) => ({ ...o, totalAmount: Number(o.totalAmount), paidAmount: Number(o.paidAmount) })),
  };
}

export type CustomerHistory = Awaited<ReturnType<typeof getCustomerHistory>>;

export async function getPrescriptionById(id: number) {
  const [prescription, linkedOrders] = await Promise.all([
    prisma.prescription.findUnique({ where: { id }, include: { customer: true, createdBy: true } }),
    prisma.order.findMany({
      where: { prescriptionId: id },
      select: {
        id: true,
        receiptNumber: true,
        createdAt: true,
        totalAmount: true,
        discountAmount: true,
        discountPercent: true,
        taxAmount: true,
        paidAmount: true,
        deliveryDate: true,
        payments: { select: { method: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  return prescription ? { ...prescription, linkedOrders } : null;
}
