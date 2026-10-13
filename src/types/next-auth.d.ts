import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string;
      role: "ADMIN" | "EMPLOYEE";
      canEditInventory: boolean;
      canManageExpenses: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    username: string;
    role: "ADMIN" | "EMPLOYEE";
    canEditInventory: boolean;
    canManageExpenses: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    username: string;
    role: "ADMIN" | "EMPLOYEE";
    canEditInventory: boolean;
    canManageExpenses: boolean;
  }
}
