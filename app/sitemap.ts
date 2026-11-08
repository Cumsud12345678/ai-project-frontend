import type { MetadataRoute } from "next";

export const dynamic = "force-dynamic"; // SITE_URL işə salınanda oxunsun, build zamanı yox

// SITE_URL verilməyibsə sitemap boş qalır (mütləq ünvan lazımdır).
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.SITE_URL?.replace(/\/+$/, "");
  if (!base) return [];
  const languages = { az: `${base}/`, en: `${base}/en`, ru: `${base}/ru`, tr: `${base}/tr` };
  const legal = ["terms", "privacy", "refund"].map((d) => ({
    url: `${base}/legal/${d}`, changeFrequency: "yearly" as const, priority: 0.3,
    alternates: { languages: { az: `${base}/legal/${d}`, en: `${base}/legal/${d}?lang=en`, ru: `${base}/legal/${d}?lang=ru`, tr: `${base}/legal/${d}?lang=tr` } },
  }));
  return [...[`/`, `/en`, `/ru`, `/tr`].map((p) => ({ url: `${base}${p === "/" ? "/" : p}`, changeFrequency: "monthly" as const, priority: p === "/" ? 1 : 0.8, alternates: { languages } })), ...legal];
}
