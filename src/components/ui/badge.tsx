import { cn } from "@/lib/utils";

type Color = "navy" | "teal" | "amber" | "green" | "red" | "blue" | "gray";

const colorClasses: Record<Color, string> = {
  navy: "bg-brand-navy/10 text-brand-navy ring-1 ring-inset ring-brand-navy/15",
  teal: "bg-brand-teal/10 text-brand-teal-dark ring-1 ring-inset ring-brand-teal/20",
  amber: "bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-300",
  green: "bg-emerald-100 text-emerald-800 ring-1 ring-inset ring-emerald-300",
  red: "bg-red-100 text-red-800 ring-1 ring-inset ring-red-300",
  blue: "bg-blue-100 text-blue-800 ring-1 ring-inset ring-blue-300",
  gray: "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-300",
};

/** نسخة ممتلئة اللون (خلفية صلبة + نص أبيض) للحالات الحرجة التي يجب أن تلفت الانتباه فوراً */
const solidColorClasses: Record<Color, string> = {
  navy: "bg-brand-navy text-white",
  teal: "bg-brand-teal text-white",
  amber: "bg-amber-500 text-white",
  green: "bg-emerald-600 text-white",
  red: "bg-red-600 text-white",
  blue: "bg-blue-600 text-white",
  gray: "bg-slate-600 text-white",
};

export function Badge({
  color = "gray",
  solid = false,
  className,
  children,
}: {
  color?: Color;
  /** خلفية صلبة بدل التدرج الباهت - للتنبيهات الحرجة مثل نفاد المخزون */
  solid?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap",
        solid ? solidColorClasses[color] : colorClasses[color],
        className
      )}
    >
      {children}
    </span>
  );
}
