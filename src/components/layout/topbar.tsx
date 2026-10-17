"use client";

import { useState, useRef, useEffect } from "react";
import { signOut, useSession } from "next-auth/react";
import { Menu, LogOut, UserCircle, ChevronDown, KeyRound } from "lucide-react";
import Link from "next/link";
import { roleLabels } from "@/lib/labels";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return (
    <header className="no-print flex h-16 items-center justify-between border-b border-border bg-surface px-4 sm:px-6">
      <button
        onClick={onMenuClick}
        className="rounded-lg p-2 text-muted hover:bg-background lg:hidden"
        aria-label="القائمة"
      >
        <Menu className="size-5" />
      </button>

      <div className="hidden lg:block" />

      <div className="flex items-center gap-2">
        <ThemeToggle />
        <div className="relative" ref={ref}>
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-background"
          >
            <div className="flex size-8 items-center justify-center rounded-full bg-brand-navy/10 text-brand-navy">
              <UserCircle className="size-5" />
            </div>
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-foreground">
                {session?.user?.name}
              </p>
              <p className="text-xs text-muted">
                {session?.user?.role ? roleLabels[session.user.role] : ""}
              </p>
            </div>
            <ChevronDown className="size-4 text-muted" />
          </button>

          {open && (
            <div className="absolute left-0 top-full z-50 mt-2 w-48 rounded-lg border border-border bg-surface py-1 shadow-lg">
              <Link
                href="/settings/profile"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-background"
              >
                <KeyRound className="size-4" />
                تغيير كلمة المرور
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-100"
              >
                <LogOut className="size-4" />
                تسجيل الخروج
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
