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

export async function getPrescriptionById(id: number) {
  const [prescription, linkedOrders] = await Promise.all([
    prisma.prescription.findUnique({ where: { id }, include: { customer: true, createdBy: true } }),
    prisma.order.findMany({
      where: { prescriptionId: id },
      select: { id: true, receiptNumber: true, createdAt: true, totalAmount: true, paidAmount: true, deliveryDate: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  return prescription ? { ...prescription, linkedOrders } : null;
}
