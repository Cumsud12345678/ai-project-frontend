"use client";
// Vizual API qoşulması: ünvan → sahələr → filtrlər → yoxla və saxla. JSON yazmaq lazım deyil.
// Proqramçılar üçün son addımda hazır JSON görünür, "Elan mənbəyi" səhifəsində əl ilə də dəyişmək olur.
import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, ChevronDown, CircleCheck, ClipboardPaste, Code2, FlaskConical, ImageOff, Loader2, Plus, Trash2, TriangleAlert, Zap } from "lucide-react";
import { toast } from "sonner";
import { activate, fetchSample, testConfig, updateConfig, type ConfigJson, type TestResult } from "@/lib/api";
import { analyzeSample } from "@/lib/sample-analyzer";
import {
  CORE_FIELDS, REQUIRED_FIELDS, buildSource, fromAnalysis, fromConfig, itemsOf, leafPaths, lockedField, prefilled, resolveField, row, testKey, urlParams,
  type AuthType, type BuilderState, type FilterKind, type FilterRow,
} from "@/lib/api-builder";
import { hasSite } from "@/lib/site";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { ListingTable } from "@/components/listing-table";
import { useSession } from "@/components/session";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";

const selectCls = "h-10 w-full rounded-md border border-border bg-card px-3 text-sm";
const EMPTY: BuilderState = { url: "", method: "GET", authType: "none", authName: "X-Api-Key", itemsPath: ".", fields: {}, currency: "AZN", attrs: [], filters: [], limitParam: "" };
type Step = 1 | 2 | 3 | 4;
type FTest = { state: "run" | "ok" | "warn" | "err"; text: string; request?: string | null };

/**
 * goals: sehirbazdan gəlirsə (çatın rejimi buna görə qoyulur).
 * Hesab hələ yoxdursa (Elan mənbəyi səhifəsində ilk qoşulma) businessName/domain verilir, saxlananda hesab yaradılır və açar onIssuedKey ilə qaytarılır.
 */
