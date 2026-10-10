import { FileDown } from "lucide-react";

export function ExportButton({ href, label = "تصدير Excel" }: { href: string; label?: string }) {
  return (
    <a
      href={href}
      className="no-print inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground transition-colors hover:bg-background"
    >
      <FileDown className="size-4" />
      {label}
    </a>
  );
}
