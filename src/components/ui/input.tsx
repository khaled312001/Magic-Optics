import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "h-10 w-full rounded-lg border border-slate-300 bg-surface px-3 text-sm text-foreground",
          "placeholder:text-muted",
          "focus:outline-none focus:ring-2 focus:ring-brand-teal/40 focus:border-brand-teal",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "w-full rounded-lg border border-slate-300 bg-surface px-3 py-2 text-sm text-foreground",
          "placeholder:text-muted",
          "focus:outline-none focus:ring-2 focus:ring-brand-teal/40 focus:border-brand-teal",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          className
        )}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={cn(
          "h-10 w-full rounded-lg border border-slate-300 bg-surface px-3 text-sm text-foreground",
          "focus:outline-none focus:ring-2 focus:ring-brand-teal/40 focus:border-brand-teal",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          className
        )}
        {...props}
      >
        {children}
      </select>
    );
  }
);
Select.displayName = "Select";

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cn("mb-1.5 block text-sm font-medium text-foreground", className)} {...props} />
  );
}

export function FieldError({ children }: { children?: string[] | string }) {
  if (!children || (Array.isArray(children) && children.length === 0)) return null;
  const text = Array.isArray(children) ? children[0] : children;
  return <p className="mt-1 text-xs text-red-600">{text}</p>;
}
