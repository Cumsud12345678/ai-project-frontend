"use client";
// Avtomatlaşdırmalar: "nə vaxt [hadisə] → [addımlar]". Göndərmə yerləri (Telegram qrupu, Bitrix24, webhook) "Bağlantılar"dadır.
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Bell, CalendarClock, CheckCircle2, CircleAlert, FlaskConical, Inbox as InboxIcon, Mail, MessageSquareX, Pencil, Plug, Plus, Send, Sheet, Tag, ThumbsDown, Ticket, Trash2, Webhook, Workflow, type LucideIcon } from "lucide-react";
import { getAutomations, saveAutomations, testAutomation, type AutoAction, type AutoTrigger, type Automation, type AutomationsView } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { RequireTenant } from "@/components/session";
import { FormSkeleton } from "@/components/skeletons";
import { LeadForwardCard } from "@/components/lead-forward-card";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { RowMenu } from "@/components/ui/row-menu";
import { Switch } from "@/components/ui/switch";

type ActType = AutoAction["type"];
const ALLOWED: Record<AutoTrigger, ActType[]> = {
  lead: ["telegram", "webhook", "bitrix"],
  bad_rating: ["telegram", "email", "webhook", "ticket", "tag"],
  chat_closed: ["telegram", "email", "webhook", "bitrix", "ticket", "tag"],
  daily: ["telegram", "email", "webhook"],
};
const T_ICON: Record<AutoTrigger, LucideIcon> = { lead: InboxIcon, bad_rating: ThumbsDown, chat_closed: MessageSquareX, daily: CalendarClock };
const A_ICON: Record<ActType, LucideIcon> = { telegram: Send, email: Mail, webhook: Webhook, bitrix: Sheet, ticket: Ticket, tag: Tag };

function useLabels() {
  const { t } = useI18n();
  const trig: Record<AutoTrigger, { label: string; when: string; hint: string }> = {
    lead: { label: t("Yeni müraciət"), when: t("yeni müraciət gələndə"), hint: t("Ziyarətçi əlaqə formasını dolduranda (sayt, Telegram, WhatsApp)") },
    bad_rating: { label: t("Pis qiymət"), when: t("pis qiymət veriləndə"), hint: t("Operator söhbətinə 1-2 ulduz və ya AI cavabına 👎") },
    chat_closed: { label: t("Söhbət bağlandı"), when: t("canlı söhbət bağlananda"), hint: t("Operator və ya müştəri canlı söhbəti bitirəndə") },
    daily: { label: t("Hər gün"), when: t("hər gün"), hint: t("Seçdiyin saatda dünənki xülasə") },
  };
  const act: Record<ActType, { label: string; does: string }> = {
    telegram: { label: t("Telegram qrupu"), does: t("Telegram qrupuna yaz") },
    email: { label: t("E-poçt"), does: t("mənə e-poçt göndər") },
    webhook: { label: t("Google Sheets / webhook"), does: t("Google Sheets-ə (webhook) yaz") },
    bitrix: { label: "Bitrix24", does: t("Bitrix24-də lid yarat") },
    ticket: { label: t("Müraciət yarat"), does: t("müraciət yarat") },
    tag: { label: t("Teq qoy"), does: t("söhbətə teq qoy") },
  };
  return { trig, act };
}

