"use client";

import { useRouter } from "next/navigation";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateField } from "@/components/ui/date-field";
import { formatDate } from "@/lib/utils";

export function DateNav({ date, basePath }: { date: string; basePath: string }) {
  const router = useRouter();

  function go(offsetDays: number) {
    const d = new Date(date);
    d.setDate(d.getDate() + offsetDays);
    router.push(`${basePath}?date=${d.toISOString().slice(0, 10)}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="icon" onClick={() => go(-1)} title="اليوم السابق">
        <ChevronRight className="size-4" />
      </Button>
      <DateField value={date} onChange={(v) => v && router.push(`${basePath}?date=${v}`)} />
      <Button variant="outline" size="icon" onClick={() => go(1)} title="اليوم التالي">
        <ChevronLeft className="size-4" />
      </Button>
      <span className="text-sm text-muted">{formatDate(date)}</span>
    </div>
  );
}
