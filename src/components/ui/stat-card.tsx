import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "navy",
  hint,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: "navy" | "teal" | "amber" | "red" | "green";
  hint?: string;
}) {
  const toneClasses: Record<string, string> = {
    navy: "bg-brand-navy/10 text-brand-navy",
    teal: "bg-brand-teal/10 text-brand-teal-dark",
    amber: "bg-amber-100 text-amber-700",
    red: "bg-red-100 text-red-700",
    green: "bg-emerald-100 text-emerald-700",
  };

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
