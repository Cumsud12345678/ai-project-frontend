"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FileUp, Link2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { activate, ApiError, feedPreview, feedRefresh, getFeedStatus, testConfig, updateConfig, type ConfigJson, type FeedPreview, type FeedStatus, type TestResult } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { ListingTable } from "@/components/listing-table";
import { useSession } from "@/components/session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";

const MAX_FEED = 5 * 1024 * 1024;
const NUMERIC = new Set(["price", "year", "mileage", "volume", "power"]);
const FIELDS = ["id", "title", "price", "currency", "url", "image", "make", "model", "year", "city", "bodyType", "fuelType", "transmission", "mileage", "volume", "power"] as const;
const REQUIRED = new Set(["id", "title"]);
type Mapping = Record<string, string>;

/** Avtomatik təklifdən (path | {path,...} | şablon) sadə "sahə → sütun" cədvəli */
function toMapping(fields: Record<string, unknown> = {}): Mapping {
  const m: Mapping = {};
  for (const f of FIELDS) {
    const v = fields[f];
    if (typeof v === "string") m[f] = v;
    else if (v && typeof v === "object" && typeof (v as { path?: unknown }).path === "string") m[f] = (v as { path: string }).path;
    else if (v && typeof v === "object" && typeof (v as { template?: unknown }).template === "string") m[f] = (v as { template: string }).template;
  }
  return m;
}
function fromMapping(m: Mapping, attributes: unknown): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of FIELDS) {
    const v = m[f];
    if (!v) continue;
    out[f] = NUMERIC.has(f) ? { path: v, type: "number", loose: true } : v;
  }
  if (attributes && typeof attributes === "object" && Object.keys(attributes).length) out.attributes = attributes;
  return out;
}

