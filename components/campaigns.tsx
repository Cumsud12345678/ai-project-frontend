"use client";
// Kampaniyalar: ziyarətçi yazmamış çat düyməsinin yanında göstərilən kart (başlıq, mətn, düymələr) və şərtləri.
// Saxlanma vidjet ayarlarının "proactive" hissəsinə gedir; statistika ayrıca sayılır (göstərilib / klik / söhbət).
import { PlanLockNotice } from "@/components/plan-ui";
import { useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, ArrowUp, BarChart3, CalendarClock, Copy, Eye, Headset, Megaphone, MonitorSmartphone, Pause, Pencil, Play, Plus, Repeat, RotateCcw, Timer, Trash2, Users, X } from "lucide-react";
import { resetCampaignStats, saveWidget, type CampaignButton, type CampaignStat, type ProactiveRule, type WidgetResponse } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Switch, SwitchRow } from "@/components/ui/switch";
import { RowMenu } from "@/components/ui/row-menu";

export const MAX_CAMPAIGNS = 10;
export type CampFilter = "all" | "ongoing" | "scheduled" | "inactive";
export type CampStatus = "ongoing" | "scheduled" | "inactive";
type Draft = Omit<ProactiveRule, "id"> & { id?: string };

export function campStatus(r: ProactiveRule, now = Date.now()): CampStatus {
  if (r.active === false || (r.endAt && Date.parse(r.endAt) <= now)) return "inactive";
  if (r.startAt && Date.parse(r.startAt) > now) return "scheduled";
  return "ongoing";
}

