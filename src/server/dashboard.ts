import "server-only";
import { prisma } from "@/lib/prisma";
import { getCashDayView, getOutstanding, nextAutoCloseAt } from "@/server/cash-utils";
import { getSalesOverTime } from "@/server/reports";
import { addDays, cairoDateStr, cairoDayRange, cairoMonthRange, dbDate } from "@/lib/cairo-time";
import { getShopSettings } from "@/server/settings";

export async function getDashboardData() {
  const today = cairoDateStr();
  const { start: startOfToday, end: endOfToday } = cairoDayRange(today);
  const [year, month] = today.split("-").map(Number);

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
    salesTrend,
    todayCollectedAgg,
    monthOutstanding,
    settings,
    dueTodayCount,
    overdueCount,
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
    getCashDayView(today),
    getSalesOverTime(7),
    prisma.payment.aggregate({ where: { createdAt: { gte: startOfToday, lt: endOfToday } }, _sum: { amount: true } }),
    getOutstanding(cairoMonthRange(year, month)),
    getShopSettings(),
    // موعد التسليم محفوظ كتاريخ فقط (منتصف ليل UTC)
    prisma.order.count({
      where: { status: { in: ["PENDING", "READY"] }, deliveryDate: { gte: dbDate(today), lt: dbDate(addDays(today, 1)) } },
    }),
    prisma.order.count({ where: { status: { in: ["PENDING", "READY"] }, deliveryDate: { lt: dbDate(today) } } }),
  ]);

  const nextCloseAt = nextAutoCloseAt(settings.autoClose);

  const todaySalesTotal = todayOrders.reduce((s, o) => s + Number(o.totalAmount), 0);
  const todayOrdersCount = todayOrders.length;

  const lowStock = lowStockProducts.filter((p) => p.quantity <= p.minQuantity);

  const debtors = outstandingOrders
    .map((o) => ({ ...o, remaining: Number(o.totalAmount) - Number(o.paidAmount) }))
    .filter((o) => o.remaining > 0)
    .sort((a, b) => b.remaining - a.remaining);

  const totalOutstanding = debtors.reduce((s, o) => s + o.remaining, 0);

  const todayCollected = Number(todayCollectedAgg._sum.amount ?? 0);

  return {
    todaySalesTotal,
    todayOrdersCount,
    pendingCount,
    readyCount,
    lowStock,
    recentOrders,
    debtors: debtors.slice(0, 6),
    totalOutstanding,
    monthOutstanding,
    customersCount,
    productsCount,
    cashBalance: cashDay.closingBalance,
    cashDayClosed: cashDay.closed,
    todayCollected,
    salesTrend,
    autoClose: settings.autoClose,
    nextCloseAt,
    dueTodayCount,
    overdueCount,
  };
}
