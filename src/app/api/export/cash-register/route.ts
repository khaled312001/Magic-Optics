import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCashDayView } from "@/server/cash-utils";
import { buildWorkbookBuffer, excelResponse } from "@/lib/excel";
import { cashCategoryLabels } from "@/lib/labels";
import { cairoDateStr } from "@/lib/cairo-time";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") || cairoDateStr();

  const day = await getCashDayView(date);

  const rows: (string | number)[][] = day.entries.map((e) => [
    cashCategoryLabels[e.category],
    e.type === "IN" ? "وارد" : "منصرف",
    e.type === "IN" ? Number(e.amount) : -Number(e.amount),
    e.note ?? "",
    e.createdBy?.name ?? "",
    e.createdAt.toLocaleTimeString("ar-EG-u-nu-latn", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Cairo" }),
  ]);

  rows.push(["", "", "", "", "", ""]);
  rows.push(["رصيد أول اليوم", "", day.openingBalance, "", "", ""]);
  rows.push(["إجمالي الوارد", "", day.cashIn, "", "", ""]);
  rows.push(["منها تحصيل فواتير", "", day.collected, "", "", ""]);
  rows.push(["إجمالي المنصرف", "", -day.cashOut, "", "", ""]);
  if (day.handedOver > 0) rows.push(["تسليم عند الإقفال", "", -day.handedOver, "", "", ""]);
  rows.push(["رصيد آخر اليوم", "", day.closingBalance, "", "", ""]);

  const buffer = buildWorkbookBuffer(
    "الخزنة اليومية",
    ["البند", "النوع", "المبلغ", "ملاحظة", "بواسطة", "الوقت"],
    rows
  );

  return excelResponse(buffer, `الخزنة-${date}.xlsx`);
}
