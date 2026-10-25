import { ExternalLink } from "lucide-react";
import type { Listing } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

// Müştərinin sxemi nədirsə (motosiklet, məhsul, xidmət...) cədvəl ona uyğunlaşır:
// yalnız heç olmasa bir elanda dolu olan sahələr sütun olur, əlavə sütunlar "attributes"-dən gəlir.
const KNOWN = [
  ["make", "Marka"], ["model", "Model"], ["bodyType", "Kateqoriya"], ["year", "İl"], ["mileage", "Yürüş"], ["volume", "Həcm"], ["power", "Güc"],
  ["fuelType", "Yanacaq"], ["transmission", "Sürətlər qutusu"], ["city", "Şəhər"],
] as const;
const MAX_EXTRA = 6;
const filled = (v: unknown) => v !== null && v !== undefined && v !== "";

export function listingColumns(listings: Listing[]): { key: string; label: string; attr: boolean }[] {
  const cols: { key: string; label: string; attr: boolean }[] = [];
  for (const [key, label] of KNOWN) if (listings.some((l) => filled(l[key]))) cols.push({ key, label, attr: false });
  const count = new Map<string, number>();
  for (const l of listings) for (const [k, v] of Object.entries(l.attributes ?? {})) if (filled(v)) count.set(k, (count.get(k) ?? 0) + 1);
  const attrs = [...count].sort((a, b) => b[1] - a[1]).map(([k]) => ({ key: k, label: k, attr: true }));
  return [...cols, ...attrs].slice(0, MAX_EXTRA);
}

export function ListingTable({ listings }: { listings: Listing[] }) {
  const { t, num } = useI18n();
  const cols = listingColumns(listings);
  const hasPrice = listings.some((l) => typeof l.price === "number");
  const hasImage = listings.some((l) => l.image);
  const cell = (l: Listing, c: { key: string; attr: boolean }) => {
    const v = c.attr ? l.attributes?.[c.key] : (l as unknown as Record<string, unknown>)[c.key];
    if (!filled(v)) return "–";
    if (typeof v !== "number") return String(v);
    return c.key === "mileage" ? `${num(v)} ${t("km")}` : c.key === "year" ? String(v) : num(v);
  };
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border text-muted-foreground">
          <tr>
            <th className="px-4 py-2 font-medium">{t("Başlıq")}</th>
            {hasPrice && <th className="px-4 py-2 font-medium">{t("Qiymət")}</th>}
            {cols.map((c) => <th key={c.key} className="whitespace-nowrap px-4 py-2 font-medium">{c.attr ? c.label : t(c.label)}</th>)}
            <th className="px-4 py-2" />
          </tr>
        </thead>
        <tbody>
          {listings.map((l) => (
            <tr key={l.id} className="border-b border-border last:border-0">
              <td className="px-4 py-2 font-medium">
                <div className="flex items-center gap-3">
                  {hasImage && (l.image
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={l.image} alt="" loading="lazy" referrerPolicy="no-referrer" className="size-10 shrink-0 rounded-md border border-border bg-muted object-cover" />
                    : <span className="size-10 shrink-0 rounded-md border border-border bg-muted" />)}
                  <span className="min-w-0 break-words">{l.title}</span>
                </div>
              </td>
              {hasPrice && <td className="whitespace-nowrap px-4 py-2 tabular-nums">{typeof l.price === "number" ? `${num(l.price)}${l.currency ? ` ${l.currency}` : ""}` : "–"}</td>}
              {cols.map((c) => <td key={c.key} className="px-4 py-2 tabular-nums">{cell(l, c)}</td>)}
              <td className="px-4 py-2">
                {l.url && <a href={l.url.replace(/ /g, "%20")} target="_blank" rel="noreferrer" aria-label={t("{title} elanını aç", { title: l.title })} className="text-primary"><ExternalLink size={16} /></a>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
