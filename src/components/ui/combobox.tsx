"use client";

import { useMemo, useRef, useState } from "react";
import { Search, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type ComboboxItem = {
  id: number;
  label: string;
  sublabel?: string;
  /** قيمة بارزة على طرف السطر (مثل السعر) */
  trailing?: string;
  /** نص إضافي للبحث لا يُعرض (مثل كود الصنف) */
  keywords?: string;
};

export function Combobox({
  items,
  onSelect,
  placeholder = "ابحث...",
  selectedLabel,
}: {
  items: ComboboxItem[];
  onSelect: (item: ComboboxItem) => void;
  placeholder?: string;
  selectedLabel?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return items.slice(0, 30);
    const q = query.trim().toLowerCase();
    const matches = items.filter(
      (i) => i.label.toLowerCase().includes(q) || i.sublabel?.toLowerCase().includes(q) || i.keywords?.toLowerCase().includes(q)
    );
    // المطابقة التامة للكود/الاسم أولاً
    const exact = (i: ComboboxItem) => i.label.toLowerCase() === q || i.keywords?.toLowerCase().split(" ").includes(q);
    return [...matches.filter(exact), ...matches.filter((i) => !exact(i))].slice(0, 30);
  }, [items, query]);

  function choose(item: ComboboxItem) {
    onSelect(item);
    setQuery("");
    setOpen(false);
  }

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <Input
          value={open ? query : selectedLabel ?? query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (!open) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, filtered.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              const item = filtered[active];
              if (item) choose(item);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          onFocus={() => {
            setOpen(true);
            setQuery("");
            setActive(0);
          }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder}
          className="pr-9"
        />
      </div>

      {open && filtered.length > 0 && (
        <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-border bg-surface py-1 shadow-lg">
          {filtered.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                choose(item);
              }}
              onMouseEnter={() => setActive(index)}
              className={cn(
                "flex w-full items-center justify-between gap-3 px-3 py-2 text-right text-sm",
                index === active ? "bg-background" : "hover:bg-background"
              )}
            >
              <span className="min-w-0">
                <span className="text-foreground">{item.label}</span>
                {item.sublabel && <span className="mr-2 text-xs text-muted">{item.sublabel}</span>}
              </span>
              <span className="flex shrink-0 items-center gap-2">
                {item.trailing && <span className="font-bold text-brand-navy">{item.trailing}</span>}
                {selectedLabel === item.label && <Check className="size-3.5 text-brand-teal" />}
              </span>
            </button>
          ))}
        </div>
      )}
      {open && filtered.length === 0 && (
        <div className={cn("absolute z-20 mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-muted shadow-lg")}>
          لا توجد نتائج
        </div>
      )}
    </div>
  );
}
