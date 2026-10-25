import type { MetadataRoute } from "next";

export const dynamic = "force-dynamic"; // SITE_URL işə salınanda oxunsun, build zamanı yox

export default function robots(): MetadataRoute.Robots {
  const base = process.env.SITE_URL?.replace(/\/+$/, "");
  return {
    rules: { userAgent: "*", allow: ["/", "/en", "/ru"], disallow: ["/dashboard", "/settings", "/admin", "/connection", "/embed", "/queries", "/listings", "/playground", "/api/"] },
    ...(base ? { sitemap: `${base}/sitemap.xml` } : {}),
  };
}
