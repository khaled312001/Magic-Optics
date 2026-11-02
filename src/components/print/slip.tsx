import Image from "next/image";
import type { ReactNode } from "react";

/**
 * مكونات ورقة الطابعة الحرارية (80mm - مساحة طباعة فعلية 72mm):
 * أسود صريح فقط (الرمادي يطلع باهت على الحراري)، خطوط عريضة، جداول بحدود، وشرائط عناوين سوداء.
 */

type Shop = {
  name: string;
  address: string;
  phone: string;
  phone2: string | null;
  commercialRegister?: string | null;
  taxNumber?: string | null;
};

export function SlipPaper({ children }: { children: ReactNode }) {
  return (
    <div className="print-area print-thermal mx-auto w-[380px] max-w-full rounded-xl border border-border bg-white p-4 shadow-sm">
      <div className="slip">{children}</div>
    </div>
  );
}

export function SlipHeader({ shop }: { shop: Shop }) {
  return (
    <div className="slip-head">
      {/* نسخة أبيض وأسود صريح من اللوجو (الألوان بتطلع باهتة ومنقّطة على الحراري) - فيها اسم المحل */}
      <Image src="/logo-print.png" alt={shop.name} width={190} height={143} className="slip-logo" priority />
      {shop.address && <p>{shop.address}</p>}
      <p dir="ltr">{[shop.phone, shop.phone2].filter(Boolean).join("  /  ")}</p>
      {(shop.commercialRegister || shop.taxNumber) && (
        <p className="slip-legal">
          {shop.commercialRegister && (
            <span>
              سجل تجاري: <b dir="ltr">{shop.commercialRegister}</b>
            </span>
          )}
          {shop.taxNumber && (
            <span>
              بطاقة ضريبية: <b dir="ltr">{shop.taxNumber}</b>
            </span>
          )}
        </p>
      )}
    </div>
  );
}

/** شريط أسود بعنوان الورقة ورقمها */
export function SlipBar({ title, number }: { title: string; number?: string }) {
  return (
    <div className="slip-bar">
      <span>{title}</span>
      {number && <span dir="ltr">{number}</span>}
    </div>
  );
}

/** جدول بيانات (عنوان | قيمة) بحدود */
export function SlipInfo({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <table className="slip-table slip-info">
      <tbody>
        {rows.map(([label, value]) => (
          <tr key={label}>
            <th>{label}</th>
            <td>{value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

type RxValues = Record<
  | "leftAxisFar" | "leftCylFar" | "leftSphFar" | "ipdFar" | "rightAxisFar" | "rightCylFar" | "rightSphFar"
  | "leftAxisNear" | "leftCylNear" | "leftSphNear" | "ipdNear" | "rightAxisNear" | "rightCylNear" | "rightSphNear",
  string | null
>;

function v(value: string | null) {
  return value?.trim() || "-";
}

/** جدول قياسات كشف النظر */
export function SlipRxTable({ rx }: { rx: RxValues }) {
  return (
    <table className="slip-table slip-rx">
      <thead>
        <tr>
          <th rowSpan={2}></th>
          <th colSpan={3}>العين اليسرى L</th>
          <th rowSpan={2}>IPD</th>
          <th colSpan={3}>العين اليمنى R</th>
        </tr>
        <tr>
          <th>AXIS</th>
          <th>CYL</th>
          <th>SPH</th>
          <th>AXIS</th>
          <th>CYL</th>
          <th>SPH</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <th>D</th>
          <td dir="ltr">{v(rx.leftAxisFar)}</td>
          <td dir="ltr">{v(rx.leftCylFar)}</td>
          <td dir="ltr">{v(rx.leftSphFar)}</td>
          <td dir="ltr">{v(rx.ipdFar)}</td>
          <td dir="ltr">{v(rx.rightAxisFar)}</td>
          <td dir="ltr">{v(rx.rightCylFar)}</td>
          <td dir="ltr">{v(rx.rightSphFar)}</td>
        </tr>
        <tr>
          <th>R</th>
          <td dir="ltr">{v(rx.leftAxisNear)}</td>
          <td dir="ltr">{v(rx.leftCylNear)}</td>
          <td dir="ltr">{v(rx.leftSphNear)}</td>
          <td dir="ltr">{v(rx.ipdNear)}</td>
          <td dir="ltr">{v(rx.rightAxisNear)}</td>
          <td dir="ltr">{v(rx.rightCylNear)}</td>
          <td dir="ltr">{v(rx.rightSphNear)}</td>
        </tr>
      </tbody>
    </table>
  );
}

/** صف مبلغ: عادي أو مميز (شريط أسود) */
export function SlipAmount({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={strong ? "slip-amount slip-amount-strong" : "slip-amount"}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

export function SlipFooter({ children }: { children: ReactNode }) {
  return <div className="slip-foot">{children}</div>;
}
