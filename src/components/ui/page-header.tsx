import type { LucideIcon } from "lucide-react";

export function PageHeader({
  title,
  description,
  action,
  icon: Icon,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-surface px-4 py-4 shadow-sm sm:px-5">
      <div className="flex min-w-0 items-center gap-3.5">
        {Icon && (
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(135deg,var(--color-brand-navy),var(--color-brand-teal))] text-white shadow-sm">
            <Icon className="size-5.5" />
          </div>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold leading-tight text-foreground sm:text-xl">{title}</h1>
          {description && <p className="mt-1 truncate text-sm text-muted">{description}</p>}
        </div>
      </div>
      {action && <div className="flex flex-wrap items-center gap-2">{action}</div>}
    </div>
  );
}
