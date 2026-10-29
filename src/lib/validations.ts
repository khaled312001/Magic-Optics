import { z } from "zod";

export const customerSchema = z.object({
  name: z.string().trim().min(2, "الاسم مطلوب (حرفان على الأقل)").max(150),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  phone2: z.string().trim().max(30).optional().or(z.literal("")),
  address: z.string().trim().max(250).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});
export type CustomerInput = z.infer<typeof customerSchema>;

const optText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || null);

// الخانة الفاضية = null (وليس 0) - z.coerce.number("") كانت ترجع 0 فتتسجل القياسات الفاضية كأصفار
const optId = z.preprocess(
  (v) => (v === "" || v === undefined || v === null ? null : v),
  z.coerce.number().int().positive().nullable()
);

const paymentMethod = z.enum(["CASH", "INSTAPAY", "VISA", "VODAFONE_CASH"]).default("CASH");
const checkbox = z.preprocess((v) => v === "1" || v === "on", z.boolean());

const numOrEmpty = z.preprocess(
  (v) => (v === "" || v === undefined || v === null ? null : v),
  z.coerce.number().nullable()
);

export const prescriptionSchema = z
  .object({
    customerId: z.coerce.number().int().positive().optional(),
    newCustomerName: z.string().trim().max(150).optional().or(z.literal("")),
    newCustomerPhone: z.string().trim().max(30).optional().or(z.literal("")),
    rightSphFar: optText(20),
    rightCylFar: optText(20),
    rightAxisFar: optText(20),
    leftSphFar: optText(20),
    leftCylFar: optText(20),
    leftAxisFar: optText(20),
    rightSphNear: optText(20),
    rightCylNear: optText(20),
    rightAxisNear: optText(20),
    leftSphNear: optText(20),
    leftCylNear: optText(20),
    leftAxisNear: optText(20),
    ipdFar: optText(20),
    ipdNear: optText(20),
    date: z.string().optional().or(z.literal("")),
    notes: z.string().trim().max(2000).optional().or(z.literal("")),
    doctorName: optText(150),
    frame: optText(200),
    lensType: optText(200),
    // الفريم والعدسة المختاران من المخزون (يُخصمان من المخزون عند عمل الفاتورة)
    frameProductId: optId,
    lensProductId: optId,
    // سعر الفريم والعدسات كما يكتبه البائع (يتعبى من سعر المخزون ويمكن تعديله) - هو اللى يظهر فى الفاتورة
    framePrice: numOrEmpty,
    lensPrice: numOrEmpty,
    // تفاصيل الطلب المرتبط (اختياري) - تطابق سلّة الكشف الورقية التي تجمع بيانات الفحص والطلب فى إيصال واحد
    orderType: z.enum(["MEDICAL", "SUNGLASSES", "LENS_CHANGE", "OTHER"]).optional(),
    orderStatus: z.enum(["PENDING", "READY", "DELIVERED", "CANCELLED"]).default("PENDING"),
    paymentMethod,
    applyTax: checkbox,
    orderDescription: z.string().trim().max(200).optional().or(z.literal("")),
    totalAmount: numOrEmpty,
    paidAmount: numOrEmpty,
    deliveryDate: z.string().optional().or(z.literal("")),
  })
  .refine((data) => data.customerId || data.newCustomerName?.trim(), {
    message: "اختر عميلاً أو أدخل اسم عميل جديد",
    path: ["customerId"],
  });
export type PrescriptionInput = z.infer<typeof prescriptionSchema>;

/** قياسات كشف النظر المُدخلة من شاشة الفاتورة (تُحفظ ككشف مرتبط بالفاتورة) */
export const rxSchema = z.object({
  rightSphFar: optText(20),
  rightCylFar: optText(20),
  rightAxisFar: optText(20),
  leftSphFar: optText(20),
  leftCylFar: optText(20),
  leftAxisFar: optText(20),
  rightSphNear: optText(20),
  rightCylNear: optText(20),
  rightAxisNear: optText(20),
  leftSphNear: optText(20),
  leftCylNear: optText(20),
  leftAxisNear: optText(20),
  ipdFar: optText(20),
  ipdNear: optText(20),
  date: z.string().optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  doctorName: optText(150),
  frame: optText(200),
  lensType: optText(200),
});

export const productCategorySchema = z.enum([
  "FRAME_MEDICAL",
  "FRAME_SUNGLASSES",
  "LENS",
  "LENS_CONTRACT",
  "ACCESSORY",
]);

export const productSchema = z.object({
  code: z.string().trim().max(50).optional().or(z.literal("")),
  factoryCode: z.string().trim().max(50).optional().or(z.literal("")),
  name: z.string().trim().min(2, "اسم الصنف مطلوب").max(200),
  category: productCategorySchema,
  costPrice: z.coerce.number().min(0, "لا يمكن أن يكون سالباً"),
  sellPrice: z.coerce.number().min(0, "لا يمكن أن يكون سالباً"),
  quantity: z.coerce.number().int().min(0),
  minQuantity: z.coerce.number().int().min(0),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});
