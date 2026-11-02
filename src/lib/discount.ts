export type DiscountType = "PERCENT" | "AMOUNT";

/** حالة خصم الفاتورة كما تظهر فى الشاشة: مفعّل أو لا، ونسبة أو مبلغ */
export type DiscountState = { applied: boolean; type: DiscountType; value: string };

export function initialDiscount(shopPercent: number): DiscountState {
  return { applied: shopPercent > 0, type: "PERCENT", value: shopPercent > 0 ? String(shopPercent) : "" };
}

/** قيمة الخصم على مبلغ الشنابر - لا تتجاوز المبلغ نفسه، والنسبة لا تتجاوز 100% */
export function calcDiscount(base: number, type: DiscountType, value: number) {
  if (base <= 0 || value <= 0) return 0;
  const discount = type === "AMOUNT" ? value : (base * Math.min(value, 100)) / 100;
  return Math.round(Math.min(discount, base) * 100) / 100;
}

export function discountOf(base: number, state: DiscountState) {
  return state.applied ? calcDiscount(base, state.type, Number(state.value) || 0) : 0;
}
