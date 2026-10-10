"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { updateOrderStatus } from "@/server/orders";
import { orderStatusLabels } from "@/lib/labels";
import type { OrderStatus } from "@prisma/client";

export function StatusSelect({ orderId, status }: { orderId: number; status: OrderStatus }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { show } = useToast();

  return (
    <Select
      defaultValue={status}
      disabled={isPending}
      className="w-auto"
      onChange={(e) => {
        const value = e.target.value as OrderStatus;
        startTransition(async () => {
          const result = await updateOrderStatus(orderId, value);
          if (result.ok) {
            show("تم تحديث حالة الفاتورة");
            router.refresh();
          } else {
            show(result.error, "error");
          }
        });
      }}
    >
      {Object.entries(orderStatusLabels).map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </Select>
  );
}
