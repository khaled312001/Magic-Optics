import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getSalesOverTime,
  getTopProducts,
  getOutstandingBalances,
  getLowStockReport,
  getProfitSummary,
  getCashExpenses,
  resolveReportRange,
} from "@/server/reports";
import { getShopSettings } from "@/server/settings";
import { buildReportHtml } from "@/lib/report-pdf-html";
import { renderHtmlToPdf } from "@/lib/pdf-browser";
import { formatDateUTC } from "@/lib/utils";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return new Response("Unauthorized", { status: 401 });
  if (session.user?.role !== "ADMIN") return new Response("Forbidden", { status: 403 });

  const { searchParams } = new URL(request.url);
  const fromParam = searchParams.get("from") ?? undefined;
  const toParam = searchParams.get("to") ?? undefined;
  const range = resolveReportRange(fromParam, toParam, 30);
  const salesRange = resolveReportRange(fromParam, toParam, 14);
  const periodLabel = typeof range === "number" ? `${range} يوم` : `${formatDateUTC(range.from)} - ${formatDateUTC(range.until)}`;

  const [sales, topProducts, debtors, lowStock, profit, expenses, shop] = await Promise.all([
    getSalesOverTime(salesRange),
    getTopProducts(range),
    getOutstandingBalances(),
    getLowStockReport(),
    getProfitSummary(range),
    getCashExpenses(range),
    getShopSettings(),
  ]);

  const html = buildReportHtml({ shop, sales, topProducts, debtors, lowStock, profit, expenses, periodLabel });

  let pdf: Buffer;
  try {
    pdf = await renderHtmlToPdf(html);
  } catch (err) {
    console.error("reports-pdf render failed:", err);
    const message = err instanceof Error ? err.message : String(err);
    return new Response(`PDF generation failed: ${message}`, { status: 500 });
  }

  const filename = `تقرير-${new Date().toISOString().slice(0, 10)}.pdf`;
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="report.pdf"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}
