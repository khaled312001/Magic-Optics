import "server-only";
import * as XLSX from "xlsx";

export function buildWorkbookBuffer(sheetName: string, headers: string[], rows: (string | number)[][]) {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws["!cols"] = headers.map(() => ({ wch: 20 }));
  ws["!views"] = [{ rightToLeft: true }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

export function excelResponse(buffer: Buffer, filename: string) {
  // اسم الملف قد يحتوي حروفاً عربية، وترويسات HTTP تقبل فقط ASCII فى القيمة
  // المباشرة؛ لذا نرسل بديلاً إنجليزياً بسيطاً + الاسم العربي الحقيقي مرمّزاً
  // حسب RFC 5987 (filename*) ليعرضه المتصفح عند التنزيل.
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="export.xlsx"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}
