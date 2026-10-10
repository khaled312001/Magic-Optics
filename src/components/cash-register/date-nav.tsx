"use client";

import { useRouter } from "next/navigation";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/utils";

export function DateNav({ date }: { date: string }) {
  const router = useRouter();

  function go(offsetDays: number) {
    const d = new Date(date);
    d.setDate(d.getDate() + offsetDays);
    router.push(`/cash-register?date=${d.toISOString().slice(0, 10)}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="icon" onClick={() => go(-1)} title="اليوم السابق">
        <ChevronRight className="size-4" />
      </Button>
      <Input
        type="date"
        value={date}
        onChange={(e) => router.push(`/cash-register?date=${e.target.value}`)}
        className="w-40"
      />
      <Button variant="outline" size="icon" onClick={() => go(1)} title="اليوم التالي">
        <ChevronLeft className="size-4" />
      </Button>
      <span className="text-sm text-muted">{formatDate(date)}</span>
    </div>
  );
}
