import { cn } from "@/lib/utils";

type Color = "navy" | "teal" | "amber" | "green" | "red" | "blue" | "gray";

const colorClasses: Record<Color, string> = {
  navy: "bg-brand-navy/10 text-brand-navy",
  teal: "bg-brand-teal/10 text-brand-teal-dark",
  amber: "bg-amber-100 text-amber-700",
  green: "bg-emerald-100 text-emerald-700",
  red: "bg-red-100 text-red-700",
  blue: "bg-blue-100 text-blue-700",
  gray: "bg-slate-100 text-slate-600",
};

export function Badge({
  color = "gray",
  className,
  children,
}: {
  color?: Color;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap",
        colorClasses[color],
        className
      )}
    >
      {children}
    </span>
  );
}
