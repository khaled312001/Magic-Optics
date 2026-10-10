import "server-only";
import { prisma } from "@/lib/prisma";
import { getOrCreateCashDay } from "@/server/cashRegister";

function todayStr() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export async function getDashboardData() {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);

  const [
    todayOrders,
    pendingCount,
    readyCount,
    lowStockProducts,
    recentOrders,
    outstandingOrders,
    customersCount,
    productsCount,
    cashDay,
  ] = await Promise.all([
    prisma.order.findMany({
      where: { createdAt: { gte: startOfToday, lt: endOfToday }, status: { not: "CANCELLED" } },
    }),
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.order.count({ where: { status: "READY" } }),
    prisma.product.findMany({
      where: { active: true },
      orderBy: { quantity: "asc" },
    }),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { customer: true },
    }),
    prisma.order.findMany({
      where: { status: { not: "CANCELLED" } },
      include: { customer: true },
    }),
    prisma.customer.count(),
    prisma.product.count({ where: { active: true } }),
    getOrCreateCashDay(todayStr()),
  ]);

  const todaySalesTotal = todayOrders.reduce((s, o) => s + Number(o.totalAmount), 0);
  const todayOrdersCount = todayOrders.length;

  const lowStock = lowStockProducts.filter((p) => p.quantity <= p.minQuantity);

  const debtors = outstandingOrders
    .map((o) => ({ ...o, remaining: Number(o.totalAmount) - Number(o.paidAmount) }))
    .filter((o) => o.remaining > 0)
    .sort((a, b) => b.remaining - a.remaining);

  const totalOutstanding = debtors.reduce((s, o) => s + o.remaining, 0);

  const cashIn = cashDay.entries.filter((e) => e.type === "IN").reduce((s, e) => s + Number(e.amount), 0);
  const cashOut = cashDay.entries.filter((e) => e.type === "OUT").reduce((s, e) => s + Number(e.amount), 0);
  const cashBalance = Number(cashDay.openingBalance) + cashIn - cashOut;

  return {
    todaySalesTotal,
    todayOrdersCount,
    pendingCount,
    readyCount,
    lowStock,
    recentOrders,
    debtors: debtors.slice(0, 6),
    totalOutstanding,
    customersCount,
    productsCount,
    cashBalance,
  };
}
