"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";
import { userSchema } from "@/lib/validations";
import { ActionResult, handleActionError, okResult } from "@/server/action-result";

export async function createUser(formData: FormData): Promise<ActionResult<{ id: number }>> {
  try {
    await requireAdmin();
    const data = userSchema.parse(Object.fromEntries(formData));

    if (!data.password) {
      return { ok: false, error: "كلمة المرور مطلوبة عند إنشاء مستخدم جديد" };
    }

    const hashed = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        username: data.username,
        password: hashed,
        role: data.role,
        active: data.active,
        canEditInventory: data.canEditInventory,
        canManageExpenses: data.canManageExpenses,
      },
    });

    revalidatePath("/settings/users");
    return okResult({ id: user.id });
  } catch (err) {
    return handleActionError(err);
  }
}

export async function updateUser(id: number, formData: FormData): Promise<ActionResult<{ id: number }>> {
  try {
    await requireAdmin();
    const data = userSchema.parse(Object.fromEntries(formData));

    await prisma.user.update({
      where: { id },
      data: {
        name: data.name,
        username: data.username,
        role: data.role,
        active: data.active,
        canEditInventory: data.canEditInventory,
        canManageExpenses: data.canManageExpenses,
        ...(data.password ? { password: await bcrypt.hash(data.password, 10) } : {}),
      },
    });

    revalidatePath("/settings/users");
    return okResult({ id });
  } catch (err) {
    return handleActionError(err);
  }
}

export async function deleteUser(id: number): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    if (Number(admin.id) === id) {
      return { ok: false, error: "لا يمكنك حذف حسابك الحالي" };
    }
    await prisma.user.delete({ where: { id } });
    revalidatePath("/settings/users");
    return okResult(undefined);
  } catch (err) {
    return handleActionError(err);
  }
}
