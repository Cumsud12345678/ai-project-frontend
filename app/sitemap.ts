import type { MetadataRoute } from "next";

export const dynamic = "force-dynamic"; // SITE_URL işə salınanda oxunsun, build zamanı yox

// SITE_URL verilməyibsə sitemap boş qalır (mütləq ünvan lazımdır).
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.SITE_URL?.replace(/\/+$/, "");
  if (!base) return [];
  const languages = { az: `${base}/`, en: `${base}/en`, ru: `${base}/ru` };
  return [`/`, `/en`, `/ru`].map((p) => ({ url: `${base}${p === "/" ? "/" : p}`, changeFrequency: "monthly" as const, priority: p === "/" ? 1 : 0.8, alternates: { languages } }));
}
