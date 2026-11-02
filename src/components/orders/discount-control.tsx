import { Input, Select } from "@/components/ui/input";
import type { DiscountState, DiscountType } from "@/lib/discount";

/** خصم الشنابر لهذه الفاتورة: علامة تفعيل + نسبة أو مبلغ (الافتراضى من بيانات المحل) */
export function DiscountControl({
  state,
  shopPercent,
  onChange,
}: {
  state: DiscountState;
  shopPercent: number;
  onChange: (next: DiscountState) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-foreground">
      <input type="hidden" name="applyDiscount" value={state.applied ? "1" : "0"} />
      <input type="hidden" name="discountType" value={state.type} />
      {/* الخانة الفاضية = صفر صريح، حتى لا يطبق الخادم نسبة بيانات المحل */}
      <input type="hidden" name="discountValue" value={Number(state.value) || 0} />
      <label className="flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={state.applied}
          onChange={(e) => onChange({ ...state, applied: e.target.checked })}
          className="size-4 accent-brand-teal"
        />
        خصم الشنابر
      </label>
      <Input
        aria-label={state.type === "PERCENT" ? "نسبة الخصم" : "مبلغ الخصم"}
        type="number"
        min={0}
        max={state.type === "PERCENT" ? 100 : undefined}
        step="0.01"
        disabled={!state.applied}
        value={state.value}
        onChange={(e) => onChange({ ...state, value: e.target.value })}
        className="h-9 w-20 px-2 text-center"
      />
      <Select
        aria-label="نوع الخصم"
        disabled={!state.applied}
        value={state.type}
        onChange={(e) => {
          const type = e.target.value as DiscountType;
          // نفس الرقم معناه مختلف بين النسبة والمبلغ، فلا يُنقل من نوع لآخر
          onChange({ ...state, type, value: type === "PERCENT" && shopPercent > 0 ? String(shopPercent) : "" });
        }}
        className="h-9 w-24"
      >
        <option value="PERCENT">%</option>
        <option value="AMOUNT">ج.م</option>
      </Select>
    </div>
  );
}
