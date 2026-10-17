"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lock, LockOpen, CalendarCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { closeCash, reopenCash } from "@/server/cashRegister";
import { formatCurrency } from "@/lib/utils";

type Mode = "DAY" | "MONTH" | "REOPEN";

const texts: Record<Mode, { title: string; confirm: string; done: string }> = {
  DAY: { title: "إقفال اليوم وتصفير الخزنة", confirm: "إقفال اليوم", done: "تم إقفال اليوم وتصفير الخزنة" },
  MONTH: { title: "إقفال الشهر وتصفير الخزنة", confirm: "إقفال الشهر", done: "تم إقفال الشهر وحفظ التقرير الشهري" },
  REOPEN: { title: "فتح اليوم", confirm: "فتح اليوم", done: "تم فتح اليوم" },
};

export function CashClosingActions({ date, closed, balance }: { date: string; closed: boolean; balance: number }) {
  const [mode, setMode] = useState<Mode | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { show } = useToast();

  function confirm() {
    if (!mode) return;
    startTransition(async () => {
      const result = mode === "REOPEN" ? await reopenCash(date) : await closeCash(date, mode);
      if (result.ok) {
        show(texts[mode].done);
        setMode(null);
        router.refresh();
      } else {
        show(result.error, "error");
      }
    });
  }

  return (
    <>
      {closed ? (
        <Button variant="outline" onClick={() => setMode("REOPEN")}>
          <LockOpen className="size-4" />
          فتح اليوم
        </Button>
      ) : (
        <>
          <Button variant="outline" onClick={() => setMode("DAY")}>
            <Lock className="size-4" />
            إقفال اليوم
          </Button>
          <Button variant="outline" onClick={() => setMode("MONTH")}>
            <CalendarCheck className="size-4" />
            إقفال الشهر
          </Button>
        </>
      )}

      <Dialog open={mode !== null} onClose={() => setMode(null)} title={mode ? texts[mode].title : ""} maxWidth="max-w-sm">
        {mode === "REOPEN" ? (
          <p className="text-sm text-muted">سيتم إلغاء حركة تسليم النقدية ويرجع رصيد الخزنة كما كان قبل الإقفال.</p>
        ) : (
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-lg bg-background px-3 py-3">
              <span className="text-muted">النقدية التي ستُسلَّم</span>
              <span className="text-lg font-extrabold text-foreground">{formatCurrency(Math.max(0, balance))}</span>
            </div>
            <p className="text-muted">
              يُسجَّل الرصيد كحركة تسليم فيصبح رصيد الخزنة صفراً، ويُقفل اليوم فلا تُضاف عليه حركات يدوية.
              {mode === "MONTH" && " ويُحفظ التقرير الشهري لهذا الشهر."}
            </p>
          </div>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setMode(null)} disabled={isPending}>
            إلغاء
          </Button>
          <Button onClick={confirm} loading={isPending}>
            {mode ? texts[mode].confirm : ""}
          </Button>
        </div>
      </Dialog>
    </>
  );
}
