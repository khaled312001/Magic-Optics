import "server-only";
import type { CashCategory, OrderType, PaymentMethod, Prisma } from "@prisma/client";
import { paymentMethodLabels } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { addDays, cairoDateStr, cairoDayStart, cairoMonthRange, dbDate } from "@/lib/cairo-time";

type Tx = Prisma.TransactionClient;

/** بنود تسليم النقدية عند إقفال اليوم/الشهر - تُصفّر الخزنة ولا تُحسب كمصروفات */
export const CLOSING_CATEGORIES: CashCategory[] = ["DAY_CLOSING", "MONTH_CLOSING"];

const ORDER_TYPE_CASH_CATEGORY: Record<OrderType, CashCategory> = {
  MEDICAL: "MEDICAL_SALE",
  SUNGLASSES: "SUNGLASSES_SALE",
  LENS_CHANGE: "LENS_CHANGE",
  OTHER: "OTHER_SALE",
};

export async function ensureCashDay(tx: Tx, dateStr: string) {
  return tx.cashRegisterDay.upsert({ where: { date: dbDate(dateStr) }, create: { date: dbDate(dateStr) }, update: {} });
}

/**
 * يسجّل دفعة فاتورة فى الخزنة كحركة وارد فى يوم الدفع (بتوقيت القاهرة).
 * الحركة مربوطة بالدفعة فتُحذف تلقائياً إذا حُذفت الدفعة أو الفاتورة.
 */
export async function createPaymentWithCash(
  tx: Tx,
  input: { orderId: number; amount: number; method?: PaymentMethod; note?: string | null; userId: number }
) {
  const method = input.method ?? "CASH";
  const order = await tx.order.findUniqueOrThrow({ where: { id: input.orderId }, select: { type: true, receiptNumber: true } });
  const payment = await tx.payment.create({
    data: { orderId: input.orderId, amount: input.amount, method, note: input.note || null, createdById: input.userId },
  });
  const day = await ensureCashDay(tx, cairoDateStr(payment.createdAt));
  await tx.cashEntry.create({
    data: {
      dayId: day.id,
      category: ORDER_TYPE_CASH_CATEGORY[order.type],
      type: "IN",
      amount: input.amount,
      method,
      note: `تحصيل فاتورة #${order.receiptNumber}${method !== "CASH" ? ` (${paymentMethodLabels[method]})` : ""}${input.note ? ` - ${input.note}` : ""}`,
      createdById: input.userId,
      paymentId: payment.id,
      createdAt: payment.createdAt,
    },
  });
  return payment;
}

/** رصيد درج الخزنة قبل يوم معين = كل الوارد النقدي - كل المنصرف فى الأيام السابقة (محسوب دائماً، فلا يتجمّد) */
async function balanceBefore(dateStr: string) {
  const sums = await prisma.cashEntry.groupBy({
    by: ["type"],
    where: { day: { date: { lt: dbDate(dateStr) } }, method: "CASH" },
    _sum: { amount: true },
  });
  const get = (type: "IN" | "OUT") => Number(sums.find((s) => s.type === type)?._sum.amount ?? 0);
  return get("IN") - get("OUT");
}

/** يوم الخزنة بكل حركاته وأرصدته المحسوبة */
export async function getCashDayView(dateStr: string) {
  const day = await prisma.cashRegisterDay.upsert({
    where: { date: dbDate(dateStr) },
    create: { date: dbDate(dateStr) },
    update: {},
    include: {
      entries: {
        orderBy: { createdAt: "asc" },
        include: { createdBy: true, payment: { select: { orderId: true } } },
      },
    },
  });

  const openingBalance = await balanceBefore(dateStr);
  const sum = (filter: (e: (typeof day.entries)[number]) => boolean) =>
    day.entries.filter(filter).reduce((s, e) => s + Number(e.amount), 0);

  // الدرج = النقدي فقط، والتحصيل الإلكتروني (إنستاباي/فيزا/فودافون كاش) يُعرض منفصلاً
  const cashIn = sum((e) => e.type === "IN" && e.method === "CASH");
  const cashOut = sum((e) => e.type === "OUT" && e.method === "CASH" && !CLOSING_CATEGORIES.includes(e.category));
  const handedOver = sum((e) => e.type === "OUT" && CLOSING_CATEGORIES.includes(e.category));
  const collected = sum((e) => e.type === "IN" && e.paymentId !== null);
  const electronicIn = sum((e) => e.type === "IN" && e.method !== "CASH");
  const byMethod = (Object.keys(paymentMethodLabels) as PaymentMethod[])
    .map((method) => ({ method, amount: sum((e) => e.type === "IN" && e.method === method) }))
    .filter((m) => m.amount > 0);

  return {
    ...day,
    openingBalance,
    cashIn,
    cashOut,
    handedOver,
    collected,
    electronicIn,
    byMethod,
    /** الرصيد قبل التسليم/التصفير */
    balanceBeforeClosing: openingBalance + cashIn - cashOut,
    closingBalance: openingBalance + cashIn - cashOut - handedOver,
  };
}

