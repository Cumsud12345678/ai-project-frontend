"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Check, Copy, MessageCircle, X } from "lucide-react";
import { toast } from "sonner";
import { getWidget, rotateWidgetKey, saveWidget, type WidgetResponse } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/components/session";
import { FormSkeleton } from "@/components/skeletons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { SwitchRow } from "@/components/ui/switch";

// Ekran 3 pilləyə bölünür: lg (kompüter), md (planşet), sm (telefon). Boş xana yuxarı pillədən miras alır.
type Placement = {
  position: "right" | "left";
  sideLg: string; bottomLg: string; sideMd: string; bottomMd: string; sideSm: string; bottomSm: string;
  bpMd: string; bpLg: string;
  pages: "all" | "show" | "hide"; paths: string[]; // hansı səhifələrdə görünsün (data-show-on / data-hide-on)
};
const EMPTY: Placement = { position: "right", sideLg: "", bottomLg: "", sideMd: "", bottomMd: "", sideSm: "", bottomSm: "", bpMd: "", bpLg: "", pages: "all", paths: [] };

// Boş və ya yanlış dəyər atributa yazılmır.
const pxAttr = (name: string, v: string, min = 0) => {
  const n = v.trim() === "" ? NaN : Number(v);
  return Number.isFinite(n) && n >= min ? ` ${name}="${Math.min(3000, Math.round(n))}"` : "";
};

