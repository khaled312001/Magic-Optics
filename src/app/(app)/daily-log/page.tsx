import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { History, LogIn, Receipt, Wallet, Eye, Glasses, UserX, ChevronLeft } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { DateNav } from "@/components/ui/date-nav";
import { getDailyActivity, type ActivityKind } from "@/server/activityLog";
import { formatCurrency } from "@/lib/utils";
import { roleLabels } from "@/lib/labels";
import type { LucideIcon } from "lucide-react";

export const dynamic = "force-dynamic";

function todayStr() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function timeStr(d: Date) {
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", { hour: "2-digit", minute: "2-digit" }).format(d);
}

const kindIcons: Record<ActivityKind, LucideIcon> = {
  ORDER: Receipt,
  PAYMENT: Wallet,
  PRESCRIPTION: Eye,
  STOCK: Glasses,
  CASH: Wallet,
};

export default async function DailyLogPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") redirect("/dashboard");

  const { date } = await searchParams;
  const selectedDate = date || todayStr();

  const activity = await getDailyActivity(selectedDate);

  const totalLogins = activity.reduce((s, u) => s + u.logins.length, 0);
  const totalOps = activity.reduce((s, u) => s + u.items.length, 0);
  const activeUsers = activity.filter((u) => u.logins.length > 0 || u.items.length > 0).length;

  return (
    <div>
      <PageHeader title="السجل اليومي" description="ملخص تسجيلات الدخول والعمليات لكل المستخدمين فى اليوم المحدد" />

      <div className="mb-4">
        <DateNav date={selectedDate} basePath="/daily-log" />
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="تسجيلات الدخول" value={String(totalLogins)} icon={LogIn} tone="navy" highlight />
        <StatCard label="إجمالي العمليات" value={String(totalOps)} icon={History} tone="teal" />
        <StatCard label="مستخدمون نشطون" value={`${activeUsers} / ${activity.length}`} icon={Receipt} tone="green" />
        <StatCard label="بدون نشاط" value={String(activity.length - activeUsers)} icon={UserX} tone="amber" />
      </div>

      <div className="space-y-4">
        {activity.map((u) => {
          const hasActivity = u.logins.length > 0 || u.items.length > 0;
          return (
            <Card key={u.userId} className={!hasActivity ? "opacity-60" : undefined}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle>{u.name}</CardTitle>
                  <Badge color={u.role === "ADMIN" ? "navy" : "gray"}>{roleLabels[u.role]}</Badge>
                  {!u.active && <Badge color="red">معطل</Badge>}
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {u.logins.length === 0 ? (
                    <span className="text-xs text-muted">لم يسجل الدخول اليوم</span>
                  ) : (
                    u.logins.map((l, i) => (
                      <Badge key={i} color="blue">
                        <LogIn className="size-3" />
                        {timeStr(l)}
                      </Badge>
                    ))
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {u.items.length === 0 ? (
                  <p className="p-5 text-sm text-muted">لا توجد عمليات مسجلة فى هذا اليوم</p>
                ) : (
                  <div className="divide-y divide-border">
                    {u.items.map((item) => {
                      const Icon = kindIcons[item.kind];
                      const content = (
                        <>
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-background text-brand-navy">
                            <Icon className="size-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-foreground">{item.label}</p>
                            <p className="truncate text-xs text-muted">{item.detail}</p>
                          </div>
                          {item.amount !== undefined && (
                            <span className={`shrink-0 font-semibold ${item.amount < 0 ? "text-red-600" : "text-emerald-600"}`}>
                              {item.amount < 0 ? "-" : "+"}
                              {formatCurrency(Math.abs(item.amount))}
                            </span>
                          )}
                          <span className="shrink-0 text-xs text-muted">{timeStr(item.time)}</span>
                          {item.href && <ChevronLeft className="size-4 shrink-0 text-muted" />}
                        </>
                      );
                      return item.href ? (
                        <Link
                          key={item.id}
                          href={item.href}
                          className="flex items-center gap-3 px-5 py-2.5 text-sm transition-colors hover:bg-background"
                        >
                          {content}
                        </Link>
                      ) : (
                        <div key={item.id} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                          {content}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
