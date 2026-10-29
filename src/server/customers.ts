"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, requireAdmin } from "@/lib/auth-helpers";
import { customerSchema, prescriptionSchema, rxSchema } from "@/lib/validations";
import { createPaymentWithCash } from "@/server/cash-utils";
import { ActionResult, handleActionError, okResult } from "@/server/action-result";
import { generateReceiptNumber } from "@/lib/utils";
import { isStockTracked, orderTypeLabels } from "@/lib/labels";
import { computeTax } from "@/server/discount-utils";
import { getShopSettings } from "@/server/settings";

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
      // القيمة المكتوبة = المبلغ قبل الضريبة، والضريبة تُضاف عليه
      const taxAmount = data.applyTax ? await computeTax(totalAmount) : 0;
      const grandTotal = Math.round((totalAmount + taxAmount) * 100) / 100;
      const paidAmount = Math.min(data.paidAmount ?? 0, grandTotal);
      // القيمة المكتوبة صافية بعد خصم الشنابر، فالأصناف تُبنى بأسعارها المكتوبة والخصم يُسجل على الفريم
      const shop = await getShopSettings();
      const { lines, discountAmount } = await buildPrescriptionOrderLines(
        data,
        totalAmount,
        Number(shop.discountPercent),
        orderTypeLabels[orderType]
      );

      const order = await prisma.$transaction(async (tx) => {
        const created = await tx.order.create({
          data: {
            receiptNumber: generateReceiptNumber(),
            customerId,
            prescriptionId: prescription.id,
            type: orderType,
            status: data.orderStatus,
            totalAmount: grandTotal,
            discountAmount,
            taxAmount,
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
          await createPaymentWithCash(tx, { orderId: created.id, amount: paidAmount, method: data.paymentMethod, userId: Number(user.id) });
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
/**
 * أصناف فاتورة الكشف: الفريم والعدسات بالسعر المكتوب فى الكشف (أو سعر المخزون لو ما اتكتبش).
 * خصم الشنابر يُحسب على سعر الفريم فقط. لو القيمة المكتوبة أكبر يُضاف الفرق كإضافات، ولو أقل يُخصم من الفريم أولاً.
 */
async function buildPrescriptionOrderLines(
  data: {
    frame: string | null;
    lensType: string | null;
    frameProductId: number | null;
    lensProductId: number | null;
    framePrice: number | null;
    lensPrice: number | null;
    orderDescription?: string;
  },
  netAmount: number,
  discountPercent: number,
  fallbackLabel: string
) {
  const ids = [data.frameProductId, data.lensProductId].filter((id): id is number => !!id);
  const products = ids.length ? await prisma.product.findMany({ where: { id: { in: ids } } }) : [];
  const parts = [
    { kind: "frame", product: products.find((p) => p.id === data.frameProductId), text: data.frame, price: data.framePrice },
    { kind: "lens", product: products.find((p) => p.id === data.lensProductId), text: data.lensType, price: data.lensPrice },
  ];

  const lines: { productId: number | null; description: string; price: number; isFrame: boolean }[] = [];
  const freeText: string[] = [];
  for (const part of parts) {
    if (part.product) {
      lines.push({
        productId: part.product.id,
        description: part.product.name,
        price: part.price ?? Number(part.product.sellPrice),
        isFrame: part.kind === "frame",
      });
    } else if (part.text && part.price !== null && part.price > 0) {
      lines.push({ productId: null, description: part.text, price: part.price, isFrame: part.kind === "frame" });
    } else if (part.text) {
      freeText.push(part.text);
    }
  }

  if (lines.length === 0) {
    return {
      lines: [{ productId: null, description: data.orderDescription?.trim() || freeText.join(" + ") || fallbackLabel, price: netAmount }],
      discountAmount: 0,
    };
  }

  const frameLine = lines.find((l) => l.isFrame);
  const discountAmount = frameLine ? Math.round(frameLine.price * discountPercent) / 100 : 0;
  const gross = netAmount + discountAmount;

  const diff = Math.round((gross - lines.reduce((s, l) => s + l.price, 0)) * 100) / 100;
  if (diff > 0) {
    lines.push({ productId: null, description: freeText.join(" + ") || "إضافات", price: diff, isFrame: false });
  } else if (diff < 0) {
    let rest = -diff;
    for (const l of lines) {
      const cut = Math.min(l.price, rest);
      l.price -= cut;
      rest -= cut;
    }
  }
  return { lines: lines.map(({ productId, description, price }) => ({ productId, description, price })), discountAmount };
}

/** تعديل كشف محفوظ: القياسات والتاريخ وبيانات الورقة (الفاتورة المرتبطة لا تتغير) */
export async function updatePrescription(id: number, formData: FormData): Promise<ActionResult> {
  try {
    await requireUser();
    const { date, notes, ...rest } = rxSchema.parse(Object.fromEntries(formData));
    const updated = await prisma.prescription.update({
      where: { id },
      data: { ...rest, notes: notes || null, ...(date ? { date: new Date(date) } : {}) },
    });
    revalidatePath(`/customers/${updated.customerId}`);
    revalidatePath("/prescriptions");
    revalidatePath(`/prescriptions/${id}`);
    return okResult(undefined);
  } catch (err) {
    return handleActionError(err);
  }
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
