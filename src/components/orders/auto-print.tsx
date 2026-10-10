"use client";

import { useEffect } from "react";

/** يفتح نافذة الطباعة تلقائياً بعد تحميل الإيصال، يُستخدم مباشرة بعد إصدار فاتورة جديدة */
export function AutoPrint() {
  useEffect(() => {
    const timer = setTimeout(() => window.print(), 500);
    return () => clearTimeout(timer);
  }, []);

  return null;
}
