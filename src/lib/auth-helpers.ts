import "server-only";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export class UnauthorizedError extends Error {
  constructor(message = "غير مصرح لك بهذا الإجراء") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  return session?.user ?? null;
}

/** يتأكد أن هناك مستخدمًا مسجلاً دخوله (أي دور) */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError("يجب تسجيل الدخول أولاً");
  return user;
}

/** يتأكد أن المستخدم الحالي مدير */
export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new UnauthorizedError("هذا الإجراء متاح للمدير فقط");
  return user;
}

/** يتأكد أن المستخدم مدير أو لديه صلاحية تعديل المخزون */
export async function requireInventoryEdit() {
  const user = await requireUser();
  if (user.role !== "ADMIN" && !user.canEditInventory) {
    throw new UnauthorizedError("ليس لديك صلاحية تعديل المخزون، راجع المدير");
  }
  return user;
}

/** يتأكد أن المستخدم مدير أو لديه صلاحية تسجيل حركات المنصرف بالخزنة */
export async function requireExpenseManage() {
  const user = await requireUser();
  if (user.role !== "ADMIN" && !user.canManageExpenses) {
    throw new UnauthorizedError("ليس لديك صلاحية تسجيل المصروفات، راجع المدير");
  }
  return user;
}
