// WooCommerce mağazası üçün hazır konfiqurasiya: WooCommerce-in açıq Store API-si (/wp-json/wc/store/v1/products).
// Açar və icazə lazım deyil: bu API mağazanın vitrinində görünən məhsulları onsuz da hamıya göstərir.
// Store API qiyməti ən kiçik vahiddə işlədir (100.25 AZN -> 10025), ona görə filtr 100-ə vurulur, cavab 100-ə bölünür.
// ai-server/test/woocommerce.test.mjs eyni quruluşu saxta mağaza ilə yoxlayır.

/** İstifadəçinin yazdığı ünvandan https://domen.az (yol və sorğu olmadan). Yanlışdırsa null. */
export function wooBaseUrl(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  let u: URL;
  try { u = new URL(/^[a-z]+:\/\//i.test(v) ? v : `https://${v}`); } catch { return null; }
  if (u.protocol !== "https:" || !u.hostname.includes(".")) return null;
  return u.origin;
}

export function wooConfig(baseUrl: string, opts: { businessName?: string; language?: "az" | "en" | "ru" | "tr" } = {}) {
  const host = new URL(baseUrl).hostname.replace(/^www\./, "");
  return {
    businessName: opts.businessName?.trim() || host,
    domain: host,
    profile: { mode: "listings", language: opts.language ?? "az", maxResults: 5 },
    source: {
      type: "rest",
      baseUrl,
      timeoutMs: 8000,
      cacheSeconds: 60,
      localSort: ["price"],
      search: { method: "GET", path: "/wp-json/wc/store/v1/products", limitParam: "per_page" },
      filters: {
        search: { type: "text", description: "Məhsulun adı və ya açar sözlər", param: "search" },
        minPrice: { type: "number", description: "Minimum qiymət", param: "min_price", multiply: 100 },
        maxPrice: { type: "number", description: "Maksimum qiymət", param: "max_price", multiply: 100 },
        category: { type: "string", description: "Kateqoriya", param: "category", valueFrom: "vocabulary" },
        onSale: { type: "boolean", description: "Yalnız endirimdə olan məhsullar", param: "on_sale", valueMap: { true: "true" } },
      },
      vocabulary: { lists: { category: { path: "/wp-json/wc/store/v1/products/categories?per_page=100", idField: "id", nameField: "name" } } },
      response: {
        itemsPath: ".",
        fields: {
          id: "id",
          title: "name",
          url: "permalink",
          image: "images[0].src",
          currency: "prices.currency_code",
          price: { path: "prices.price", divide: 100 },
          attributes: {
            "Kateqoriya": "categories[0].name",
            "Qısa təsvir": { path: "short_description", stripHtml: true },
            "Stokda": { path: "is_in_stock", type: "boolean" },
          },
        },
      },
    },
  };
}
