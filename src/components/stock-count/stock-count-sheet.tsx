"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save, CheckCheck, Printer, Search, Equal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { saveStockCount, approveStockCount } from "@/server/stockCount";
import { cn, formatCurrency } from "@/lib/utils";
import { productCategoryShortLabels } from "@/lib/labels";

export type CountSheetItem = {
  id: number;
  name: string;
  code: string | null;
  category: keyof typeof productCategoryShortLabels;
  systemQty: number;
  countedQty: number | null;
  costPrice: number;
};

export function StockCountSheet({
  countId,
  items,
  editable,
  canApprove,
}: {
  countId: number;
  items: CountSheetItem[];
  editable: boolean;
  canApprove: boolean;
}) {
  const [counts, setCounts] = useState<Record<number, string>>(() =>
    Object.fromEntries(items.map((it) => [it.id, it.countedQty === null ? "" : String(it.countedQty)]))
  );
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("");
  const [dirty, setDirty] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { show } = useToast();

  const categories = useMemo(() => Array.from(new Set(items.map((it) => it.category))), [items]);

  const visible = items.filter((it) => {
    if (category && it.category !== category) return false;
    const q = query.trim().toLowerCase();
    return !q || it.name.toLowerCase().includes(q) || it.code?.toLowerCase().includes(q);
  });

  const summary = useMemo(() => {
    let counted = 0;
    let shortageQty = 0;
    let shortageValue = 0;
    let excessQty = 0;
    let excessValue = 0;
    for (const it of items) {
      const raw = counts[it.id];
      if (raw === "" || raw === undefined) continue;
      counted++;
      const diff = Number(raw) - it.systemQty;
      if (diff < 0) {
        shortageQty += -diff;
        shortageValue += -diff * it.costPrice;
      } else if (diff > 0) {
        excessQty += diff;
        excessValue += diff * it.costPrice;
      }
    }
    return { counted, shortageQty, shortageValue, excessQty, excessValue };
  }, [counts, items]);

  function entries() {
    return items.map((it) => ({ id: it.id, countedQty: counts[it.id] === "" ? null : Math.max(0, Math.floor(Number(counts[it.id]))) }));
  }

  function save(then?: () => void) {
    startTransition(async () => {
      const result = await saveStockCount(countId, entries());
      if (!result.ok) {
        show(result.error, "error");
        return;
      }
      setDirty(false);
      if (then) then();
      else {
        show("تم حفظ الجرد");
        router.refresh();
      }
    });
  }

  function approve() {
    save(() =>
      startTransition(async () => {
        const result = await approveStockCount(countId);
        if (result.ok) {
          show("تم اعتماد الجرد وتسوية المخزون");
          setConfirmOpen(false);
          router.refresh();
        } else show(result.error, "error");
      })
    );
  }

  return (
    <div>
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
          <p className="text-xs text-muted">تم عده</p>
          <p className="mt-1 text-xl font-extrabold text-foreground">
            {summary.counted} <span className="text-sm font-medium text-muted">من {items.length} صنف</span>
          </p>
        </div>
        <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4 shadow-sm">
          <p className="text-xs font-medium text-red-700">العجز</p>
          <p className="mt-1 text-xl font-extrabold text-red-700">{formatCurrency(summary.shortageValue)}</p>
          <p className="text-xs text-red-700">{summary.shortageQty} قطعة</p>
        </div>
        <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 p-4 shadow-sm">
          <p className="text-xs font-medium text-emerald-700">الزيادة</p>
          <p className="mt-1 text-xl font-extrabold text-emerald-700">{formatCurrency(summary.excessValue)}</p>
          <p className="text-xs text-emerald-700">{summary.excessQty} قطعة</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
          <p className="text-xs text-muted">صافي الفرق (بسعر التكلفة)</p>
          <p
            className={cn(
              "mt-1 text-xl font-extrabold",
              summary.excessValue - summary.shortageValue < 0 ? "text-red-600" : "text-emerald-600"
            )}
          >
            {formatCurrency(summary.excessValue - summary.shortageValue)}
          </p>
        </div>
      </div>

      <div className="no-print mb-4 flex flex-col gap-3 rounded-2xl border border-border bg-surface p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {["", ...categories].map((c) => (
            <button
              key={c || "all"}
              type="button"
              onClick={() => setCategory(c)}
              className={cn(
                "rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
                category === c ? "bg-brand-teal text-white shadow-sm" : "bg-background text-muted hover:text-foreground"
              )}
            >
              {c ? productCategoryShortLabels[c as keyof typeof productCategoryShortLabels] : "الكل"}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full lg:w-64">
            <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث بالاسم أو الكود..." className="pr-9" />
          </div>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="size-4" />
            طباعة
          </Button>
          {editable && (
            <Button variant="outline" onClick={() => save()} loading={isPending && !confirmOpen}>
              <Save className="size-4" />
              حفظ{dirty ? " *" : ""}
            </Button>
          )}
          {editable && canApprove && (
            <Button onClick={() => setConfirmOpen(true)}>
              <CheckCheck className="size-4" />
              اعتماد الجرد
            </Button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-surface shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-background text-right text-xs text-muted">
              <th className="px-4 py-2.5 font-medium">الكود</th>
              <th className="px-4 py-2.5 font-medium">الصنف</th>
              <th className="px-4 py-2.5 font-medium">الفئة</th>
              <th className="px-4 py-2.5 text-center font-medium">بالسيستم</th>
              <th className="px-4 py-2.5 text-center font-medium">الفعلي</th>
              <th className="px-4 py-2.5 text-center font-medium">الفرق</th>
              <th className="px-4 py-2.5 font-medium">قيمة الفرق</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {visible.map((it) => {
              const raw = counts[it.id] ?? "";
              const diff = raw === "" ? null : Number(raw) - it.systemQty;
              return (
                <tr key={it.id} className={cn(diff !== null && diff !== 0 && (diff < 0 ? "bg-red-50" : "bg-emerald-50"))}>
                  <td className="px-4 py-2 font-medium text-brand-navy">{it.code || "-"}</td>
                  <td className="px-4 py-2 text-foreground">{it.name}</td>
                  <td className="px-4 py-2 text-xs text-muted">{productCategoryShortLabels[it.category]}</td>
                  <td className="px-4 py-2 text-center font-semibold text-foreground">{it.systemQty}</td>
                  <td className="px-4 py-2">
                    {editable ? (
                      <div className="flex items-center justify-center gap-1">
                        <Input
                          type="number"
                          min={0}
                          step="1"
                          value={raw}
                          onChange={(e) => {
                            setCounts((c) => ({ ...c, [it.id]: e.target.value }));
                            setDirty(true);
                          }}
                          className="h-9 w-20 px-2 text-center"
                        />
                        <button
                          type="button"
                          title="مطابق للسيستم"
                          onClick={() => {
                            setCounts((c) => ({ ...c, [it.id]: String(it.systemQty) }));
                            setDirty(true);
                          }}
                          className="no-print rounded-md p-1.5 text-muted hover:bg-background hover:text-brand-teal-dark"
                        >
                          <Equal className="size-4" />
                        </button>
                      </div>
                    ) : (
                      <p className="text-center font-semibold text-foreground">{raw === "" ? "-" : raw}</p>
                    )}
                  </td>
                  <td
                    className={cn(
                      "px-4 py-2 text-center font-bold",
                      diff === null || diff === 0 ? "text-muted" : diff < 0 ? "text-red-600" : "text-emerald-600"
                    )}
                    dir="ltr"
                  >
                    {diff === null ? "-" : diff > 0 ? `+${diff}` : diff}
                  </td>
                  <td className="px-4 py-2 text-xs text-muted">{diff ? formatCurrency(Math.abs(diff) * it.costPrice) : "-"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} title="اعتماد الجرد وتسوية المخزون" maxWidth="max-w-sm">
        <div className="space-y-2 text-sm">
          <p className="text-muted">
            سيتم تعديل كميات المخزون حسب العدد الفعلي لـ {summary.counted} صنف (الأصناف التي لم تُعد لن تتغير). لا يمكن التراجع بعد الاعتماد.
          </p>
          <div className="flex justify-between rounded-lg bg-red-50 px-3 py-2 text-red-700">
            <span>العجز</span>
            <span className="font-bold">{formatCurrency(summary.shortageValue)}</span>
          </div>
          <div className="flex justify-between rounded-lg bg-emerald-50 px-3 py-2 text-emerald-700">
            <span>الزيادة</span>
            <span className="font-bold">{formatCurrency(summary.excessValue)}</span>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={isPending}>
            إلغاء
          </Button>
          <Button onClick={approve} loading={isPending}>
            اعتماد
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
