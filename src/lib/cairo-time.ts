// كل حسابات الأيام والشهور (الخزنة، مبيعات اليوم، التقارير) بتوقيت القاهرة، لأن خادم
// Vercel يعمل بتوقيت UTC: بدون هذا التحويل تُحسب الدفعات بين 12 و3 فجراً على اليوم السابق.

const TZ = "Africa/Cairo";

const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const partsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

/** تاريخ اليوم (أو لحظة معينة) بتوقيت القاهرة بصيغة YYYY-MM-DD */
export function cairoDateStr(date: Date = new Date()) {
  return dateFormatter.format(date);
}

/** فرق توقيت القاهرة عن UTC (بالملّي ثانية) فى لحظة معينة - يتغير مع التوقيت الصيفي */
function cairoOffsetMs(at: Date) {
  const parts = partsFormatter.formatToParts(at);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - Math.floor(at.getTime() / 1000) * 1000;
}

/** يضيف أياماً لتاريخ YYYY-MM-DD */
export function addDays(dateStr: string, days: number) {
  const [y, m, d] = dateStr.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** لحظة بداية يوم معين (منتصف الليل بتوقيت القاهرة) */
export function cairoDayStart(dateStr: string) {
  const [y, m, d] = dateStr.slice(0, 10).split("-").map(Number);
  const utcMidnight = Date.UTC(y, m - 1, d);
  return new Date(utcMidnight - cairoOffsetMs(new Date(utcMidnight)));
}

/** حدود يوم بتوقيت القاهرة: [start, end) */
export function cairoDayRange(dateStr: string) {
  return { start: cairoDayStart(dateStr), end: cairoDayStart(addDays(dateStr, 1)) };
}

/** حدود شهر كامل بتوقيت القاهرة: [start, end) */
export function cairoMonthRange(year: number, month: number) {
  const first = `${year}-${String(month).padStart(2, "0")}-01`;
  const next = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, "0")}-01`;
  return { start: cairoDayStart(first), end: cairoDayStart(next) };
}

/** قيمة عمود DATE فى قاعدة البيانات لتاريخ YYYY-MM-DD (منتصف ليل UTC) */
export function dbDate(dateStr: string) {
  const [y, m, d] = dateStr.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
