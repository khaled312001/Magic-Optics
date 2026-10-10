import type { Product } from "@prisma/client";

/** منتج بعد تحويل حقول Decimal إلى رقم عادي، صالح للتمرير إلى Client Components */
export type SerializedProduct = Omit<Product, "costPrice" | "sellPrice"> & {
  costPrice: number;
  sellPrice: number;
};
