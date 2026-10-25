// Brauzer yalnız bu saytla danışır; /api/portal/* sorğuları portal backend-inə yönləndirilir.
// Beləliklə sessiya cookie-si bu saytın öz ünvanında qalır (CORS və ya üçüncü tərəf cookie problemi olmur).
const portal = (process.env.PORTAL_API_URL ?? "http://localhost:4000").replace(/\/+$/, "");

export default {
  // AI cavabı (Gemini + müştəri API-si) 30 saniyədən uzun çəkə bilər; Next-in standart proksi limiti 30 saniyədir.
  experimental: { proxyTimeout: 90_000 },
  async rewrites() {
    return [{ source: "/api/portal/:path*", destination: `${portal}/:path*` }];
  },
};
