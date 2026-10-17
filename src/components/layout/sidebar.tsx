"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  Glasses,
  Receipt,
  Wallet,
  BarChart3,
  Settings,
  Eye,
  History,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "لوحة التحكم", icon: LayoutDashboard },
  { href: "/orders", label: "الفواتير", icon: Receipt },
  { href: "/customers", label: "العملاء", icon: Users },
  { href: "/prescriptions", label: "كشوفات النظر", icon: Eye },
  { href: "/inventory", label: "المخزون", icon: Glasses },
  { href: "/cash-register", label: "الخزنة اليومية", icon: Wallet },
  { href: "/daily-log", label: "السجل اليومي", icon: History, adminOnly: true },
  { href: "/reports", label: "التقارير", icon: BarChart3, adminOnly: true },
  { href: "/settings", label: "الإعدادات", icon: Settings },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  return (
    <div className="flex h-full flex-col bg-brand-navy text-white dark:border-l dark:border-border dark:bg-[#0f1829]">
      <div className="flex items-center gap-3 px-5 py-5">
        <Image
          src="/logo.jpg"
          alt="Magic Optics"
          width={40}
          height={40}
          priority
          className="rounded-lg bg-white object-contain p-0.5"
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">Magic Optics</p>
          <p className="truncate text-xs text-white/60">مركز ماجيك للبصريات</p>
        </div>
        <button className="mr-auto rounded-lg p-1.5 text-white/70 hover:bg-white/10 lg:hidden" onClick={onNavigate}>
          <X className="size-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {navItems
          .filter((item) => !item.adminOnly || isAdmin)
          .map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active ? "bg-brand-teal text-white" : "text-white/75 hover:bg-white/10 hover:text-white"
                )}
              >
                <Icon className="size-4.5 shrink-0" />
                {item.label}
              </Link>
            );
          })}
      </nav>

      <div className="border-t border-white/10 px-5 py-4 text-xs text-white/50">
        قنا - قفط - أمام فرع اتصالات
        <br />
        01012135456
      </div>
    </div>
  );
}
