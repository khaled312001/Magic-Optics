"use client";

import { useMemo, useRef, useState } from "react";
import { Search, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type ComboboxItem = { id: number; label: string; sublabel?: string };

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
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return items.slice(0, 30);
    const q = query.toLowerCase();
    return items
      .filter((i) => i.label.toLowerCase().includes(q) || i.sublabel?.toLowerCase().includes(q))
      .slice(0, 30);
  }, [items, query]);

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <Input
          value={open ? query : selectedLabel ?? query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            setQuery("");
          }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder}
          className="pr-9"
        />
      </div>

      {open && filtered.length > 0 && (
        <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-border bg-surface py-1 shadow-lg">
          {filtered.map((item) => (
            <button
              key={item.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(item);
                setQuery("");
                setOpen(false);
              }}
              className="flex w-full items-center justify-between px-3 py-2 text-right text-sm hover:bg-background"
            >
              <span>
                <span className="text-foreground">{item.label}</span>
                {item.sublabel && <span className="mr-2 text-xs text-muted">{item.sublabel}</span>}
              </span>
              {selectedLabel === item.label && <Check className="size-3.5 text-brand-teal" />}
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
