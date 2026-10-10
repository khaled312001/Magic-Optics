import "server-only";
import fs from "fs";
import path from "path";
import { amiriRegularBase64, amiriBoldBase64 } from "@/assets/fonts/amiri-base64";

function esc(value: string | number | null | undefined): string {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

function fmtMoney(n: number): string {
  return `${n.toLocaleString("en-US", { maximumFractionDigits: 2 })} ج.م`;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("ar-EG", { day: "numeric", month: "short" });
}

let logoDataUri: string | null = null;
function getLogoDataUri(): string {
  if (logoDataUri) return logoDataUri;
  const buf = fs.readFileSync(path.join(process.cwd(), "public", "logo.jpg"));
  logoDataUri = `data:image/jpeg;base64,${buf.toString("base64")}`;
  return logoDataUri;
}

export interface ReportPdfData {
  shop: { name: string; address: string | null; phone: string | null; phone2: string | null };
  sales: { date: string; total: number }[];
  topProducts: { name: string; quantity: number; total: number }[];
  debtors: { customer: { name: string } | null; remaining: number }[];
  lowStock: { code: string | null; name: string; quantity: number; minQuantity: number }[];
  profit: { revenue: number; cost: number; profit: number };
  periodLabel: string;
}

export function buildReportHtml(data: ReportPdfData): string {
  const { shop, sales, topProducts, debtors, lowStock, profit, periodLabel } = data;
  const maxSale = Math.max(1, ...sales.map((s) => s.total));
  const generatedAt = new Date().toLocaleString("ar-EG", { dateStyle: "long", timeStyle: "short" });
  const topDebtors = debtors.slice(0, 10);

  const salesBars = sales
    .map(
      (s) => `
      <div class="bar-col">
        <div class="bar-track"><div class="bar-fill" style="height:${Math.max(4, (s.total / maxSale) * 100)}%"></div></div>
        <div class="bar-label">${esc(fmtDate(s.date))}</div>
      </div>`
    )
    .join("");

  const topProductsRows =
    topProducts.length === 0
      ? `<tr><td colspan="3" class="empty">لا توجد بيانات مبيعات بعد</td></tr>`
      : topProducts
          .map(
            (p, i) => `
      <tr>
        <td class="num">${i + 1}</td>
        <td>${esc(p.name)}</td>
        <td class="num">${p.quantity}</td>
        <td class="num">${esc(fmtMoney(p.total))}</td>
      </tr>`
          )
          .join("");

  const debtorsRows =
    topDebtors.length === 0
      ? `<tr><td colspan="2" class="empty">لا يوجد عملاء مدينون</td></tr>`
      : topDebtors
          .map(
            (d) => `
      <tr>
        <td>${esc(d.customer?.name ?? "عميل")}</td>
        <td class="num amount-neg">${esc(fmtMoney(d.remaining))}</td>
      </tr>`
          )
          .join("");

  const lowStockRows =
    lowStock.length === 0
      ? `<tr><td colspan="3" class="empty">لا توجد أصناف منخفضة المخزون</td></tr>`
      : lowStock
          .slice(0, 15)
          .map(
            (p) => `
      <tr>
        <td>${esc(p.code ?? "-")}</td>
        <td>${esc(p.name)}</td>
        <td class="num amount-neg" dir="ltr">${p.quantity} / ${p.minQuantity}</td>
      </tr>`
          )
          .join("");

  const totalDebt = debtors.reduce((s, d) => s + d.remaining, 0);

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<style>
  @font-face { font-family: 'Amiri'; src: url(data:font/ttf;base64,${amiriRegularBase64}) format('truetype'); font-weight: 400; }
  @font-face { font-family: 'Amiri'; src: url(data:font/ttf;base64,${amiriBoldBase64}) format('truetype'); font-weight: 700; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Amiri', serif; direction: rtl; color: #1a2332; background: #ffffff; }
  .page { padding: 16mm 14mm; }
  .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #0f2a52; padding-bottom: 10px; margin-bottom: 18px; }
  .header-right { display: flex; align-items: center; gap: 12px; }
  .header-right img { width: 52px; height: 52px; border-radius: 10px; object-fit: cover; }
  .header-shop-name { font-size: 15px; font-weight: 700; color: #0f2a52; }
  .header-shop-sub { font-size: 10px; color: #667085; margin-top: 2px; }
  .header-title { text-align: left; }
  .header-title h1 { font-size: 20px; font-weight: 700; color: #0f2a52; }
  .header-title .sub { font-size: 10px; color: #667085; margin-top: 3px; }

  .cards { display: flex; gap: 10px; margin-bottom: 18px; }
  .stat-card { flex: 1; border-radius: 10px; padding: 12px 14px; color: #fff; }
  .stat-card .label { font-size: 10px; opacity: 0.85; }
  .stat-card .value { font-size: 17px; font-weight: 700; margin-top: 4px; }
  .stat-card.revenue { background: linear-gradient(135deg, #0f2a52, #1f4785); }
  .stat-card.cost { background: linear-gradient(135deg, #667085, #475065); }
  .stat-card.profit { background: linear-gradient(135deg, #0a8a81, #0eaea3); }
  .stat-card.debt { background: linear-gradient(135deg, #b4302f, #d4514f); }

  .section { margin-bottom: 18px; }
  .section-title { font-size: 13px; font-weight: 700; color: #0f2a52; border-right: 4px solid #0eaea3; padding-right: 8px; margin-bottom: 10px; }

  .chart-box { border: 1px solid #e5e9f0; border-radius: 10px; padding: 14px 12px 8px; }
  .bars { display: flex; align-items: flex-end; gap: 4px; height: 100px; }
  .bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; justify-content: flex-end; }
  .bar-track { width: 100%; height: 80px; display: flex; align-items: flex-end; }
  .bar-fill { width: 100%; background: linear-gradient(180deg, #0eaea3, #0a8a81); border-radius: 3px 3px 0 0; }
  .bar-label { font-size: 7px; color: #667085; margin-top: 4px; }

  table { width: 100%; border-collapse: collapse; font-size: 10.5px; }
  thead td { background: #0f2a52; color: #fff; font-weight: 700; padding: 7px 8px; }
  tbody td { padding: 6px 8px; border-bottom: 1px solid #e5e9f0; }
  tbody tr:nth-child(even) { background: #f7f9fc; }
  td.num { text-align: center; }
  td.empty { text-align: center; color: #98a2b3; padding: 14px; }
  td.amount-neg { color: #b4302f; font-weight: 700; }

  .two-col { display: flex; gap: 14px; }
  .two-col > div { flex: 1; }

  .footer-note { text-align: center; font-size: 9px; color: #98a2b3; margin-top: 10px; }
</style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="header-right">
        <img src="${getLogoDataUri()}" alt="logo" />
        <div>
          <div class="header-shop-name">${esc(shop.name)}</div>
          <div class="header-shop-sub">${esc([shop.address, shop.phone].filter(Boolean).join(" - "))}</div>
        </div>
      </div>
      <div class="header-title">
        <h1>تقرير أداء المحل</h1>
        <div class="sub">${esc(generatedAt)}</div>
      </div>
    </div>

    <div class="cards">
      <div class="stat-card revenue"><div class="label">الإيرادات (${esc(periodLabel)})</div><div class="value">${esc(fmtMoney(profit.revenue))}</div></div>
      <div class="stat-card cost"><div class="label">التكلفة التقديرية</div><div class="value">${esc(fmtMoney(profit.cost))}</div></div>
      <div class="stat-card profit"><div class="label">صافي الربح التقديري</div><div class="value">${esc(fmtMoney(profit.profit))}</div></div>
      <div class="stat-card debt"><div class="label">إجمالي المستحق على العملاء</div><div class="value">${esc(fmtMoney(totalDebt))}</div></div>
    </div>

    <div class="section">
      <div class="section-title">حركة المبيعات اليومية</div>
      <div class="chart-box">
        <div class="bars">${salesBars}</div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">الأصناف الأكثر مبيعاً</div>
      <table>
        <thead><tr><td class="num">#</td><td>الصنف</td><td class="num">الكمية</td><td class="num">الإجمالي</td></tr></thead>
        <tbody>${topProductsRows}</tbody>
      </table>
    </div>

    <div class="section two-col">
      <div>
        <div class="section-title">أعلى العملاء المدينين</div>
        <table>
          <thead><tr><td>العميل</td><td class="num">المتبقي</td></tr></thead>
          <tbody>${debtorsRows}</tbody>
        </table>
      </div>
      <div>
        <div class="section-title">أصناف منخفضة المخزون</div>
        <table>
          <thead><tr><td>الكود</td><td>الصنف</td><td class="num">الكمية / الحد الأدنى</td></tr></thead>
          <tbody>${lowStockRows}</tbody>
        </table>
      </div>
    </div>

    <div class="footer-note">تم إنشاء هذا التقرير تلقائياً من نظام إدارة ${esc(shop.name)}</div>
  </div>
</body>
</html>`;
}
