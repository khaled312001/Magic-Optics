import type { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const authOptions: AuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 يوم
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        username: { label: "اسم المستخدم", type: "text" },
        password: { label: "كلمة المرور", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { username: credentials.username.trim() },
        });

        if (!user || !user.active) return null;

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) return null;

        await prisma.loginLog.create({ data: { userId: user.id } });

        return {
          id: String(user.id),
          name: user.name,
          username: user.username,
          role: user.role,
          canEditInventory: user.canEditInventory,
          canManageExpenses: user.canManageExpenses,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = (user as { username: string }).username;
        token.role = (user as { role: "ADMIN" | "EMPLOYEE" }).role;
        token.canEditInventory = (user as { canEditInventory: boolean }).canEditInventory;
        token.canManageExpenses = (user as { canManageExpenses: boolean }).canManageExpenses;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.username = token.username as string;
        session.user.role = token.role as "ADMIN" | "EMPLOYEE";
        session.user.canEditInventory = token.canEditInventory as boolean;
        session.user.canManageExpenses = token.canManageExpenses as boolean;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
