"use client";

import Link from "next/link";
import { useSearchParams, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { orderStatusLabels } from "@/lib/labels";

const statuses = [
  { value: "", label: "الكل" },
  { value: "PENDING", label: orderStatusLabels.PENDING },
  { value: "READY", label: orderStatusLabels.READY },
  { value: "DELIVERED", label: orderStatusLabels.DELIVERED },
  { value: "CANCELLED", label: orderStatusLabels.CANCELLED },
];

export function StatusTabs() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const active = searchParams.get("status") ?? "";
  const q = searchParams.get("q");

  return (
    <div className="flex flex-wrap gap-2 border-b border-border pb-3">
      {statuses.map((s) => {
        const params = new URLSearchParams();
        if (s.value) params.set("status", s.value);
        if (q) params.set("q", q);
        const href = `${pathname}${params.toString() ? `?${params.toString()}` : ""}`;
        const isActive = active === s.value;
        return (
          <Link
            key={s.value}
            href={href}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
              isActive ? "bg-brand-navy text-white" : "bg-background text-muted hover:text-foreground"
            )}
          >
            {s.label}
          </Link>
        );
      })}
    </div>
  );
}
