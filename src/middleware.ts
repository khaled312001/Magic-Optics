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
     * - ملفات Next الثابتة والصور
     */
    "/((?!login|api/auth|_next/static|_next/image|favicon.ico|logo.jpg).*)",
  ],
};