function Snippet({ scriptUrl, widgetKey, place }: { scriptUrl: string; widgetKey: string; place: Placement }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const attrs = (place.position === "left" ? ' data-position="left"' : "")
    + pxAttr("data-side", place.sideLg) + pxAttr("data-bottom", place.bottomLg)
    + pxAttr("data-side-md", place.sideMd) + pxAttr("data-bottom-md", place.bottomMd)
    + pxAttr("data-side-sm", place.sideSm) + pxAttr("data-bottom-sm", place.bottomSm)
    + pxAttr("data-bp-md", place.bpMd, 320) + pxAttr("data-bp-lg", place.bpLg, 320)
    + (place.pages !== "all" && place.paths.length ? ` ${place.pages === "show" ? "data-show-on" : "data-hide-on"}="${place.paths.join(",")}"` : "");
  const code = `<script src="${scriptUrl}" data-key="${widgetKey}"${attrs} defer></script>`;
  async function copy() {
    try { await navigator.clipboard.writeText(code); toast.success(t("Kod kopyalandı.")); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { toast.error(t("Kopyalanmadı. Mətni əl ilə seçib kopyala.")); }
  }
  return (
    <div className="flex flex-col gap-3">
      <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-md bg-muted p-3 font-mono text-xs">{code}</pre>
      <div><Button size="sm" onClick={copy}>{copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}{copied ? t("Kopyalandı") : t("Kodu kopyala")}</Button></div>
    </div>
  );
}


/** Səhifə yolu: "/" ilə başlayır (və ya *), vergül, dırnaq və boşluq olmur. */
const cleanPath = (v: string) => {
  const x = v.trim().replace(/^https?:\/\/[^/]+/i, "").split(/[?#]/)[0]!;
  if (x === "*") return x;
  return /^\/[^\s,"'<>]{0,99}$/.test(x) ? (x.length > 1 && x.endsWith("/") ? x.replace(/\/+$/, "") || "/" : x) : "";
};

function PagesFieldset({ place, setP }: { place: Placement; setP: (p: Partial<Placement>) => void }) {
  const { t } = useI18n();
  const [draft, setDraft] = useState("");
  const [bad, setBad] = useState(false);
  function add() {
    if (!draft.trim()) return;
    const p = cleanPath(draft);
    if (!p) { setBad(true); return; }
    setBad(false);
    if (!place.paths.includes(p) && place.paths.length < 30) setP({ paths: [...place.paths, p] });
    setDraft("");
  }
  return (
    <fieldset className="flex flex-col gap-3 rounded-md border border-border p-3">
      <legend className="px-1 text-sm font-medium">{t("Çat hansı səhifələrdə görünsün")}</legend>
      <div className="flex items-center gap-2">
        <Label htmlFor="pages-mode">{t("Rejim")}</Label>
        <select id="pages-mode" value={place.pages} onChange={(e) => setP({ pages: e.target.value as Placement["pages"] })} className="h-8 rounded-md border border-border bg-card px-2 text-sm">
          <option value="all">{t("Skriptin olduğu hər yerdə")}</option>
          <option value="show">{t("Yalnız bu səhifələrdə")}</option>
          <option value="hide">{t("Bu səhifələrdə gizlət")}</option>
        </select>
      </div>
      {place.pages !== "all" && (
        <>
          <div className="flex flex-wrap items-start gap-2">
            <div className="flex flex-col gap-1">
              <Label htmlFor="page-path" className="sr-only">{t("Səhifə yolu")}</Label>
              <Input id="page-path" value={draft} placeholder="/profile, /shop/*" onChange={(e) => { setDraft(e.target.value); setBad(false); }} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} className="w-56" aria-invalid={bad} />
              {bad && <p role="alert" className="text-xs text-destructive">{t("Yol / ilə başlamalıdır, məs. /profile və ya /shop/*")}</p>}
            </div>
            <Button type="button" size="sm" variant="outline" onClick={add}>{t("Əlavə et")}</Button>
          </div>
          {place.paths.length > 0 ? (
            <ul className="flex flex-wrap gap-2" aria-label={t("Seçilmiş səhifələr")}>
              {place.paths.map((p) => (
                <li key={p} className="flex items-center gap-1 rounded-full border border-border bg-muted px-3 py-1 font-mono text-xs">
                  {p}
                  <button type="button" className="cursor-pointer text-muted-foreground hover:text-foreground" aria-label={t("{p} yolunu sil", { p })} onClick={() => setP({ paths: place.paths.filter((x) => x !== p) })}><X size={12} aria-hidden /></button>
                </li>
              ))}
            </ul>
          ) : <p className="text-xs text-muted-foreground">{t("Hələ yol əlavə etməmisən: bu halda çat hər yerdə görünəcək.")}</p>}
        </>
      )}
      <p className="text-xs text-muted-foreground">{t("/yol dəqiq həmin səhifə, /yol/* altındakı bütün səhifələr deməkdir. Next.js kimi saytlarda link ilə keçid də izlənir, ona görə skripti bir səhifəyə qoysan da çat başqa səhifələrdə qalmır.")}</p>
    </fieldset>
  );
}

/** Kart + öz "Saxla" düyməsi. Dəyişiklik yoxdursa düymə passivdir. */
function SaveCard({ dirty, onSave, children }: { dirty: boolean; onSave: () => Promise<void>; children: React.ReactNode }) {
  const { t } = useI18n();
  const [state, setState] = useState<"idle" | "busy" | "saved">("idle");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!dirty || state === "busy") return;
    setState("busy");
    try { await onSave(); setState("saved"); toast.success(t("Saxlandı. Dəyişiklik saytda səhifə yenilənəndə görünəcək.")); } catch (err) { toast.error((err as Error).message); setState("idle"); }
  }
  return (
    <Card>
      <form onSubmit={submit} onChange={() => setState("idle")}>
        {children}
        <div className="flex items-center justify-end gap-3 border-t border-border px-5 py-3">
          <Button disabled={!dirty || state === "busy"}>{state === "busy" ? t("Saxlanır…") : t("Saxla")}</Button>
        </div>
      </form>
    </Card>
  );
}

function Editor({ data, onChange }: { data: WidgetResponse; onChange: (d: WidgetResponse) => void }) {
  const { t } = useI18n();
  const w = data.widget;
  const [enabled, setEnabled] = useState(w.enabled);
  const [title, setTitle] = useState(w.title);
  const [greeting, setGreeting] = useState(w.greeting);
  const [color, setColor] = useState(w.color);
  const [label, setLabel] = useState(w.label ?? "");
  const [origins, setOrigins] = useState(w.origins.join("\n"));
  const [place, setPlace] = useState<Placement>(EMPTY);
  // Limitlər: 0 = limitsiz. Xana boşdursa/səhvdirsə "limitsiz" sayılmır, dəyər yoxlanır.
  const lim0 = w.limits ?? { perVisitorDay: 30, siteHour: 0 };
  const [visLimited, setVisLimited] = useState(lim0.perVisitorDay > 0);
  const [visN, setVisN] = useState(String(lim0.perVisitorDay > 0 ? lim0.perVisitorDay : 30));
  const [siteLimited, setSiteLimited] = useState(lim0.siteHour > 0);
  const [siteN, setSiteN] = useState(String(lim0.siteHour > 0 ? lim0.siteHour : 500));
  const intIn = (v: string, max: number) => { const n = Number(v); return Number.isInteger(n) && n >= 1 && n <= max ? n : null; };
  const visVal = visLimited ? intIn(visN, 10_000) : 0;
  const siteVal = siteLimited ? intIn(siteN, 1_000_000) : 0;
  const limitsDirty = visVal !== null && siteVal !== null && (visVal !== lim0.perVisitorDay || siteVal !== lim0.siteHour);
  const saveLimits = async () => { if (visVal === null || siteVal === null) throw new Error(t("Limit 1 ilə maksimum arasında tam ədəd olmalıdır.")); onChange(await saveWidget({ limits: { perVisitorDay: visVal, siteHour: siteVal } })); };
  const setP = (patch: Partial<Placement>) => setPlace((p) => ({ ...p, ...patch }));
  const num = (v: string, d: number) => (v.trim() !== "" && Number.isFinite(Number(v)) && Number(v) >= 320 ? Math.round(Number(v)) : d);
  const bpMd = num(place.bpMd, 768);
  const bpLg = Math.max(bpMd, num(place.bpLg, 1024));
  const [rotating, setRotating] = useState<"idle" | "confirm" | "busy">("idle");

  // Hər kartın öz "Saxla" düyməsi var; yalnız həmin kartın sahələri göndərilir.
  const look = { enabled, title, greeting, color, label };
  const lookDirty = look.enabled !== w.enabled || look.title !== w.title || look.greeting !== w.greeting || look.color !== w.color || look.label !== (w.label ?? "");
  const parsedOrigins = () => origins.split("\n").map((s) => s.trim()).filter(Boolean);
  const originsDirty = JSON.stringify(parsedOrigins()) !== JSON.stringify(w.origins);
  const saveLook = async () => { onChange(await saveWidget(look)); };
  const saveOrigins = async () => { const next = await saveWidget({ origins: parsedOrigins() }); onChange(next); setOrigins(next.widget.origins.join("\n")); };

  async function rotate() {
    setRotating("busy");
    try { onChange(await rotateWidgetKey()); setRotating("idle"); toast.success(t("Vidjet açarı yeniləndi. Yeni kodu saytına yapışdır.")); }
    catch (err) { toast.error((err as Error).message); setRotating("idle"); }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t("Quraşdırma kodu")}</CardTitle>
          <CardDescription>{t("Bu sətri saytının hər səhifəsində")} <code className="font-mono">&lt;/body&gt;</code> {t("teqindən əvvəl yapışdır. Çat düyməsi sağ aşağıda görünəcək.")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          {!w.enabled && <p role="status" className="text-destructive">{t("Vidjet hazırda söndürülüb. Saytda görünməyəcək.")}</p>}
          <Snippet scriptUrl={data.scriptUrl} widgetKey={w.key} place={place} />
          <PagesFieldset place={place} setP={setP} />
          <fieldset className="flex flex-col gap-4 rounded-md border border-border p-3">
            <legend className="px-1 text-sm font-medium">{t("Düymənin yeri (piksellə)")}</legend>
            <div className="flex items-center gap-2">
              <Label htmlFor="pos">{t("Tərəf")}</Label>
              <select id="pos" value={place.position} onChange={(e) => setP({ position: e.target.value as "right" | "left" })} className="h-8 rounded-md border border-border bg-card px-2 text-sm">
                <option value="right">{t("Sağ")}</option><option value="left">{t("Sol")}</option>
              </select>
            </div>
            {([
              ["lg", t("Kompüter"), t("eni {n}px və çox", { n: bpLg }), "sideLg", "bottomLg", "20", "20"],
              ["md", t("Planşet"), t("eni {a}–{b}px", { a: bpMd, b: Math.max(bpMd, bpLg - 1) }), "sideMd", "bottomMd", t("kompüterdəki kimi"), t("kompüterdəki kimi")],
              ["sm", t("Telefon"), t("eni {n}px və az; çat tam ekran açılır", { n: bpMd - 1 }), "sideSm", "bottomSm", t("planşetdəki kimi"), t("planşetdəki kimi")],
            ] as const).map(([id, name, hint, kSide, kBottom, phSide, phBottom]) => (
              <div key={id} className="flex flex-col gap-2">
                <p className="text-sm"><strong>{name}</strong> <span className="text-xs text-muted-foreground">({hint})</span></p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {([[t("Yan kənardan"), kSide, phSide], [t("Aşağıdan"), kBottom, phBottom]] as const).map(([label, k, ph]) => (
                    <div key={k} className="flex flex-col gap-1">
                      <Label htmlFor={`px-${id}-${k.startsWith("side") ? "side" : "bottom"}`} className="text-xs text-muted-foreground">{label}</Label>
                      <div className="flex items-center gap-2">
                        <Input id={`px-${id}-${k.startsWith("side") ? "side" : "bottom"}`} type="number" inputMode="numeric" min={0} max={3000} placeholder={ph} value={place[k]} onChange={(e) => setP({ [k]: e.target.value })} />
                        <span className="text-sm text-muted-foreground">px</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <p className="text-xs text-muted-foreground">{t("Boş xana yuxarıdakı pillədən miras alır (telefon ← planşet ← kompüter), hamısı boşdursa 20px olur. Məsələn saytında aşağıda sabit menyu varsa, telefon üçün aşağıdan 80 yaz.")}</p>
            <details className="text-sm">
              <summary className="cursor-pointer font-medium">{t("Pillələrin sərhədlərini dəyiş")}</summary>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="bp-md" className="text-xs text-muted-foreground">{t("Planşet bu eninə qədər telefon sayılır (defolt 768)")}</Label>
                  <div className="flex items-center gap-2"><Input id="bp-md" type="number" inputMode="numeric" min={320} max={3000} placeholder="768" value={place.bpMd} onChange={(e) => setP({ bpMd: e.target.value })} /><span className="text-sm text-muted-foreground">px</span></div>
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="bp-lg" className="text-xs text-muted-foreground">{t("Kompüter bu enindən başlayır (defolt 1024)")}</Label>
                  <div className="flex items-center gap-2"><Input id="bp-lg" type="number" inputMode="numeric" min={320} max={3000} placeholder="1024" value={place.bpLg} onChange={(e) => setP({ bpLg: e.target.value })} /><span className="text-sm text-muted-foreground">px</span></div>
                </div>
              </div>
            </details>
          </fieldset>
          <p className="text-muted-foreground">
            {t("Daha dəqiq nəzarət üçün saytın CSS-ində")} <code className="font-mono">[data-car-advisor]{"{ --ca-bottom:90px; --ca-side:30px; }"}</code> {t("yazmaq olar (planşet üçün")} <code className="font-mono">--ca-bottom-md</code>, <code className="font-mono">--ca-side-md</code>, {t("telefon üçün")} <code className="font-mono">--ca-bottom-sm</code>, <code className="font-mono">--ca-side-sm</code>). {t("Öz düyməndən açmaq üçün:")} <code className="font-mono">window.CarAdvisor.open()</code>. {t("Bu kod ictimaidir, gizli API açarı deyil. Heç nə sızdırmır, amma yalnız aşağıdakı saytlarda işləyir.")}
          </p>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-6">
        <SaveCard dirty={lookDirty} onSave={saveLook}>
          <CardHeader><CardTitle>{t("Görünüş və davranış")}</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <SwitchRow className="sm:col-span-2" checked={enabled} onChange={setEnabled} on={t("Açıq")} off={t("Bağlı")}
              title={t("Vidjet aktivdir")} description={t("Söndürsən çat düyməsi saytında göstərilmir (skripti silmək lazım deyil).")} />
            <div className="flex flex-col gap-1"><Label htmlFor="title">{t("Başlıq")}</Label><Input id="title" required maxLength={60} value={title} onChange={(e) => setTitle(e.target.value)} /></div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="color">{t("Rəng")}</Label>
              <div className="flex gap-2">
                <input aria-label={t("Rəng seçici")} type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-9 w-12 cursor-pointer rounded-md border border-border bg-card p-1" />
                <Input id="color" pattern="#[0-9a-fA-F]{6}" maxLength={7} value={color} onChange={(e) => setColor(e.target.value)} className="font-mono" />
              </div>
            </div>
            <div className="flex flex-col gap-1 sm:col-span-2">
              <Label htmlFor="label">{t("Loqonun yanındakı yazı")}</Label>
              <div className="flex items-center gap-3">
                <Input id="label" maxLength={40} placeholder={t("məs. AI-dan soruş")} value={label} onChange={(e) => setLabel(e.target.value)} className="max-w-xs" />
                {label.trim() && (
                  <span className="hidden items-center gap-2 sm:flex" aria-hidden>
                    <span className="rounded-full border border-border bg-white px-4 py-2.5 text-sm font-semibold text-[#111827] shadow-md">{label.trim()}</span>
                    <span className="grid size-10 place-items-center rounded-full text-white shadow-md" style={{ background: color }}><MessageCircle size={18} /></span>
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{t("Çat düyməsinin yanında göstərilir (düymənin tərəfinə görə solunda və ya sağında). Boş buraxsan, yazı göstərilməz.")}</p>
            </div>
            <div className="flex flex-col gap-1 sm:col-span-2"><Label htmlFor="greeting">{t("Salamlama mesajı")}</Label><Textarea id="greeting" required maxLength={300} value={greeting} onChange={(e) => setGreeting(e.target.value)} /></div>
          </CardContent>
        </SaveCard>
        <SaveCard dirty={limitsDirty} onSave={saveLimits}>
          <CardHeader>
            <CardTitle>{t("İstifadə limitləri")}</CardTitle>
            <CardDescription>{t("Çatın sənin balansından həddindən artıq xərclənməsinin qarşısını almaq üçün. İstəsən limitsiz edə bilərsən.")}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 text-sm">
            <div className="flex flex-col gap-2">
              <SwitchRow checked={visLimited} onChange={setVisLimited} on={t("Limitli")} off={t("Limitsiz")} title={t("Ziyarətçi başına gündəlik limit")} />
              {visLimited && (
                <div className="flex flex-wrap items-center gap-2">
                  <Label htmlFor="lim-vis">{t("Bir ziyarətçi bir gündə ən çox")}</Label>
                  <Input id="lim-vis" type="number" inputMode="numeric" min={1} max={10000} value={visN} onChange={(e) => setVisN(e.target.value)} className="w-24" aria-invalid={visVal === null} />
                  <span>{t("mesaj")}</span>
                </div>
              )}
              <p className="text-xs text-muted-foreground">{t("Limit dolanda ziyarətçiyə əlaqə forması göstərilir, müraciəti itmir. Eyni şəbəkədən (ofis, mobil operator) girən ziyarətçilər ayrı sayılır.")}</p>
            </div>
            <div className="flex flex-col gap-2">
              <SwitchRow checked={siteLimited} onChange={setSiteLimited} on={t("Limitli")} off={t("Limitsiz")} title={t("Bütün sayt üçün saatlıq limit")} />
              {siteLimited && (
                <div className="flex flex-wrap items-center gap-2">
                  <Label htmlFor="lim-site">{t("Bütün ziyarətçilər birlikdə saatda ən çox")}</Label>
                  <Input id="lim-site" type="number" inputMode="numeric" min={1} max={1000000} value={siteN} onChange={(e) => setSiteN(e.target.value)} className="w-28" aria-invalid={siteVal === null} />
                  <span>{t("mesaj")}</span>
                </div>
              )}
              <p className="text-xs text-muted-foreground">{t("Çox ziyarətçisi olan sayt üçün limitsiz saxlamaq olar: xərci balans məhdudlaşdırır və balans bitəndə çat dayanır.")}</p>
            </div>
            <p className="text-xs text-muted-foreground">{t("Botlardan qorunmaq üçün ziyarətçi başına dəqiqədə 10 mesaj həddi həmişə qalır, bunu real insan keçmir. Ziyarətçini tanımaq üçün brauzerdə təsadüfi anonim ID saxlanır (şəxsi məlumat deyil), saytının məxfilik siyasətində bunu qeyd etməyi məsləhət görürük.")}</p>
          </CardContent>
        </SaveCard>
        <SaveCard dirty={originsDirty} onSave={saveOrigins}>
          <CardHeader>
            <CardTitle>{t("İcazəli saytlar")}</CardTitle>
            <CardDescription>{t("Vidjet yalnız bu saytlardan işləyir. Başqa sayt kodu kopyalasa belə, söhbət açılmır.")}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <p>{t("Avtomatik icazəli:")} <strong>{data.domain}</strong>, <strong>www.{data.domain.replace(/^www\./, "")}</strong> {t("və bütün alt domenlər.")}</p>
            <div className="flex flex-col gap-1">
              <Label htmlFor="origins">{t("Əlavə ünvanlar (hər sətirdə bir)")}</Label>
              <Textarea id="origins" value={origins} onChange={(e) => setOrigins(e.target.value)} placeholder={"http://localhost:3000\nhttps://test.mənim-saytim.az"} className="font-mono text-xs" />
              <p className="text-xs text-muted-foreground">{t("Sınaq üçün lokal ünvan (məs. http://localhost:3000) və ya başqa domen əlavə edə bilərsən. Protokol və port yazılmalıdır.")}</p>
            </div>
          </CardContent>
        </SaveCard>
      </div>

      <Card>
        <CardHeader><CardTitle>{t("Vidjet açarını yenilə")}</CardTitle><CardDescription>{t("Kod kimsə tərəfindən sui-istifadə olunursa istifadə et.")}</CardDescription></CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          {rotating === "idle" ? (
            <div><Button variant="outline" onClick={() => setRotating("confirm")}>{t("Açarı yenilə")}</Button></div>
          ) : (
            <>
              <p>{t("Köhnə kod dərhal işləməyi dayandıracaq. Yeni kodu saytına yenidən yapışdırmalısan.")}</p>
              <div className="flex gap-2">
                <Button size="sm" disabled={rotating === "busy"} onClick={rotate}>{rotating === "busy" ? t("Yenilənir…") : t("Bəli, yenilə")}</Button>
                <Button size="sm" variant="outline" disabled={rotating === "busy"} onClick={() => setRotating("idle")}>{t("Ləğv et")}</Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function InstallStatus({ data, onRecheck }: { data: WidgetResponse; onRecheck: () => Promise<void> }) {
  const { t, short } = useI18n();
  const [busy, setBusy] = useState(false);
  const seen = data.widget.lastSeenAt ? new Date(data.widget.lastSeenAt) : null;
  const recent = seen ? Date.now() - seen.getTime() < 24 * 3600_000 : false;
  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6 text-sm">
        <div role="status" className="flex min-w-0 flex-col gap-1">
          {!seen ? (
            <>
              <p className="font-medium text-amber">{t("Vidjet hələ saytında görünməyib.")}</p>
              <p className="text-muted-foreground">{t("Kodu saytına yapışdırıb səhifəni yenilə, sonra “Yenidən yoxla” bas. Görünmürsə: kod hər səhifədə </body>-dən əvvəl olmalıdır və saytın ünvanı “İcazəli saytlar” siyahısında olmalıdır.")}</p>
            </>
          ) : (
            <>
              <p className={recent ? "font-medium text-primary" : "font-medium text-amber"}>{recent ? t("Vidjet saytında işləyir.") : t("Vidjet bir gündən çoxdur saytında görünmür.")}</p>
              <p className="text-muted-foreground">{t("Saytda son görünmə: {when}. Vaxt təxmini 10 dəqiqəlik dəqiqliklə yenilənir.", { when: short(seen.toISOString()) })}</p>
            </>
          )}
        </div>
        <Button size="sm" variant="outline" disabled={busy} onClick={async () => { setBusy(true); try { await onRecheck(); } finally { setBusy(false); } }}>{busy ? t("Yoxlanır…") : t("Yenidən yoxla")}</Button>
      </CardContent>
    </Card>
  );
}

export default function EmbedPage() {
  const { tenant } = useSession();
  const { t } = useI18n();
  const [data, setData] = useState<WidgetResponse | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try { setData(await getWidget()); setError(""); } catch (e) { setError((e as Error).message); }
  }, []);
  useEffect(() => { if (tenant) void load(); }, [tenant, load]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("Saytına qoş")}</h1>
        <p className="text-sm text-muted-foreground">{t("Bir sətir kodla saytında hazır çat pəncərəsi aç. Backend yazmağa ehtiyac yoxdur.")}</p>
      </div>
      {!tenant ? (
        <p className="text-sm text-muted-foreground">{t("Əvvəlcə")} <Link className="underline" href="/connection">{t("elan mənbəyini qoş")}</Link>{t(", sonra vidjet kodu burada görünəcək.")}</p>
      ) : error ? (
        <div role="alert" className="flex flex-col items-start gap-2 text-sm text-destructive"><p>{error}</p><Button size="sm" variant="outline" onClick={load}>{t("Yenidən yüklə")}</Button></div>
      ) : !data ? (
        <FormSkeleton fields={4} />
      ) : (
        // Saxlama və ya açar yenilənməsindən sonra forma təzə məlumatla yenidən qurulur
        <>
          <InstallStatus data={data} onRecheck={load} />
          <Editor key={data.widget.key} data={data} onChange={setData} />
        </>
      )}
    </div>
  );
}
