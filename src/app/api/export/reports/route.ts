import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { excelResponse } from "@/lib/excel";
import {
  getSalesOverTime,
  getTopProducts,
  getOutstandingBalances,
  getLowStockReport,
  getProfitSummary,
  getCashExpenses,
  resolveReportRange,
} from "@/server/reports";
import * as XLSX from "xlsx";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return new Response("Unauthorized", { status: 401 });
  if (session.user?.role !== "ADMIN") return new Response("Forbidden", { status: 403 });

  const { searchParams } = new URL(request.url);
  const range = resolveReportRange(searchParams.get("from") ?? undefined, searchParams.get("to") ?? undefined, 30);
  const salesRange = resolveReportRange(searchParams.get("from") ?? undefined, searchParams.get("to") ?? undefined, 14);

  const [sales, topProducts, debtors, lowStock, profit, expenses] = await Promise.all([
    getSalesOverTime(salesRange),
    getTopProducts(range),
    getOutstandingBalances(),
    getLowStockReport(),
    getProfitSummary(range),
    getCashExpenses(range),
  ]);

  const wb = XLSX.utils.book_new();

  const salesSheet = XLSX.utils.aoa_to_sheet([
    ["التاريخ", "إجمالي المبيعات"],
    ...sales.map((s) => [s.date, s.total]),
  ]);
  salesSheet["!views"] = [{ rightToLeft: true }];
  XLSX.utils.book_append_sheet(wb, salesSheet, "المبيعات اليومية");

  const topSheet = XLSX.utils.aoa_to_sheet([
    ["الصنف", "الكمية المباعة", "الإجمالي"],
    ...topProducts.map((p) => [p.name, p.quantity, p.total]),
  ]);
  topSheet["!views"] = [{ rightToLeft: true }];
  XLSX.utils.book_append_sheet(wb, topSheet, "الأكثر مبيعاً");

  const debtorsSheet = XLSX.utils.aoa_to_sheet([
    ["العميل", "المتبقي"],
    ...debtors.map((d) => [d.customer?.name ?? "", d.remaining]),
  ]);
  debtorsSheet["!views"] = [{ rightToLeft: true }];
  XLSX.utils.book_append_sheet(wb, debtorsSheet, "عملاء مدينون");

  const lowStockSheet = XLSX.utils.aoa_to_sheet([
    ["الكود", "الصنف", "الكمية المتبقية"],
    ...lowStock.map((p) => [p.code ?? "", p.name, p.quantity]),
  ]);
  lowStockSheet["!views"] = [{ rightToLeft: true }];
  XLSX.utils.book_append_sheet(wb, lowStockSheet, "مخزون منخفض");

  const summarySheet = XLSX.utils.aoa_to_sheet([
    ["البند", "القيمة"],
    ["الإيرادات", profit.revenue],
    ["تكلفة البضاعة المباعة", profit.cost],
    ["مصروفات الخزنة", expenses],
    ["صافي الربح", profit.profit - expenses],
  ]);
  summarySheet["!views"] = [{ rightToLeft: true }];
  XLSX.utils.book_append_sheet(wb, summarySheet, "ملخص الأرباح");

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  return excelResponse(buffer, `تقرير-${new Date().toISOString().slice(0, 10)}.xlsx`);
}
