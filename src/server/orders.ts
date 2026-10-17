"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, requireAdmin } from "@/lib/auth-helpers";
import { orderSchema, paymentSchema, orderItemSchema, rxSchema } from "@/lib/validations";
import { ActionResult, handleActionError, okResult } from "@/server/action-result";
import { generateReceiptNumber } from "@/lib/utils";
import { z } from "zod";
import { createPaymentWithCash } from "@/server/cash-utils";

export async function createOrder(formData: FormData): Promise<ActionResult<{ id: number }>> {
  try {
    const user = await requireUser();

    const itemsRaw = formData.get("items");
    const items = z.array(orderItemSchema).parse(JSON.parse(String(itemsRaw ?? "[]")));

    const data = orderSchema.parse({
      ...Object.fromEntries(formData),
      items,
    });

    // قسم كشف النظر داخل الفاتورة (حقول rx_*) - يُحفظ ككشف للعميل لو اتكتب فيه أي قياس أو بيان
    let rx = null;
    if (data.type === "MEDICAL") {
      const rxRaw = Object.fromEntries(
        [...formData.entries()]
          .filter(([key]) => key.startsWith("rx_"))
          .map(([key, value]) => [key.slice(3), value])
      );
      const filled = Object.entries(rxRaw).some(
        ([key, value]) => key !== "date" && !key.endsWith("ProductId") && String(value).trim() !== ""
      );
      if (filled) rx = rxSchema.parse(rxRaw);
    }

    if (!data.customerId && !data.newCustomerName) {
      return { ok: false, error: "اختر عميلاً أو أدخل اسم عميل جديد" };
    }

    const totalAmount = items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0);
    if (data.paidAmount > totalAmount) {
      return { ok: false, error: "المبلغ المدفوع لا يمكن أن يكون أكبر من إجمالي الفاتورة" };
    }

    const order = await prisma.$transaction(async (tx) => {
      let customerId = data.customerId ?? null;
      if (!customerId && data.newCustomerName) {
        const newCustomer = await tx.customer.create({
          data: { name: data.newCustomerName, phone: data.newCustomerPhone || null },
        });
        customerId = newCustomer.id;
      }

      // كشف النظر المُدخل من شاشة الفاتورة يُحفظ ككشف للعميل ويُربط بالفاتورة
      let prescriptionId = data.prescriptionId ?? null;
      if (rx && customerId) {
        const { date, notes, ...measurements } = rx;
        const prescription = await tx.prescription.create({
          data: {
            customerId,
            ...measurements,
            date: date ? new Date(date) : undefined,
            notes: notes || null,
            createdById: Number(user.id),
          },
        });
        prescriptionId = prescription.id;
      }

      const created = await tx.order.create({
        data: {
          receiptNumber: generateReceiptNumber(),
          customerId,
          prescriptionId,
          type: data.type,
          status: data.status,
          totalAmount,
          paidAmount: data.paidAmount,
          deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : null,
          notes: data.notes || null,
          createdById: Number(user.id),
          items: {
            create: items.map((it) => ({
              productId: it.productId ?? null,
              description: it.description,
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              subtotal: it.quantity * it.unitPrice,
            })),
          },
        },
      });

      if (data.paidAmount > 0) {
        await createPaymentWithCash(tx, { orderId: created.id, amount: data.paidAmount, userId: Number(user.id) });
      }

      for (const it of items) {
        if (!it.productId) continue;
        const product = await tx.product.findUnique({ where: { id: it.productId } });
        if (!product) continue;
        await tx.product.update({
          where: { id: it.productId },
          data: { quantity: { decrement: it.quantity } },
        });
        await tx.stockMovement.create({
          data: {
            productId: it.productId,
            type: "OUT",
            quantity: it.quantity,
            note: `فاتورة رقم ${created.receiptNumber}`,
            createdById: Number(user.id),
          },
        });
      }

      return created;
    });

    revalidatePath("/orders");
    revalidatePath("/inventory");
    revalidatePath("/dashboard");
    revalidatePath("/cash-register");
    return okResult({ id: order.id });
  } catch (err) {
    return handleActionError(err);
  }
}

export async function updateOrderStatus(id: number, status: "PENDING" | "READY" | "DELIVERED" | "CANCELLED"): Promise<ActionResult> {
  try {
    await requireUser();
    await prisma.order.update({ where: { id }, data: { status } });
    revalidatePath("/orders");
    revalidatePath(`/orders/${id}`);
    revalidatePath("/dashboard");
    return okResult(undefined);
  } catch (err) {
    return handleActionError(err);
  }
}

export async function addPayment(formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const data = paymentSchema.parse(Object.fromEntries(formData));

    const order = await prisma.order.findUniqueOrThrow({ where: { id: data.orderId } });
    const remaining = Number(order.totalAmount) - Number(order.paidAmount);
    if (data.amount > remaining) {
      return { ok: false, error: `المبلغ المتبقي فقط ${remaining} ج.م` };
    }

    await prisma.$transaction(async (tx) => {
      await createPaymentWithCash(tx, { orderId: data.orderId, amount: data.amount, note: data.note, userId: Number(user.id) });
      await tx.order.update({
        where: { id: data.orderId },
        data: { paidAmount: { increment: data.amount } },
      });
    });

    revalidatePath(`/orders/${data.orderId}`);
    revalidatePath("/orders");
    revalidatePath("/dashboard");
    revalidatePath("/cash-register");
    return okResult(undefined);
  } catch (err) {
    return handleActionError(err);
  }
}

export async function updateOrderNotes(id: number, notes: string): Promise<ActionResult> {
  try {
    await requireUser();
    await prisma.order.update({ where: { id }, data: { notes: notes || null } });
    revalidatePath(`/orders/${id}`);
    return okResult(undefined);
  } catch (err) {
    return handleActionError(err);
  }
}

export async function deleteOrder(id: number): Promise<ActionResult> {
  try {
    await requireAdmin();
    await prisma.order.delete({ where: { id } }); // دفعاتها وحركاتها فى الخزنة تُحذف معها
    revalidatePath("/orders");
    revalidatePath("/dashboard");
    revalidatePath("/cash-register");
    return okResult(undefined);
  } catch (err) {
    return handleActionError(err);
  }
}
