"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BookOpen, FileText, Globe, Loader2, MessageSquareText, Plug, Plus, RefreshCw, Settings2, Trash2, Type, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { getKb, kbAddText, kbAddUrl, kbDelete, kbRefresh, kbUploadFile, saveProfile, type AutoRefresh, type KbInfo, type KbSource, type Mode } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { QaCard } from "./qa-card";
import { RequireTenant, useSession } from "@/components/session";
import { CardSkeleton } from "@/components/skeletons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { SwitchRow } from "@/components/ui/switch";
import { Tabs } from "@/components/ui/tabs";
import { Modal } from "@/components/ui/modal";
import { FilterPills, PageHeader } from "@/components/page-header";

const ACCEPT = ".pdf,.docx,.txt,.md,.csv,.html,.htm,.json";

function ModeSection({ mode, setMode }: { mode: Mode; setMode: (m: Mode) => void }) {
  const { t } = useI18n();
  const { tenant } = useSession();
  const hasSource = Boolean(tenant?.config.source);
  const options: { value: Mode; label: string }[] = hasSource
    ? [{ value: "listings", label: t("Yalnız elanlar") }, { value: "support", label: t("Yalnız dəstək") }, { value: "both", label: t("Elanlar + dəstək") }]
    : [{ value: "support", label: t("Yalnız dəstək") }];
  const help: Record<Mode, string> = {
    listings: t("Çat yalnız elan axtarışı edir. Bilik bazası istifadə olunmur."),
    support: t("Çat yalnız yüklədiyin sənədlərə və saytına əsasən cavab verir, tapmasa “bilmirəm” deyir."),
    both: t("Çat həm elan axtarır, həm də şirkət haqqında suallara sənədlərdən cavab verir."),
  };
  return (
    <div className="flex flex-col gap-3 px-5 py-4">
      <Segmented value={mode} onChange={setMode} options={options} label={t("Çatın rejimi")} />
      <p className="text-sm text-muted-foreground">{help[mode]}</p>
      {!hasSource && (
        <div className="flex flex-col gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold">{t("Elan, məhsul və ya xidmətlərini də çatda göstərmək istəyirsən?")}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">{t("Saytının API-sini qoşsan, çat sənədlərlə yanaşı elanları da axtarıb göstərəcək.")}</p>
          </div>
          <Link href="/connection" className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
            <Plug size={16} aria-hidden /> {t("Elan mənbəyini qoş")}
          </Link>
        </div>
      )}
    </div>
  );
}

