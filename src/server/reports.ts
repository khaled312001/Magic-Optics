import "server-only";
import { prisma } from "@/lib/prisma";
import { dateRangeFilter } from "@/lib/utils";
import { getStockValuation } from "@/server/stock-utils";
import { addDays, cairoDateStr, cairoDayStart, cairoMonthRange, dbDate } from "@/lib/cairo-time";

export type ReportRange = number | { from: Date; until: Date };

/** يحوّل باراميترات from/to (YYYY-MM-DD) القادمة من الطلب إلى مدى تقرير، أو يرجع الفترة الافتراضية */
export function resolveReportRange(from?: string, to?: string, defaultDays = 30): ReportRange {
  const filter = dateRangeFilter(from, to);
  if (!filter?.gte) return defaultDays;
  return { from: filter.gte, until: filter.lt ? new Date(filter.lt.getTime() - 1) : new Date() };
}

function resolveRange(range: ReportRange): { from: Date; until: Date } {
  if (typeof range !== "number") return range;

  // آخر N يوم بتوقيت القاهرة (اليوم الحالي ضمنها)
  const today = cairoDateStr();
  return {
    from: cairoDayStart(addDays(today, -(range - 1))),
    until: new Date(cairoDayStart(addDays(today, 1)).getTime() - 1),
  };
}

export async function getSalesOverTime(range: ReportRange) {
  const { from, until } = resolveRange(range);

  const orders = await prisma.order.findMany({
    where: { createdAt: { gte: from, lte: until }, status: { not: "CANCELLED" } },
    select: { createdAt: true, totalAmount: true },
  });

  const buckets = new Map<string, number>();
  const lastDay = cairoDateStr(until);
  let cursor = cairoDateStr(from);
  let guard = 0;
  while (cursor <= lastDay && guard < 400) {
    buckets.set(cursor, 0);
    cursor = addDays(cursor, 1);
    guard++;
  }
  for (const o of orders) {
    const key = cairoDateStr(o.createdAt);
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
  const fromDate = dbDate(cairoDateStr(from));
  const untilDate = dbDate(cairoDateStr(until));

  const entries = await prisma.cashEntry.findMany({
    where: {
      type: "OUT",
      category: { in: ["EXPENSE", "WITHDRAWAL"] },
      day: { date: { gte: fromDate, lte: untilDate } },
    },
  });

  return entries.reduce((s, e) => s + Number(e.amount), 0);
}

/** المحصّل فعلياً (كل دفعات الفواتير) خلال مدى معين */
export async function getCollected(range: ReportRange) {
  const { from, until } = resolveRange(range);
  const result = await prisma.payment.aggregate({
    where: { createdAt: { gte: from, lte: until } },
    _sum: { amount: true },
  });
  return Number(result._sum.amount ?? 0);
}

/** المتبقي عند العملاء من فواتير مدى معين (الفاتورة - المدفوع، بدون الملغاة) */
export async function getRangeOutstanding(range: ReportRange) {
  const { from, until } = resolveRange(range);
  const orders = await prisma.order.findMany({
    where: { createdAt: { gte: from, lte: until }, status: { not: "CANCELLED" } },
    select: { totalAmount: true, paidAmount: true },
  });
  return orders.reduce((s, o) => s + Math.max(0, Number(o.totalAmount) - Number(o.paidAmount)), 0);
}

/** ملخص مالي كامل لمدى معين: المبيعات (قيمة الفواتير) / المحصّل / المتبقي / تكلفة البضاعة / المصروفات / صافي الربح */
export async function getFinancialSummary(range: ReportRange) {
  const [profit, expenses, collected, outstanding] = await Promise.all([
    getProfitSummary(range),
    getCashExpenses(range),
    getCollected(range),
    getRangeOutstanding(range),
  ]);
  return {
    revenue: profit.revenue,
    cost: profit.cost,
    expenses,
    netProfit: profit.revenue - profit.cost - expenses,
    collected,
    outstanding,
  };
}

/** يحسب ملخص شهر كامل (1 وحتى آخر يوم فيه) بتوقيت القاهرة، بصرف النظر عن اليوم الحالي */
export async function getMonthSummary(year: number, month: number) {
  const { start, end } = cairoMonthRange(year, month);
  return getFinancialSummary({ from: start, until: new Date(end.getTime() - 1) });
}

/** المبيعات والمحصّل والمتبقي عند العملاء لكل شهر (حسب شهر الفاتورة) */
export async function getOutstandingByMonth(limit = 12) {
  const orders = await prisma.order.findMany({
    where: { status: { not: "CANCELLED" } },
    select: { createdAt: true, totalAmount: true, paidAmount: true },
  });

  const months = new Map<string, { key: string; invoiced: number; paid: number; remaining: number; count: number }>();
  for (const o of orders) {
    const key = cairoDateStr(o.createdAt).slice(0, 7);
    const m = months.get(key) ?? { key, invoiced: 0, paid: 0, remaining: 0, count: 0 };
    m.invoiced += Number(o.totalAmount);
    m.paid += Number(o.paidAmount);
    m.remaining += Math.max(0, Number(o.totalAmount) - Number(o.paidAmount));
    m.count++;
    months.set(key, m);
  }
  return Array.from(months.values())
    .sort((a, b) => b.key.localeCompare(a.key))
    .slice(0, limit);
}

/** ينشئ (أو يحدّث) السجل الشهري المحفوظ لشهر معين - يُستدعى تلقائياً فى نهاية كل شهر عبر cron، أو يدوياً */
export async function generateAndSaveMonthlyReport(year: number, month: number) {
  const [summary, stock] = await Promise.all([getMonthSummary(year, month), getStockValuation()]);
  // لقطة المخزون وقت الإقفال (عدد القطع وقيمتها بالتكلفة والبيع)
  const snapshot = { stockQuantity: stock.quantity, stockCostValue: stock.costValue, stockSellValue: stock.sellValue };
  return prisma.monthlyReport.upsert({
    where: { year_month: { year, month } },
    create: { year, month, ...summary, ...snapshot, generatedAt: new Date() },
    update: { ...summary, ...snapshot, generatedAt: new Date() },
  });
}

export async function listMonthlyReports(limit = 12) {
  return prisma.monthlyReport.findMany({
    orderBy: [{ year: "desc" }, { month: "desc" }],
    take: limit,
  });
}
