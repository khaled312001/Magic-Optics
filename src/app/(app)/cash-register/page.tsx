import Link from "next/link";
import { getServerSession } from "next-auth";
import { Wallet, Lock, HandCoins, ChevronLeft, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authOptions } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { Toolbar } from "@/components/ui/toolbar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { DeleteButton } from "@/components/ui/delete-button";
import { DateNav } from "@/components/ui/date-nav";
import { AddCashEntryDialog } from "@/components/cash-register/add-cash-entry-dialog";
import { CashClosingActions } from "@/components/cash-register/cash-closing-actions";
import { ExportButton } from "@/components/ui/export-button";
import { deleteCashEntry } from "@/server/cashRegister";
import { getCashDayView, getOutstanding, nextAutoCloseAt, CLOSING_CATEGORIES } from "@/server/cash-utils";
import { getShopSettings } from "@/server/settings";
import { CloseCountdown } from "@/components/dashboard/welcome-banner";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { cashCategoryLabels, paymentMethodLabels } from "@/lib/labels";
import { cairoDateStr, cairoMonthRange } from "@/lib/cairo-time";

export const dynamic = "force-dynamic";

export default async function CashRegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  const selectedDate = date || cairoDateStr();
  const [year, month] = selectedDate.split("-").map(Number);
  const session = await getServerSession(authOptions);
  const isAdmin = session?.user?.role === "ADMIN";
  const canManageExpenses = isAdmin || session?.user?.canManageExpenses === true;

  const [day, totalOutstanding, monthOutstanding, settings] = await Promise.all([
    getCashDayView(selectedDate),
    getOutstanding(),
    getOutstanding(cairoMonthRange(year, month)),
    getShopSettings(),
  ]);
  const isToday = selectedDate === cairoDateStr();

  return (
    <div>
      <PageHeader
        icon={Wallet}
        title="الخزنة اليومية"
        description="الوارد (تحصيل الفواتير والحركات) والمنصرف يومياً"
        action={
          <>
            <Link href="/cash-register/closings">
              <Button variant="outline">
                <History className="size-4" />
                سجل الإقفالات
              </Button>
            </Link>
            <ExportButton href={`/api/export/cash-register?date=${selectedDate}`} />
            {isAdmin && <CashClosingActions date={selectedDate} closed={day.closed} balance={day.closingBalance} />}
            {!day.closed && <AddCashEntryDialog date={selectedDate} canManageExpenses={canManageExpenses} />}
          </>
        }
      />

      <Toolbar>
        <DateNav date={selectedDate} basePath="/cash-register" />
        {isToday && !day.closed && <CloseCountdown nextCloseAt={nextAutoCloseAt(settings.autoClose)} />}
        {day.closed && (
          <Badge color="amber">
            <Lock className="size-3.5" />
            اليوم مقفول
            {day.handedOver > 0 && ` - تم تسليم ${formatCurrency(day.handedOver)}`}
          </Badge>
        )}
      </Toolbar>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl border-2 border-brand-navy/20 bg-surface p-4 shadow-sm">
          <p className="text-xs font-medium text-muted">رصيد أول اليوم</p>
          <p className="mt-1 text-xl font-extrabold text-brand-navy">{formatCurrency(day.openingBalance)}</p>
        </div>
        <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 p-4 shadow-sm">
          <p className="text-xs font-medium text-emerald-700">الوارد النقدي (للدرج)</p>
          <p className="mt-1 text-xl font-extrabold text-emerald-700">{formatCurrency(day.cashIn)}</p>
          {day.collected > 0 && <p className="mt-1 text-xs text-emerald-700">تحصيل الفواتير اليوم {formatCurrency(day.collected)}</p>}
        </div>
        <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4 shadow-sm">
          <p className="text-xs font-medium text-red-700">إجمالي المنصرف</p>
          <p className="mt-1 text-xl font-extrabold text-red-700">{formatCurrency(day.cashOut)}</p>
          {day.handedOver > 0 && <p className="mt-1 text-xs text-red-700">+ تسليم عند الإقفال {formatCurrency(day.handedOver)}</p>}
        </div>
        <div className="rounded-xl border-2 border-brand-navy bg-brand-navy p-4 text-white shadow-md shadow-brand-navy/20">
          <p className="text-xs font-medium text-white/80">رصيد آخر اليوم (فى الدرج)</p>
          <p className="mt-1 text-xl font-extrabold">{formatCurrency(day.closingBalance)}</p>
        </div>
      </div>

      {day.byMethod.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm shadow-sm">
          <span className="font-semibold text-foreground">التحصيل حسب طريقة الدفع:</span>
          {day.byMethod.map((m) => (
            <span
              key={m.method}
              className={`rounded-lg px-2.5 py-1 font-semibold ${m.method === "CASH" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"}`}
            >
              {paymentMethodLabels[m.method]} {formatCurrency(m.amount)}
            </span>
          ))}
          {day.electronicIn > 0 && (
            <span className="text-xs text-muted">· الإلكتروني ({formatCurrency(day.electronicIn)}) لا يدخل رصيد الدرج</span>
          )}
        </div>
      )}

      <Link
        href="/reports"
        className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-3 transition-colors hover:border-amber-500"
      >
        <div className="flex items-center gap-3">
          <HandCoins className="size-5 text-amber-700" />
          <div>
            <p className="text-xs font-medium text-amber-800">المتبقي عند العملاء (فلوس بره)</p>
            <p className="text-lg font-extrabold text-amber-800">{formatCurrency(totalOutstanding)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-amber-800">
          <span>
            منها من فواتير هذا الشهر: <span className="font-bold">{formatCurrency(monthOutstanding)}</span>
          </span>
          <ChevronLeft className="size-4" />
        </div>
      </Link>

      {day.entries.length === 0 ? (
        <EmptyState icon={Wallet} title="لا توجد حركات في هذا اليوم" />
      ) : (
        <Card className="overflow-hidden">
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-right text-xs text-muted">
                  <th className="px-5 py-2.5 font-medium">البند</th>
                  <th className="px-5 py-2.5 font-medium">المبلغ</th>
                  <th className="px-5 py-2.5 font-medium">ملاحظة</th>
                  <th className="px-5 py-2.5 font-medium">بواسطة</th>
                  <th className="px-5 py-2.5 font-medium">الوقت</th>
                  <th className="px-5 py-2.5 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {day.entries.map((e) => {
                  const isClosing = CLOSING_CATEGORIES.includes(e.category);
                  return (
                    <tr key={e.id} className={isClosing ? "bg-background" : undefined}>
                      <td className="px-5 py-3">
                        <Badge color={isClosing ? "navy" : e.type === "IN" ? "green" : "red"}>{cashCategoryLabels[e.category]}</Badge>
                        {e.method !== "CASH" && (
                          <Badge color="blue" className="mr-1">
                            {paymentMethodLabels[e.method]}
                          </Badge>
                        )}
                      </td>
                      <td className={`px-5 py-3 font-medium ${e.type === "IN" ? "text-emerald-600" : "text-red-600"}`}>
                        {e.type === "IN" ? "+" : "-"}
                        {formatCurrency(e.amount)}
                      </td>
                      <td className="px-5 py-3 text-muted">
                        {e.payment ? (
                          <Link href={`/orders/${e.payment.orderId}`} className="text-brand-navy hover:underline">
                            {e.note}
                          </Link>
                        ) : (
                          e.note || "-"
                        )}
                      </td>
                      <td className="px-5 py-3 text-xs text-muted">{e.createdBy?.name ?? "-"}</td>
                      <td className="px-5 py-3 text-xs text-muted">{formatDateTime(e.createdAt)}</td>
                      <td className="px-5 py-3">
                        {isAdmin && (
                          <DeleteButton
                            action={deleteCashEntry.bind(null, e.id)}
                            confirmMessage={
                              e.payment
                                ? "حذف هذا التحصيل؟ سيتم حذف الدفعة من الفاتورة ويرجع المبلغ متبقياً على العميل."
                                : isClosing
                                  ? "حذف حركة التسليم؟ سيُفتح اليوم ويرجع الرصيد كما كان."
                                  : "حذف هذه الحركة؟"
                            }
                          />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
