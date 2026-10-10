export const roleLabels = {
  ADMIN: "مدير",
  EMPLOYEE: "موظف",
} as const;

export const productCategoryLabels = {
  FRAME_MEDICAL: "إطارات طبية",
  FRAME_SUNGLASSES: "إطارات شمسية",
  LENS: "عدسات",
  ACCESSORY: "إكسسوارات",
} as const;

export const productCategoryShortLabels = {
  FRAME_MEDICAL: "إطار طبي",
  FRAME_SUNGLASSES: "إطار شمسي",
  LENS: "عدسة",
  ACCESSORY: "إكسسوار",
} as const;

export const orderTypeLabels = {
  MEDICAL: "نظارة طبية",
  SUNGLASSES: "نظارة شمسية",
  LENS_CHANGE: "تغيير عدسات",
  OTHER: "أخرى",
} as const;

export const orderStatusLabels = {
  PENDING: "قيد التجهيز",
  READY: "جاهزة للاستلام",
  DELIVERED: "تم التسليم",
  CANCELLED: "ملغية",
} as const;

export const orderStatusColors = {
  PENDING: "amber",
  READY: "blue",
  DELIVERED: "green",
  CANCELLED: "red",
} as const;

export const cashCategoryLabels = {
  SUNGLASSES_SALE: "مبيعات شمس",
  MEDICAL_SALE: "مبيعات نظر",
  LENS_CHANGE: "تغيير عدسات",
  OTHER_SALE: "مبيعات أخرى",
  BANK_DEPOSIT: "إيداع بنك",
  EXPENSE: "مصروفات",
  WITHDRAWAL: "سحب / مرتبات",
  OTHER: "أخرى",
} as const;

export const stockMovementTypeLabels = {
  IN: "إضافة للمخزون",
  OUT: "خصم من المخزون",
  ADJUSTMENT: "تسوية جرد",
} as const;
