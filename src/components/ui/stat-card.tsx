import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "navy",
  hint,
  highlight = false,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: "navy" | "teal" | "amber" | "red" | "green";
  hint?: string;
  /** يبرز البطاقة بخلفية ممتلئة بدل الأيقونة الباهتة - للمؤشرات الأهم (الخزنة/الإيراد) */
  highlight?: boolean;
}) {
  const toneClasses: Record<string, string> = {
    navy: "bg-brand-navy/10 text-brand-navy",
    teal: "bg-brand-teal/10 text-brand-teal-dark",
    amber: "bg-amber-100 text-amber-700",
    red: "bg-red-100 text-red-700",
    green: "bg-emerald-100 text-emerald-700",
  };

  const highlightClasses: Record<string, string> = {
    navy: "border-brand-navy bg-brand-navy text-white shadow-md shadow-brand-navy/20",
    teal: "border-brand-teal bg-brand-teal text-white shadow-md shadow-brand-teal/20",
    amber: "border-amber-500 bg-amber-500 text-white shadow-md shadow-amber-500/20",
    red: "border-red-600 bg-red-600 text-white shadow-md shadow-red-600/20",
    green: "border-emerald-600 bg-emerald-600 text-white shadow-md shadow-emerald-600/20",
  };

  if (highlight) {
    return (
      <div
        className={cn(
          "group rounded-xl border-2 p-4 transition-all duration-200 hover:-translate-y-0.5",
          highlightClasses[tone]
        )}
      >
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/20 transition-transform duration-200 group-hover:scale-110">
            <Icon className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-white/80">{label}</p>
            <p className="truncate text-lg font-extrabold">{value}</p>
          </div>
        </div>
        {hint && <p className="mt-2 text-xs text-white/70">{hint}</p>}
      </div>
    );
  }

  return (
    <div className="group rounded-xl border border-border bg-surface p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-110",
            toneClasses[tone]
          )}
        >
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs text-muted">{label}</p>
          <p className="truncate text-lg font-bold text-foreground">{value}</p>
        </div>
      </div>
      {hint && <p className="mt-2 text-xs text-muted">{hint}</p>}
    </div>
  );
}