/** المتبقي عند العملاء: إجمالي (الفاتورة - المدفوع) لكل الفواتير غير الملغاة، ولفواتير فترة معينة */
export async function getOutstanding(range?: { start: Date; end: Date }) {
  const orders = await prisma.order.findMany({
    where: {
      status: { not: "CANCELLED" },
      ...(range ? { createdAt: { gte: range.start, lt: range.end } } : {}),
    },
    select: { totalAmount: true, paidAmount: true },
  });
  return orders.reduce((s, o) => s + Math.max(0, Number(o.totalAmount) - Number(o.paidAmount)), 0);
}

/**
 * إقفال يوم الخزنة: يُسجَّل الرصيد كاملاً كحركة "تسليم" فيصبح صفراً، ويُقفل اليوم.
 * يُستخدم من زر الإقفال ومن الإقفال التلقائي (userId = null).
 */
export async function performCashClose(dateStr: string, scope: "DAY" | "MONTH", userId: number | null) {
  const view = await getCashDayView(dateStr);
  if (view.closed) return { closed: false, amount: 0 };
  const balance = Math.round(view.closingBalance * 100) / 100;

  await prisma.$transaction(async (tx) => {
    if (balance > 0) {
      await tx.cashEntry.create({
        data: {
          dayId: view.id,
          category: scope === "MONTH" ? "MONTH_CLOSING" : "DAY_CLOSING",
          type: "OUT",
          amount: balance,
          note: `${scope === "MONTH" ? "إقفال الشهر" : "إقفال اليوم"} - تسليم النقدية وتصفير الخزنة${userId === null ? " (تلقائي)" : ""}`,
          createdById: userId,
        },
      });
    }
    await tx.cashRegisterDay.update({
      where: { id: view.id },
      data: { closed: true, closedAt: new Date(), closeScope: scope, closedById: userId },
    });
  });
  return { closed: true, amount: balance };
}

/** موعد الإقفال التلقائي القادم (منتصف الليل بتوقيت القاهرة، أو بداية الشهر التالي) */
export function nextAutoCloseAt(mode: "NONE" | "DAILY" | "MONTHLY") {
  const today = cairoDateStr();
  const [year, month] = today.split("-").map(Number);
  if (mode === "DAILY") return cairoDayStart(addDays(today, 1)).getTime();
  if (mode === "MONTHLY") return cairoMonthRange(year, month).end.getTime();
  return null;
}

/**
 * سجل الخزنة والإقفالات: كل يوم فيه حركات أو تم إقفاله، بأرصدته ومن قفله، مجمّع بالشهور (الأحدث أولاً).
 */
export async function getCashClosingLog() {
  const days = await prisma.cashRegisterDay.findMany({
    orderBy: { date: "asc" },
    include: {
      entries: { select: { type: true, category: true, amount: true, method: true, paymentId: true, createdById: true } },
      closedBy: { select: { name: true } },
    },
  });

  let running = 0;
  const rows = [];
  for (const d of days) {
    const opening = running;
    let cashIn = 0;
    let cashOut = 0;
    let handedOver = 0;
    let collected = 0;
    let electronicIn = 0;
    let closingCategory: CashCategory | null = null;
    for (const e of d.entries) {
      const amount = Number(e.amount);
      if (e.type === "IN") {
        if (e.method === "CASH") cashIn += amount;
        else electronicIn += amount;
        if (e.paymentId !== null) collected += amount;
      } else if (CLOSING_CATEGORIES.includes(e.category)) {
        handedOver += amount;
        closingCategory = e.category;
      } else {
        cashOut += amount;
      }
    }
    running = opening + cashIn - cashOut - handedOver;
    if (d.entries.length === 0 && !d.closed) continue;

    const scope = d.closeScope ?? (closingCategory === "MONTH_CLOSING" ? "MONTH" : closingCategory ? "DAY" : null);
    rows.push({
      date: d.date.toISOString().slice(0, 10),
      opening,
      cashIn,
      cashOut,
      collected,
      electronicIn,
      handedOver,
      closing: running,
      closed: d.closed,
      closedAt: d.closedAt,
      scope,
      closedBy: d.closedBy?.name ?? null,
      auto: d.closed && d.closedAt !== null && d.closedById === null,
    });
  }

  const months = new Map<
    string,
    { key: string; days: typeof rows; cashIn: number; cashOut: number; handedOver: number; collected: number; monthClosed: boolean }
  >();
  for (const r of rows.reverse()) {
    const key = r.date.slice(0, 7);
    const m = months.get(key) ?? { key, days: [], cashIn: 0, cashOut: 0, handedOver: 0, collected: 0, monthClosed: false };
    m.days.push(r);
    m.cashIn += r.cashIn;
    m.cashOut += r.cashOut;
    m.handedOver += r.handedOver;
    m.collected += r.collected;
    if (r.scope === "MONTH") m.monthClosed = true;
    months.set(key, m);
  }
  return Array.from(months.values());
}
