"use client";

import { useState } from "react";
import { PackagePlus } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { useActionForm } from "@/components/ui/use-action-form";
import { adjustStock } from "@/server/products";
import { stockMovementTypeLabels } from "@/lib/labels";
import type { SerializedProduct } from "@/types/serialized";

export function StockAdjustDialog({ product }: { product: SerializedProduct }) {
  const [open, setOpen] = useState(false);

  const { onSubmit, isPending } = useActionForm(adjustStock, {
    successMessage: "تم تحديث المخزون",
    onSuccess: () => setOpen(false),
  });

  return (
    <>
      <Button variant="ghost" size="icon" onClick={() => setOpen(true)} title="تحديث المخزون">
        <PackagePlus className="size-4" />
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} title={`تحديث مخزون: ${product.name}`} maxWidth="max-w-sm">
        <form onSubmit={onSubmit} className="space-y-4">
          <input type="hidden" name="productId" value={product.id} />

          <p className="text-sm text-muted">الكمية الحالية: {product.quantity}</p>

          <div>
            <Label htmlFor="type">نوع الحركة</Label>
            <Select id="type" name="type" required>
              <option value="IN">{stockMovementTypeLabels.IN}</option>
              <option value="OUT">{stockMovementTypeLabels.OUT}</option>
              <option value="ADJUSTMENT">{stockMovementTypeLabels.ADJUSTMENT} (تعيين الكمية مباشرة)</option>
            </Select>
          </div>

          <div>
            <Label htmlFor="quantity">الكمية</Label>
            <Input id="quantity" name="quantity" type="number" min="1" required />
          </div>

          <div>
            <Label htmlFor="note">ملاحظة</Label>
            <Textarea id="note" name="note" rows={2} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit" loading={isPending}>
              حفظ
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
