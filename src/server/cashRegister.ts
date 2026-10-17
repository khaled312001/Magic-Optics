"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, requireAdmin, UnauthorizedError } from "@/lib/auth-helpers";
import { cashEntrySchema } from "@/lib/validations";
import { ActionResult, handleActionError, okResult } from "@/server/action-result";
import { CLOSING_CATEGORIES, ensureCashDay, performCashClose } from "@/server/cash-utils";
import { generateAndSaveMonthlyReport } from "@/server/reports";
import { dbDate } from "@/lib/cairo-time";

function revalidateMoney() {
  revalidatePath("/cash-register");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  revalidatePath("/orders");
}

export async function addCashEntry(formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const data = cashEntrySchema.parse(Object.fromEntries(formData));

    if (data.type === "OUT" && user.role !== "ADMIN" && !user.canManageExpenses) {
      throw new UnauthorizedError("ليس لديك صلاحية تسجيل حركات المنصرف، راجع المدير");
    }

    const existing = await prisma.cashRegisterDay.findUnique({ where: { date: dbDate(data.date) } });
    if (existing?.closed) {
      return { ok: false, error: "هذا اليوم مقفول - افتح اليوم أولاً لإضافة حركات" };
    }

    await prisma.$transaction(async (tx) => {
      const day = await ensureCashDay(tx, data.date);
      await tx.cashEntry.create({
        data: {
          dayId: day.id,
          category: data.category,
          type: data.type,
          amount: data.amount,
          note: data.note || null,
          createdById: Number(user.id),
        },
      });
    });

    revalidateMoney();
    return okResult(undefined);
  } catch (err) {
    return handleActionError(err);
  }
}

/**
 * حذف حركة خزنة. حركة تحصيل الفاتورة تعني حذف الدفعة نفسها (فيرجع المبلغ متبقياً على الفاتورة)،
 * وحذف حركة التسليم يعيد فتح اليوم.
 */
export async function deleteCashEntry(id: number): Promise<ActionResult> {
  try {
    await requireAdmin();
    const entry = await prisma.cashEntry.findUniqueOrThrow({ where: { id }, include: { payment: true } });

    await prisma.$transaction(async (tx) => {
      if (entry.payment) {
        await tx.order.update({
          where: { id: entry.payment.orderId },
          data: { paidAmount: { decrement: entry.payment.amount } },
        });
        await tx.payment.delete({ where: { id: entry.payment.id } }); // تحذف الحركة معها
      } else {
        await tx.cashEntry.delete({ where: { id } });
      }
      if (CLOSING_CATEGORIES.includes(entry.category)) {
        await tx.cashRegisterDay.update({
          where: { id: entry.dayId },
          data: { closed: false, closedAt: null, closeScope: null, closedById: null },
        });
      }
    });

    if (entry.payment) revalidatePath(`/orders/${entry.payment.orderId}`);
    revalidateMoney();
    return okResult(undefined);
  } catch (err) {
    return handleActionError(err);
  }
}

/**
 * إقفال اليوم (أو الشهر): يُسجَّل رصيد الخزنة كاملاً كحركة "تسليم" فيصبح الرصيد صفراً،
 * ويُقفل اليوم فلا تُضاف عليه حركات يدوية. إقفال الشهر يحفظ أيضاً التقرير الشهري.
 */
export async function closeCash(dateStr: string, scope: "DAY" | "MONTH"): Promise<ActionResult> {
  try {
    const user = await requireAdmin();
    await performCashClose(dateStr, scope, Number(user.id));

    if (scope === "MONTH") {
      const [year, month] = dateStr.split("-").map(Number);
      await generateAndSaveMonthlyReport(year, month);
    }

    revalidateMoney();
    return okResult(undefined);
  } catch (err) {
    return handleActionError(err);
  }
}

/** فتح يوم مقفول: يلغي حركات التسليم فيرجع الرصيد كما كان */
export async function reopenCash(dateStr: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    const day = await prisma.cashRegisterDay.findUnique({ where: { date: dbDate(dateStr) } });
    if (!day) return okResult(undefined);

    await prisma.$transaction([
      prisma.cashEntry.deleteMany({ where: { dayId: day.id, category: { in: CLOSING_CATEGORIES } } }),
      prisma.cashRegisterDay.update({
        where: { id: day.id },
        data: { closed: false, closedAt: null, closeScope: null, closedById: null },
      }),
    ]);

    revalidateMoney();
    return okResult(undefined);
  } catch (err) {
    return handleActionError(err);
  }
}
