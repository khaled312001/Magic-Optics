import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: [
    /*
     * حماية كل المسارات ما عدا:
     * - /login
     * - /api/auth (نظام تسجيل الدخول)
     * - /api/cron (مهام مجدولة من Vercel Cron، تتحقق من CRON_SECRET بنفسها)
     * - ملفات Next الثابتة والصور
     */
    "/((?!login|api/auth|api/cron|_next/static|_next/image|favicon.ico|logo.jpg).*)",
  ],
};
