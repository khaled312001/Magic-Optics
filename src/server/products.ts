"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, requireAdmin } from "@/lib/auth-helpers";
import { productSchema, stockAdjustSchema } from "@/lib/validations";
import { ActionResult, handleActionError, okResult } from "@/server/action-result";

export async function createProduct(formData: FormData): Promise<ActionResult<{ id: number }>> {
  try {
    await requireUser();
    const data = productSchema.parse(Object.fromEntries(formData));

    const product = await prisma.product.create({
      data: {
        code: data.code || null,
        name: data.name,
        category: data.category,
        costPrice: data.costPrice,
        sellPrice: data.sellPrice,
        quantity: data.quantity,
        minQuantity: data.minQuantity,
        notes: data.notes || null,
      },
    });

    revalidatePath("/inventory");
    return okResult({ id: product.id });
  } catch (err) {
    return handleActionError(err);
  }
}

export async function updateProduct(id: number, formData: FormData): Promise<ActionResult<{ id: number }>> {
  try {
    await requireUser();
    const data = productSchema.parse(Object.fromEntries(formData));

    await prisma.product.update({
      where: { id },
      data: {
        code: data.code || null,
        name: data.name,
        category: data.category,
        costPrice: data.costPrice,
        sellPrice: data.sellPrice,
        quantity: data.quantity,
        minQuantity: data.minQuantity,
        notes: data.notes || null,
      },
    });

    revalidatePath("/inventory");
    return okResult({ id });
  } catch (err) {
    return handleActionError(err);
  }
}

export async function toggleProductActive(id: number, active: boolean): Promise<ActionResult> {
  try {
    await requireAdmin();
    await prisma.product.update({ where: { id }, data: { active } });
    revalidatePath("/inventory");
    return okResult(undefined);
  } catch (err) {
    return handleActionError(err);
  }
}

export async function deleteProduct(id: number): Promise<ActionResult> {
  try {
    await requireAdmin();
    await prisma.product.delete({ where: { id } });
    revalidatePath("/inventory");
    return okResult(undefined);
  } catch (err) {
    return handleActionError(err);
  }
}

export async function adjustStock(formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const data = stockAdjustSchema.parse(Object.fromEntries(formData));

    const product = await prisma.product.findUniqueOrThrow({ where: { id: data.productId } });

    let newQuantity = product.quantity;
    if (data.type === "IN") newQuantity += data.quantity;
    else if (data.type === "OUT") newQuantity -= data.quantity;
    else newQuantity = data.quantity; // ADJUSTMENT: تعيين الكمية مباشرة

    if (newQuantity < 0) {
      return { ok: false, error: "لا يمكن أن تقل الكمية عن صفر" };
    }

    await prisma.$transaction([
      prisma.product.update({ where: { id: data.productId }, data: { quantity: newQuantity } }),
      prisma.stockMovement.create({
        data: {
          productId: data.productId,
          type: data.type,
          quantity: data.quantity,
          note: data.note || null,
          createdById: Number(user.id),
        },
      }),
    ]);

    revalidatePath("/inventory");
    return okResult(undefined);
  } catch (err) {
    return handleActionError(err);
  }
}