/** Fayl və ya link ilə qoşulma: API lazım deyil. Faylı oxuyur, sütunları avtomatik uyğunlaşdırır, istifadəçi düzəldə bilir. */
export function FeedSetup({ businessName, domain, onIssuedKey }: { businessName: string; domain: string; onIssuedKey: (k: string) => void }) {
  const { t, locale, short } = useI18n();
  const { tenant, refresh } = useSession();
  const saved = tenant?.config?.source as { type?: string; feed?: Record<string, unknown>; response?: { fields?: Record<string, unknown>; defaults?: Record<string, unknown> } } | undefined;
  const isFeed = saved?.type === "feed";
  const [how, setHow] = useState<"file" | "url">(isFeed && typeof saved?.feed?.url === "string" ? "url" : "file");
  const [url, setUrl] = useState(isFeed && typeof saved?.feed?.url === "string" ? saved.feed.url : "");
  const [format, setFormat] = useState<"" | "csv" | "json" | "xml">("");
  const [itemsPath, setItemsPath] = useState("");
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const [prev, setPrev] = useState<FeedPreview | null>(null);
  const [map, setMap] = useState<Mapping>(() => (isFeed ? toMapping(saved?.response?.fields) : {}));
  const [refreshHours, setRefreshHours] = useState<number>(isFeed && typeof saved?.feed?.refreshHours === "number" ? (saved.feed.refreshHours as number) : 24);
  const [result, setResult] = useState<TestResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<"" | "read" | "test" | "save" | "refresh">("");
  const [status, setStatus] = useState<FeedStatus | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const refreshFileRef = useRef<HTMLInputElement>(null);

  const loadStatus = useCallback(() => { if (isFeed) getFeedStatus().then(setStatus).catch(() => {}); }, [isFeed]);
  useEffect(() => { loadStatus(); }, [loadStatus]);

  const labels: Record<string, string> = useMemo(() => ({
    id: t("ID (hər sətirdə fərqli)"), title: t("Ad / başlıq"), price: t("Qiymət"), currency: t("Valyuta"), url: t("Məhsulun linki"), image: t("Şəkil linki"),
    make: t("Marka / brend"), model: t("Model"), year: t("İl"), city: t("Şəhər"), bodyType: t("Kateqoriya"), fuelType: t("Yanacaq növü"),
    transmission: t("Sürətlər qutusu"), mileage: t("Yürüş"), volume: t("Həcm"), power: t("Güc"),
  }), [t]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (f.size > MAX_FEED) return setError(t("Fayl çox böyükdür (maksimum 5 MB)."));
    setText(await f.text()); setFileName(f.name); setPrev(null); setResult(null); setError("");
    if (!format) setFormat("");
  }

  async function read() {
    setError(""); setResult(null);
    if (how === "file" && !text) return setError(t("Əvvəlcə fayl seç."));
    if (how === "url" && !/^https:\/\//i.test(url.trim())) return setError(t("Link https ilə başlamalıdır."));
    setBusy("read");
    try {
      const p = await feedPreview({ ...(how === "file" ? { feedText: text } : { url: url.trim() }), ...(format && { format }), ...(itemsPath.trim() && { itemsPath: itemsPath.trim() }) });
      setPrev(p);
      // Əvvəlki xəritələmə hələ də eyni sütunlara uyğundursa saxlanır, yoxsa avtomatik təklif götürülür
      const cols = new Set(p.columns.map((c) => c.path));
      const keep = isFeed && Object.values(toMapping(saved?.response?.fields)).every((v) => v.includes("{") || cols.has(v));
      setMap(keep ? toMapping(saved?.response?.fields) : toMapping(p.suggestion.fields));
    } catch (e) { setError((e as Error).message); setPrev(null); }
    finally { setBusy(""); }
  }

  const missing = FIELDS.filter((f) => REQUIRED.has(f) && !map[f]);
  function build(): ConfigJson | null {
    if (!businessName.trim() || !domain.trim()) { setError(t("Biznes adını və domeni yaz.")); return null; }
    if (!prev && !isFeed) { setError(t("Əvvəlcə faylı oxu.")); return null; }
    if (missing.length) { setError(t("Bu sahələr boş ola bilməz: {n}", { n: missing.map((f) => labels[f]).join(", ") })); return null; }
    const attrs = prev && toMapping(prev.suggestion.fields) && (prev.suggestion.fields as { attributes?: unknown }).attributes;
    const savedAttrs = (saved?.response?.fields as { attributes?: unknown } | undefined)?.attributes;
    const mode = (tenant?.config?.profile as { mode?: string } | undefined)?.mode;
    return {
      businessName: businessName.trim(), domain: domain.trim(),
      profile: { mode: mode === "support" ? "both" : (mode as "listings" | "both" | undefined) ?? "listings", language: locale },
      source: {
        type: "feed",
        feed: { ...(how === "url" && url.trim() && { url: url.trim() }), ...(prev?.format && { format: prev.format }), ...(prev?.itemsPath && { itemsPath: prev.itemsPath }), ...(prev?.delimiter && { delimiter: prev.delimiter }), ...(how === "url" && { refreshHours }) },
        response: { fields: fromMapping(map, attrs ?? savedAttrs), ...((prev?.suggestion.defaults && Object.keys(prev.suggestion.defaults).length ? prev.suggestion.defaults : saved?.response?.defaults) && { defaults: Object.keys(prev?.suggestion.defaults ?? {}).length ? prev!.suggestion.defaults : saved?.response?.defaults }) },
      },
      ...(how === "file" && text && { feedText: text }),
    };
  }

  async function run(kind: "test" | "save") {
    setError(""); setResult(null);
    const config = build();
    if (!config) return;
    setBusy(kind);
    try {
      if (kind === "test") { setResult(await testConfig(config)); toast.success(t("Yoxlama uğurlu oldu.")); }
      else if (tenant) {
        const r = await updateConfig(config);
        setResult({ ok: true, sampleCount: r.sampleListings.length, sampleListings: r.sampleListings, supportedFilters: [] });
        toast.success(t("Konfiqurasiya yeniləndi. API açarın dəyişmədi."));
        await refresh(); loadStatus();
      } else {
        const r = await activate(config);
        setResult({ ok: true, sampleCount: r.sampleListings.length, sampleListings: r.sampleListings, supportedFilters: [] });
        onIssuedKey(r.apiKey);
        toast.success(t("Aktivləşdi."));
        await refresh();
      }
    } catch (e) { setError((e as Error).message + (e instanceof ApiError && e.debug?.dropped?.length ? ` (${[...new Set(e.debug.dropped)].slice(0, 3).join(", ")})` : "")); }
    finally { setBusy(""); }
  }

  async function refreshNow(newText?: string) {
    setBusy("refresh"); setError("");
    try { const r = await feedRefresh(newText); toast.success(t("Yeniləndi: {n} sətir.", { n: r.count })); loadStatus(); }
    catch (e) { setError((e as Error).message); loadStatus(); }
    finally { setBusy(""); }
  }
  async function onRefreshFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (f.size > MAX_FEED) return setError(t("Fayl çox böyükdür (maksimum 5 MB)."));
    await refreshNow(await f.text());
  }

  const cols = prev?.columns ?? [];
  const options = (cur: string) => (cur && !cols.some((c) => c.path === cur) ? [{ path: cur, samples: [] as string[] }, ...cols] : cols);
  const REFRESH = [[0, t("Yalnız əl ilə")], [6, t("6 saatdan bir")], [24, t("Gündə bir dəfə")], [168, t("Həftədə bir dəfə")]] as const;

  return (
    <div className="flex flex-col gap-6">
      {isFeed && status?.feed && (
        <section className="flex flex-col gap-3 rounded-lg border border-border bg-card p-5">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge className="bg-primary/15 text-primary">{status.feed.format.toUpperCase()}</Badge>
            <span><strong>{status.feed.count}</strong> {t("sətir")}</span>
            <span className="text-muted-foreground">· {t("Son yenilənmə")}: {short(status.feed.updatedAt)}</span>
            {status.feed.url && <span className="min-w-0 max-w-full truncate text-muted-foreground">· {status.feed.url}</span>}
          </div>
          {status.feed.lastError && <p role="alert" className="text-sm text-destructive">{t("Son yeniləmə alınmadı")}: {status.feed.lastError}. {t("Köhnə məlumat istifadə olunur.")}</p>}
          <div className="flex flex-wrap gap-2">
            {status.feed.url && <Button variant="outline" size="sm" disabled={!!busy} onClick={() => refreshNow()}><RefreshCw size={14} aria-hidden />{busy === "refresh" ? t("Yenilənir…") : t("İndi yenilə")}</Button>}
            <Button variant="outline" size="sm" disabled={!!busy} onClick={() => refreshFileRef.current?.click()}><FileUp size={14} aria-hidden />{t("Yeni faylla yenilə")}</Button>
            <input ref={refreshFileRef} type="file" accept=".csv,.tsv,.txt,.json,.xml" className="hidden" onChange={onRefreshFile} aria-label={t("Yeni faylla yenilə")} />
          </div>
        </section>
      )}

      <section className="flex flex-col gap-4 rounded-lg border border-border bg-card p-5">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold">{t("1. Faylı və ya linki göstər")}</h2>
          <p className="text-sm text-muted-foreground">{t("Excel-dən CSV kimi saxla və ya saytının məhsul/elan XML, JSON feed linkini ver (Google Merchant feed də olar). API yazmağa ehtiyac yoxdur.")}</p>
        </div>
        <Segmented value={how} onChange={(v) => { setHow(v); setPrev(null); setResult(null); setError(""); }} label={t("Mənbə növü")}
          options={[{ value: "file", label: t("Fayl yüklə") }, { value: "url", label: t("Link ilə") }]} />
        {how === "file" ? (
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}><FileUp size={16} aria-hidden />{t("Fayl seç (CSV, JSON, XML)")}</Button>
            <input ref={fileRef} type="file" accept=".csv,.tsv,.txt,.json,.xml,text/csv,application/json,application/xml,text/xml" className="hidden" onChange={onFile} aria-label={t("Fayl seç (CSV, JSON, XML)")} />
            <span className="text-sm text-muted-foreground">{fileName ? `${fileName} · ${Math.max(1, Math.round(text.length / 1024))} KB` : t("Maksimum 5 MB, 5000 sətir.")}</span>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <Label htmlFor="feed-url">{t("Feed linki (https)")}</Label>
            <div className="flex items-center gap-2"><Link2 size={16} className="shrink-0 text-muted-foreground" aria-hidden /><Input id="feed-url" inputMode="url" placeholder="https://saytin.az/feed.xml" value={url} onChange={(e) => { setUrl(e.target.value); setPrev(null); }} /></div>
            <p className="text-xs text-muted-foreground">{t("Link hamıya açıq olmalıdır (şifrə tələb etməməlidir). Google Sheets üçün: Fayl → Paylaş → Veb-də dərc et → CSV.")}</p>
          </div>
        )}
        <details className="text-sm">
          <summary className="cursor-pointer text-primary">{t("Qabaqcıl ayarlar")}</summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <Label htmlFor="feed-format">{t("Format")}</Label>
              <select id="feed-format" value={format} onChange={(e) => { setFormat(e.target.value as typeof format); setPrev(null); }} className="h-10 rounded-md border border-border bg-card px-3 text-sm">
                <option value="">{t("Avtomatik aşkarla")}</option><option value="csv">CSV</option><option value="json">JSON</option><option value="xml">XML</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="feed-path">{t("Siyahının yeri (JSON yolu və ya XML elementi)")}</Label>
              <Input id="feed-path" placeholder="data.products" value={itemsPath} onChange={(e) => { setItemsPath(e.target.value); setPrev(null); }} />
              <p className="text-xs text-muted-foreground">{t("Boş qoysan avtomatik tapılır.")}</p>
            </div>
          </div>
        </details>
        <div><Button onClick={read} disabled={!!busy}>{busy === "read" ? t("Oxunur…") : t("Faylı oxu")}</Button></div>
      </section>

      {error && <div role="alert" className="rounded-lg border border-destructive/40 bg-card p-4 text-sm text-destructive">{error}</div>}

      {prev && (
        <section className="flex flex-col gap-4 rounded-lg border border-border bg-card p-5">
          <div className="flex flex-col gap-1">
            <h2 className="text-base font-semibold">{t("2. Sütunları yoxla")}</h2>
            <p className="text-sm text-muted-foreground">
              <strong>{prev.count}</strong> {t("sətir tapıldı")} · {prev.format.toUpperCase()}. {t("Sütunlar avtomatik uyğunlaşdırıldı, səhv olanı dəyiş.")}
              {prev.truncated && <span className="text-amber"> {t("Yalnız ilk 5000 sətir götürüldü.")}</span>}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {FIELDS.map((f) => {
              const cur = map[f] ?? "";
              const ex = options(cur).find((c) => c.path === cur)?.samples?.[0];
              return (
                <div key={f} className="flex flex-col gap-1">
                  <Label htmlFor={`fm-${f}`}>{labels[f]}{REQUIRED.has(f) && " *"}</Label>
                  <select id={`fm-${f}`} value={cur} onChange={(e) => { setMap((m) => ({ ...m, [f]: e.target.value })); setResult(null); }}
                    className="h-10 rounded-md border border-border bg-card px-3 text-sm">
                    <option value="">{t("— yoxdur —")}</option>
                    {options(cur).map((c) => <option key={c.path} value={c.path}>{c.path}</option>)}
                  </select>
                  {ex && <p className="truncate text-xs text-muted-foreground">{t("Məsələn")}: {ex}</p>}
                </div>
              );
            })}
          </div>
          {prev.sample.length > 0 && (<><p className="text-sm font-medium">{t("Avtomatik təklifə görə ilk elanlar")}</p><ListingTable listings={prev.sample} /></>)}
          {how === "url" && (
            <div className="flex flex-col gap-1">
              <Label htmlFor="feed-refresh">{t("Linkdən avtomatik yenilənmə")}</Label>
              <select id="feed-refresh" value={refreshHours} onChange={(e) => setRefreshHours(Number(e.target.value))} className="h-10 max-w-xs rounded-md border border-border bg-card px-3 text-sm">
                {REFRESH.map(([h, label]) => <option key={h} value={h}>{label}</option>)}
              </select>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" onClick={() => run("test")} disabled={!!busy}>{busy === "test" ? t("Yoxlanır…") : t("Yoxla")}</Button>
            <Button onClick={() => run("save")} disabled={!!busy}>{busy === "save" ? t("Gözlə…") : tenant ? t("Yenilə") : t("Aktivləşdir")}</Button>
          </div>
        </section>
      )}

      {result && (
        <div className="flex flex-col gap-3">
          <p className="text-sm"><strong>{result.sampleCount}</strong> {t("qeyd oxundu")}.</p>
          {result.supportedFilters.length > 0 && <div className="flex flex-wrap items-center gap-2 text-sm">{t("Dəstəklənən süzgəclər:")} {result.supportedFilters.map((f) => <Badge key={f}>{f}</Badge>)}</div>}
          {result.sampleListings.length > 0 && <ListingTable listings={result.sampleListings} />}
        </div>
      )}
    </div>
  );
}
