"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, requireAdmin } from "@/lib/auth-helpers";
import { customerSchema, prescriptionSchema } from "@/lib/validations";
import { ActionResult, handleActionError, okResult } from "@/server/action-result";
import { generateReceiptNumber } from "@/lib/utils";
import { orderTypeLabels } from "@/lib/labels";

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

    // لو العميل كتب قيمة الطلب، يتولد فاتورة مرتبطة بهذا الكشف تلقائياً (زي سلّة الفحص الورقية التي تجمع الكشف والطلب معاً)
    let orderId: number | undefined;
    if (data.totalAmount && data.totalAmount > 0) {
      const orderType = data.orderType ?? "MEDICAL";
      const paidAmount = Math.min(data.paidAmount ?? 0, data.totalAmount);

      const order = await prisma.order.create({
        data: {
          receiptNumber: generateReceiptNumber(),
          customerId,
          prescriptionId: prescription.id,
          type: orderType,
          status: "PENDING",
          totalAmount: data.totalAmount,
          paidAmount,
          deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : null,
          createdById: Number(user.id),
          items: {
            create: [
              {
                description:
                  data.orderDescription?.trim() ||
                  [data.frame, data.lensType].filter(Boolean).join(" + ") ||
                  orderTypeLabels[orderType],
                quantity: 1,
                unitPrice: data.totalAmount,
                subtotal: data.totalAmount,
              },
            ],
          },
          payments: paidAmount > 0 ? { create: [{ amount: paidAmount, createdById: Number(user.id) }] } : undefined,
        },
      });
      orderId = order.id;
      revalidatePath("/orders");
      revalidatePath("/dashboard");
    }

    revalidatePath(`/customers/${customerId}`);
    revalidatePath("/prescriptions");
    return okResult({ id: prescription.id, orderId });
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
