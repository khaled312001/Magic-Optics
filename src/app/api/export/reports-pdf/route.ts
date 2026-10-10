import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSalesOverTime, getTopProducts, getOutstandingBalances, getLowStockReport, getProfitSummary } from "@/server/reports";
import { getShopSettings } from "@/server/settings";
import { buildReportHtml } from "@/lib/report-pdf-html";
import { renderHtmlToPdf } from "@/lib/pdf-browser";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return new Response("Unauthorized", { status: 401 });
  if (session.user?.role !== "ADMIN") return new Response("Forbidden", { status: 403 });

  const periodDays = 14;
  const [sales, topProducts, debtors, lowStock, profit, shop] = await Promise.all([
    getSalesOverTime(periodDays),
    getTopProducts(30),
    getOutstandingBalances(),
    getLowStockReport(),
    getProfitSummary(30),
    getShopSettings(),
  ]);

  const html = buildReportHtml({ shop, sales, topProducts, debtors, lowStock, profit, periodDays });
  const pdf = await renderHtmlToPdf(html);

  const filename = `تقرير-${new Date().toISOString().slice(0, 10)}.pdf`;
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="report.pdf"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}
