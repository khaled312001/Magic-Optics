"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Parts = { d: string; m: string; y: string };

function toParts(iso?: string): Parts {
  const match = iso?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return { d: "", m: "", y: "" };
  return { y: match[1], m: match[2], d: match[3] };
}

function toIso({ d, m, y }: Parts): string {
  if (y.length !== 4 || !d || !m) return "";
  const day = Number(d);
  const month = Number(m);
  const year = Number(y);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return "";
  return `${y}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function todayIso() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/**
 * حقل تاريخ بترتيب يوم / شهر / سنة ثابت. حقل type="date" الأصلي يعرض الترتيب
 * حسب لغة جهاز الكمبيوتر (شهر/يوم/سنة على أجهزة الإنجليزي) ولا يمكن التحكم فيه.
 */
export function DateField({
  name,
  id,
  value,
  defaultValue,
  onChange,
  className,
  "aria-label": ariaLabel,
}: {
  name?: string;
  id?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (iso: string) => void;
  className?: string;
  "aria-label"?: string;
}) {
  const [parts, setParts] = useState<Parts>(() => toParts(value ?? defaultValue));
  const monthRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (value === undefined) return;
    setParts((current) => (toIso(current) === value ? current : toParts(value)));
  }, [value]);

  function update(next: Parts) {
    setParts(next);
    const iso = toIso(next);
    const wasComplete = toIso(parts);
    if (iso !== wasComplete && (iso || (!next.d && !next.m && !next.y))) onChange?.(iso);
  }

  const digits = (v: string, max: number) => v.replace(/\D/g, "").slice(0, max);
  const segment = "min-w-0 bg-transparent text-center text-sm text-foreground placeholder:text-muted focus:outline-none";

  return (
    <div
      dir="ltr"
      aria-label={ariaLabel}
      className={cn(
        "flex h-10 w-44 items-center gap-1 rounded-lg border border-slate-300 bg-surface px-2",
        "focus-within:border-brand-teal focus-within:ring-2 focus-within:ring-brand-teal/40",
        className
      )}
    >
      <input
        id={id}
        inputMode="numeric"
        placeholder="يوم"
        aria-label="اليوم"
        value={parts.d}
        onChange={(e) => {
          const d = digits(e.target.value, 2);
          update({ ...parts, d });
          if (d.length === 2 || Number(d) > 3) monthRef.current?.focus();
        }}
        className={cn(segment, "w-8 flex-none")}
      />
      <span className="text-muted">/</span>
      <input
        ref={monthRef}
        inputMode="numeric"
        placeholder="شهر"
        aria-label="الشهر"
        value={parts.m}
        onChange={(e) => {
          const m = digits(e.target.value, 2);
          update({ ...parts, m });
          if (m.length === 2 || Number(m) > 1) yearRef.current?.focus();
        }}
        className={cn(segment, "w-8 flex-none")}
      />
      <span className="text-muted">/</span>
      <input
        ref={yearRef}
        inputMode="numeric"
        placeholder="سنة"
        aria-label="السنة"
        value={parts.y}
        onChange={(e) => update({ ...parts, y: digits(e.target.value, 4) })}
        className={cn(segment, "w-full flex-1")}
      />
      {name && <input type="hidden" name={name} value={toIso(parts)} />}
    </div>
  );
}
