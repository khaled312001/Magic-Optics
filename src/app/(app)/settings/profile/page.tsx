import { KeyRound } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { ChangePasswordForm } from "@/components/settings/change-password-form";

export const dynamic = "force-dynamic";

export default function ProfileSettingsPage() {
  return (
    <div>
      <PageHeader icon={KeyRound} title="تغيير كلمة المرور" />
      <ChangePasswordForm />
    </div>
  );
}
