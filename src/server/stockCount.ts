"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireInventoryEdit } from "@/lib/auth-helpers";
import { ActionResult, handleActionError, okResult } from "@/server/action-result";
import { cairoDateStr } from "@/lib/cairo-time";
import { NON_STOCK_CATEGORIES } from "@/lib/labels";

const MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

/** بدء جرد جديد: لقطة من كل الأصناف النشطة بكمياتها الحالية */
export async function startStockCount(): Promise<ActionResult<{ id: number }>> {
  try {
    const user = await requireInventoryEdit();
    const open = await prisma.stockCount.findFirst({ where: { status: "OPEN" } });
    if (open) return { ok: false, error: `يوجد جرد مفتوح بالفعل (${open.title}) - أكمله أو احذفه أولاً` };

    const products = await prisma.product.findMany({ where: { active: true, category: { notIn: [...NON_STOCK_CATEGORIES] } } });
    const [y, m] = cairoDateStr().split("-").map(Number);

    const count = await prisma.stockCount.create({
      data: {
        title: `جرد ${MONTHS[m - 1]} ${y}`,
        createdById: Number(user.id),
        items: {
          create: products.map((p) => ({
            productId: p.id,
            name: p.name,
            code: p.code,
            category: p.category,
            systemQty: p.quantity,
            costPrice: p.costPrice,
            sellPrice: p.sellPrice,
          })),
        },
      },
    });

    revalidatePath("/stock-count");
    return okResult({ id: count.id });
  } catch (err) {
    return handleActionError(err);
  }
}

const entriesSchema = z.array(
  z.object({ id: z.number().int().positive(), countedQty: z.number().int().min(0).nullable() })
);

/** حفظ الكميات الفعلية المكتوبة (يمكن الحفظ أكثر من مرة أثناء العد) */
export async function saveStockCount(id: number, entries: { id: number; countedQty: number | null }[]): Promise<ActionResult> {
  try {
    await requireInventoryEdit();
    const data = entriesSchema.parse(entries);
    const count = await prisma.stockCount.findUniqueOrThrow({ where: { id } });
    if (count.status !== "OPEN") return { ok: false, error: "هذا الجرد معتمد ولا يمكن تعديله" };

    await prisma.$transaction(
      data.map((e) => prisma.stockCountItem.updateMany({ where: { id: e.id, countId: id }, data: { countedQty: e.countedQty } }))
    );

    revalidatePath(`/stock-count/${id}`);
    revalidatePath("/stock-count");
    return okResult(undefined);
  } catch (err) {
    return handleActionError(err);
  }
}

/**
 * اعتماد الجرد: كل صنف تم عده تُضاف له الفروق (الفعلي - السيستم وقت البدء) على كميته الحالية،
 * فلا تضيع المبيعات التي حصلت أثناء العد. الأصناف التي لم تُعد لا تتغير.
 */
export async function approveStockCount(id: number): Promise<ActionResult> {
  try {
    const user = await requireAdmin();
    const count = await prisma.stockCount.findUniqueOrThrow({ where: { id }, include: { items: true } });
    if (count.status !== "OPEN") return { ok: false, error: "تم اعتماد هذا الجرد من قبل" };

    await prisma.$transaction(async (tx) => {
      for (const it of count.items) {
        if (it.countedQty === null || !it.productId) continue;
        const diff = it.countedQty - it.systemQty;
        if (diff === 0) continue;
        const product = await tx.product.findUnique({ where: { id: it.productId } });
        if (!product) continue;
        const newQuantity = Math.max(0, product.quantity + diff);
        await tx.product.update({ where: { id: product.id }, data: { quantity: newQuantity } });
        await tx.stockMovement.create({
          data: {
            productId: product.id,
            type: "ADJUSTMENT",
            quantity: newQuantity,
            note: `${count.title}: السيستم ${it.systemQty} - الفعلي ${it.countedQty} (${diff > 0 ? "زيادة" : "عجز"} ${Math.abs(diff)})`,
            createdById: Number(user.id),
          },
        });
      }
      await tx.stockCount.update({ where: { id }, data: { status: "APPROVED", approvedAt: new Date() } });
    });

    revalidatePath(`/stock-count/${id}`);
    revalidatePath("/stock-count");
    revalidatePath("/inventory");
    return okResult(undefined);
  } catch (err) {
    return handleActionError(err);
  }
}

export async function deleteStockCount(id: number): Promise<ActionResult> {
  try {
    await requireAdmin();
    const count = await prisma.stockCount.findUniqueOrThrow({ where: { id } });
    if (count.status !== "OPEN") return { ok: false, error: "لا يمكن حذف جرد معتمد (تمت تسوية المخزون به)" };
    await prisma.stockCount.delete({ where: { id } });
    revalidatePath("/stock-count");
    return okResult(undefined);
  } catch (err) {
    return handleActionError(err);
  }
}
