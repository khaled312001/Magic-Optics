import { Store } from "lucide-react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { ShopSettingsForm } from "@/components/settings/shop-settings-form";
import { getShopSettings } from "@/server/settings";

export const dynamic = "force-dynamic";

export default async function ShopSettingsPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") redirect("/dashboard");

  const settings = await getShopSettings();

  return (
    <div>
      <PageHeader icon={Store} title="بيانات المحل" description="تظهر هذه البيانات في رأس إيصالات الطباعة" />
      <ShopSettingsForm
        settings={{ ...settings, examFee: Number(settings.examFee), discountPercent: Number(settings.discountPercent) }}
      />
    </div>
  );
}
