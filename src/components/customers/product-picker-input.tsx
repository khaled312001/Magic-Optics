"use client";

import { useMemo, useState } from "react";
import { Check, Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import { isStockTracked } from "@/lib/labels";
import { cn, formatCurrency } from "@/lib/utils";

export type PickerProduct = { id: number; name: string; code: string | null; sellPrice: number; quantity: number; category?: string };

/**
 * خانة نص حرة مع اقتراحات من المخزون: اختيار صنف يربطه بالفاتورة (فيُخصم من المخزون بسعره)،
 * والكتابة اليدوية بعدها تلغي الربط.
 */
export function ProductPickerInput({
  id,
  name,
  productIdName,
  products,
  onPick,
}: {
  id: string;
  name: string;
  productIdName: string;
  products: PickerProduct[];
  onPick: (product: PickerProduct | null) => void;
}) {
  const [text, setText] = useState("");
  const [picked, setPicked] = useState<PickerProduct | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const matches = useMemo(() => {
    const q = text.trim().toLowerCase();
    if (!q || picked) return [];
    return products
      .filter((p) => p.name.toLowerCase().includes(q) || p.code?.toLowerCase().includes(q))
      .slice(0, 8);
  }, [text, products, picked]);

  function choose(p: PickerProduct) {
    setPicked(p);
    setText(p.name);
    setOpen(false);
    onPick(p);
  }

  return (
    <div className="relative">
      <Input
        id={id}
        name={name}
        value={text}
        autoComplete="off"
        onChange={(e) => {
          setText(e.target.value);
          setActive(0);
          setOpen(true);
          if (picked) {
            setPicked(null);
            onPick(null);
          }
        }}
        onKeyDown={(e) => {
          if (!open || matches.length === 0) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, matches.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            choose(matches[active]);
          }
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="اكتب أو ابحث فى المخزون"
        className={cn(picked && "border-brand-teal pl-8")}
      />
      {picked && <Check className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-brand-teal" />}
      {picked && <input type="hidden" name={productIdName} value={picked.id} />}
      {picked && (
        <p className="mt-0.5 truncate text-[11px] text-brand-teal-dark">
          من المخزون · {formatCurrency(picked.sellPrice)}
          {isStockTracked(picked.category) && ` · متبقي ${picked.quantity}`}
        </p>
      )}

      {open && matches.length > 0 && (
        <div className="absolute z-30 mt-1 max-h-56 w-full min-w-56 overflow-y-auto rounded-lg border border-border bg-surface py-1 shadow-lg">
          {matches.map((p, index) => (
            <button
              key={p.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                choose(p);
              }}
              onMouseEnter={() => setActive(index)}
              className={cn(
                "flex w-full items-center justify-between gap-2 px-3 py-2 text-right text-sm",
                index === active ? "bg-background" : "hover:bg-background"
              )}
            >
              <span className="flex min-w-0 items-center gap-1.5">
                <Package className="size-3.5 shrink-0 text-muted" />
                <span className="truncate text-foreground">{p.name}</span>
                {p.code && <span className="text-xs text-muted">{p.code}</span>}
              </span>
              <span className="shrink-0 text-xs">
                <span className="font-bold text-brand-navy">{formatCurrency(p.sellPrice)}</span>
                {isStockTracked(p.category) && (
                  <span className={cn("mr-1.5", p.quantity > 0 ? "text-muted" : "text-red-600")}>({p.quantity})</span>
                )}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
