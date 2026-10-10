"use client";

import { useState } from "react";
import { Plus, Pencil } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea, Select, FieldError } from "@/components/ui/input";
import { useActionForm } from "@/components/ui/use-action-form";
import { createProduct, updateProduct } from "@/server/products";
import { productCategoryLabels } from "@/lib/labels";
import type { SerializedProduct } from "@/types/serialized";

export function ProductFormDialog({
  product,
  defaultCategory,
  isAdmin,
}: {
  product?: SerializedProduct;
  defaultCategory?: string;
  isAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);
  const isEdit = Boolean(product);

  const { onSubmit, isPending, fieldErrors } = useActionForm(
    (fd) => (isEdit ? updateProduct(product!.id, fd) : createProduct(fd)),
    {
      successMessage: isEdit ? "تم تحديث الصنف" : "تم إضافة الصنف",
      onSuccess: () => setOpen(false),
    }
  );

  return (
    <>
      {isEdit ? (
        <Button variant="ghost" size="icon" onClick={() => setOpen(true)} title="تعديل">
          <Pencil className="size-4" />
        </Button>
      ) : (
        <Button onClick={() => setOpen(true)}>
          <Plus className="size-4" />
          صنف جديد
        </Button>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} title={isEdit ? "تعديل الصنف" : "إضافة صنف جديد"}>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">الاسم / النوع *</Label>
            <Input id="name" name="name" defaultValue={product?.name} required />
            <FieldError>{fieldErrors.name}</FieldError>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="category">الفئة *</Label>
              <Select id="category" name="category" defaultValue={product?.category ?? defaultCategory} required>
                {Object.entries(productCategoryLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="code">الكود</Label>
              <Input id="code" name="code" dir="ltr" className="text-right" defaultValue={product?.code ?? ""} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {isAdmin && (
              <div>
                <Label htmlFor="costPrice">سعر التكلفة</Label>
                <Input
                  id="costPrice"
                  name="costPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={product?.costPrice?.toString() ?? "0"}
                />
                <FieldError>{fieldErrors.costPrice}</FieldError>
              </div>
            )}
            <div>
              <Label htmlFor="sellPrice">سعر البيع *</Label>
              <Input
                id="sellPrice"
                name="sellPrice"
                type="number"
                step="0.01"
                min="0"
                required
                defaultValue={product?.sellPrice?.toString() ?? ""}
              />
              <FieldError>{fieldErrors.sellPrice}</FieldError>
            </div>
          </div>

          {!isAdmin && <input type="hidden" name="costPrice" value={product?.costPrice?.toString() ?? "0"} />}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="quantity">الكمية بالمخزون *</Label>
              <Input id="quantity" name="quantity" type="number" min="0" required defaultValue={product?.quantity ?? 0} />
            </div>
            <div>
              <Label htmlFor="minQuantity">حد التنبيه</Label>
              <Input id="minQuantity" name="minQuantity" type="number" min="0" defaultValue={product?.minQuantity ?? 3} />
            </div>
          </div>

          <div>
            <Label htmlFor="notes">ملاحظات</Label>
            <Textarea id="notes" name="notes" rows={2} defaultValue={product?.notes ?? ""} />
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
