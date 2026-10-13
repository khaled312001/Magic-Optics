"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/auth-helpers";
import { shopSettingsSchema } from "@/lib/validations";
import { ActionResult, handleActionError, okResult } from "@/server/action-result";

export async function getShopSettings() {
  const settings = await prisma.shopSettings.findUnique({ where: { id: 1 } });
  if (settings) return settings;
  return prisma.shopSettings.create({ data: { id: 1 } });
}

export async function updateShopSettings(formData: FormData): Promise<ActionResult> {
  try {
    await requireAdmin();
    const data = shopSettingsSchema.parse(Object.fromEntries(formData));

    await prisma.shopSettings.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        name: data.name,
        address: data.address || "",
        phone: data.phone || "",
        phone2: data.phone2 || null,
        examFee: data.examFee,
        discountPercent: data.discountPercent,
      },
      update: {
        name: data.name,
        address: data.address || "",
        phone: data.phone || "",
        phone2: data.phone2 || null,
        examFee: data.examFee,
        discountPercent: data.discountPercent,
      },
    });

    revalidatePath("/settings/shop");
    revalidatePath("/");
    return okResult(undefined);
  } catch (err) {
    return handleActionError(err);
  }
}

export async function changeOwnPassword(formData: FormData): Promise<ActionResult> {
  try {
    const current = await requireUser();
    const currentPassword = String(formData.get("currentPassword") ?? "");
    const newPassword = String(formData.get("newPassword") ?? "");

    if (newPassword.length < 6) {
      return { ok: false, error: "كلمة المرور الجديدة 6 أحرف على الأقل" };
    }

    const user = await prisma.user.findUniqueOrThrow({ where: { id: Number(current.id) } });
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return { ok: false, error: "كلمة المرور الحالية غير صحيحة" };
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { password: await bcrypt.hash(newPassword, 10) },
    });

    return okResult(undefined);
  } catch (err) {
    return handleActionError(err);
  }
}
