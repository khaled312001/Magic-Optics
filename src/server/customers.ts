"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, requireAdmin } from "@/lib/auth-helpers";
import { customerSchema, prescriptionSchema } from "@/lib/validations";
import { createPaymentWithCash } from "@/server/cash-utils";
import { ActionResult, handleActionError, okResult } from "@/server/action-result";
import { generateReceiptNumber } from "@/lib/utils";
import { isStockTracked, orderTypeLabels } from "@/lib/labels";
import { computeFrameDiscount } from "@/server/discount-utils";

export async function createCustomer(formData: FormData): Promise<ActionResult<{ id: number }>> {
  try {
    await requireUser();
    const data = customerSchema.parse(Object.fromEntries(formData));

    const customer = await prisma.customer.create({
      data: {
        name: data.name,
        phone: data.phone || null,
        phone2: data.phone2 || null,
        address: data.address || null,
        notes: data.notes || null,
      },
    });

    revalidatePath("/customers");
    return okResult({ id: customer.id });
  } catch (err) {
    return handleActionError(err);
  }
}

export async function updateCustomer(id: number, formData: FormData): Promise<ActionResult<{ id: number }>> {
  try {
    await requireUser();
    const data = customerSchema.parse(Object.fromEntries(formData));

    await prisma.customer.update({
      where: { id },
      data: {
        name: data.name,
        phone: data.phone || null,
        phone2: data.phone2 || null,
        address: data.address || null,
        notes: data.notes || null,
      },
    });

    revalidatePath("/customers");
    revalidatePath(`/customers/${id}`);
    return okResult({ id });
  } catch (err) {
    return handleActionError(err);
  }
}

export async function deleteCustomer(id: number): Promise<ActionResult> {
  try {
    await requireAdmin();
    await prisma.customer.delete({ where: { id } });
    revalidatePath("/customers");
    return okResult(undefined);
  } catch (err) {
    return handleActionError(err);
  }
}

