import Link from "next/link";
import { History, ChevronRight, Lock, LockOpen, CalendarCheck, Bot } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { getCashClosingLog } from "@/server/cash-utils";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

const MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

function dayLabel(date: string) {
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", { weekday: "long", day: "numeric", month: "short", timeZone: "UTC" }).format(
    new Date(`${date}T00:00:00Z`)
  );
}

export default async function CashClosingsPage() {
  const months = await getCashClosingLog();

  return (
    <div>
      <Link href="/cash-register" className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
        <ChevronRight className="size-4" />
        الخزنة اليومية
      </Link>
      <PageHeader icon={History} title="سجل الإقفالات" description="كل أيام الخزنة وإقفالاتها اليومية والشهرية، مجمعة بالشهر" />

      {months.length === 0 ? (
        <EmptyState icon={History} title="لا توجد حركات خزنة بعد" />
      ) : (
        <div className="space-y-5">
          {months.map((m) => {
            const [y, mo] = m.key.split("-").map(Number);
            return (
              <Card key={m.key} className="overflow-hidden">
                <CardHeader className="flex-wrap">
                  <CardTitle className="flex items-center gap-2">
                    <CalendarCheck className="size-4 text-brand-teal-dark" />
                    {MONTHS[mo - 1]} {y}
                    {m.monthClosed ? <Badge color="green">تم إقفال الشهر</Badge> : <Badge color="gray">الشهر مفتوح</Badge>}
                  </CardTitle>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="rounded-lg bg-emerald-50 px-2.5 py-1.5 font-semibold text-emerald-700">الوارد {formatCurrency(m.cashIn)}</span>
                    <span className="rounded-lg bg-red-50 px-2.5 py-1.5 font-semibold text-red-700">المنصرف {formatCurrency(m.cashOut)}</span>
                    <span className="rounded-lg bg-background px-2.5 py-1.5 font-semibold text-foreground">
                      المُسلَّم {formatCurrency(m.handedOver)}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="overflow-x-auto p-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-right text-xs text-muted">
                        <th className="px-4 py-2.5 font-medium">اليوم</th>
                        <th className="px-4 py-2.5 font-medium">أول اليوم</th>
                        <th className="px-4 py-2.5 font-medium">الوارد</th>
                        <th className="px-4 py-2.5 font-medium">المنصرف</th>
                        <th className="px-4 py-2.5 font-medium">المُسلَّم</th>
                        <th className="px-4 py-2.5 font-medium">آخر اليوم</th>
                        <th className="px-4 py-2.5 font-medium">الإقفال</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {m.days.map((d) => (
                        <tr key={d.date} className="hover:bg-background">
                          <td className="px-4 py-3">
                            <Link href={`/cash-register?date=${d.date}`} className="font-medium text-brand-navy hover:underline">
                              {dayLabel(d.date)}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-muted">{formatCurrency(d.opening)}</td>
                          <td className="px-4 py-3 text-emerald-600">
                            {formatCurrency(d.cashIn)}
                            {d.electronicIn > 0 && (
                              <span className="block text-[11px] text-blue-600">+ إلكتروني {formatCurrency(d.electronicIn)}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-red-600">{formatCurrency(d.cashOut)}</td>
                          <td className="px-4 py-3 font-semibold text-foreground">{d.handedOver > 0 ? formatCurrency(d.handedOver) : "-"}</td>
                          <td className="px-4 py-3 font-bold text-foreground">{formatCurrency(d.closing)}</td>
                          <td className="px-4 py-3">
                            {d.closed ? (
                              <div className="space-y-0.5">
                                <Badge color={d.scope === "MONTH" ? "navy" : "green"}>
                                  <Lock className="size-3" />
                                  {d.scope === "MONTH" ? "إقفال شهر" : "إقفال يوم"}
                                </Badge>
                                <p className="flex items-center gap-1 text-[11px] text-muted">
                                  {d.auto ? (
                                    <>
                                      <Bot className="size-3" /> تلقائي
                                    </>
                                  ) : (
                                    d.closedBy ?? ""
                                  )}
                                  {d.closedAt && ` · ${formatDateTime(d.closedAt)}`}
                                </p>
                              </div>
                            ) : (
                              <Badge color="amber">
                                <LockOpen className="size-3" />
                                مفتوح
                              </Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
