import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildWorkbookBuffer, excelResponse } from "@/lib/excel";
import { productCategoryShortLabels } from "@/lib/labels";
import type { Prisma, ProductCategory } from "@prisma/client";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const q = searchParams.get("q");

  const where: Prisma.ProductWhereInput = {
    active: true,
    ...(category ? { category: category as ProductCategory } : {}),
    ...(q ? (category === "LENS" ? { name: { contains: q } } : { code: { contains: q } }) : {}),
  };

  const products = await prisma.product.findMany({ where, orderBy: [{ category: "asc" }, { name: "asc" }] });

  const headers = ["كود المحل", "كود المصنع", "الاسم", "الفئة", "سعر البيع", "الكمية", "حد التنبيه"];

  const rows = products.map((p) => [
    p.code ?? "",
    p.factoryCode ?? "",
    p.name,
    productCategoryShortLabels[p.category],
    Number(p.sellPrice),
    p.quantity,
    p.minQuantity,
  ]);

  const buffer = buildWorkbookBuffer("المخزون", headers, rows);
  return excelResponse(buffer, `المخزون-${new Date().toISOString().slice(0, 10)}.xlsx`);
}
