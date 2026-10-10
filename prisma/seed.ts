import { PrismaClient, ProductCategory } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // --- إعدادات المحل ---------------------------------------------------
  await prisma.shopSettings.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      name: "Magic Optics - مركز ماجيك للبصريات",
      address: "قنا - قفط - أمام فرع اتصالات",
      phone: "01012135456",
    },
    update: {},
  });

  // --- المستخدم المدير ----------------------------------------------------
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "7l7dN8WKL7";
  await prisma.user.upsert({
    where: { username: "admin" },
    create: {
      name: "صاحب المحل",
      username: "admin",
      password: await bcrypt.hash(adminPassword, 10),
      role: "ADMIN",
    },
    update: {},
  });

  // --- إطارات النظارات الطبية (نضارات طبيه.xlsx) --------------------------
  const medicalFrames: Array<[string, number, number, number, string]> = [
    ["A", 37, 100, 350, "Astra مستطيل مصري"],
    ["B", 2, 250, 875, "hiphi مربع"],
    ["C", 29, 150, 525, "boss TR"],
    ["D", 2, 200, 700, "rafale استيت"],
    ["E", 22, 80, 280, "Dacchi قط"],
    ["F", 14, 175, 650, "rafale استيت"],
    ["G", 9, 125, 450, "Dacchi مستطيل"],
    ["H", 22, 100, 350, "Feberal"],
    ["I", 3, 200, 700, "hiphi مستطيل"],
    ["J", 15, 125, 450, "astra قط"],
    ["K", 3, 100, 350, "فاستون / ريبان"],
    ["L", 18, 150, 525, "استين استوك"],
    ["M", 2, 350, 1200, "Silhouette"],
    ["N", 6, 500, 1750, "Cartier / Mont"],
    ["U", 3, 175, 620, "Tomforo قط"],
    ["Y", 42, 45, 160, "معدن استوك"],
    ["V", 73, 65, 250, "سيليكون اطفال"],
    ["X", 50, 50, 175, "TR + معدن فاشون"],
    ["Z", 61, 60, 250, "TR"],
    ["P", 9, 175, 620, "Astra-Sun"],
    ["W", 13, 25, 90, "فريملس صغير"],
    ["O", 26, 50, 180, "استيت"],
    ["ق", 13, 70, 245, "قراءة مطبق"],
    ["ق", 31, 35, 130, "قراءة جاهزة بلوكت"],
    ["ق", 53, 30, 110, "قراءة جاهزة عادية"],
    ["ق", 2, 60, 180, "مغناطيس"],
    ["ق", 2, 60, 180, "قراءة جاهزة بلوكت معدن"],
    ["ق", 1, 65, 200, "هاف"],
  ];

  // --- إطارات النظارات الشمسية (نضارات شمس.xlsx) ---------------------------
  const sunglassesFrames: Array<[string, number, number, number, string]> = [
    ["1", 21, 90, 350, "رجالي وسط"],
    ["2", 9, 90, 350, "اطفال بولاريز"],
    ["3", 7, 35, 150, "اطفالي"],
    ["4", 3, 65, 250, "فريملس اطفالي"],
    ["5", 19, 165, 605, "ايطالي"],
    ["6", 17, 150, 550, "معدن"],
    ["7", 18, 135, 500, "عظم رجالي + حريمي"],
    ["8", 36, 65, 250, "وسط رجالي + وسط حريمي"],
    ["9", 3, 225, 670, "ريبان زجاج"],
    ["10", 16, 180, 650, "ريبان"],
    ["11", 0, 150, 600, "2 غيار"],
    ["12", 1, 150, 800, "3 غيار"],
    ["13", 3, 300, 1200, "4 غيارات"],
    ["14", 7, 250, 1350, "5 غيار"],
  ];

  // --- إكسسوارات ---------------------------------------------------------
  const accessories: Array<[string | null, number, number, number, string]> = [
    [null, 20, 15, 35, "إسبراي تنظيف العدسات"],
    ["أ", 10, 6.5, 25, "سلسلة جلد"],
    ["م", 7, 12.5, 45, "سلسلة معدن"],
    ["ب", 18, 5, 18, "سلسلة جلد بقماش"],
    ["و", 49, 2.5, 10, "سلسلة أقطان عادي"],
    [null, 5, 15, 45, "سلسلة سيليكون كبير"],
    [null, 15, 12, 40, "سلسلة سيليكون صغير"],
    [null, 9, 18, 55, "سلسلة معدن خرز"],
    [null, 23, 12, 40, "سنادة نظارة"],
    [null, 1, 60, 150, "غطاء كسل العين"],
    ["ن", 12, 5, 15, "سلسلة قماش مستورد"],
  ];

  // --- العدسات (التعاقد.docx + أسعار العدسات) ------------------------------
  const lenses: Array<[number, string]> = [
    [335, "سيلفر 1.56 انتي ريفلكشن"],
    [420, "سيلفر 1.56 انتي ريفلكشن أكبر من سلندر 2"],
    [620, "سيلفر 1.56 بلوكت"],
    [730, "سيلفر فوتوجراي"],
    [995, "سيلفر فوتوجراي بلوكت"],
    [300, "بلاتينيوم 1.5 بلاستيك أبيض"],
    [350, "بلاتينيوم 1.5 أكبر من سلندر 2"],
    [470, "بلاتينيوم 1.56 انتي ريفلكشن"],
    [650, "بلاتينيوم 1.56 انتي ريفلكشن أكبر من سلندر 2"],
    [845, "بلاتينيوم 1.59 ايرولايت انتي ريفلكشن مقاوم للكسر"],
    [1655, "بلاتينيوم 1.56 قيادة ليلية اسفيرك بلوكت UV420"],
    [840, "بلاتينيوم بلوكت بلو ستيل"],
    [1035, "بلاتينيوم بلوكت"],
    [990, "بلاتينيوم 1.56 فوتو براون/جراي"],
    [1290, "مضغوط بلاتينيوم 1.61 انتي ريفلكشن نواقص وزوائد (+3 إلى -5)"],
    [1980, "مضغوط بلاتينيوم 1.67 انتي ريفلكشن نواقص (+5 إلى -7)"],
    [5560, "مضغوط بلاتينيوم 1.74 انتي ريفلكشن نواقص (أكبر من 7)"],
    [280, "زجاج 1.53 أبيض"],
    [335, "زجاج 1.53 أبيض نواقص فوق سلندر 2"],
    [575, "ميرا جلاس (زجاج انتي ريفلكشن)"],
    [575, "فلنت مضغوط 1.7 أبيض"],
    [860, "فلنت مضغوط 1.7 انتي ريفلكشن"],
  ];

  const existingCount = await prisma.product.count();
  if (existingCount === 0) {
    await prisma.product.createMany({
      data: [
        ...medicalFrames.map(([code, quantity, costPrice, sellPrice, name]) => ({
          code,
          name,
          category: ProductCategory.FRAME_MEDICAL,
          costPrice,
          sellPrice,
          quantity,
          minQuantity: 3,
        })),
        ...sunglassesFrames.map(([code, quantity, costPrice, sellPrice, name]) => ({
          code,
          name,
          category: ProductCategory.FRAME_SUNGLASSES,
          costPrice,
          sellPrice,
          quantity,
          minQuantity: 3,
        })),
        ...accessories.map(([code, quantity, costPrice, sellPrice, name]) => ({
          code,
          name,
          category: ProductCategory.ACCESSORY,
          costPrice,
          sellPrice,
          quantity,
          minQuantity: 3,
        })),
        ...lenses.map(([sellPrice, name]) => ({
          code: null,
          name,
          category: ProductCategory.LENS,
          costPrice: Math.round(sellPrice * 0.6),
          sellPrice,
          quantity: 10,
          minQuantity: 2,
        })),
      ],
    });
  }

  console.log("✅ تم تجهيز قاعدة البيانات بالبيانات الأولية");
  console.log(`   اسم المستخدم: admin`);
  console.log(`   كلمة المرور: ${adminPassword} (يُنصح بتغييرها فور تسجيل الدخول)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
