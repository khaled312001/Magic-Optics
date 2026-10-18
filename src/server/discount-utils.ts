import "server-only";
import { prisma } from "@/lib/prisma";
import { getShopSettings } from "@/server/settings";

export const FRAME_CATEGORIES = ["FRAME_MEDICAL", "FRAME_SUNGLASSES"] as const;

/** خصم الشنابر: نسبة بيانات المحل على أصناف الإطارات فقط (لا يشمل العدسات ولا الإضافات) */
export async function computeFrameDiscount(lines: { productId: number | null | undefined; amount: number }[]) {
  const ids = [...new Set(lines.map((l) => l.productId).filter((id): id is number => !!id))];
  if (ids.length === 0) return 0;
  const [frames, shop] = await Promise.all([
    prisma.product.findMany({ where: { id: { in: ids }, category: { in: [...FRAME_CATEGORIES] } }, select: { id: true } }),
    getShopSettings(),
  ]);
  const frameIds = new Set(frames.map((f) => f.id));
  const frameSubtotal = lines.filter((l) => l.productId && frameIds.has(l.productId)).reduce((s, l) => s + l.amount, 0);
  return Math.round(frameSubtotal * Number(shop.discountPercent)) / 100;
}
