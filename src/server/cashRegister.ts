"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, requireAdmin, UnauthorizedError } from "@/lib/auth-helpers";
import { cashEntrySchema } from "@/lib/validations";
import { ActionResult, handleActionError, okResult } from "@/server/action-result";

function startOfDay(dateStr: string) {
  // يبني تاريخ UTC منتصف الليل صراحة من "YYYY-MM-DD" بغض النظر عن توقيت الخادم المحلي،
  // لتفادي انزياح اليوم عند التخزين في عمود MySQL من نوع DATE
  const [y, m, d] = dateStr.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** يجلب يوم الخزنة لتاريخ معين، وينشئه برصيد افتتاحي = رصيد آخر يوم سابق إن لم يكن موجوداً */
export async function getOrCreateCashDay(dateStr: string) {
  const date = startOfDay(dateStr);

  const existing = await prisma.cashRegisterDay.findUnique({
    where: { date },
    include: { entries: { orderBy: { createdAt: "asc" }, include: { createdBy: true } } },
  });
  if (existing) return existing;

  const previous = await prisma.cashRegisterDay.findFirst({
    where: { date: { lt: date } },
    orderBy: { date: "desc" },
    include: { entries: true },
  });

  let openingBalance = 0;
  if (previous) {
    const inSum = previous.entries
      .filter((e) => e.type === "IN")
      .reduce((s, e) => s + Number(e.amount), 0);
    const outSum = previous.entries
      .filter((e) => e.type === "OUT")
      .reduce((s, e) => s + Number(e.amount), 0);
    openingBalance = Number(previous.openingBalance) + inSum - outSum;
  }

  try {
    const created = await prisma.cashRegisterDay.create({
      data: { date, openingBalance },
      include: { entries: { orderBy: { createdAt: "asc" }, include: { createdBy: true } } },
    });
    return created;
  } catch (err) {
    // سباق نادر: طلبان متزامنان أنشآ نفس اليوم في نفس اللحظة - أعد قراءة السجل الذي أنشأه الآخر
    if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "P2002") {
      return prisma.cashRegisterDay.findUniqueOrThrow({
        where: { date },
        include: { entries: { orderBy: { createdAt: "asc" }, include: { createdBy: true } } },
      });
    }
    throw err;
  }
}

export async function addCashEntry(formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const data = cashEntrySchema.parse(Object.fromEntries(formData));

    if (data.type === "OUT" && user.role !== "ADMIN" && !user.canManageExpenses) {
      throw new UnauthorizedError("ليس لديك صلاحية تسجيل حركات المنصرف، راجع المدير");
    }

    const day = await getOrCreateCashDay(data.date);

    await prisma.cashEntry.create({
      data: {
        dayId: day.id,
        category: data.category,
        type: data.type,
        amount: data.amount,
        note: data.note || null,
        createdById: Number(user.id),
      },
    });

    revalidatePath("/cash-register");
    revalidatePath("/dashboard");
    return okResult(undefined);
  } catch (err) {
    return handleActionError(err);
  }
}

export async function deleteCashEntry(id: number): Promise<ActionResult> {
  try {
    await requireAdmin();
    await prisma.cashEntry.delete({ where: { id } });
    revalidatePath("/cash-register");
    revalidatePath("/dashboard");
    return okResult(undefined);
  } catch (err) {
    return handleActionError(err);
  }
}

export async function closeCashDay(dayId: number): Promise<ActionResult> {
  try {
    await requireAdmin();
    await prisma.cashRegisterDay.update({ where: { id: dayId }, data: { closed: true } });
    revalidatePath("/cash-register");
    return okResult(undefined);
  } catch (err) {
    return handleActionError(err);
  }
}

export async function reopenCashDay(dayId: number): Promise<ActionResult> {
  try {
    await requireAdmin();
    await prisma.cashRegisterDay.update({ where: { id: dayId }, data: { closed: false } });
    revalidatePath("/cash-register");
    return okResult(undefined);
  } catch (err) {
    return handleActionError(err);
  }
}
