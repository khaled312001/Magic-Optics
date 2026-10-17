import { NextResponse } from "next/server";
import { generateAndSaveMonthlyReport } from "@/server/reports";
import { performCashClose } from "@/server/cash-utils";
import { getShopSettings } from "@/server/settings";
import { addDays, cairoDateStr } from "@/lib/cairo-time";

export const dynamic = "force-dynamic";

/**
 * يُستدعى يومياً بعد منتصف الليل بتوقيت مصر عبر Vercel Cron (راجع vercel.json):
 * - الإقفال التلقائي للخزنة حسب إعداد المحل: كل يوم، أو آخر يوم فى الشهر فقط.
 * - إذا كان "أمس" آخر يوم فى الشهر، يُحفظ التقرير الشهري لذلك الشهر.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const today = cairoDateStr();
  const yesterday = addDays(today, -1);
  const monthEnded = yesterday.slice(0, 7) !== today.slice(0, 7);
  const settings = await getShopSettings();

  let cashClose: { closed: boolean; amount: number } | null = null;
  if (settings.autoClose === "DAILY" || (settings.autoClose === "MONTHLY" && monthEnded)) {
    cashClose = await performCashClose(yesterday, monthEnded ? "MONTH" : "DAY", null);
  }

  let report = null;
  if (monthEnded) {
    const [year, month] = yesterday.split("-").map(Number);
    report = await generateAndSaveMonthlyReport(year, month);
  }

  return NextResponse.json({ date: yesterday, autoClose: settings.autoClose, cashClose, monthEnded, report });
}
