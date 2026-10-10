import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { Users } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DeleteButton } from "@/components/ui/delete-button";
import { UserFormDialog } from "@/components/settings/user-form-dialog";
import { deleteUser } from "@/server/users";
import { roleLabels } from "@/lib/labels";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function UsersSettingsPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") redirect("/dashboard");

  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <div>
      <PageHeader title="المستخدمون" description={`${users.length} مستخدم`} action={<UserFormDialog />} />

      <Card className="overflow-hidden">
        <div className="divide-y divide-border">
          {users.map((u) => (
            <div key={u.id} className="flex items-center justify-between gap-3 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-full bg-brand-navy/10 text-brand-navy">
                  <Users className="size-4" />
                </div>
                <div>
                  <p className="font-medium text-foreground">
                    {u.name}
                    {u.id === Number(session.user.id) && <span className="mr-1 text-xs text-muted">(أنت)</span>}
                  </p>
                  <p className="text-xs text-muted">
                    {u.username} · منذ {formatDate(u.createdAt)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!u.active && <Badge color="red">معطل</Badge>}
                <Badge color={u.role === "ADMIN" ? "navy" : "gray"}>{roleLabels[u.role]}</Badge>
                <UserFormDialog user={u} />
                {u.id !== Number(session.user.id) && (
                  <DeleteButton action={deleteUser.bind(null, u.id)} confirmMessage={`حذف المستخدم "${u.name}"؟`} />
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
