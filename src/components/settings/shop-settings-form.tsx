"use client";

import { Input, Label, FieldError } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useActionForm } from "@/components/ui/use-action-form";
import { updateShopSettings } from "@/server/settings";
import type { ShopSettings } from "@prisma/client";

type SerializedShopSettings = Omit<ShopSettings, "examFee" | "discountPercent"> & {
  examFee: number;
  discountPercent: number;
};

export function ShopSettingsForm({ settings }: { settings: SerializedShopSettings }) {
  const { onSubmit, isPending, fieldErrors } = useActionForm(updateShopSettings, {
    successMessage: "تم حفظ بيانات المحل",
    refresh: true,
  });

  return (
    <form onSubmit={onSubmit} className="max-w-md space-y-4">
      <div>
        <Label htmlFor="name">اسم المحل *</Label>
        <Input id="name" name="name" defaultValue={settings.name} required />
        <FieldError>{fieldErrors.name}</FieldError>
      </div>
      <div>
        <Label htmlFor="address">العنوان</Label>
        <Input id="address" name="address" defaultValue={settings.address} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="phone">الهاتف الأساسي</Label>
          <Input id="phone" name="phone" dir="ltr" className="text-right" defaultValue={settings.phone} />
        </div>
        <div>
          <Label htmlFor="phone2">هاتف آخر</Label>
          <Input id="phone2" name="phone2" dir="ltr" className="text-right" defaultValue={settings.phone2 ?? ""} />
        </div>
      </div>
      <div>
        <Label htmlFor="examFee">سعر العدسات</Label>
        <Input
          id="examFee"
          name="examFee"
          type="number"
          min={0}
          step="0.01"
          className="w-48"
          defaultValue={settings.examFee.toString()}
        />
        <p className="mt-1 text-xs text-muted">يُقترح تلقائياً عند إضافة فاتورة نظارة طبية</p>
      </div>
      <div>
        <Label htmlFor="discountPercent">نسبة خصم الشنابر %</Label>
        <Input
          id="discountPercent"
          name="discountPercent"
          type="number"
          min={0}
          max={100}
          step="1"
          className="w-48"
          defaultValue={settings.discountPercent.toString()}
        />
        <p className="mt-1 text-xs text-muted">تُطبع أسفل كل فاتورة - خصم على الشنابر فقط، لا يشمل العدسات</p>
      </div>
      <Button type="submit" loading={isPending}>
        حفظ التغييرات
      </Button>
    </form>
  );
}
