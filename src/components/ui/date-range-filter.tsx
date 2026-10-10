"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";

export function DateRangeFilter({ fromKey = "from", toKey = "to" }: { fromKey?: string; toKey?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const from = searchParams.get(fromKey) ?? "";
  const to = searchParams.get(toKey) ?? "";

  function update(next: { from?: string; to?: string }) {
    const params = new URLSearchParams(searchParams.toString());
    const nf = next.from !== undefined ? next.from : from;
    const nt = next.to !== undefined ? next.to : to;
    if (nf) params.set(fromKey, nf);
    else params.delete(fromKey);
    if (nt) params.set(toKey, nt);
    else params.delete(toKey);
    router.push(params.toString() ? `${pathname}?${params.toString()}` : pathname);
  }

  const hasFilter = from || to;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input type="date" value={from} onChange={(e) => update({ from: e.target.value })} className="h-9 w-[150px]" aria-label="من تاريخ" />
      <span className="text-xs text-muted">إلى</span>
      <Input type="date" value={to} onChange={(e) => update({ to: e.target.value })} className="h-9 w-[150px]" aria-label="إلى تاريخ" />
      {hasFilter && (
        <button
          type="button"
          onClick={() => update({ from: "", to: "" })}
          className="inline-flex h-9 items-center gap-1 rounded-lg px-2 text-xs text-muted hover:text-foreground"
        >
          <X className="size-3.5" />
          مسح
        </button>
      )}
    </div>
  );
}
