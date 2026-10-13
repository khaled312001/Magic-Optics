import "server-only";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";
import { dateRangeFilter } from "@/lib/utils";
import { cashCategoryLabels, stockMovementTypeLabels } from "@/lib/labels";
import type { Role } from "@prisma/client";

export type ActivityKind = "ORDER" | "PAYMENT" | "PRESCRIPTION" | "STOCK" | "CASH";

export type ActivityItem = {
  id: string;
  time: Date;
  kind: ActivityKind;
  label: string;
  detail: string;
  amount?: number;
};

export type UserDailyActivity = {
  userId: number;
  name: string;
  role: Role;
  active: boolean;
  logins: Date[];
  items: ActivityItem[];
};

export async function getDailyActivity(dateStr: string): Promise<UserDailyActivity[]> {
  await requireAdmin();
  const range = dateRangeFilter(dateStr, dateStr);

  const [users, logins, orders, payments, prescriptions, stockMoves, cashEntries] = await Promise.all([
    prisma.user.findMany({ orderBy: { name: "asc" } }),
    prisma.loginLog.findMany({ where: { createdAt: range }, orderBy: { createdAt: "asc" } }),
    prisma.order.findMany({ where: { createdAt: range }, include: { customer: true } }),
    prisma.payment.findMany({ where: { createdAt: range }, include: { order: { include: { customer: true } } } }),
    prisma.prescription.findMany({ where: { createdAt: range }, include: { customer: true } }),
    prisma.stockMovement.findMany({ where: { createdAt: range }, include: { product: true } }),
    prisma.cashEntry.findMany({ where: { createdAt: range } }),
  ]);

  const byUser = new Map<number, UserDailyActivity>();
  for (const u of users) {
    byUser.set(u.id, { userId: u.id, name: u.name, role: u.role, active: u.active, logins: [], items: [] });
  }

  function push(userId: number | null, item: ActivityItem) {
    if (userId === null) return;
    byUser.get(userId)?.items.push(item);
  }

  for (const l of logins) {
    byUser.get(l.userId)?.logins.push(l.createdAt);
  }
  for (const o of orders) {
    push(o.createdById, {
      id: `order-${o.id}`,
      time: o.createdAt,
      kind: "ORDER",
      label: `فاتورة جديدة #${o.receiptNumber}`,
      detail: o.customer?.name ?? "بدون اسم",
      amount: Number(o.totalAmount),
    });
  }
  for (const p of payments) {
    push(p.createdById, {
      id: `payment-${p.id}`,
      time: p.createdAt,
      kind: "PAYMENT",
      label: `دفعة على فاتورة #${p.order.receiptNumber}`,
      detail: p.order.customer?.name ?? "-",
      amount: Number(p.amount),
    });
  }
  for (const pr of prescriptions) {
    push(pr.createdById, {
      id: `rx-${pr.id}`,
      time: pr.createdAt,
      kind: "PRESCRIPTION",
      label: "كشف نظر جديد",
      detail: pr.customer.name,
    });
  }
  for (const s of stockMoves) {
    push(s.createdById, {
      id: `stock-${s.id}`,
      time: s.createdAt,
      kind: "STOCK",
      label: stockMovementTypeLabels[s.type],
      detail: `${s.product.name} (${s.quantity})`,
    });
  }
  for (const c of cashEntries) {
    push(c.createdById, {
      id: `cash-${c.id}`,
      time: c.createdAt,
      kind: "CASH",
      label: cashCategoryLabels[c.category],
      detail: c.note || "-",
      amount: Number(c.amount) * (c.type === "OUT" ? -1 : 1),
    });
  }

  const result = Array.from(byUser.values());
  for (const u of result) {
    u.items.sort((a, b) => a.time.getTime() - b.time.getTime());
    u.logins.sort((a, b) => a.getTime() - b.getTime());
  }

  // الأكثر نشاطاً أولاً، فمن لم يسجل دخولاً أو يعمل شيئاً فى آخر القائمة
  result.sort((a, b) => b.items.length + b.logins.length - (a.items.length + a.logins.length));
  return result;
}
