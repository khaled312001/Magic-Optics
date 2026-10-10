import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getOrCreateCashDay } from "@/server/cashRegister";
import { buildWorkbookBuffer, excelResponse } from "@/lib/excel";
import { cashCategoryLabels } from "@/lib/labels";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") || new Date().toISOString().slice(0, 10);

  const day = await getOrCreateCashDay(date);

  const cashIn = day.entries.filter((e) => e.type === "IN").reduce((s, e) => s + Number(e.amount), 0);
  const cashOut = day.entries.filter((e) => e.type === "OUT").reduce((s, e) => s + Number(e.amount), 0);
  const closingBalance = Number(day.openingBalance) + cashIn - cashOut;

  const rows = day.entries.map((e) => [
    cashCategoryLabels[e.category],
    e.type === "IN" ? "وارد" : "منصرف",
    e.type === "IN" ? Number(e.amount) : -Number(e.amount),
    e.note ?? "",
    e.createdBy?.name ?? "",
    e.createdAt.toLocaleTimeString("ar-EG-u-nu-latn", { hour: "2-digit", minute: "2-digit" }),
  ]);

  rows.push(["", "", "", "", "", ""]);
  rows.push(["رصيد أول اليوم", "", Number(day.openingBalance), "", "", ""]);
  rows.push(["إجمالي الوارد", "", cashIn, "", "", ""]);
  rows.push(["إجمالي المنصرف", "", -cashOut, "", "", ""]);
  rows.push(["رصيد آخر اليوم", "", closingBalance, "", "", ""]);

  const buffer = buildWorkbookBuffer(
    "الخزنة اليومية",
    ["البند", "النوع", "المبلغ", "ملاحظة", "بواسطة", "الوقت"],
    rows
  );

  return excelResponse(buffer, `الخزنة-${date}.xlsx`);
}
