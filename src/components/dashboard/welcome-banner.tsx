"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sun, Moon, Sunrise, Timer, AlertTriangle, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

export type BannerAlert = { tone: "red" | "amber" | "green" | "blue"; text: string; href: string };

const TIPS = [
  "يوم موفق ومبيعات كتير إن شاء الله",
  "راجع الفواتير الجاهزة وكلّم العملاء للاستلام",
  "تابع المتبقي عند العملاء علشان الخزنة تفضل مظبوطة",
  "سجّل كل مصروف فى الخزنة أول بأول",
  "ابتسامتك مع العميل أهم من أي عرض",
  "راجع المخزون المنخفض قبل ما يخلص",
  "كل كشف نظر مسجّل = عميل راجع تاني",
];

function cairoHour(now: Date) {
  return Number(new Intl.DateTimeFormat("en-US", { timeZone: "Africa/Cairo", hour: "numeric", hourCycle: "h23" }).format(now));
}

function greeting(hour: number) {
  if (hour >= 5 && hour < 12) return { text: "صباح الخير", Icon: Sunrise };
  if (hour >= 12 && hour < 17) return { text: "نهارك سعيد", Icon: Sun };
  return { text: "مساء الخير", Icon: Moon };
}

function splitDuration(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** عد تنازلي حتى الإقفال التلقائي للخزنة - يُرسم بعد التحميل فقط لتفادي اختلاف وقت الخادم والمتصفح */
function useNow() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

export function CloseCountdown({ nextCloseAt, className }: { nextCloseAt: number | null; className?: string }) {
  const now = useNow();
  if (!nextCloseAt || !now) return null;
  const left = nextCloseAt - now.getTime();
  const { days, hours, minutes, seconds } = splitDuration(left);
  const urgent = left < 60 * 60 * 1000;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium",
        urgent ? "bg-red-50 text-red-700" : "bg-background text-foreground",
        className
      )}
    >
      <Timer className="size-4" />
      الإقفال التلقائي بعد
      <span dir="ltr" className="font-bold tabular-nums">
        {days > 0 && `${days}d `}
        {pad(hours)}:{pad(minutes)}:{pad(seconds)}
      </span>
    </span>
  );
}

export function WelcomeBanner({
  name,
  isAdmin,
  autoClose,
  nextCloseAt,
  alerts,
}: {
  name: string;
  isAdmin: boolean;
  autoClose: "NONE" | "DAILY" | "MONTHLY";
  nextCloseAt: number | null;
  alerts: BannerAlert[];
}) {
  const now = useNow();
  const hour = now ? cairoHour(now) : 10;
  const { text, Icon } = greeting(hour);
  const tip = TIPS[(now ?? new Date(0)).getDate() % TIPS.length];
  const dateLabel = now
    ? new Intl.DateTimeFormat("ar-EG-u-nu-latn", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Cairo" }).format(now)
    : "";

  const left = nextCloseAt && now ? nextCloseAt - now.getTime() : null;
  const time = left !== null ? splitDuration(left) : null;
  const urgent = left !== null && left < 60 * 60 * 1000;

  return (
    <div className="mb-5 overflow-hidden rounded-2xl bg-[linear-gradient(135deg,var(--color-brand-navy),var(--color-brand-teal))] text-white shadow-md">
      <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-5">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-white/15">
            <Icon className="size-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xl font-bold">
              {text} يا {name.split(" ")[0]} 👋
            </p>
            <p className="mt-0.5 text-sm text-white/80">{tip}</p>
            {dateLabel && <p className="mt-1 text-xs text-white/60">{dateLabel}</p>}
          </div>
        </div>

        {autoClose === "NONE" ? (
          isAdmin && (
            <Link
              href="/settings/shop"
              className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-3 text-sm text-white/85 transition-colors hover:bg-white/20"
            >
              <Settings className="size-4" />
              الإقفال التلقائي للخزنة غير مفعّل - فعّله من بيانات المحل
            </Link>
          )
        ) : (
          time && (
            <div className={cn("rounded-xl px-4 py-3 text-center", urgent ? "animate-pulse bg-red-600" : "bg-white/15")}>
              <p className="text-xs text-white/80">
                {autoClose === "DAILY" ? "إقفال الخزنة تلقائياً الساعة 12 بالليل بعد" : "إقفال الشهر تلقائياً بعد"}
              </p>
              <p dir="ltr" className="mt-1 text-2xl font-extrabold tabular-nums">
                {time.days > 0 && <span className="text-base font-bold">{time.days} يوم </span>}
                {pad(time.hours)}:{pad(time.minutes)}:{pad(time.seconds)}
              </p>
              {urgent && <p className="mt-0.5 text-xs">سجّل باقي الحركات قبل الإقفال</p>}
            </div>
          )
        )}
      </div>

      {alerts.length > 0 && (
        <div className="flex flex-wrap gap-2 border-t border-white/15 bg-black/10 px-5 py-3">
          {alerts.map((a) => (
            <Link
              key={a.text}
              href={a.href}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-transform hover:-translate-y-0.5",
                a.tone === "red" && "bg-red-600 text-white",
                a.tone === "amber" && "bg-amber-500 text-white",
                a.tone === "green" && "bg-emerald-600 text-white",
                a.tone === "blue" && "bg-white/90 text-brand-navy"
              )}
            >
              {(a.tone === "red" || a.tone === "amber") && <AlertTriangle className="size-3.5" />}
              {a.text}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
