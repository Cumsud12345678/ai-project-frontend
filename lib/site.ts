// Saytı olmayan müştəri (yalnız Telegram və ya WhatsApp): sistem domen tələb edir, ona görə ".invalid" ilə bitən
// unikal yer tutucu yazılır. ".invalid" heç vaxt real domen ola bilməz (RFC 2606), vidjet orada işləmir,
// domen nəzarətində də hər hesab ayrıca görünür (bir-birinin "dublikatı" sayılmır).
export const NO_SITE_TLD = ".invalid";

export function noSiteDomain(): string {
  const rnd = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10);
  return `nosite-${rnd}${NO_SITE_TLD}`;
}

export const hasSite = (domain: string | null | undefined) => Boolean(domain) && !String(domain).toLowerCase().endsWith(NO_SITE_TLD);

/** "https://www.Shop.az/x" → "shop.az"; boş və ya səhvdirsə "" */
export function cleanDomain(raw: string): string {
  const h = raw.trim().toLowerCase().replace(/^[a-z]+:\/\//, "").split(/[/?#]/)[0]!.replace(/:\d+$/, "").replace(/^www\./, "").replace(/\.+$/, "");
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(h) ? h : "";
}