export type ProductInput = z.infer<typeof productSchema>;

export const stockAdjustSchema = z.object({
  productId: z.coerce.number().int().positive(),
  type: z.enum(["IN", "OUT", "ADJUSTMENT"]),
  quantity: z.coerce.number().int().positive("الكمية يجب أن تكون أكبر من صفر"),
  note: z.string().trim().max(500).optional().or(z.literal("")),
});
export type StockAdjustInput = z.infer<typeof stockAdjustSchema>;

const idOrEmpty = z
  .union([z.coerce.number().int().positive(), z.literal("")])
  .optional()
  .nullable()
  .transform((v) => (v === "" || v === undefined || v === null ? null : v));

export const orderItemSchema = z.object({
  productId: idOrEmpty,
  description: z.string().trim().min(1, "وصف الصنف مطلوب").max(300),
  quantity: z.coerce.number().int().positive().default(1),
  unitPrice: z.coerce.number().min(0),
});

export const orderSchema = z.object({
  customerId: idOrEmpty,
  newCustomerName: z.string().trim().max(150).optional().or(z.literal("")),
  newCustomerPhone: z.string().trim().max(30).optional().or(z.literal("")),
  prescriptionId: idOrEmpty,
  type: z.enum(["MEDICAL", "SUNGLASSES", "LENS_CHANGE", "OTHER"]),
  status: z.enum(["PENDING", "READY", "DELIVERED", "CANCELLED"]).default("PENDING"),
  items: z.array(orderItemSchema).min(1, "أضف صنفاً واحداً على الأقل"),
  paidAmount: z.coerce.number().min(0).default(0),
  applyDiscount: checkbox,
  applyTax: checkbox,
  paymentMethod,
  deliveryDate: z.string().optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});
export type OrderInput = z.infer<typeof orderSchema>;

export const paymentSchema = z.object({
  orderId: z.coerce.number().int().positive(),
  amount: z.coerce.number().positive("المبلغ يجب أن يكون أكبر من صفر"),
  paymentMethod,
  note: z.string().trim().max(300).optional().or(z.literal("")),
});
export type PaymentInput = z.infer<typeof paymentSchema>;

export const cashEntrySchema = z.object({
  date: z.string().min(1, "التاريخ مطلوب"),
  category: z.enum([
    "SUNGLASSES_SALE",
    "MEDICAL_SALE",
    "LENS_CHANGE",
    "OTHER_SALE",
    "SUNGLASSES_PURCHASE",
    "MEDICAL_PURCHASE",
    "LENS_PURCHASE",
    "OTHER_PURCHASE",
    "BANK_DEPOSIT",
    "EXPENSE",
    "WITHDRAWAL",
    "OTHER",
  ]),
  type: z.enum(["IN", "OUT"]),
  amount: z.coerce.number().positive("المبلغ يجب أن يكون أكبر من صفر"),
  note: z.string().trim().max(300).optional().or(z.literal("")),
});
export type CashEntryInput = z.infer<typeof cashEntrySchema>;

const checkboxBool = (defaultValue: "true" | "false") =>
  z
    .union([z.literal("true"), z.literal("false")])
    .default(defaultValue)
    .transform((v) => v === "true");

export const userSchema = z.object({
  name: z.string().trim().min(2, "الاسم مطلوب").max(150),
  username: z
    .string()
    .trim()
    .min(3, "اسم المستخدم 3 أحرف على الأقل")
    .max(50)
    .regex(/^[a-zA-Z0-9_.]+$/, "اسم المستخدم يجب أن يكون بالإنجليزية بدون مسافات"),
  password: z.string().min(6, "كلمة المرور 6 أحرف على الأقل").max(100).optional().or(z.literal("")),
  role: z.enum(["ADMIN", "EMPLOYEE"]),
  active: checkboxBool("true"),
  canEditInventory: checkboxBool("true"),
  canManageExpenses: checkboxBool("true"),
});
export type UserInput = z.infer<typeof userSchema>;

export const shopSettingsSchema = z.object({
  name: z.string().trim().min(2).max(200),
  address: z.string().trim().max(300).optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  phone2: z.string().trim().max(30).optional().or(z.literal("")),
  taxNumber: z.string().trim().max(50).optional().or(z.literal("")),
  commercialRegister: z.string().trim().max(50).optional().or(z.literal("")),
  examFee: z.coerce.number().min(0).default(0),
  discountPercent: z.coerce.number().min(0).max(100).default(20),
  taxPercent: z.coerce.number().min(0).max(100).default(14),
  autoClose: z.enum(["NONE", "DAILY", "MONTHLY"]).default("NONE"),
});
export type ShopSettingsInput = z.infer<typeof shopSettingsSchema>;