export function ApiBuilder({ onSaved, goals, businessName, domain, onIssuedKey }: {
  onSaved?: () => void; goals?: string[]; businessName?: string; domain?: string; onIssuedKey?: (key: string) => void;
}) {
  const { t, locale } = useI18n();
  const { tenant, refresh } = useSession();
  const [s, setS] = useState<BuilderState>(() => fromConfig(tenant?.config, EMPTY));
  const [step, setStep] = useState<Step>(1);
  const editing = useRef(prefilled(s)).current; // saxlanmış qoşulma: cavab gətirmədən də addımlara keçmək olur
  const [secret, setSecret] = useState("");
  const [paste, setPaste] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [raw, setRaw] = useState<unknown>(null);
  const [notes, setNotes] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [result, setResult] = useState<TestResult | null>(null);
  const [tests, setTests] = useState<Record<string, FTest>>({});
  const [values, setValues] = useState<Record<string, string>>({});
  const baseline = useRef<{ key: string; ids: string } | null>(null); // filtrsiz nəticə: hər sınaqda təkrar sorğu olmasın
  const set = (p: Partial<BuilderState>) => setS((x) => ({ ...x, ...p }));
  const setRow = (key: string, p: Partial<FilterRow>) => setS((x) => ({ ...x, filters: x.filters.map((f) => (f.key === key ? { ...f, ...p } : f)) }));

  const items = useMemo(() => itemsOf(raw, s.itemsPath), [raw, s.itemsPath]);
  const paths = useMemo(() => leafPaths(items[0]), [items]);
  const params = useMemo(() => urlParams(s.url), [s.url]);
  const needsName = s.authType === "header" || s.authType === "query";
  const labels: Record<string, string> = {
    title: t("Başlıq"), price: t("Qiymət"), id: "ID", image: t("Şəkil"), url: t("Elanın linki"), currency: t("Valyuta"),
    make: t("Marka"), model: t("Model"), year: t("Buraxılış ili"), city: t("Şəhər"), mileage: t("Yürüş"),
  };

  // ---------------- 1. Ünvan: cavabı gətir
  function analyze(json: unknown) {
    const r = analyzeSample(JSON.stringify(json), t);
    if ("error" in r) { setErr(r.error); return; }
    setRaw(json);
    setNotes(r.analysis.notes.filter((n) => !/response\.fields\.(id|title|price)|itemsPath/.test(n)));
    setS((x) => fromAnalysis(x, r.analysis, t));
    setStep(2);
  }
  async function load(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (paste) {
      try { analyze(JSON.parse(pasteText)); } catch (er) { setErr(t("Bu JSON deyil: {msg}. API cavabını olduğu kimi, tam kopyala.", { msg: (er as Error).message })); }
      return;
    }
    if (!/^https:\/\//i.test(s.url.trim())) return setErr(t("API ünvanı https:// ilə olmalıdır."));
    if (s.authType !== "none" && !secret.trim()) return setErr(t("API açarını yaz: yalnız sorğu üçün işlənir, şifrələnib saxlanır."));
    if (needsName && !s.authName.trim()) return setErr(t("Açarın adını yaz (məs. X-Api-Key)."));
    setBusy(true);
    try {
      const r = await fetchSample({ url: s.url.trim(), method: s.method, ...(s.authType !== "none" && { auth: { type: s.authType, ...(needsName && { name: s.authName.trim() }) }, apiSecret: secret.trim() }) });
      analyze(r.json);
    } catch (er) { setErr((er as Error).message); }
    finally { setBusy(false); }
  }

  // ---------------- konfiqurasiya
  function config(): ConfigJson | null {
    const missing = REQUIRED_FIELDS.find((f) => !s.fields[f] && !lockedField(s, f));
    if (missing) { setErr(t("“{f}” sahəsini seç: elan kartı üçün lazımdır.", { f: labels[missing] ?? missing })); setStep(2); return null; }
    const b = buildSource(s, t);
    if ("error" in b) { setErr(b.error); return null; }
    const biz = tenant?.businessName ?? businessName?.trim() ?? "";
    const dom = tenant?.domain ?? domain?.trim() ?? "";
    if (!biz || !dom) { setErr(t("Əvvəl biznes adını və sayt domenini yaz.")); return null; }
    // Rejim: sehirbazda məqsədə görə; Elan mənbəyi səhifəsində isə bilik bazası işləyirdisə ("support"/"both") o itməsin
    const cur = tenant?.config.profile?.mode;
    const both = goals ? goals.includes("answer") : cur === "support" || cur === "both";
    return {
      businessName: biz, domain: dom,
      profile: { ...(tenant?.config.profile ?? { language: locale }), mode: both ? "both" : "listings" },
      source: b.source, ...(s.authType !== "none" && secret.trim() && { apiSecret: secret.trim() }),
    };
  }
  async function runTest() {
    setErr(""); setResult(null);
    const c = config();
    if (!c) return;
    setStep(4); setBusy(true);
    try { setResult(await testConfig(c)); } catch (er) { setErr((er as Error).message); }
    finally { setBusy(false); }
  }
  async function testFilter(f: FilterRow) {
    const v = (values[f.key] ?? "").trim();
    if (!v) return;
    const c = config();
    if (!c) return;
    setTests((x) => ({ ...x, [f.key]: { state: "run", text: "" } }));
    try {
      const value = f.kind === "number" || f.kind === "range" ? Number(v) : f.kind === "boolean" ? /^(1|true|bəli|beli|yes|da|evet)$/i.test(v) : v;
      const ids = (r: TestResult) => r.sampleListings.map((l) => l.id).join("|");
      const ck = JSON.stringify(c.source);
      if (baseline.current?.key !== ck) baseline.current = { key: ck, ids: ids(await testConfig(c)) };
      const hit = await testConfig(c, { [testKey(f)]: value });
      const st: FTest = !hit.sampleCount
        ? { state: "warn", text: t("Heç nə tapılmadı. Dəyəri yoxla, ya da API bu parametri başqa adla gözləyir."), request: hit.debug?.request }
        : ids(hit) === baseline.current.ids
          ? { state: "warn", text: t("Nəticə dəyişmədi: API parametri nəzərə almır ola bilər. Parametrin adını yoxla."), request: hit.debug?.request }
          : { state: "ok", text: t("İşləyir: nəticə dəyişdi ({n} elan).", { n: hit.sampleCount }), request: hit.debug?.request };
      setTests((x) => ({ ...x, [f.key]: st }));
    } catch (er) { setTests((x) => ({ ...x, [f.key]: { state: "err", text: (er as Error).message } })); }
  }
  async function save() {
    const c = config();
    if (!c) return;
    setBusy(true); setErr("");
    try {
      const r = tenant ? await updateConfig(c) : await activate(c);
      if ("apiKey" in r && r.apiKey) onIssuedKey?.(r.apiKey);
      await refresh();
      toast.success(t("Elanların qoşuldu: köməkçi artıq axtarış edə bilər."));
      if (r.sampleListings?.length) setResult((x) => (x ? { ...x, sampleListings: r.sampleListings } : x));
      onSaved?.();
    } catch (er) { setErr((er as Error).message); }
    finally { setBusy(false); }
  }

  const stepsUi: { n: Step; label: string }[] = [{ n: 1, label: t("Ünvan") }, { n: 2, label: t("Sahələr") }, { n: 3, label: t("Filtrlər") }, { n: 4, label: t("Yoxla") }];
  const first = items[0];
  const preview = first ? {
    title: resolveField(first, s.fields.title ?? ""), price: resolveField(first, s.fields.price ?? ""),
    currency: s.fields.currency ? resolveField(first, s.fields.currency) : s.currency, image: resolveField(first, s.fields.image ?? ""), url: resolveField(first, s.fields.url ?? ""),
  } : null;
  const opt = (p: { path: string; example: string }) => <option key={p.path} value={p.path}>{p.path}{p.example ? ` · ${p.example}` : ""}</option>;

  return (
    <div className="flex flex-col gap-5">
      {/* mini addımlar */}
      <ol className="grid grid-cols-4 gap-2" aria-label={t("API qoşulması")}>
        {stepsUi.map((x) => {
          const reach = x.n === 1 || ((raw !== null || editing) && x.n <= 3) || (x.n === 4 && (result !== null || step === 4 || editing));
          return (
            <li key={x.n}>
              <button type="button" disabled={!reach} onClick={() => setStep(x.n)} aria-current={step === x.n ? "step" : undefined}
                className={cn("flex w-full cursor-pointer flex-col gap-1.5 text-left disabled:cursor-not-allowed", !reach && "opacity-50")}>
                <span className={cn("h-1 rounded-full", step >= x.n ? "bg-foreground" : "bg-muted")} />
                <span className={cn("text-xs", step === x.n ? "font-semibold" : "text-muted-foreground")}>{x.n}. {x.label}</span>
              </button>
            </li>
          );
        })}
      </ol>

      {editing && raw === null && step < 4 && (
        <p className="rounded-xl bg-muted/60 px-3 py-2.5 text-sm text-muted-foreground">
          {t("Hazırda qoşulub. Dəyişmək istədiyin addıma keç: filtr əlavə etmək üçün “Filtrlər”. Sahələri siyahıdan seçmək üçün əvvəl cavabı gətir.")}
          {s.authType !== "none" && ` ${t("Yoxlamaq üçün API açarını yenidən yaz (saxlanmış açar panelə qaytarılmır).")}`}
        </p>
      )}

      {step === 1 && (
        <form onSubmit={load} className="flex flex-col gap-4">
          {!paste ? (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ab-url">{t("Elanları qaytaran API ünvanı")}</Label>
                <div className="flex gap-2">
                  <select aria-label={t("Metod")} value={s.method} onChange={(e) => set({ method: e.target.value as "GET" | "POST" })} className="h-11 w-24 shrink-0 rounded-md border border-border bg-card px-2 font-mono text-sm">
                    <option>GET</option><option>POST</option>
                  </select>
                  <Input id="ab-url" inputMode="url" className="h-11 font-mono text-sm" placeholder="https://api.saytim.az/api/listings?limit=10" value={s.url} onChange={(e) => set({ url: e.target.value })} />
                </div>
                <p className="text-xs text-muted-foreground">{t("Brauzerdə açanda elan siyahısı (JSON) görünən ünvan. Saytındakı axtarış səhifəsinin istifadə etdiyi API adətən budur.")}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="ab-auth">{t("Açar lazımdır?")}</Label>
                  <select id="ab-auth" className={selectCls} value={s.authType} onChange={(e) => set({ authType: e.target.value as AuthType, authName: e.target.value === "query" ? "api_key" : e.target.value === "header" ? "X-Api-Key" : s.authName })}>
                    <option value="none">{t("Yox, açıq API")}</option>
                    <option value="bearer">{t("Bearer token")}</option>
                    <option value="header">{t("Başlıqda açar")}</option>
                    <option value="query">{t("Linkdə parametr")}</option>
                  </select>
                </div>
                {needsName && (
                  <div className="flex flex-col gap-1.5"><Label htmlFor="ab-an">{s.authType === "header" ? t("Başlığın adı") : t("Parametrin adı")}</Label><Input id="ab-an" className="font-mono" value={s.authName} onChange={(e) => set({ authName: e.target.value })} /></div>
                )}
                {s.authType !== "none" && (
                  <div className="flex flex-col gap-1.5"><Label htmlFor="ab-sec">{t("API açarı")}</Label><Input id="ab-sec" type="password" autoComplete="off" value={secret} onChange={(e) => setSecret(e.target.value)} /></div>
                )}
              </div>
              {s.authType !== "none" && <p className="-mt-2 text-xs text-muted-foreground">{t("Açar şifrələnib saxlanır və paneldə bir daha göstərilmir.")}</p>}
            </>
          ) : (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ab-paste">{t("API cavabı (JSON)")}</Label>
              <Textarea id="ab-paste" rows={9} spellCheck={false} className="font-mono text-xs" placeholder='{ "data": [ { "id": 1, "title": "…", "price": 1500 } ] }' value={pasteText} onChange={(e) => setPasteText(e.target.value)} />
              <p className="text-xs text-muted-foreground">{t("API yalnız daxili şəbəkədədirsə və ya hələ hazır deyilsə: cavabı Postman və ya brauzerdən kopyala. Sahələri tanıyandan sonra ünvanı yenə yazmalısan.")}</p>
              <div className="flex flex-col gap-1.5 pt-2">
                <Label htmlFor="ab-url2">{t("API ünvanı")}</Label>
                <Input id="ab-url2" inputMode="url" className="font-mono text-sm" placeholder="https://api.saytim.az/api/listings" value={s.url} onChange={(e) => set({ url: e.target.value })} />
              </div>
            </div>
          )}
          {err && <p role="alert" className="text-sm text-destructive">{err}</p>}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button type="button" onClick={() => { setPaste(!paste); setErr(""); }} className="inline-flex cursor-pointer items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
              <ClipboardPaste size={15} aria-hidden />{paste ? t("Ünvandan gətir") : t("Cavabı özüm yapışdırım")}
            </button>
            <Button disabled={busy || (paste ? !pasteText.trim() : !s.url.trim())}>{busy ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Zap size={16} aria-hidden />}{paste ? t("Sahələri tanı") : t("Cavabı gətir")}</Button>
          </div>
        </form>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-5">
          <p role="status" className="flex flex-wrap items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
            <CircleCheck size={16} aria-hidden />{raw !== null ? t("{n} elan tapıldı. Sahələri avtomatik tanıdıq: yoxla, səhv varsa dəyiş.", { n: items.length }) : t("Saxlanmış sahələr. Siyahıdan seçmək üçün 1-ci addımda cavabı gətir.")}
          </p>
          {preview && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium text-muted-foreground">{t("Müştəri belə görəcək")}</p>
              <div className="flex max-w-md items-center gap-3 overflow-hidden rounded-xl border border-border bg-card p-2.5">
                <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-lg bg-muted">
                  {/^https?:\/\//.test(preview.image) ? <img src={preview.image} alt="" className="size-full object-cover" /> : <ImageOff size={20} className="text-muted-foreground" aria-label={t("Şəkil yoxdur")} />}
                </div>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <p className="truncate text-sm font-semibold">{preview.title || <span className="text-destructive">{t("Başlıq boşdur")}</span>}</p>
                  <p className="text-sm tabular-nums">{preview.price ? `${preview.price} ${preview.currency}` : <span className="text-destructive">{t("Qiymət boşdur")}</span>}</p>
                  {preview.url && <p className="truncate text-xs text-muted-foreground">{preview.url}</p>}
                </div>
              </div>
              {preview.image && !/^https?:\/\//.test(preview.image) && <p className="text-xs text-amber-700">{t("Şəkil yolu tam ünvan deyil. “Şablon yaz” seç və əvvəlinə CDN ünvanını əlavə et.")}</p>}
            </div>
          )}
          <div>
            <div className="grid gap-3 sm:grid-cols-2">
              {CORE_FIELDS.map((k) => {
                const v = s.fields[k] ?? "";
                const tpl = v.includes("{") || (v && !paths.some((p) => p.path === v));
                const req = REQUIRED_FIELDS.includes(k);
                return (
                  <div key={k} className="flex flex-col gap-1.5">
                    <Label htmlFor={`ab-f-${k}`}>{labels[k]}{req && <span className="text-destructive"> *</span>}</Label>
                    <select id={`ab-f-${k}`} className={cn(selectCls, req && !v && !lockedField(s, k) && "border-destructive")} value={tpl ? "__tpl" : v}
                      onChange={(e) => set({ fields: { ...s.fields, [k]: e.target.value === "__tpl" ? (k === "url" && tenant && hasSite(tenant.domain) ? `https://${tenant.domain}/elan/{${s.fields.id || "id"}}` : `{${v || s.fields.id || "id"}}`) : e.target.value } })}>
                      <option value="">{lockedField(s, k) ? t("— JSON-dakı xüsusi ayar saxlanır —") : k === "currency" ? t("— yoxdur, sabit valyuta —") : t("— yoxdur —")}</option>
                      {paths.map(opt)}
                      <option value="__tpl">{t("✎ Şablon yaz…")}</option>
                    </select>
                    {tpl && <Input aria-label={t("Şablon")} className="font-mono text-xs" value={v} onChange={(e) => set({ fields: { ...s.fields, [k]: e.target.value } })} />}
                    {k === "currency" && !v && <Input aria-label={t("Sabit valyuta")} className="font-mono text-xs" maxLength={3} value={s.currency} onChange={(e) => set({ currency: e.target.value })} />}
                    {tpl && k === "url" && <p className="text-xs text-muted-foreground">{t("Fiqurlu mötərizədə cavabdakı sahə: {example}", { example: "https://saytim.az/elan/{id}" })}</p>}
                  </div>
                );
              })}
            </div>
          </div>
          {paths.length > 0 && (
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-sm font-medium">{t("Elanda əlavə məlumat")} <span className="font-normal text-muted-foreground">{t("(köməkçi bunları görür və müqayisə edir)")}</span></legend>
              <div className="flex flex-wrap gap-2">
                {paths.filter((p) => !Object.values(s.fields).includes(p.path)).slice(0, 24).map((p) => {
                  const on = s.attrs.some((a) => a.path === p.path);
                  const name = p.path.split(/[.[\]]/).filter(Boolean).filter((x) => !/^\d+$/.test(x)).at(-1) ?? p.path;
                  return (
                    <button key={p.path} type="button" aria-pressed={on} title={`${p.path}: ${p.example}`}
                      onClick={() => set({ attrs: on ? s.attrs.filter((a) => a.path !== p.path) : [...s.attrs, { label: name.charAt(0).toUpperCase() + name.slice(1), path: p.path }] })}
                      className={cn("inline-flex cursor-pointer items-center gap-1 rounded-full border px-3 py-1 text-xs", on ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground/40")}>
                      {on && <Check size={12} strokeWidth={3} aria-hidden />}{p.path}
                    </button>
                  );
                })}
              </div>
              {s.attrs.length > 0 && (
                <div className="grid gap-2 sm:grid-cols-2">
                  {s.attrs.map((a, i) => (
                    <div key={a.path} className="flex items-center gap-2">
                      <Input aria-label={t("Elanda görünən ad")} value={a.label} maxLength={40} onChange={(e) => set({ attrs: s.attrs.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} />
                      <code className="w-32 shrink-0 truncate text-xs text-muted-foreground" title={a.path}>{a.path}</code>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">{t("5–8 sahə kifayətdir: hər sahə köməkçinin sorğusunu bir az bahalaşdırır.")}</p>
            </fieldset>
          )}
          {notes.map((n) => <p key={n} className="flex gap-2 text-sm text-amber-700"><TriangleAlert size={15} className="mt-0.5 shrink-0" aria-hidden />{n}</p>)}
          {err && <p role="alert" className="text-sm text-destructive">{err}</p>}
          <div className="flex justify-between gap-2">
            <Button variant="ghost" onClick={() => setStep(1)}><ArrowLeft size={16} aria-hidden />{t("Geri")}</Button>
            <Button onClick={() => { const m = REQUIRED_FIELDS.find((f) => !s.fields[f] && !lockedField(s, f)); if (m) return setErr(t("“{f}” sahəsini seç: elan kartı üçün lazımdır.", { f: labels[m] ?? m })); setErr(""); setStep(3); }}>{t("Davam et")}<ArrowRight size={16} aria-hidden /></Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">{t("Müştəri “Bakıda 5000 AZN-ə qədər Honda” yazanda köməkçi bunu filtrlərə çevirib API-nə parametr kimi göndərir. Lazım olanları aç və API-nin parametr adını yaz.")}</p>
          {params.length > 0 && (
            <p className="text-xs text-muted-foreground">{t("Ünvandakı parametrlər:")} {params.map((p) => <code key={p} className="mx-0.5 rounded bg-muted px-1.5 py-0.5 font-mono">{p}</code>)}</p>
          )}
          <datalist id="ab-params">{params.map((p) => <option key={p} value={p} />)}</datalist>
          <ul className="flex flex-col gap-2">
            {s.filters.map((f) => <FilterItem key={f.key} f={f} test={tests[f.key]} value={values[f.key] ?? ""} onValue={(v) => setValues((x) => ({ ...x, [f.key]: v }))}
              onChange={(p) => setRow(f.key, p)} onRemove={f.custom ? () => set({ filters: s.filters.filter((x) => x.key !== f.key) }) : undefined} onTest={() => void testFilter(f)} />)}
          </ul>
          <AddFilter existing={s.filters.map((f) => f.key)} onAdd={(r) => set({ filters: [...s.filters, r] })} />
          <details className="rounded-xl border border-border">
            <summary className="cursor-pointer px-4 py-3 text-sm font-medium">{t("Əlavə ayarlar")}</summary>
            <div className="grid gap-3 border-t border-border p-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5"><Label htmlFor="ab-lim">{t("Səhifədə elan sayı parametri")}</Label><Input id="ab-lim" list="ab-params" className="font-mono" placeholder="limit, per_page" value={s.limitParam} onChange={(e) => set({ limitParam: e.target.value })} /><p className="text-xs text-muted-foreground">{t("İstəyə bağlı. API bir dəfəyə çox elan qaytarırsa, sorğu sürətlənir.")}</p></div>
              <div className="flex flex-col gap-1.5"><Label htmlFor="ab-ip">{t("Elan siyahısı cavabın harasındadır")}</Label><Input id="ab-ip" className="font-mono" value={s.itemsPath} onChange={(e) => set({ itemsPath: e.target.value })} /><p className="text-xs text-muted-foreground">{t("Avtomatik tapılıb. Nöqtə (.) cavabın özü siyahıdır deməkdir.")}</p></div>
            </div>
          </details>
          {err && <p role="alert" className="text-sm text-destructive">{err}</p>}
          <div className="flex justify-between gap-2">
            <Button variant="ghost" onClick={() => setStep(2)}><ArrowLeft size={16} aria-hidden />{t("Geri")}</Button>
            <Button onClick={() => void runTest()}>{t("Yoxla")}<ArrowRight size={16} aria-hidden /></Button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="flex flex-col gap-4">
          {busy && !result && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 size={16} className="animate-spin" aria-hidden />{t("API-nə real sorğu göndəririk…")}</p>}
          {result && (
            <>
              <p role="status" className={cn("flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm", result.sampleCount ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800")}>
                {result.sampleCount ? <CircleCheck size={16} aria-hidden /> : <TriangleAlert size={16} aria-hidden />}
                {result.sampleCount ? t("Hər şey işləyir: köməkçi elanlarını oxudu.") : t("Sorğu getdi, amma elan oxunmadı. Sahələri yoxla.")}
              </p>
              {result.sampleListings.length > 0 && <ListingTable listings={result.sampleListings} />}
              {(result.debug?.dropped?.length ?? 0) > 0 && <p className="text-xs text-amber-700">{t("Bəzi elanlar atıldı:")} {result.debug!.dropped!.slice(0, 3).join("; ")}</p>}
              {result.filters && result.filters.length > 0 && (
                <p className="text-sm text-muted-foreground">{t("Köməkçinin istifadə edəcəyi filtrlər:")} {result.filters.map((f) => <span key={f.name} className="mx-0.5 inline-block rounded-full bg-muted px-2 py-0.5 text-xs text-foreground">{f.description}</span>)}</p>
              )}
            </>
          )}
          {err && <p role="alert" className="text-sm text-destructive">{err}</p>}
          <details className="rounded-xl border border-border">
            <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-medium"><Code2 size={15} aria-hidden />{t("Proqramçı üçün: hazır JSON")}</summary>
            <pre className="max-h-72 overflow-auto border-t border-border bg-muted/40 p-4 font-mono text-xs">{(() => { const b = buildSource(s, t); return "error" in b ? b.error : JSON.stringify({ source: b.source }, null, 2); })()}</pre>
            <p className="border-t border-border px-4 py-3 text-xs text-muted-foreground">{t("Daha incə ayar (qiymət çevirmə, çeşidləmə, GraphQL) üçün")} <Link href="/connection" className="font-medium text-foreground underline underline-offset-2">{t("Elan mənbəyi")}</Link> {t("səhifəsində JSON redaktoru var.")}</p>
          </details>
          <div className="flex flex-wrap justify-between gap-2">
            <Button variant="ghost" onClick={() => setStep(3)}><ArrowLeft size={16} aria-hidden />{t("Geri")}</Button>
            <div className="flex gap-2">
              <Button variant="outline" disabled={busy} onClick={() => void runTest()}>{t("Yenidən yoxla")}</Button>
              <Button disabled={busy || !result?.sampleCount} onClick={() => void save()}>{busy && result ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Check size={16} aria-hidden />}{t("Saxla və qoş")}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- filtr sətri
function FilterItem({ f, test, value, onValue, onChange, onRemove, onTest }: {
  f: FilterRow; test?: FTest; value: string; onValue: (v: string) => void; onChange: (p: Partial<FilterRow>) => void; onRemove?: () => void; onTest: () => void;
}) {
  const { t } = useI18n();
  const kinds: Record<FilterKind, string> = { text: t("Açar söz"), string: t("Dəyər"), number: t("Rəqəm"), range: t("Aralıq"), boolean: t("Bəli / xeyr") };
  return (
    <li className={cn("rounded-xl border transition-colors", f.on ? "border-foreground/30 bg-card" : "border-border")}>
      <div className="flex items-center gap-3 p-3">
        <input type="checkbox" checked={f.on} onChange={(e) => onChange({ on: e.target.checked })} aria-label={f.label} className="size-4 shrink-0 cursor-pointer accent-foreground" />
        <button type="button" onClick={() => onChange({ on: !f.on })} className="min-w-0 flex-1 cursor-pointer text-left">
          <span className="text-sm font-medium">{f.label}</span>
          <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{kinds[f.kind]}</span>
        </button>
        {test && test.state !== "run" && (test.state === "ok" ? <CircleCheck size={16} className="text-emerald-600" aria-label={t("İşləyir")} /> : <TriangleAlert size={16} className="text-amber-600" aria-label={t("Yoxla")} />)}
        {onRemove && <button type="button" onClick={onRemove} aria-label={t("Sil")} className="cursor-pointer rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"><Trash2 size={15} /></button>}
        <ChevronDown size={16} aria-hidden className={cn("text-muted-foreground transition-transform", f.on && "rotate-180")} />
      </div>
      {f.on && (
        <div className="flex flex-col gap-3 border-t border-border p-3">
          {f.kind === "range" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5"><Label htmlFor={`fp-${f.key}-min`}>{t("“Ən az” parametri")}</Label><Input id={`fp-${f.key}-min`} list="ab-params" className="font-mono" placeholder={`${f.key}_from`} value={f.minParam} onChange={(e) => onChange({ minParam: e.target.value })} /></div>
              <div className="flex flex-col gap-1.5"><Label htmlFor={`fp-${f.key}-max`}>{t("“Ən çox” parametri")}</Label><Input id={`fp-${f.key}-max`} list="ab-params" className="font-mono" placeholder={`${f.key}_to`} value={f.maxParam} onChange={(e) => onChange({ maxParam: e.target.value })} /></div>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5"><Label htmlFor={`fp-${f.key}`}>{t("API-də parametrin adı")}</Label><Input id={`fp-${f.key}`} list="ab-params" className="font-mono" placeholder={f.kind === "text" ? "q, search" : f.key} value={f.param} onChange={(e) => onChange({ param: e.target.value })} /></div>
          )}
          {f.kind === "string" && (
            <label className="flex items-start gap-2.5 text-sm">
              <input type="checkbox" checked={f.vocab} onChange={(e) => onChange({ vocab: e.target.checked })} className="mt-0.5 size-4 accent-foreground" />
              <span>{t("API ad yox ID gözləyir")}<span className="block text-xs text-muted-foreground">{t("məs. “Honda” əvəzinə 12. Adı ID-yə sistem özü çevirir: siyahını API-ndən oxuyur.")}</span></span>
            </label>
          )}
          {f.vocab && f.kind === "string" && (
            <div className="grid gap-3 rounded-lg bg-muted/50 p-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5"><Label htmlFor={`fv-${f.key}-p`}>{t("Siyahı ünvanı")}</Label><Input id={`fv-${f.key}-p`} className="font-mono" placeholder="/api/brands" value={f.vocabPath} onChange={(e) => onChange({ vocabPath: e.target.value })} /></div>
              <div className="flex flex-col gap-1.5"><Label htmlFor={`fv-${f.key}-i`}>{t("Siyahı cavabın harasındadır")}</Label><Input id={`fv-${f.key}-i`} className="font-mono" placeholder="data" value={f.vocabItems} onChange={(e) => onChange({ vocabItems: e.target.value })} /></div>
              <div className="flex flex-col gap-1.5"><Label htmlFor={`fv-${f.key}-id`}>{t("ID sahəsi")}</Label><Input id={`fv-${f.key}-id`} className="font-mono" value={f.vocabId} onChange={(e) => onChange({ vocabId: e.target.value })} /></div>
              <div className="flex flex-col gap-1.5"><Label htmlFor={`fv-${f.key}-n`}>{t("Ad sahəsi")}</Label><Input id={`fv-${f.key}-n`} className="font-mono" value={f.vocabName} onChange={(e) => onChange({ vocabName: e.target.value })} /></div>
            </div>
          )}
          <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border p-2.5 sm:flex-row sm:items-center">
            <FlaskConical size={15} className="hidden shrink-0 text-muted-foreground sm:block" aria-hidden />
            <Input aria-label={t("Sınaq dəyəri")} className="h-9" placeholder={f.kind === "range" ? t("məs. 5000 (ən çox)") : f.kind === "boolean" ? t("bəli") : f.kind === "text" ? t("məs. qırmızı") : t("məs. Honda")} value={value} onChange={(e) => onValue(e.target.value)} />
            <Button type="button" size="sm" variant="outline" className="shrink-0 whitespace-nowrap" disabled={!value.trim() || test?.state === "run"} onClick={onTest}>{test?.state === "run" ? <Loader2 size={14} className="animate-spin" aria-hidden /> : null}{t("Filtri sına")}</Button>
          </div>
          {test && test.state !== "run" && (
            <div className={cn("text-sm", test.state === "ok" ? "text-emerald-700" : test.state === "err" ? "text-destructive" : "text-amber-700")}>
              <p>{test.text}</p>
              {test.request && <code className="mt-1 block break-all text-xs text-muted-foreground">{test.request}</code>}
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function AddFilter({ existing, onAdd }: { existing: string[]; onAdd: (r: FilterRow) => void }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [kind, setKind] = useState<FilterKind>("string");
  const [err, setErr] = useState("");
  function add() {
    const l = label.trim();
    if (l.length < 3) return setErr(t("Ad ən azı 3 hərf olmalıdır, məs. Rəng."));
    // Açar addan avtomatik: "Mühərrik həcmi" → muherrikHecmi
    const base = l.toLowerCase().replace(/[əƏ]/g, "e").replace(/[ıİ]/g, "i").replace(/[öÖ]/g, "o").replace(/[üÜ]/g, "u").replace(/[şŞ]/g, "s").replace(/[çÇ]/g, "c").replace(/[ğĞ]/g, "g")
      .normalize("NFKD").replace(/[^a-z0-9 ]/g, "").trim().split(/\s+/).map((w, i) => (i ? w.charAt(0).toUpperCase() + w.slice(1) : w)).join("").replace(/^[0-9]+/, "").slice(0, 28) || "filter";
    let key = base, n = 2;
    while (existing.includes(key) || ["sort", "limit", "sortBy", "sortDir"].includes(key)) key = `${base}${n++}`;
    onAdd(row(key, l, kind, { on: true, custom: true }));
    setLabel(""); setErr(""); setOpen(false);
  }
  if (!open) return <button type="button" onClick={() => setOpen(true)} className="inline-flex w-fit cursor-pointer items-center gap-1.5 text-sm font-medium hover:underline"><Plus size={15} aria-hidden />{t("Başqa filtr əlavə et")}</button>;
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border p-3 sm:flex-row sm:items-end">
      <div className="flex flex-1 flex-col gap-1.5"><Label htmlFor="af-l">{t("Filtrin adı")}</Label><Input id="af-l" value={label} maxLength={60} placeholder={t("məs. Rəng")} onChange={(e) => setLabel(e.target.value)} autoFocus /></div>
      <div className="flex flex-col gap-1.5 sm:w-48"><Label htmlFor="af-k">{t("Növü")}</Label>
        <select id="af-k" className={selectCls} value={kind} onChange={(e) => setKind(e.target.value as FilterKind)}>
          <option value="string">{t("Dəyər (məs. rəng)")}</option><option value="range">{t("Aralıq (məs. il)")}</option><option value="number">{t("Rəqəm")}</option><option value="boolean">{t("Bəli / xeyr")}</option><option value="text">{t("Açar söz")}</option>
        </select></div>
      <div className="flex gap-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>{t("Ləğv et")}</Button><Button type="button" onClick={add}>{t("Əlavə et")}</Button></div>
      {err && <p role="alert" className="text-sm text-destructive sm:basis-full">{err}</p>}
    </div>
  );
}

