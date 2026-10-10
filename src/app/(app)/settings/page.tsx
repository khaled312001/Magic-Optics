import Link from "next/link";
import { getServerSession } from "next-auth";
import { Users, Store, KeyRound, ChevronLeft } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  const isAdmin = session?.user?.role === "ADMIN";

  const links = [
    { href: "/settings/profile", label: "تغيير كلمة المرور", description: "تحديث بيانات دخولك الشخصية", icon: KeyRound },
    ...(isAdmin
      ? [
          { href: "/settings/users", label: "المستخدمون", description: "إدارة حسابات الموظفين", icon: Users },
          { href: "/settings/shop", label: "بيانات المحل", description: "الاسم والعنوان وأرقام الهاتف", icon: Store },
        ]
      : []),
  ];

  return (
    <div>
      <PageHeader title="الإعدادات" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {links.map((l) => (
          <Link key={l.href} href={l.href}>
            <Card className="flex items-center gap-4 p-5 hover:border-brand-teal">
              <div className="flex size-11 items-center justify-center rounded-lg bg-brand-navy/10 text-brand-navy">
                <l.icon className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground">{l.label}</p>
                <p className="text-sm text-muted">{l.description}</p>
              </div>
              <ChevronLeft className="size-4 text-muted" />
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
