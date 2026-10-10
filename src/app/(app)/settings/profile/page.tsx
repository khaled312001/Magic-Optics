import { PageHeader } from "@/components/ui/page-header";
import { ChangePasswordForm } from "@/components/settings/change-password-form";

export const dynamic = "force-dynamic";

export default function ProfileSettingsPage() {
  return (
    <div>
      <PageHeader title="تغيير كلمة المرور" />
      <ChangePasswordForm />
    </div>
  );
}
