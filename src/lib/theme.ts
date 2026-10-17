export type Theme = "dark" | "light";

export const THEME_STORAGE_KEY = "theme";

/** صفحات الطباعة (الإيصال وكشف النظر) تبقى فاتحة دائماً */
export const PRINT_PATH_PATTERN = /^\/(orders\/\d+\/receipt|prescriptions\/\d+)\/?$/;

/**
 * سكربت صغير يُنفَّذ قبل رسم الصفحة لتطبيق الوضع المحفوظ بدون وميض.
 * الوضع الداكن هو الافتراضي.
 */
export const themeInitScript = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t==="light"||${PRINT_PATH_PATTERN}.test(location.pathname)){document.documentElement.classList.remove("dark")}}catch(e){}})();`;

export function getStoredTheme(): Theme {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

export function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}
