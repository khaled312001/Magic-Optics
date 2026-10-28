import { Select } from "@/components/ui/input";
import { paymentMethodLabels } from "@/lib/labels";

/** طريقة الدفع: نقدي (يدخل درج الخزنة) أو تحصيل إلكتروني */
export function PaymentMethodSelect({ id = "paymentMethod", className }: { id?: string; className?: string }) {
  return (
    <Select id={id} name="paymentMethod" defaultValue="CASH" className={className}>
      {Object.entries(paymentMethodLabels).map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </Select>
  );
}