/** Cümlə şəklində təsvir: "Yeni müraciət gələndə → Telegram qrupuna yaz, Bitrix24-də lid yarat" */
function Sentence({ a, big }: { a: Automation; big?: boolean }) {
  const { t } = useI18n();
  const { trig, act } = useLabels();
  const TI = T_ICON[a.trigger];
  const chip = cn("inline-flex items-center gap-1 rounded-lg px-2 py-0.5 font-medium", big ? "text-lg" : "text-sm");
  const when = a.trigger === "daily" ? `${trig.daily.when} ${String(a.when?.hour ?? 9).padStart(2, "0")}:00` : trig[a.trigger].when;
  return (
    <p className={cn("flex flex-wrap items-center gap-x-1.5 gap-y-1.5 leading-relaxed", big ? "text-lg" : "text-sm")}>
      <span className="text-muted-foreground">{t("Nə vaxt")}</span>
      <span className={cn(chip, "bg-amber/15 text-amber")}><TI size={big ? 17 : 14} aria-hidden />{when}</span>
      <span className="text-muted-foreground">→</span>
      {a.actions.map((x, i) => {
        const AI = A_ICON[x.type];
        return <span key={i} className={cn(chip, "bg-muted text-foreground")}><AI size={big ? 17 : 14} aria-hidden />{x.type === "tag" ? `${act.tag.does}: ${x.tag}` : x.type === "ticket" && x.priority === "high" ? `${act.ticket.does} (${t("yüksək prioritet")})` : act[x.type].does}</span>;
      })}
    </p>
  );
}

function templates(t: (k: string) => string): { key: string; a: Automation; note: string }[] {
  const mk = (name: string, trigger: AutoTrigger, actions: AutoAction[], when?: Automation["when"]): Automation => ({ name, trigger, actions, enabled: true, ...(when && { when }) });
  return [
    { key: "lead-tg", a: mk(t("Yeni müraciəti Telegram qrupuna göndər"), "lead", [{ type: "telegram" }]), note: t("Satış komandası müraciəti dərhal qrupda görür") },
    { key: "lead-crm", a: mk(t("Yeni müraciəti Bitrix24-ə ötür"), "lead", [{ type: "bitrix" }]), note: t("Hər müraciət CRM-də lid olur") },
    { key: "bad-ticket", a: mk(t("Pis qiymətdən müraciət yarat"), "bad_rating", [{ type: "ticket", priority: "high" }, { type: "tag", tag: t("Şikayət") }, { type: "telegram" }], { source: "csat" }), note: t("Narazı müştəri itməsin: müraciət yüksək prioritetlə açılır") },
    { key: "daily-tg", a: mk(t("Səhər xülasəsi Telegrama"), "daily", [{ type: "telegram" }], { hour: 9 }), note: t("Hər səhər dünənki söhbətlər, müraciətlər, cavabsız suallar") },
    { key: "daily-mail", a: mk(t("Səhər xülasəsi e-poçtla"), "daily", [{ type: "email" }], { hour: 9 }), note: t("Panelə girmədən nəyin getdiyini gör") },
    { key: "closed-sheet", a: mk(t("Bağlanan söhbəti Google Sheets-ə yaz"), "chat_closed", [{ type: "webhook" }], { withContact: true }), note: t("Əlaqəsi olan hər söhbət cədvəldə qalır") },
    { key: "closed-lead", a: mk(t("Söhbətdə əlaqə varsa müraciət yarat"), "chat_closed", [{ type: "ticket", priority: "normal" }], { withContact: true }), note: t("Operator unutsa da müştəri itmir") },
  ];
}

