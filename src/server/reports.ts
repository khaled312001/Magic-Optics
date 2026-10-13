import "server-only";
import { prisma } from "@/lib/prisma";
import { dateRangeFilter } from "@/lib/utils";

export type ReportRange = number | { from: Date; until: Date };

/** يحوّل باراميترات from/to (YYYY-MM-DD) القادمة من الطلب إلى مدى تقرير، أو يرجع الفترة الافتراضية */
export function resolveReportRange(from?: string, to?: string, defaultDays = 30): ReportRange {
  const filter = dateRangeFilter(from, to);
  if (!filter?.gte) return defaultDays;
  return { from: filter.gte, until: filter.lt ? new Date(filter.lt.getTime() - 1) : new Date() };
}

function resolveRange(range: ReportRange): { from: Date; until: Date } {
  if (typeof range !== "number") return range;

  const from = new Date();
  from.setDate(from.getDate() - (range - 1));
  from.setHours(0, 0, 0, 0);
  const until = new Date();
  until.setHours(23, 59, 59, 999);
  return { from, until };
}

export async function getSalesOverTime(range: ReportRange) {
  const { from, until } = resolveRange(range);

  const orders = await prisma.order.findMany({
    where: { createdAt: { gte: from, lte: until }, status: { not: "CANCELLED" } },
    select: { createdAt: true, totalAmount: true },
  });

  const buckets = new Map<string, number>();
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);
  const lastDay = new Date(until);
  lastDay.setHours(0, 0, 0, 0);
  let guard = 0;
  while (cursor <= lastDay && guard < 400) {
    buckets.set(cursor.toISOString().slice(0, 10), 0);
    cursor.setDate(cursor.getDate() + 1);
    guard++;
  }
  for (const o of orders) {
    const key = o.createdAt.toISOString().slice(0, 10);
    buckets.set(key, (buckets.get(key) ?? 0) + Number(o.totalAmount));
  }

  return Array.from(buckets.entries()).map(([date, total]) => ({ date, total }));
}

export async function getTopProducts(range: ReportRange, limit = 8) {
  const { from, until } = resolveRange(range);

  const items = await prisma.orderItem.findMany({
    where: { order: { createdAt: { gte: from, lte: until }, status: { not: "CANCELLED" } } },
    include: { product: true },
  });

  const map = new Map<string, { name: string; quantity: number; total: number }>();
  for (const it of items) {
    const key = it.product?.id ? `p${it.product.id}` : it.description;
    const name = it.product?.name ?? it.description;
    const entry = map.get(key) ?? { name, quantity: 0, total: 0 };
    entry.quantity += it.quantity;
    entry.total += Number(it.subtotal);
    map.set(key, entry);
  }

  return Array.from(map.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

export async function getOutstandingBalances() {
  const orders = await prisma.order.findMany({
    where: { status: { not: "CANCELLED" } },
    include: { customer: true },
    orderBy: { createdAt: "desc" },
  });

  return orders
    .map((o) => ({ ...o, remaining: Number(o.totalAmount) - Number(o.paidAmount) }))
    .filter((o) => o.remaining > 0.01)
    .sort((a, b) => b.remaining - a.remaining);
}

export async function getLowStockReport() {
  const products = await prisma.product.findMany({ where: { active: true }, orderBy: { quantity: "asc" } });
  return products.filter((p) => p.quantity <= p.minQuantity);
}

export async function getProfitSummary(range: ReportRange) {
  const { from, until } = resolveRange(range);

  const items = await prisma.orderItem.findMany({
    where: { order: { createdAt: { gte: from, lte: until }, status: { not: "CANCELLED" } } },
    include: { product: true },
  });

  let revenue = 0;
  let cost = 0;
  for (const it of items) {
    revenue += Number(it.subtotal);
    if (it.product) cost += Number(it.product.costPrice) * it.quantity;
  }

  return { revenue, cost, profit: revenue - cost };
}

/** مصروفات الخزنة (مصروفات + سحب/مرتبات) خلال مدى معين - لا تشمل المشتريات أو الإيداع البنكي (ليست "مصروفاً" بل تحويل نقدية) */
export async function getCashExpenses(range: ReportRange) {
  const { from, until } = resolveRange(range);
  const fromDate = new Date(Date.UTC(from.getFullYear(), from.getMonth(), from.getDate()));
  const untilDate = new Date(Date.UTC(until.getFullYear(), until.getMonth(), until.getDate()));

  const entries = await prisma.cashEntry.findMany({
    where: {
      type: "OUT",
      category: { in: ["EXPENSE", "WITHDRAWAL"] },
      day: { date: { gte: fromDate, lte: untilDate } },
    },
  });

  return entries.reduce((s, e) => s + Number(e.amount), 0);
}

/** ملخص مالي كامل (إيراد / تكلفة بضاعة / مصروفات / صافي ربح) لمدى معين */
export async function getFinancialSummary(range: ReportRange) {
  const [profit, expenses] = await Promise.all([getProfitSummary(range), getCashExpenses(range)]);
  return {
    revenue: profit.revenue,
    cost: profit.cost,
    expenses,
    netProfit: profit.revenue - profit.cost - expenses,
  };
}

/** يحسب ملخص شهر كامل (1 وحتى آخر يوم فيه) من بياناته، بصرف النظر عن اليوم الحالي */
export async function getMonthSummary(year: number, month: number) {
  const from = new Date(Date.UTC(year, month - 1, 1));
  const until = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)); // آخر يوم فى الشهر
  return getFinancialSummary({ from, until });
}

/** ينشئ (أو يحدّث) السجل الشهري المحفوظ لشهر معين - يُستدعى تلقائياً فى نهاية كل شهر عبر cron، أو يدوياً */
export async function generateAndSaveMonthlyReport(year: number, month: number) {
  const summary = await getMonthSummary(year, month);
  return prisma.monthlyReport.upsert({
    where: { year_month: { year, month } },
    create: { year, month, ...summary, generatedAt: new Date() },
    update: { ...summary, generatedAt: new Date() },
  });
}

export async function listMonthlyReports(limit = 12) {
  return prisma.monthlyReport.findMany({
    orderBy: [{ year: "desc" }, { month: "desc" }],
    take: limit,
  });
}
