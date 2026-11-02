import "server-only";
import { prisma } from "@/lib/prisma";
import { getShopSettings } from "@/server/settings";
import { calcDiscount, type DiscountType } from "@/lib/discount";

export const FRAME_CATEGORIES = ["FRAME_MEDICAL", "FRAME_SUNGLASSES"] as const;

/** ضريبة القيمة المضافة (نسبة بيانات المحل) على المبلغ الصافي بعد الخصم */
export async function computeTax(netAmount: number) {
  const shop = await getShopSettings();
  return Math.round(netAmount * Number(shop.taxPercent)) / 100;
}

/**
 * خصم الفاتورة كما كُتب فى الشاشة. لو الخانة مش مبعوتة (صفحة قديمة مفتوحة قبل التحديث) تُستخدم نسبة بيانات المحل.
 */
export async function resolveDiscount(data: { applyDiscount: boolean; discountType: DiscountType; discountValue: number | null }) {
  if (!data.applyDiscount) return { type: "PERCENT" as DiscountType, value: 0 };
  if (data.discountValue !== null) return { type: data.discountType, value: data.discountValue };
  const shop = await getShopSettings();
  return { type: "PERCENT" as DiscountType, value: Number(shop.discountPercent) };
}

/** خصم الشنابر: على أصناف الإطارات فقط (لا يشمل العدسات ولا الإضافات) */
export async function computeFrameDiscount(
  lines: { productId: number | null | undefined; amount: number }[],
  discount: { type: DiscountType; value: number }
) {
  const ids = [...new Set(lines.map((l) => l.productId).filter((id): id is number => !!id))];
  if (ids.length === 0) return 0;
  const frames = await prisma.product.findMany({ where: { id: { in: ids }, category: { in: [...FRAME_CATEGORIES] } }, select: { id: true } });
  const frameIds = new Set(frames.map((f) => f.id));
  const frameSubtotal = lines.filter((l) => l.productId && frameIds.has(l.productId)).reduce((s, l) => s + l.amount, 0);
  return calcDiscount(frameSubtotal, discount.type, discount.value);
}

/** النسبة اللى تتطبع فى الفاتورة - فاضية لو الخصم مبلغ */
export function storedDiscountPercent(discount: { type: DiscountType; value: number }, discountAmount: number) {
  return discount.type === "PERCENT" && discountAmount > 0 ? Math.min(discount.value, 100) : null;
}