function Editor({ init, view, onCancel, onSave, saving, openConnections }: { init: Automation; view: AutomationsView; onCancel: () => void; onSave: (a: Automation) => void; saving: boolean; openConnections: () => void }) {
  const { t } = useI18n();
  const { trig, act } = useLabels();
  const [a, setA] = useState<Automation>(init);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ type: ActType; ok: boolean; note?: string }[] | null>(null);
  const set = (p: Partial<Automation>) => { setA((x) => ({ ...x, ...p })); setResult(null); };
  const setWhen = (p: NonNullable<Automation["when"]>) => set({ when: { ...a.when, ...p } });
  const has = (k: ActType) => a.actions.some((x) => x.type === k);
  const toggle = (k: ActType, on: boolean) => set({ actions: on ? [...a.actions, k === "ticket" ? { type: k, priority: "normal" } : k === "tag" ? { type: k, tag: "" } : { type: k } as AutoAction] : a.actions.filter((x) => x.type !== k) });
  const changeTrigger = (tr: AutoTrigger) => set({ trigger: tr, actions: a.actions.filter((x) => ALLOWED[tr].includes(x.type)), when: tr === "daily" ? { hour: a.when?.hour ?? 9 } : {} });
  const c = view.connections;
  const connected: Partial<Record<ActType, boolean>> = { telegram: Boolean(c.telegram), webhook: Boolean(c.webhook), bitrix: Boolean(c.bitrix) };
  const tagBad = a.actions.some((x) => x.type === "tag" && !x.tag.trim());
  const valid = a.name.trim() && a.actions.length > 0 && !tagBad;
  async function runTest() {
    setTesting(true);
    try { setResult((await testAutomation(a)).steps); } catch (e) { toast.error((e as Error).message); } finally { setTesting(false); }
  }
  const sel = "h-10 rounded-md border border-border bg-card px-3 text-sm";

  return (
    <Modal open onClose={onCancel} busy={saving} size="lg" title={init.id ? t("Avtomatlaşdırmanı redaktə et") : t("Yeni avtomatlaşdırma")}
      footer={<>
        <Button type="button" variant="outline" className="mr-auto" disabled={!valid || testing} onClick={runTest}><FlaskConical size={15} aria-hidden />{testing ? t("Sınanır…") : t("Sına")}</Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>{t("Ləğv et")}</Button>
        <Button type="submit" form="auto-form" disabled={!valid || saving}>{saving ? t("Saxlanır…") : t("Saxla")}</Button>
      </>}>
      <form id="auto-form" onSubmit={(e) => { e.preventDefault(); if (valid) onSave({ ...a, name: a.name.trim() }); }} className="flex flex-col gap-5">
        <div className="rounded-2xl bg-muted/50 p-4"><Sentence a={a} big /></div>
        <div className="flex flex-col gap-1"><Label htmlFor="au-name">{t("Ad")}</Label><Input id="au-name" value={a.name} maxLength={60} onChange={(e) => set({ name: e.target.value })} placeholder={t("məs. Pis qiymətdən müraciət yarat")} required /></div>

        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">{t("Nə vaxt")}</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {(Object.keys(trig) as AutoTrigger[]).map((k) => {
              const I = T_ICON[k];
              return (
                <button key={k} type="button" aria-pressed={a.trigger === k} onClick={() => changeTrigger(k)}
                  className={cn("flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-left", a.trigger === k ? "border-foreground bg-muted/50" : "border-border hover:border-foreground/40")}>
                  <I size={18} aria-hidden className="mt-0.5 shrink-0" />
                  <span><span className="block text-sm font-medium">{trig[k].label}</span><span className="text-xs text-muted-foreground">{trig[k].hint}</span></span>
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap items-end gap-3">
            {a.trigger === "daily" ? (
              <div className="flex flex-col gap-1"><Label htmlFor="au-hour">{t("Saat ({tz})", { tz: view.tz })}</Label>
                <select id="au-hour" className={sel} value={a.when?.hour ?? 9} onChange={(e) => setWhen({ hour: Number(e.target.value) })}>{Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>)}</select></div>
            ) : (
              <div className="flex flex-col gap-1"><Label htmlFor="au-ch">{t("Kanal")}</Label>
                <select id="au-ch" className={sel} value={a.when?.channel ?? "any"} onChange={(e) => setWhen({ channel: e.target.value as "any" })}><option value="any">{t("Hamısı")}</option><option value="site">{t("Sayt")}</option><option value="telegram">Telegram</option><option value="whatsapp">WhatsApp</option></select></div>
            )}
            {a.trigger === "bad_rating" && (
              <div className="flex flex-col gap-1"><Label htmlFor="au-src">{t("Hansı qiymət")}</Label>
                <select id="au-src" className={sel} value={a.when?.source ?? "any"} onChange={(e) => setWhen({ source: e.target.value as "any" })}><option value="any">{t("İkisi də")}</option><option value="csat">{t("Operator söhbətinə 1-2 ulduz")}</option><option value="feedback">{t("AI cavabına 👎")}</option></select></div>
            )}
            {a.trigger === "chat_closed" && (
              <label className="flex h-10 items-center gap-2 text-sm"><input type="checkbox" checked={a.when?.withContact === true} onChange={(e) => setWhen({ withContact: e.target.checked })} />{t("Yalnız müştəri əlaqə qoyubsa")}</label>
            )}
          </div>
        </section>

        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">{t("Nə etsin")}</h3>
          <ul className="overflow-hidden rounded-xl border border-border">
            {ALLOWED[a.trigger].map((k) => {
              const I = A_ICON[k];
              const cur = a.actions.find((x) => x.type === k);
              const needs = k in connected && !connected[k];
              return (
                <li key={k} className="flex flex-wrap items-center gap-3 border-b border-border px-3 py-2.5 last:border-b-0">
                  <input type="checkbox" id={`au-a-${k}`} checked={has(k)} onChange={(e) => toggle(k, e.target.checked)} />
                  <I size={16} aria-hidden className="shrink-0 text-muted-foreground" />
                  <label htmlFor={`au-a-${k}`} className="min-w-0 flex-1 cursor-pointer text-sm">{act[k].does}</label>
                  {needs && <button type="button" onClick={openConnections} className="cursor-pointer text-xs font-medium text-amber hover:underline">{t("Qoşulmayıb · qoş")}</button>}
                  {cur?.type === "ticket" && <select aria-label={t("Prioritet")} className="h-8 rounded-md border border-border bg-card px-2 text-xs" value={cur.priority} onChange={(e) => set({ actions: a.actions.map((x) => (x.type === "ticket" ? { type: "ticket", priority: e.target.value as "high" } : x)) })}><option value="normal">{t("Normal prioritet")}</option><option value="high">{t("Yüksək prioritet")}</option></select>}
                  {cur?.type === "tag" && <Input aria-label={t("Teq")} value={cur.tag} maxLength={24} onChange={(e) => set({ actions: a.actions.map((x) => (x.type === "tag" ? { type: "tag", tag: e.target.value } : x)) })} placeholder={t("məs. Şikayət")} className="h-8 w-40 text-xs" />}
                </li>
              );
            })}
          </ul>
          {(has("ticket") || has("tag")) && <p className="text-xs text-muted-foreground">{t("Müraciət yalnız müştəri telefon və ya e-poçt qoyubsa yaranır; teq yalnız canlı söhbətə qoyulur.")}</p>}
          {a.trigger === "lead" && <p className="text-xs text-muted-foreground">{t("Yeni müraciət haqqında e-poçtu onsuz da alırsan, ona görə burada e-poçt addımı yoxdur.")}</p>}
        </section>

        {result && (
          <section className="flex flex-col gap-1.5 rounded-xl bg-muted/50 p-3 text-sm">
            <p className="font-medium">{t("Sınaq nəticəsi")}</p>
            {result.map((s, i) => <p key={i} className="flex items-start gap-2">{s.ok ? <CheckCircle2 size={15} aria-hidden className="mt-0.5 shrink-0 text-emerald-600" /> : <CircleAlert size={15} aria-hidden className="mt-0.5 shrink-0 text-destructive" />}<span>{act[s.type].does}{s.note ? ` · ${t(s.note)}` : ""}</span></p>)}
            <p className="text-xs text-muted-foreground">{t("Sınaqda mesajlar “Sınaq” qeydi ilə göndərilir; lid, müraciət və teq yaradılmır.")}</p>
          </section>
        )}
      </form>
    </Modal>
  );
}