function AddSection({ info, onAdded }: { info: KbInfo; onAdded: () => void }) {
  const { t } = useI18n();
  const [tab, setTab] = useState<"file" | "site" | "text">("file");
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState("");
  const [crawl, setCrawl] = useState(true);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const full = info.totals.sources >= info.limits.sources;
  const mb = Math.round(info.limits.fileBytes / 1048576);

  async function upload(files: FileList | File[]) {
    setBusy(true);
    let ok = 0;
    for (const f of Array.from(files)) {
      if (f.size > info.limits.fileBytes) { toast.error(t("{name}: fayl çox böyükdür (maksimum {mb} MB)", { name: f.name, mb })); continue; }
      try { await kbUploadFile(f); ok++; } catch (e) { toast.error(`${f.name}: ${(e as Error).message}`); }
    }
    setBusy(false);
    if (ok) { toast.success(t("{n} fayl əlavə edildi, oxunur…", { n: ok })); onAdded(); }
  }
  async function addUrl(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || busy) return;
    const full = /^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`;
    const norm = (u: string) => u.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/+$/, "").toLowerCase();
    if (info.sources.some((x) => x.url && norm(x.url) === norm(full))) { toast.error(t("Bu ünvan artıq əlavə edilib.")); return; }
    setBusy(true);
    try { await kbAddUrl(full, crawl); setUrl(""); toast.success(t("Sayt əlavə edildi, oxunur…")); onAdded(); }
    catch (err) { toast.error((err as Error).message); }
    finally { setBusy(false); }
  }
  async function addText(e: React.FormEvent) {
    e.preventDefault();
    if (text.trim().length < 20 || busy) return;
    setBusy(true);
    try { await kbAddText(title.trim(), text); setTitle(""); setText(""); toast.success(t("Mətn əlavə edildi.")); onAdded(); }
    catch (err) { toast.error((err as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <div>
      <div className="flex flex-col gap-4">
        <Tabs value={tab} onChange={setTab} label={t("Mənbə növü")} items={[{ value: "file", label: t("Fayl") }, { value: "site", label: t("Sayt linki") }, { value: "text", label: t("Mətn / FAQ") }]} />
        {full && <p role="alert" className="text-sm text-destructive">{t("Mənbə limitinə çatdın ({n}). Yenisini əlavə etmək üçün köhnələrini sil.", { n: info.limits.sources })}</p>}

        {tab === "file" && (
          <div
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); if (!full && e.dataTransfer.files.length) void upload(e.dataTransfer.files); }}
            className={cn("flex flex-col items-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors", drag ? "border-primary bg-primary/5" : "border-border")}>
            {busy ? <Loader2 className="animate-spin text-muted-foreground" aria-hidden /> : <UploadCloud className="text-muted-foreground" aria-hidden />}
            <p className="text-sm font-medium">{t("Faylı bura sürüşdür və ya seç")}</p>
            <p className="text-xs text-muted-foreground">{t("PDF, Word (DOCX), TXT, MD, CSV, HTML · maksimum {mb} MB", { mb })}</p>
            <Button type="button" variant="outline" size="sm" disabled={busy || full} onClick={() => fileRef.current?.click()}>{t("Fayl seç")}</Button>
            <input ref={fileRef} type="file" multiple accept={ACCEPT} className="hidden" aria-label={t("Fayl seç")} onChange={(e) => { if (e.target.files?.length) void upload(e.target.files); e.target.value = ""; }} />
            <p className="text-xs text-muted-foreground">{t("Skan edilmiş (şəkil) PDF oxunmur: mətnli PDF və ya Word istifadə et.")}</p>
          </div>
        )}

        {tab === "site" && (
          <form onSubmit={addUrl} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="kb-url">{t("Sayt və ya səhifə ünvanı")}</Label>
              <Input id="kb-url" inputMode="url" placeholder="https://saytin.az" value={url} onChange={(e) => setUrl(e.target.value)} />
            </div>
            <SwitchRow checked={crawl} onChange={setCrawl} on={t("Açıq")} off={t("Bağlı")}
              title={t("Bütün saytı oxu (sitemap və linklərlə, maksimum 40 səhifə)")}
              description={t("Söndürsən yalnız bu bir səhifə oxunur. Sayt sonradan dəyişəndə “Yenilə” düyməsi ilə təzələ.")} />
            <div><Button disabled={busy || full || !url.trim()}>{busy ? t("Gözlə…") : t("Saytı əlavə et")}</Button></div>
            <p className="text-xs text-muted-foreground">{t("Səhifələr JavaScript ilə sonradan yüklənirsə (boş görünürsə) oxuna bilməyə bilər: bu halda mətni və ya PDF-i əlavə et.")}</p>
          </form>
        )}

        {tab === "text" && (
          <form onSubmit={addText} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1"><Label htmlFor="kb-title">{t("Başlıq (ixtiyari)")}</Label><Input id="kb-title" maxLength={160} placeholder={t("məs. Çatdırılma şərtləri")} value={title} onChange={(e) => setTitle(e.target.value)} /></div>
            <div className="flex flex-col gap-1"><Label htmlFor="kb-text">{t("Mətn")}</Label><Textarea id="kb-text" rows={8} placeholder={t("Tez-tez verilən sualları və cavabları, qaydaları, qiymətləri bura yapışdır.")} value={text} onChange={(e) => setText(e.target.value)} /></div>
            <div><Button disabled={busy || full || text.trim().length < 20}>{busy ? t("Gözlə…") : t("Mətni əlavə et")}</Button></div>
          </form>
        )}
      </div>
    </div>
  );
}

const ICON = { file: FileText, url: Globe, site: Globe, text: Type, qa: Type, proc: Type } as const;

function SourceRow({ s, onChange }: { s: KbSource; onChange: () => void }) {
  const { t, num, short } = useI18n();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const Icon = ICON[s.type];
  const size = s.type === "site" ? t("{n} səhifə", { n: s.pages }) : s.size ? `${s.size > 1048576 ? (s.size / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(s.size / 1024)) + " KB"}` : "";

  async function run(fn: () => Promise<unknown>, ok: string) {
    setBusy(true);
    try { await fn(); toast.success(ok); onChange(); } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); setConfirm(false); }
  }
  return (
    <li className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <Icon size={18} className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium" title={s.url ?? s.name}>{s.url ? s.url.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "") : s.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {[s.type === "file" ? t("Fayl") : s.type === "text" ? t("Mətn") : s.type === "site" ? t("Bütün sayt") : t("Səhifə"), size, s.status === "ready" ? t("{n} hissə", { n: num(s.chunks) }) : "", s.lastIndexedAt ? short(s.lastIndexedAt) : ""].filter(Boolean).join(" · ")}
          </p>
          {s.status === "failed" && s.error && <p role="alert" className="mt-1 text-xs text-destructive">{t(s.error)}</p>}
          {s.status === "ready" && s.refreshError && <p className="mt-1 text-xs text-amber">{t("Son avtomatik yenilənmə alınmadı, köhnə məlumat işləyir")}: {t(s.refreshError)}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2 pl-8 sm:pl-0">
        {s.status === "processing" && <Badge className="gap-1"><Loader2 size={12} className="animate-spin" aria-hidden />{t("Oxunur…")}</Badge>}
        {s.status === "ready" && <Badge className="bg-primary/15 text-primary">{t("Hazırdır")}</Badge>}
        {s.status === "failed" && <Badge className="bg-destructive/15 text-destructive">{t("Alınmadı")}</Badge>}
        {(s.type === "url" || s.type === "site") && s.status !== "processing" && (
          <Button size="sm" variant="outline" disabled={busy} onClick={() => run(() => kbRefresh(s.id), t("Yenidən oxunur…"))} aria-label={t("Yenilə")}><RefreshCw size={14} aria-hidden /><span className="hidden sm:inline">{t("Yenilə")}</span></Button>
        )}
        {confirm ? (
          <>
            <Button size="sm" variant="destructive" disabled={busy} onClick={() => run(() => kbDelete(s.id), t("Silindi."))}>{t("Bəli, sil")}</Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirm(false)}>{t("Ləğv et")}</Button>
          </>
        ) : (
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => setConfirm(true)} aria-label={t("Sil")}><Trash2 size={14} aria-hidden /></Button>
        )}
      </div>
    </li>
  );
}

function AutoRefreshCard({ info }: { info: KbInfo }) {
  const { t } = useI18n();
  const [value, setValue] = useState<AutoRefresh>(info.autoRefresh ?? "weekly");
  const [busy, setBusy] = useState(false);
  const hasSites = info.sources.some((s) => s.type === "url" || s.type === "site");
  async function change(v: AutoRefresh) {
    const prev = value;
    setValue(v); setBusy(true);
    try { await saveProfile({ kbAutoRefresh: v }); toast.success(t("Saxlandı.")); }
    catch (e) { setValue(prev); toast.error((e as Error).message); }
    finally { setBusy(false); }
  }
  return (
    <Card>
      <CardHeader><CardTitle>{t("Saytın avtomatik yenilənməsi")}</CardTitle><CardDescription>{t("Əlavə etdiyin saytlar seçdiyin vaxtda özü yenidən oxunur. Məzmun dəyişməyibsə heç nə edilmir və xərc çıxmır.")}</CardDescription></CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Segmented value={value} onChange={(v) => { if (!busy) void change(v); }} label={t("Yenilənmə tezliyi")} options={[{ value: "off", label: t("Söndürülüb") }, { value: "daily", label: t("Hər gün") }, { value: "weekly", label: t("Hər həftə") }]} />
        <p className="text-sm text-muted-foreground">{hasSites ? t("Yalnız sayt linkləri yenilənir. Fayl və mətnlər dəyişmir. İstəsən istənilən vaxt “Yenilə” düyməsi ilə dərhal yeniləyə bilərsən.") : t("Hələ sayt linki əlavə etməmisən. Əlavə edəndə burada seçdiyin tezliklə yenilənəcək.")}</p>
      </CardContent>
    </Card>
  );
}

function FallbackCard({ info }: { info: KbInfo }) {
  const { t } = useI18n();
  const { refresh } = useSession();
  const [base, setBase] = useState(info.fallbackMessage);
  const [value, setValue] = useState(info.fallbackMessage);
  const [busy, setBusy] = useState(false);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try { await saveProfile({ fallbackMessage: value.trim() }); await refresh(); setBase(value.trim()); toast.success(t("Saxlandı.")); }
    catch (err) { toast.error((err as Error).message); }
    finally { setBusy(false); }
  }
  return (
    <Card>
      <form onSubmit={save}>
        <CardHeader><CardTitle>{t("Cavab tapılmayanda")}</CardTitle><CardDescription>{t("Sualın cavabı sənədlərdə olmayanda istifadəçi bu mesajı görür və “Operatorla əlaqə” düyməsi çıxır. Boş qalsa standart mətn işlənir.")}</CardDescription></CardHeader>
        <CardContent className="flex flex-col gap-1">
          <Label htmlFor="fb">{t("Mesaj")}</Label>
          <Textarea id="fb" rows={3} maxLength={300} placeholder={info.defaultFallback} value={value} onChange={(e) => setValue(e.target.value)} />
        </CardContent>
        <div className="flex justify-end border-t border-border px-5 py-3"><Button disabled={busy || value.trim() === base}>{busy ? t("Saxlanır…") : t("Saxla")}</Button></div>
      </form>
    </Card>
  );
}

type Filter = "all" | "site" | "file" | "text" | "qa";

function Knowledge() {
  const { t, num } = useI18n();
  const { refresh } = useSession();
  const [info, setInfo] = useState<KbInfo | null>(null);
  const [mode, setMode] = useState<Mode | null>(null); // qaralama: "Saxla"ya qədər yalnız görünüşü dəyişir
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [adding, setAdding] = useState(false);
  const [settings, setSettings] = useState(false);
  const load = useCallback(() => getKb().then((i) => { setInfo(i); setMode((m) => m ?? i.mode); setError(""); }).catch((e: Error) => setError(e.message)), []);
  useEffect(() => { void load(); }, [load]);
  const processing = info?.sources.some((s) => s.status === "processing");
  useEffect(() => {
    if (!processing) return;
    const id = setInterval(() => void load(), 2500); // oxunma bitənə qədər status yenilənir
    return () => clearInterval(id);
  }, [processing, load]);

  if (!info || !mode) return error ? <p role="alert" className="text-sm text-destructive">{error}</p> : <CardSkeleton rows={4} />;
  const plain = info.sources.filter((s) => s.type !== "qa" && s.type !== "proc"); // sual-cavab və ssenarilər ayrıca
  const kindOf = (s: KbSource): Filter => (s.type === "url" || s.type === "site" ? "site" : s.type === "file" ? "file" : "text");
  const qaCount = info.sources.filter((s) => s.type === "qa").length;
  const ready = plain.filter((s) => s.status === "ready").length;
  const usesKb = info.mode !== "listings";
  const shown = filter === "all" ? plain : plain.filter((s) => kindOf(s) === filter);

  async function saveMode() {
    setSaving(true);
    try { await saveProfile({ mode: mode! }); await refresh(); await load(); toast.success(t("Saxlandı.")); }
    catch (e) { toast.error((e as Error).message); }
    finally { setSaving(false); }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("Bilik bazası")}
        description={t("Çat müştərilərin suallarına şirkətinin sənədləri və saytı əsasında cavab verir. Məlumat yoxdursa uydurmur: “bilmirəm” deyir və sualı sənə göstərir.")}
        actions={<>
          <Button variant="outline" onClick={() => setSettings(true)}><Settings2 size={16} aria-hidden />{t("Ayarlar")}</Button>
          {usesKb && <Button onClick={() => setAdding(true)} disabled={info.totals.sources >= info.limits.sources}><Plus size={16} aria-hidden />{t("Yeni mənbə")}</Button>}
        </>} />

      {!usesKb && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber/40 bg-amber/10 p-4 text-sm">
          <p className="min-w-0 flex-1">{t("Bilik bazası istifadə olunmur: çat yalnız elan axtarır. Şirkət haqqında suallara da cavab versin istəyirsənsə, rejimi dəyiş.")}</p>
          <Button size="sm" onClick={() => setSettings(true)}>{t("Rejimi dəyiş")}</Button>
        </div>
      )}

      {usesKb && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <FilterPills value={filter} onChange={setFilter} label={t("Mənbə növü")} items={[
              { value: "all", label: t("Hamısı"), count: plain.length + qaCount },
              { value: "site", label: t("Saytlar"), count: plain.filter((s) => kindOf(s) === "site").length, icon: <Globe size={14} aria-hidden className="text-sky-600" /> },
              { value: "file", label: t("Fayllar"), count: plain.filter((s) => kindOf(s) === "file").length, icon: <FileText size={14} aria-hidden className="text-rose-600" /> },
              { value: "text", label: t("Mətnlər"), count: plain.filter((s) => kindOf(s) === "text").length, icon: <Type size={14} aria-hidden /> },
              { value: "qa", label: t("Dəqiq cavablar"), count: qaCount, icon: <MessageSquareText size={14} aria-hidden className="text-emerald-600" /> },
            ]} />
            <p className="text-sm text-muted-foreground">{t("{n}/{max} mənbə · {chunks} hissə", { n: info.totals.sources, max: info.limits.sources, chunks: num(info.totals.chunks) })}</p>
          </div>

          {filter !== "qa" && (shown.length ? (
            <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">{shown.map((s) => <SourceRow key={s.id} s={s} onChange={load} />)}</ul>
          ) : (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border px-6 py-12 text-center">
              <span className="grid size-12 place-items-center rounded-full bg-muted"><BookOpen size={22} aria-hidden /></span>
              <h2 className="font-semibold">{filter === "all" ? t("Hələ mənbə yoxdur") : t("Bu növdə mənbə yoxdur")}</h2>
              <p className="max-w-md text-sm text-muted-foreground">{t("Sayt linki, fayl (PDF, Word) və ya mətn əlavə et: çat cavabları yalnız buradan götürür.")}</p>
              <Button onClick={() => setAdding(true)}><Plus size={16} aria-hidden />{t("Yeni mənbə")}</Button>
            </div>
          ))}
          {ready > 0 && filter === "all" && <p className="-mt-3 text-xs text-muted-foreground">{t("{n} mənbə hazırdır, cəmi {chunks} hissə. Çatı “Sınaq söhbəti”ndə yoxlaya bilərsən.", { n: ready, chunks: num(info.totals.chunks) })}</p>}
          {(filter === "all" || filter === "qa") && <QaCard info={info} onChange={load} />}
          <p className="rounded-xl bg-muted/50 p-4 text-sm text-muted-foreground">
            {t("Ssenarilər (köməkçi nə vaxt nə etsin) indi Köməkçi → Bacarıqlar bölməsindədir.")} <Link href="/assistant/skills#proc" className="text-primary underline">{t("Bacarıqlara keç")}</Link>
          </p>
        </>
      )}

      <Modal open={adding} onClose={() => setAdding(false)} size="lg" title={t("Yeni mənbə")} description={t("Çat cavabları yalnız buraya əlavə etdiyin məlumatdan götürür. İstədiyin qədər mənbə qarışdıra bilərsən.")}>
        <AddSection info={info} onAdded={() => { setAdding(false); void load(); }} />
      </Modal>

      <Modal open={settings} onClose={() => { setSettings(false); setMode(info.mode); }} size="lg" title={t("Bilik bazasının ayarları")}
        footer={mode !== info.mode ? <><Button variant="outline" onClick={() => setMode(info.mode)}>{t("Ləğv et")}</Button><Button onClick={saveMode} disabled={saving}>{saving ? t("Saxlanır…") : t("Rejimi saxla")}</Button></> : undefined}>
        <div className="flex flex-col gap-5">
          <section className="overflow-hidden rounded-xl border border-border">
            <div className="px-5 pt-4"><h3 className="font-semibold">{t("Çatın rejimi")}</h3><p className="text-sm text-muted-foreground">{t("Çat saytında nə edəcək.")}</p></div>
            <ModeSection mode={mode} setMode={setMode} />
          </section>
          {usesKb && <AutoRefreshCard info={info} />}
          {usesKb && <FallbackCard info={info} />}
        </div>
      </Modal>
    </div>
  );
}

export default function KnowledgePage() {
  return <RequireTenant><Knowledge /></RequireTenant>;
}
