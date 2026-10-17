"use client";

import Link from "next/link";
import { useSearchParams, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { productCategoryLabels } from "@/lib/labels";

const categories = [
  { value: "", label: "الكل" },
  { value: "FRAME_MEDICAL", label: productCategoryLabels.FRAME_MEDICAL },
  { value: "FRAME_SUNGLASSES", label: productCategoryLabels.FRAME_SUNGLASSES },
  { value: "LENS", label: productCategoryLabels.LENS },
  { value: "LENS_CONTRACT", label: productCategoryLabels.LENS_CONTRACT },
  { value: "ACCESSORY", label: productCategoryLabels.ACCESSORY },
];

export function CategoryTabs() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const active = searchParams.get("category") ?? "";
  const q = searchParams.get("q");

  return (
    <div className="flex flex-wrap gap-1.5">
      {categories.map((c) => {
        const params = new URLSearchParams();
        if (c.value) params.set("category", c.value);
        if (q) params.set("q", q);
        const href = `${pathname}${params.toString() ? `?${params.toString()}` : ""}`;
        const isActive = active === c.value;
        return (
          <Link
            key={c.value}
            href={href}
            className={cn(
              "rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
              isActive ? "bg-brand-teal text-white shadow-sm" : "bg-background text-muted hover:text-foreground"
            )}
          >
            {c.label}
          </Link>
        );
      })}
    </div>
  );
}
