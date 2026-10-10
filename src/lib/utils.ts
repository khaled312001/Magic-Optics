import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

// نستخدم أرقاماً إنجليزية (0-9) رغم أن اللغة عربية، لأن هذا هو المعتاد فى
// فواتير وقوائم أسعار المحل نفسه (كما يظهر فى نماذجه الورقية)، بدلاً من
// الأرقام الهندية التي تنتجها لغة "ar-EG" افتراضياً.
const AR_EG_LATIN = "ar-EG-u-nu-latn";

export function formatCurrency(value: number | string | { toString(): string }) {
  const n = typeof value === "object" ? Number(value.toString()) : Number(value);
  return (
    new Intl.NumberFormat(AR_EG_LATIN, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(n) + " ج.م"
  );
}

export function formatDate(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(AR_EG_LATIN, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(d);
}

export function formatDateShort(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(AR_EG_LATIN, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function formatDateTime(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(AR_EG_LATIN, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function toNumber(value: number | string | { toString(): string }) {
  return typeof value === "object" ? Number(value.toString()) : Number(value);
}

/** لتنسيق حدود مدى تاريخ مبنية بتوقيت UTC (مثل dateRangeFilter)، بدون أن ينزلق اليوم بسبب فرق التوقيت المحلي */
export function formatDateUTC(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(AR_EG_LATIN, {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(d);
}

/** يبني فلتر تاريخ لـ Prisma (gte/lt) من قيم "YYYY-MM-DD" قادمة من مُدخلات تاريخ */
export function dateRangeFilter(from?: string, to?: string): { gte?: Date; lt?: Date } | undefined {
  if (!from && !to) return undefined;
  const filter: { gte?: Date; lt?: Date } = {};
  if (from) filter.gte = new Date(`${from}T00:00:00.000Z`);
  if (to) {
    const end = new Date(`${to}T00:00:00.000Z`);
    end.setUTCDate(end.getUTCDate() + 1);
    filter.lt = end;
  }
  return filter;
}

/** رقم إيصال فريد مبني على التاريخ + رقم عشوائي قصير */
export function generateReceiptNumber() {
  const now = new Date();
  const y = now.getFullYear().toString().slice(2);
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${y}${m}${d}-${rand}`;
}