const sel = "h-10 w-full rounded-md border border-border bg-card px-3 text-sm";
const isoToLocal = (v?: string | null) => (v ? new Date(new Date(v).getTime() - new Date(v).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");
const localToIso = (v: string) => (v ? new Date(v).toISOString() : null);

/** Vidjetdəki kartın panel önizləməsi (rəng və ad vidjet ayarlarından) */
export function CampaignPreview({ r, color, name, className }: { r: Draft; color: string; name: string; className?: string }) {
  const { t } = useI18n();
  const card = Boolean(r.title || r.buttons?.length);
  const style = { "--c": color } as React.CSSProperties;
  if (!card) return (
    <div style={style} className={cn("flex max-w-[260px] items-start rounded-2xl bg-card text-left text-sm shadow-lg ring-1 ring-border/60", className)}>
      <p className="flex-1 px-3.5 py-3 font-semibold leading-snug">{r.text || t("Mesajın mətni")}</p>
      <X size={16} aria-hidden className="m-2.5 shrink-0 text-muted-foreground" />
    </div>
  );
  return (
    <div style={style} className={cn("flex w-[280px] flex-col gap-2.5 rounded-[20px] bg-card p-2.5 text-left text-sm shadow-lg ring-1 ring-border/60", className)}>
      <div className="flex items-center gap-2">
        <span className="grid size-6 place-items-center rounded-full bg-[var(--c)] text-[10px] font-bold text-white">{(name || "?").slice(0, 1).toUpperCase()}</span>
        <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{name}</span>
        <X size={16} aria-hidden className="text-muted-foreground" />
      </div>
      {r.title && (
        <div className="rounded-[14px] px-4 py-6 text-center text-[26px] font-extrabold leading-[1.1] tracking-tight [overflow-wrap:anywhere]"
          style={{ background: `radial-gradient(120% 90% at 85% 0%, color-mix(in srgb, ${color} 35%, transparent), transparent 70%), color-mix(in srgb, ${color} 8%, var(--card))` }}>
          {r.title}
        </div>
      )}
      <p className="px-1 leading-relaxed [overflow-wrap:anywhere]">{r.text || t("Mesajın mətni")}</p>
      {!!r.buttons?.length && (
        <div className="flex flex-wrap gap-1.5">
          {r.buttons.map((b, i) => <span key={i} className={cn("rounded-full border px-3.5 py-1.5 text-[13px] font-semibold", b.kind !== "close" && i === 0 ? "border-transparent bg-[var(--c)] text-white" : "border-border")}>{b.label || "…"}</span>)}
        </div>
      )}
      <div className="flex items-center gap-1.5 rounded-full border border-border py-1 pl-3.5 pr-1 text-muted-foreground">
        <span className="flex-1 truncate">{t("Mesajınızı yazın…")}</span>
        <span className="grid size-8 place-items-center rounded-full bg-[var(--c)] text-white"><ArrowUp size={15} aria-hidden /></span>
      </div>
    </div>
  );
}

function Conditions({ r }: { r: ProactiveRule }) {
  const { t, short } = useI18n();
  const chips: { icon: typeof Users; text: string }[] = [
    { icon: Users, text: r.audience === "new" ? t("Yeni ziyarətçilər") : r.audience === "returning" ? t("Təkrar gələnlər") : t("Bütün ziyarətçilər") },
    { icon: MonitorSmartphone, text: r.device === "mobile" ? t("Yalnız telefon") : r.device === "desktop" ? t("Yalnız kompüter") : t("Bütün cihazlar") },
    { icon: Repeat, text: r.freq === "once" ? t("Ziyarətçiyə bir dəfə") : t("Hər ziyarətdə") },
    { icon: Timer, text: t("{n} san sonra · {pages}", { n: r.delaySec, pages: r.match === "*" ? t("bütün sayt") : r.match }) },
  ];
  if (r.online) chips.push({ icon: Headset, text: t("Yalnız operator onlayn olanda") });
  if (r.startAt || r.endAt) chips.push({ icon: CalendarClock, text: `${r.startAt ? short(r.startAt) : "…"} → ${r.endAt ? short(r.endAt) : "…"}` });
  return <div className="flex flex-wrap gap-1.5">{chips.map((c, i) => <span key={i} className="inline-flex max-w-full items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs"><c.icon size={12} aria-hidden className="shrink-0 text-muted-foreground" /><span className="truncate">{c.text}</span></span>)}</div>;
}

function Stats({ s }: { s?: CampaignStat }) {
  const { t } = useI18n();
  if (!s || !s.shown) return <div className="flex items-center justify-center gap-2 rounded-lg bg-muted/60 py-3 text-xs text-muted-foreground"><BarChart3 size={14} aria-hidden />{t("Hələ məlumat yoxdur")}</div>;
  const pct = (n: number) => `${Math.round((n / s.shown) * 100)}%`;
  const cell = (label: string, v: number, p?: string) => <div className="flex flex-col"><span className="text-xs text-muted-foreground">{label}</span><span className="font-semibold tabular-nums">{v}{p && <span className="ml-1 text-xs font-normal text-muted-foreground">{p}</span>}</span></div>;
  return <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted/60 p-3">{cell(t("Göstərilib"), s.shown)}{cell(t("Klik"), s.clicked, pct(s.clicked))}{cell(t("Söhbət"), s.chats, pct(s.chats))}</div>;
}

function templates(t: (k: string) => string): { key: string; label: string; hint: string; r: Draft }[] {
  const base = { delaySec: 8, match: "*", active: true, device: "all" as const, online: false, startAt: null, endAt: null };
  return [
    { key: "new", label: t("Yeni gələnləri salamla"), hint: t("İlk dəfə gələn ziyarətçiyə qısa salam və kömək təklifi"),
      r: { ...base, name: t("Yeni gələnləri salamla"), title: t("Salam!"), text: t("Kömək lazımdır? Sualını yaz, sənə düzgün istiqamət göstərək."), audience: "new", freq: "visit", buttons: [{ label: t("Söhbətə başla"), kind: "chat" }, { label: t("Sadəcə baxıram"), kind: "close" }] } },
    { key: "back", label: t("Geri qayıdanları salamla"), hint: t("Saytı təkrar ziyarət edənlərə qaldıqları yerdən davam etməyi təklif et"),
      r: { ...base, name: t("Geri qayıdanları salamla"), title: t("Xoş gəldin!"), text: t("Qaldığın yerdən davam etməyə kömək edək?"), audience: "returning", freq: "visit", buttons: [{ label: t("Söhbətə başla"), kind: "chat" }] } },
    { key: "op", label: t("Operator onlayndır"), hint: t("Yalnız operator panelin başında olanda canlı yazışmaya dəvət et"),
      r: { ...base, delaySec: 20, name: t("Operator onlayndır"), text: t("Operatorumuz indi onlayndır. Sualın varsa, elə indi yaz!"), audience: "all", freq: "visit", online: true, buttons: [{ label: t("Operatorla yaz"), kind: "chat" }] } },
    { key: "blank", label: t("Boş kampaniya"), hint: t("Hər şeyi özün qur"), r: { ...base, delaySec: 15, name: "", text: "", audience: "all", freq: "visit" } },
  ];
}

function Editor({ init, color, name, liveOn, onCancel, onSave }: { init: Draft; color: string; name: string; liveOn: boolean; onCancel: () => void; onSave: (r: Draft) => Promise<void> }) {
  const { t } = useI18n();
  const [r, setR] = useState<Draft>(init);
  const [busy, setBusy] = useState(false);
  const set = (p: Partial<Draft>) => setR((x) => ({ ...x, ...p }));
  const btns = r.buttons ?? [];
  const setBtn = (i: number, p: Partial<CampaignButton>) => set({ buttons: btns.map((b, j) => (j === i ? { ...b, ...p } : b)) });
  const kinds: { v: CampaignButton["kind"]; l: string }[] = [{ v: "chat", l: t("Çatı açır") }, { v: "send", l: t("Yazısını sual kimi göndərir") }, { v: "close", l: t("Kartı bağlayır") }];
  // datetime-local yarımçıq doldurulanda (tarix var, saat yox) brauzer boş dəyər qaytarır: əvvəllər kampaniya vaxtsız saxlanırdı
  const startRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLInputElement>(null);
  const [tried, setTried] = useState(false);
  const [partial, setPartial] = useState({ start: false, end: false });
  const errs = {
    text: r.text.trim().length < 3 ? t("Mesajı yaz (ən azı 3 simvol).") : "",
    start: partial.start ? t("Tarixi və saatı tam seç.") : "",
    end: partial.end ? t("Tarixi və saatı tam seç.") : r.startAt && r.endAt && Date.parse(r.endAt) <= Date.parse(r.startAt) ? t("Bitmə vaxtı başlamadan sonra olmalıdır.") : r.endAt && !init.endAt && Date.parse(r.endAt) < Date.now() ? t("Bitmə vaxtı keçmişdədir.") : "",
    buttons: btns.some((b) => !b.label.trim()) ? t("Düymənin yazısını yaz və ya düyməni sil.") : "",
  };
  const firstErr = Object.values(errs).find(Boolean) ?? "";
  const checkPartial = () => setPartial({ start: Boolean(startRef.current?.validity.badInput), end: Boolean(endRef.current?.validity.badInput) });
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTried(true);
    const bad = { start: Boolean(startRef.current?.validity.badInput), end: Boolean(endRef.current?.validity.badInput) };
    setPartial(bad);
    if (firstErr || bad.start || bad.end) return;
    setBusy(true);
    try { await onSave({ ...r, buttons: btns.filter((b) => b.label.trim()), title: r.title?.trim() || undefined, name: r.name?.trim() || undefined }); }
    finally { setBusy(false); }
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} aria-label={t("Geri")}><ArrowLeft size={16} aria-hidden /></Button>
        <h3 className="flex-1 text-lg font-semibold">{init.id ? t("Kampaniyanı redaktə et") : t("Yeni kampaniya")}</h3>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-5">
          <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
            <h4 className="font-medium">{t("Məzmun")}</h4>
            <div className="flex flex-col gap-1"><Label htmlFor="c-name">{t("Kampaniyanın adı (yalnız paneldə görünür)")}</Label><Input id="c-name" value={r.name ?? ""} maxLength={60} onChange={(e) => set({ name: e.target.value })} placeholder={t("məs. Yeni gələnləri salamla")} /></div>
            <div className="flex flex-col gap-1"><Label htmlFor="c-title">{t("İri başlıq (ixtiyari)")}</Label><Input id="c-title" value={r.title ?? ""} maxLength={40} onChange={(e) => set({ title: e.target.value })} placeholder={t("məs. Salam!")} /><p className="text-xs text-muted-foreground">{t("Başlıq və ya düymə yoxdursa, kart əvəzinə kiçik balon göstərilir.")}</p></div>
            <div className="flex flex-col gap-1"><Label htmlFor="c-text">{t("Mesaj")}</Label><Textarea id="c-text" required minLength={3} aria-invalid={tried && Boolean(errs.text)} value={r.text} maxLength={300} rows={3} onChange={(e) => set({ text: e.target.value })} placeholder={t("Sualın var? Sənə kömək edə bilərəm.")} />{tried && errs.text ? <p role="alert" className="text-xs text-destructive">{errs.text}</p> : <p className="text-xs text-muted-foreground">{t("Ziyarətçi kartı açanda bu mesaj çatda ilk cavab kimi qalır.")}</p>}</div>
            <div className="flex flex-col gap-2">
              <Label>{t("Düymələr (ən çox 3)")}</Label>
              {btns.map((b, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2">
                  <Input value={b.label} maxLength={30} onChange={(e) => setBtn(i, { label: e.target.value })} aria-label={t("Düymənin yazısı")} className="min-w-40 flex-1" />
                  <select value={b.kind} onChange={(e) => setBtn(i, { kind: e.target.value as CampaignButton["kind"] })} aria-label={t("Düymə nə edir")} className={cn(sel, "w-auto")}>{kinds.map((k) => <option key={k.v} value={k.v}>{k.l}</option>)}</select>
                  <Button type="button" variant="ghost" size="sm" onClick={() => set({ buttons: btns.filter((_, j) => j !== i) })} aria-label={t("Sil")}><Trash2 size={14} aria-hidden /></Button>
                </div>
              ))}
              {tried && errs.buttons && <p role="alert" className="text-xs text-destructive">{errs.buttons}</p>}
              {btns.length < 3 && <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => set({ buttons: [...btns, { label: "", kind: btns.length ? "close" : "chat" }] })}><Plus size={14} aria-hidden />{t("Düymə əlavə et")}</Button>}
            </div>
          </section>

          <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
            <h4 className="font-medium">{t("Kimə və nə vaxt")}</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1"><Label htmlFor="c-aud">{t("Ziyarətçilər")}</Label><select id="c-aud" className={sel} value={r.audience ?? "all"} onChange={(e) => set({ audience: e.target.value as Draft["audience"] })}><option value="all">{t("Bütün ziyarətçilər")}</option><option value="new">{t("Yeni ziyarətçilər")}</option><option value="returning">{t("Təkrar gələnlər")}</option></select></div>
              <div className="flex flex-col gap-1"><Label htmlFor="c-dev">{t("Cihaz")}</Label><select id="c-dev" className={sel} value={r.device ?? "all"} onChange={(e) => set({ device: e.target.value as Draft["device"] })}><option value="all">{t("Bütün cihazlar")}</option><option value="mobile">{t("Yalnız telefon")}</option><option value="desktop">{t("Yalnız kompüter")}</option></select></div>
              <div className="flex flex-col gap-1"><Label htmlFor="c-freq">{t("Nə qədər tez-tez")}</Label><select id="c-freq" className={sel} value={r.freq ?? "visit"} onChange={(e) => set({ freq: e.target.value as Draft["freq"] })}><option value="visit">{t("Hər ziyarətdə")}</option><option value="once">{t("Ziyarətçiyə bir dəfə")}</option></select></div>
              <div className="flex flex-col gap-1"><Label htmlFor="c-delay">{t("Səhifədə neçə saniyədən sonra")}</Label><Input id="c-delay" type="number" min={0} max={600} value={r.delaySec} onChange={(e) => set({ delaySec: Math.max(0, Math.min(600, Math.round(Number(e.target.value) || 0))) })} /></div>
              <div className="flex flex-col gap-1 sm:col-span-2"><Label htmlFor="c-match">{t("Hansı səhifələrdə")}</Label><Input id="c-match" value={r.match} maxLength={200} onChange={(e) => set({ match: e.target.value })} placeholder="*, /products/*" /><p className="text-xs text-muted-foreground">{t("* bütün sayt, /products/* bu bölmənin hamısı, vergüllə bir neçə yol.")}</p></div>
              <div className="flex flex-col gap-1"><Label htmlFor="c-start">{t("Başlama (ixtiyari)")}</Label><Input ref={startRef} id="c-start" type="datetime-local" aria-invalid={Boolean(errs.start)} value={isoToLocal(r.startAt)} onChange={(e) => { set({ startAt: localToIso(e.target.value) }); checkPartial(); }} onBlur={checkPartial} />{errs.start && <p role="alert" className="text-xs text-destructive">{errs.start}</p>}</div>
              <div className="flex flex-col gap-1"><Label htmlFor="c-end">{t("Bitmə (ixtiyari)")}</Label><Input ref={endRef} id="c-end" type="datetime-local" aria-invalid={Boolean(errs.end)} min={isoToLocal(r.startAt) || undefined} value={isoToLocal(r.endAt)} onChange={(e) => { set({ endAt: localToIso(e.target.value) }); checkPartial(); }} onBlur={checkPartial} />{errs.end && <p role="alert" className="text-xs text-destructive">{errs.end}</p>}</div>
            </div>
            <SwitchRow checked={Boolean(r.online)} onChange={(v) => set({ online: v })} on={t("Bəli")} off={t("Xeyr")} title={t("Yalnız operator onlayn olanda")}
              description={liveOn ? t("Canlı söhbət bağlı olanda və ya iş saatından kənarda bu kampaniya göstərilmir.") : t("Diqqət: canlı söhbət hazırda söndürülüb, bu şərtlə kampaniya heç göstərilməyəcək.")} />
            <SwitchRow checked={r.active !== false} onChange={(v) => set({ active: v })} on={t("Aktiv")} off={t("Dayandırılıb")} title={t("Kampaniya aktivdir")} />
          </section>
          <div className="flex flex-wrap items-center justify-end gap-2">{tried && firstErr && <p role="alert" className="mr-auto text-sm text-destructive">{firstErr}</p>}<Button type="button" variant="outline" onClick={onCancel}>{t("Ləğv et")}</Button><Button disabled={busy}>{t("Saxla")}</Button></div>
        </div>
        <aside className="flex flex-col gap-2 lg:sticky lg:top-4 lg:self-start">
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground"><Eye size={13} aria-hidden />{t("Önizləmə")}</p>
          <div className="grid min-h-80 place-items-center rounded-2xl bg-[radial-gradient(circle_at_1px_1px,var(--color-border)_1px,transparent_0)] bg-[length:16px_16px] p-5">
            <CampaignPreview r={r} color={color} name={name} />
          </div>
        </aside>
      </div>
    </form>
  );
}

