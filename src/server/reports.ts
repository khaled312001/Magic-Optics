import "server-only";
import { prisma } from "@/lib/prisma";

export async function getSalesOverTime(days = 14) {
  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  since.setHours(0, 0, 0, 0);

  const orders = await prisma.order.findMany({
    where: { createdAt: { gte: since }, status: { not: "CANCELLED" } },
    select: { createdAt: true, totalAmount: true },
  });

  const buckets = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(d.getDate() + i);
    buckets.set(d.toISOString().slice(0, 10), 0);
  }
  for (const o of orders) {
    const key = o.createdAt.toISOString().slice(0, 10);
    buckets.set(key, (buckets.get(key) ?? 0) + Number(o.totalAmount));
  }

  return Array.from(buckets.entries()).map(([date, total]) => ({ date, total }));
}

export async function getTopProducts(days = 30, limit = 8) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const items = await prisma.orderItem.findMany({
    where: { order: { createdAt: { gte: since }, status: { not: "CANCELLED" } } },
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

export async function getProfitSummary(days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const items = await prisma.orderItem.findMany({
    where: { order: { createdAt: { gte: since }, status: { not: "CANCELLED" } } },
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
