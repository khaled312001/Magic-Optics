import { NextResponse } from "next/server";
import { generateAndSaveMonthlyReport } from "@/server/reports";

export const dynamic = "force-dynamic";

// مصر بتوقيت UTC+2 بدون توقيت صيفي حالياً - تقريب كافٍ لتحديد عبور حدود الشهر محلياً
const EGYPT_OFFSET_HOURS = 2;

/**
 * يُستدعى يومياً عبر Vercel Cron (راجع vercel.json). إذا كان "أمس" بتوقيت مصر هو آخر
 * يوم فى الشهر، يُنشئ وينشر التقرير الشهري المحفوظ لذلك الشهر تلقائياً.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const nowCairo = new Date(Date.now() + EGYPT_OFFSET_HOURS * 60 * 60 * 1000);
  const yesterdayCairo = new Date(nowCairo.getTime() - 24 * 60 * 60 * 1000);

  if (yesterdayCairo.getUTCMonth() === nowCairo.getUTCMonth()) {
    return NextResponse.json({ generated: false, reason: "لم يُعبر حد نهاية الشهر بعد" });
  }

  const year = yesterdayCairo.getUTCFullYear();
  const month = yesterdayCairo.getUTCMonth() + 1;

  const report = await generateAndSaveMonthlyReport(year, month);
  return NextResponse.json({ generated: true, year, month, report });
}