export function Campaigns({ widget, stats, filter, onChange, reloadStats }: {
  widget: WidgetResponse; stats: Record<string, CampaignStat>; filter: CampFilter; onChange: (w: WidgetResponse) => void; reloadStats: () => void;
}) {
  const { t } = useI18n();
  const w = widget.widget;
  const rules = w.proactive?.rules ?? [];
  const enabled = Boolean(w.proactive?.enabled);
  const [edit, setEdit] = useState<Draft | null>(null);
  const [picking, setPicking] = useState(false);
  const liveOn = Boolean(w.live?.enabled);

  async function persist(next: ProactiveRule[] | Draft[], on = enabled, ok?: string) {
    try { onChange(await saveWidget({ proactive: { enabled: on, rules: next as ProactiveRule[] } })); if (ok) toast.success(ok); return true; }
    catch (e) { toast.error((e as Error).message); return false; }
  }
  async function save(d: Draft) {
    const next = d.id ? rules.map((x) => (x.id === d.id ? { ...d, id: d.id } : x)) : [...rules, d];
    // İlk kampaniya yaradılanda kampaniyalar ümumiyyətlə söndürülübsə avtomatik açılır
    if (await persist(next, enabled || !rules.length, t("Saxlandı. Saytda səhifə yenilənəndə görünəcək."))) setEdit(null);
  }
  const list = rules.filter((r) => filter === "all" || campStatus(r) === filter);
  const dot = { ongoing: "bg-emerald-500", scheduled: "bg-sky-500", inactive: "bg-muted-foreground/40" } as const;
  const stLabel = { ongoing: t("Davam edir"), scheduled: t("Planlaşdırılıb"), inactive: t("Dayandırılıb") };

  if (edit) return <Editor init={edit} color={w.color} name={w.title} liveOn={liveOn} onCancel={() => setEdit(null)} onSave={save} />;
  const full = rules.length >= MAX_CAMPAIGNS;

  return (
    <div className="flex flex-col gap-4">
      <PlanLockNotice feature="campaigns" />
      <SwitchRow checked={enabled} onChange={(v) => void persist(rules, v, v ? t("Kampaniyalar aktivləşdi.") : t("Bütün kampaniyalar dayandırıldı."))} on={t("Aktiv")} off={t("Söndürülüb")}
        title={t("Kampaniyalar saytda göstərilir")} description={t("Ziyarətçi yazmamış, şərtə uyğun gələndə çat düyməsinin yanında kart çıxır. Mətn sənindir, AI xərci yoxdur. Söndürsən, heç bir kampaniya göstərilmir.")} />

      {picking && (
        <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
          <div className="flex items-center"><h3 className="flex-1 font-medium">{t("Hazır nümunədən başla")}</h3><Button variant="ghost" size="sm" onClick={() => setPicking(false)} aria-label={t("Bağla")}><X size={16} aria-hidden /></Button></div>
          <div className="grid gap-2 sm:grid-cols-2">
            {templates(t).map((x) => (
              <button key={x.key} type="button" onClick={() => { setPicking(false); setEdit(x.r); }} className="flex cursor-pointer flex-col items-start gap-1 rounded-lg border border-border p-3 text-left hover:border-primary hover:bg-primary/5">
                <span className="font-medium">{x.label}</span><span className="text-xs text-muted-foreground">{x.hint}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {!list.length ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border px-6 py-12 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary"><Megaphone size={22} aria-hidden /></span>
          <h3 className="font-semibold">{filter === "all" ? t("Hələ kampaniya yoxdur") : t("Bu qovluqda kampaniya yoxdur")}</h3>
          {filter === "all" && <p className="max-w-md text-sm text-muted-foreground">{t("Ziyarətçini ilk sən salamla: yeni gələnlərə, geri qayıdanlara və ya operator onlayn olanda fərqli kart göstər.")}</p>}
          {filter === "all" && !picking && <Button onClick={() => setPicking(true)}><Plus size={15} aria-hidden />{t("Yeni kampaniya")}</Button>}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {list.map((r) => {
            const st = campStatus(r);
            return (
              <article key={r.id} className={cn("flex flex-col gap-4 rounded-2xl border border-border bg-muted/30 p-4", (!enabled || st !== "ongoing") && "opacity-80")}>
                <header className="flex items-start gap-2">
                  <span className={cn("mt-2 size-2.5 shrink-0 rounded-full", enabled ? dot[st] : dot.inactive)} title={stLabel[st]} />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-base font-semibold">{r.name || r.title || r.text.slice(0, 40)}</h3>
                    <p className="text-xs text-muted-foreground">{enabled ? stLabel[st] : t("Kampaniyalar söndürülüb")}{r.online && !liveOn ? ` · ${t("canlı söhbət bağlıdır")}` : ""}</p>
                  </div>
                  <RowMenu items={[
                    { label: t("Redaktə et"), icon: Pencil, run: () => setEdit(r) },
                    r.active === false ? { label: t("Davam etdir"), icon: Play, run: () => void persist(rules.map((x) => (x.id === r.id ? { ...x, active: true } : x)), enabled, t("Kampaniya aktivləşdi.")) }
                      : { label: t("Dayandır"), icon: Pause, run: () => void persist(rules.map((x) => (x.id === r.id ? { ...x, active: false } : x)), enabled, t("Kampaniya dayandırıldı.")) },
                    ...(full ? [] : [{ label: t("Kopyala"), icon: Copy, run: () => { const { id: _id, ...rest } = r; setEdit({ ...rest, name: `${r.name || r.title || t("Kampaniya")} (2)`, active: false }); } }]),
                    { label: t("Statistikanı sıfırla"), icon: RotateCcw, run: async () => { try { await resetCampaignStats(r.id); reloadStats(); toast.success(t("Statistika sıfırlandı.")); } catch (e) { toast.error((e as Error).message); } } },
                    { label: t("Sil"), icon: Trash2, danger: true, run: () => { if (window.confirm(t("Kampaniya silinsin?"))) void persist(rules.filter((x) => x.id !== r.id), enabled, t("Silindi.")); } },
                  ]} />
                </header>
                <button type="button" onClick={() => setEdit(r)} className="flex cursor-pointer justify-center rounded-xl py-2 transition hover:bg-card/60" aria-label={t("Redaktə et")}>
                  <CampaignPreview r={r} color={w.color} name={w.title} className="pointer-events-none" />
                </button>
                <Conditions r={r} />
                <Stats s={stats[r.id]} />
                <div className="flex items-center gap-2 text-sm">
                  <Switch checked={r.active !== false} label={t("Kampaniya aktivdir")} onChange={(v) => void persist(rules.map((x) => (x.id === r.id ? { ...x, active: v } : x)))} />
                  <span className="text-muted-foreground">{r.active !== false ? t("Aktiv") : t("Dayandırılıb")}</span>
                </div>
              </article>
            );
          })}
        </div>
      )}
      {!full && !!list.length && !picking && <Button variant="outline" className="self-start" onClick={() => setPicking(true)}><Plus size={15} aria-hidden />{t("Yeni kampaniya")}</Button>}
      {full && <p className="text-xs text-muted-foreground">{t("Ən çox {n} kampaniya ola bilər.", { n: MAX_CAMPAIGNS })}</p>}
      <p className="text-xs text-muted-foreground">{t("Başqa şərt üçün (məsələn, səbət tərk edilib) saytın skriptindən çağır:")} <code className="font-mono">CarAdvisor.proactive(&quot;Səbətində məhsul qalıb, kömək edim?&quot;)</code> · <Link href="/embed" className="text-primary underline">{t("Vidjet ayarları")}</Link></p>
    </div>
  );
}
