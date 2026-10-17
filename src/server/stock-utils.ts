import "server-only";
import { prisma } from "@/lib/prisma";

/** قيمة البضاعة الموجودة حالياً (بسعر التكلفة والبيع) - إجمالي ولكل فئة */
export async function getStockValuation() {
  const products = await prisma.product.findMany({
    where: { active: true },
    select: { category: true, quantity: true, costPrice: true, sellPrice: true },
  });

  const byCategory = new Map<string, { category: string; items: number; quantity: number; costValue: number; sellValue: number }>();
  let quantity = 0;
  let costValue = 0;
  let sellValue = 0;
  for (const p of products) {
    const qty = Math.max(0, p.quantity);
    const cost = qty * Number(p.costPrice);
    const sell = qty * Number(p.sellPrice);
    quantity += qty;
    costValue += cost;
    sellValue += sell;
    const c = byCategory.get(p.category) ?? { category: p.category, items: 0, quantity: 0, costValue: 0, sellValue: 0 };
    c.items++;
    c.quantity += qty;
    c.costValue += cost;
    c.sellValue += sell;
    byCategory.set(p.category, c);
  }

  return { items: products.length, quantity, costValue, sellValue, byCategory: Array.from(byCategory.values()) };
}

export async function listStockCounts() {
  const counts = await prisma.stockCount.findMany({
    orderBy: { createdAt: "desc" },
    take: 24,
    include: { createdBy: { select: { name: true } }, items: true },
  });
  return counts.map(({ items, ...c }) => ({ ...c, ...summarizeCount(items) }));
}

export async function getStockCount(id: number) {
  return prisma.stockCount.findUnique({
    where: { id },
    include: { createdBy: { select: { name: true } }, items: { orderBy: [{ category: "asc" }, { name: "asc" }] } },
  });
}

type CountItem = { systemQty: number; countedQty: number | null; costPrice: unknown };

/** ملخص الجرد: عدد ما تم عده، والعجز والزيادة (بالقطع وبسعر التكلفة) */
export function summarizeCount(items: CountItem[]) {
  let counted = 0;
  let shortageQty = 0;
  let shortageValue = 0;
  let excessQty = 0;
  let excessValue = 0;
  for (const it of items) {
    if (it.countedQty === null) continue;
    counted++;
    const diff = it.countedQty - it.systemQty;
    const value = Math.abs(diff) * Number(it.costPrice);
    if (diff < 0) {
      shortageQty += -diff;
      shortageValue += value;
    } else if (diff > 0) {
      excessQty += diff;
      excessValue += value;
    }
  }
  return { total: items.length, counted, shortageQty, shortageValue, excessQty, excessValue };
}