function Automations() {
  const { t, short } = useI18n();
  const [view, setView] = useState<AutomationsView | null>(null);
  const [error, setError] = useState("");
  const [edit, setEdit] = useState<{ a: Automation; index: number | null } | null>(null);
  const [picker, setPicker] = useState(false);
  const [conns, setConns] = useState(false);
  const [saving, setSaving] = useState(false);
  const [del, setDel] = useState<number | null>(null);
  const load = useCallback(() => getAutomations().then(setView).catch((e: Error) => setError(e.message)), []);
  useEffect(() => { void load(); }, [load]);

  async function persist(items: Automation[], ok?: string): Promise<boolean> {
    setSaving(true);
    try { setView(await saveAutomations(items)); if (ok) toast.success(ok); return true; }
    catch (e) { toast.error((e as Error).message); return false; }
    finally { setSaving(false); }
  }
  if (!view) return error ? <p role="alert" className="text-sm text-destructive">{error}</p> : <FormSkeleton />;
  const items = view.items;
  const full = items.length >= view.max;
  const c = view.connections;
  const nConn = [c.telegram, c.bitrix, c.webhook].filter(Boolean).length;
  const newBtn = <Button onClick={() => setPicker(true)} disabled={full}><Plus size={16} aria-hidden />{t("Yeni avtomatlaşdırma")}</Button>;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={t("Avtomatlaşdırmalar")}
        description={t("Hadisə baş verəndə köməkçi sənin yerinə iş görsün: müraciəti komandaya ötürsün, narazı müştəri üçün müraciət açsın, hər səhər xülasə göndərsin.")}
        actions={<><Button variant="outline" onClick={() => setConns(true)}><Plug size={16} aria-hidden />{t("Bağlantılar")}{nConn > 0 && <span className="rounded-full bg-muted px-1.5 text-xs tabular-nums">{nConn}</span>}</Button>{newBtn}</>} />

      <section className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 font-semibold">{t("Mənim avtomatlaşdırmalarım")} <span className="rounded-full bg-muted px-2 text-xs tabular-nums text-muted-foreground">{items.length}</span></h2>
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border px-6 py-10 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-muted"><Workflow size={22} aria-hidden /></span>
            <h3 className="font-semibold">{t("Hələ avtomatlaşdırma yoxdur")}</h3>
            <p className="max-w-md text-sm text-muted-foreground">{t("Aşağıdakı hazır şablonlardan birini bir kliklə əlavə et və ya özün qur.")}</p>
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {items.map((a, i) => (
              <article key={a.id ?? i} className={cn("flex flex-col gap-3 rounded-2xl border border-border bg-card p-4", !a.enabled && "opacity-70")}>
                <header className="flex items-start gap-3">
                  <h3 className="min-w-0 flex-1 font-semibold">{a.name}</h3>
                  <Switch checked={a.enabled} label={a.name} onChange={(v) => void persist(items.map((x, j) => (j === i ? { ...x, enabled: v } : x)), v ? t("Aktivləşdi.") : t("Söndürüldü."))} />
                  <RowMenu items={[
                    { label: t("Redaktə et"), icon: Pencil, run: () => setEdit({ a, index: i }) },
                    { label: t("Sil"), icon: Trash2, danger: true, run: () => setDel(i) },
                  ]} />
                </header>
                <Sentence a={a} />
                <p className={cn("flex items-center gap-1.5 text-xs", a.lastRun && !a.lastRun.ok ? "text-destructive" : "text-muted-foreground")}>
                  {a.lastRun ? (a.lastRun.ok ? <CheckCircle2 size={13} aria-hidden className="text-emerald-600" /> : <CircleAlert size={13} aria-hidden />) : <Bell size={13} aria-hidden />}
                  {a.lastRun ? `${t("Son işləmə")}: ${short(a.lastRun.at)}${a.lastRun.error ? ` · ${a.lastRun.error}` : ""}` : t("Hələ işləməyib")}
                  {a.runs ? <span className="ml-auto tabular-nums">{t("{n} dəfə", { n: a.runs })}</span> : null}
                </p>
              </article>
            ))}
          </div>
        )}
        {view.implicit && items.length > 0 && <p className="text-xs text-muted-foreground">{t("Bu qayda qoşduğun bağlantılardan avtomatik yaranıb. Dəyişəndə və ya yenisini əlavə edəndə siyahı saxlanacaq.")}</p>}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 font-semibold">{t("Hazır şablonlar")} <span className="rounded-full bg-muted px-2 text-xs tabular-nums text-muted-foreground">{templates(t).length}</span></h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {templates(t).map((x) => (
            <article key={x.key} className="flex flex-col gap-2 rounded-2xl bg-muted/50 p-4">
              <h3 className="font-semibold">{x.a.name}</h3>
              <p className="flex-1 text-sm text-muted-foreground">{x.note}</p>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">{x.a.actions.map((y) => t(y.type === "telegram" ? "Telegram qrupu" : y.type === "email" ? "E-poçt" : y.type === "webhook" ? "Google Sheets / webhook" : y.type === "bitrix" ? "Bitrix24" : y.type === "ticket" ? "Müraciət yarat" : "Teq qoy")).join(" · ")}</span>
                <Button size="sm" variant="outline" className="shrink-0 whitespace-nowrap" disabled={full} onClick={() => setEdit({ a: { ...x.a }, index: null })}>{t("Əlavə et")}</Button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {edit && <Editor init={edit.a} view={view} saving={saving} onCancel={() => setEdit(null)} openConnections={() => setConns(true)}
        onSave={async (a) => { if (await persist(edit.index === null ? [...items, a] : items.map((x, j) => (j === edit.index ? a : x)), t("Saxlandı."))) setEdit(null); }} />}

      <Modal open={picker} onClose={() => setPicker(false)} size="lg" title={t("Yeni avtomatlaşdırma")} description={t("Şablondan başla və ya boş qur.")}>
        <div className="grid gap-2 sm:grid-cols-2">
          {templates(t).map((x) => (
            <button key={x.key} type="button" onClick={() => { setPicker(false); setEdit({ a: { ...x.a }, index: null }); }} className="flex cursor-pointer flex-col items-start gap-1 rounded-xl border border-border p-4 text-left hover:border-foreground/40 hover:bg-muted/40">
              <span className="font-medium">{x.a.name}</span><span className="text-xs text-muted-foreground">{x.note}</span>
            </button>
          ))}
          <button type="button" onClick={() => { setPicker(false); setEdit({ a: { name: "", trigger: "lead", actions: [], enabled: true }, index: null }); }} className="flex cursor-pointer flex-col items-start gap-1 rounded-xl border border-dashed border-border p-4 text-left hover:border-foreground/40">
            <span className="font-medium">{t("Boşdan qur")}</span><span className="text-xs text-muted-foreground">{t("Hadisəni və addımları özün seç")}</span>
          </button>
        </div>
      </Modal>

      <Modal open={conns} onClose={() => setConns(false)} size="lg" title={t("Bağlantılar")} description={t("Avtomatlaşdırmaların mesaj göndərdiyi yerlər. Heç bir rəsmi icazə lazım deyil: linki özün yaradıb bura yapışdırırsan.")}>
        <LeadForwardCard bare onChange={() => void load()} />
      </Modal>

      <Modal open={del !== null} onClose={() => setDel(null)} size="sm" title={t("Avtomatlaşdırma silinsin?")}
        footer={<><Button variant="outline" onClick={() => setDel(null)}>{t("Ləğv et")}</Button><Button variant="destructive" disabled={saving} onClick={async () => { if (del !== null && await persist(items.filter((_, j) => j !== del), t("Silindi."))) setDel(null); }}>{t("Sil")}</Button></>}>
        <p className="text-sm font-medium">{del !== null ? items[del]?.name : ""}</p>
      </Modal>
    </div>
  );
}

export default function AutomationsPage() {
  return <RequireTenant><Automations /></RequireTenant>;
}
