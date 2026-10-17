import { cn } from "@/lib/utils";

/** شريط البحث والفلاتر أسفل رأس الصفحة - بنفس الشكل فى كل الصفحات */
export function Toolbar({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "mb-5 flex flex-col gap-3 rounded-2xl border border-border bg-surface p-3 shadow-sm lg:flex-row lg:flex-wrap lg:items-center lg:justify-between",
        className
      )}
    >
      {children}
    </div>
  );
}
