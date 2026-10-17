"use client";

import { useLayoutEffect } from "react";
import { applyTheme, getStoredTheme } from "@/lib/theme";

/** يجبر صفحات الطباعة على الوضع الفاتح، ويعيد الوضع المحفوظ عند مغادرتها */
export function ForceLight() {
  useLayoutEffect(() => {
    applyTheme("light");
    return () => applyTheme(getStoredTheme());
  }, []);
  return null;
}
