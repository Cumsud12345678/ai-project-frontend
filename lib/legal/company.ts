// Hüquqi sənədlərdə görünən operator məlumatı. Dəyərlər .env-dən gəlir (kodu dəyişmədən yenilənir):
//   NEXT_PUBLIC_LEGAL_ENTITY   məs. "Hazırcavab MMC" və ya "Fərdi sahibkar Ad Soyad"
//   NEXT_PUBLIC_LEGAL_VOEN     VÖEN
//   NEXT_PUBLIC_LEGAL_ADDRESS  hüquqi ünvan
//   NEXT_PUBLIC_SUPPORT_EMAIL  dəstək və hüquqi müraciətlər üçün e-poçt
// Boş olan sahə sənəddə göstərilmir. Ödəniş sistemi müqaviləsindən əvvəl hamısını doldur.
export const COMPANY = {
  brand: process.env.NEXT_PUBLIC_BRAND_NAME || "Hazırcavab",
  entity: process.env.NEXT_PUBLIC_LEGAL_ENTITY || "",
  voen: process.env.NEXT_PUBLIC_LEGAL_VOEN || "",
  address: process.env.NEXT_PUBLIC_LEGAL_ADDRESS || "",
  email: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "",
  /** Sənədlər dəyişəndə yenilə (ISO) */
  updated: "2026-11-10",
};