export async function searchCustomers(query: string) {
  await requireUser();
  if (!query.trim()) {
    return prisma.customer.findMany({ orderBy: { createdAt: "desc" }, take: 20 });
  }
  return prisma.customer.findMany({
    where: {
      OR: [
        { name: { contains: query } },
        { phone: { contains: query } },
        { phone2: { contains: query } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}

export async function createPrescription(
  formData: FormData
): Promise<ActionResult<{ id: number; orderId?: number }>> {
  try {
    const user = await requireUser();
    const raw = Object.fromEntries(formData);
    const data = prescriptionSchema.parse(raw);

    let customerId = data.customerId;
    if (!customerId) {
      const customer = await prisma.customer.create({
        data: { name: data.newCustomerName!.trim(), phone: data.newCustomerPhone?.trim() || null },
      });
      customerId = customer.id;
    }

    const prescription = await prisma.prescription.create({
      data: {
        customerId,
        date: data.date ? new Date(data.date) : undefined,
        rightSphFar: data.rightSphFar,
        rightCylFar: data.rightCylFar,
        rightAxisFar: data.rightAxisFar,
        leftSphFar: data.leftSphFar,
        leftCylFar: data.leftCylFar,
        leftAxisFar: data.leftAxisFar,
        rightSphNear: data.rightSphNear,
        rightCylNear: data.rightCylNear,
        rightAxisNear: data.rightAxisNear,
        leftSphNear: data.leftSphNear,
        leftCylNear: data.leftCylNear,
        leftAxisNear: data.leftAxisNear,
        ipdFar: data.ipdFar,
        ipdNear: data.ipdNear,
        notes: data.notes || null,
        doctorName: data.doctorName,
        frame: data.frame,
        lensType: data.lensType,
        createdById: Number(user.id),
      },
    });

    // لو كُتبت قيمة الطلب، تتولد فاتورة مرتبطة بهذا الكشف (زي ورقة الكشف التي تجمع الكشف والطلب معاً)
    let orderId: number | undefined;
    const totalAmount = data.totalAmount ?? 0;
    if (totalAmount > 0) {
      const orderType = data.orderType ?? "MEDICAL";
      const paidAmount = Math.min(data.paidAmount ?? 0, totalAmount);
      // القيمة المكتوبة صافية بعد خصم الشنابر لو اختير فريم من المخزون، فالأصناف تُبنى على القيمة قبل الخصم
      let discountAmount = 0;
      if (data.frameProductId) {
        const frame = await prisma.product.findUnique({ where: { id: data.frameProductId }, select: { sellPrice: true } });
        if (frame) discountAmount = await computeFrameDiscount([{ productId: data.frameProductId, amount: Number(frame.sellPrice) }]);
      }
      const lines = await buildPrescriptionOrderLines(data, totalAmount + discountAmount, orderTypeLabels[orderType]);

      const order = await prisma.$transaction(async (tx) => {
        const created = await tx.order.create({
          data: {
            receiptNumber: generateReceiptNumber(),
            customerId,
            prescriptionId: prescription.id,
            type: orderType,
            status: "PENDING",
            totalAmount,
            discountAmount,
            paidAmount,
            deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : null,
            createdById: Number(user.id),
            items: {
              create: lines.map((l) => ({
                productId: l.productId,
                description: l.description,
                quantity: 1,
                unitPrice: l.price,
                subtotal: l.price,
              })),
            },
          },
        });

        // خصم الفريم/العدسة المختارين من المخزون
        for (const l of lines) {
          if (!l.productId) continue;
          const product = await tx.product.findUnique({ where: { id: l.productId }, select: { category: true } });
          if (!product || !isStockTracked(product.category)) continue;
          await tx.product.update({ where: { id: l.productId }, data: { quantity: { decrement: 1 } } });
          await tx.stockMovement.create({
            data: {
              productId: l.productId,
              type: "OUT",
              quantity: 1,
              note: `فاتورة رقم ${created.receiptNumber}`,
              createdById: Number(user.id),
            },
          });
        }

        if (paidAmount > 0) {
          await createPaymentWithCash(tx, { orderId: created.id, amount: paidAmount, userId: Number(user.id) });
        }
        return created;
      });
      orderId = order.id;
      revalidatePath("/orders");
      revalidatePath("/inventory");
      revalidatePath("/dashboard");
      revalidatePath("/cash-register");
    }

    revalidatePath(`/customers/${customerId}`);
    revalidatePath("/prescriptions");
    return okResult({ id: prescription.id, orderId });
  } catch (err) {
    return handleActionError(err);
  }
}

/**
 * أصناف فاتورة الكشف: الفريم والعدسة المختاران من المخزون بأسعارهما، وما كُتب يدوياً بدون اختيار
 * يُضاف كبند بفرق القيمة. لو القيمة المكتوبة أقل من أسعار الأصناف، يُخصم الفرق من الفريم أولاً.
 */
async function buildPrescriptionOrderLines(
  data: { frame: string | null; lensType: string | null; frameProductId: number | null; lensProductId: number | null; orderDescription?: string },
  totalAmount: number,
  fallbackLabel: string
) {
  const ids = [data.frameProductId, data.lensProductId].filter((id): id is number => !!id);
  const products = ids.length ? await prisma.product.findMany({ where: { id: { in: ids } } }) : [];
  const lines: { productId: number | null; description: string; price: number }[] = ids
    .map((id) => products.find((p) => p.id === id))
    .filter((p) => p !== undefined)
    .map((p) => ({ productId: p.id, description: p.name, price: Number(p.sellPrice) }));

  const freeText = [
    data.frameProductId ? null : data.frame,
    data.lensProductId ? null : data.lensType,
  ].filter(Boolean).join(" + ");

  if (lines.length === 0) {
    return [{ productId: null, description: data.orderDescription?.trim() || freeText || fallbackLabel, price: totalAmount }];
  }

  const diff = Math.round((totalAmount - lines.reduce((s, l) => s + l.price, 0)) * 100) / 100;
  if (diff > 0) {
    lines.push({ productId: null, description: freeText || "إضافات", price: diff });
  } else if (diff < 0) {
    let rest = -diff;
    for (const l of lines) {
      const cut = Math.min(l.price, rest);
      l.price -= cut;
      rest -= cut;
    }
  }
  return lines;
}

export async function deletePrescription(id: number, customerId: number): Promise<ActionResult> {
  try {
    await requireAdmin();
    await prisma.prescription.delete({ where: { id } });
    revalidatePath(`/customers/${customerId}`);
    revalidatePath("/prescriptions");
    return okResult(undefined);
  } catch (err) {
    return handleActionError(err);
  }
}
