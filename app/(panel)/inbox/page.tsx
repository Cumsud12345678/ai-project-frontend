"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Ban, Bot, Check, CheckCheck, Hourglass, CircleHelp, Clock, Inbox as InboxIcon, Mail, MessageCircle, MessagesSquare, Phone, Send, ShoppingBag, Star, Trash2, Undo2, UserRound, UserRoundX } from "lucide-react";
import { toast } from "sonner";
import { deleteLead, getBlocks, getChannelChats, getLeads, getLiveCount, getLiveList, getTeam, getVisitors, getUnanswered, unblock, updateLead, type BlockItem, type LeadRow, type LeadStatus, type LiveItem, type UnansweredRow } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useLiveEvents } from "@/lib/live-socket";
import { RequireTenant, useSession } from "@/components/session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LiveInbox, type LiveFolder } from "@/components/live-inbox";
import { NotifyBar } from "@/components/notify-bar";
import { KnowledgeGaps } from "@/components/knowledge-gaps";
import { FolderPane, Pane, type FolderItem } from "@/components/folder-pane";
import { ChannelChats } from "@/components/channel-chats";
import { AiWatch } from "@/components/ai-watch";

const STATUS_ORDER: LeadStatus[] = ["new", "open", "pending", "solved"];
const statusOf = (l: LeadRow): LeadStatus => l.status ?? (l.handled ? "solved" : "new");

/** Müraciət kartı: vəziyyət, prioritet, məsul, daxili qeydlər və tarixçə */
function LeadCard({ l, team, reload }: { l: LeadRow; team: string[]; reload: () => void }) {
  const { t, short } = useI18n();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const isMail = l.contact.includes("@");
  const st = statusOf(l), pr = l.priority ?? "normal";
  const stLabel: Record<LeadStatus, string> = { new: t("Yeni"), open: t("İşdədir"), pending: t("Gözləmədə"), solved: t("Həll olunub") };
  const stColor: Record<LeadStatus, string> = { new: "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/20", open: "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-600/20", pending: "bg-violet-500/10 text-violet-700", solved: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20" };
  const prLabel = { low: t("Aşağı"), normal: t("Normal"), high: t("Yüksək") };
  async function patch(p: Parameters<typeof updateLead>[1], ok?: string) {
    setBusy(true);
    try { await updateLead(l.id, p); if (ok) toast.success(ok); reload(); } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  const evText = (e: string) => {
    const [k, v = ""] = e.split(":");
    return k === "status" ? t("vəziyyət: {v}", { v: stLabel[v as LeadStatus] ?? v }) : k === "priority" ? t("prioritet: {v}", { v: prLabel[v as keyof typeof prLabel] ?? v }) : k === "assignee" ? (v === "-" ? t("məsul götürüldü") : t("məsul: {v}", { v })) : e;
  };
  const sel = "h-8 rounded-md border border-border bg-card px-2 text-xs";
  return (
    <li className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
            {l.name || t("Adsız")}
            <Badge className={stColor[st]}>{stLabel[st]}</Badge>
            {pr === "high" && <Badge className="bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20">↑ {prLabel.high}</Badge>}
            {l.assignee && <span className="inline-flex items-center gap-1 text-xs font-normal text-muted-foreground"><UserRound size={12} aria-hidden />{l.assignee.name}</span>}
          </p>
          <a href={isMail ? `mailto:${l.contact}` : `tel:${l.contact.replace(/[^\d+]/g, "")}`} className="mt-1 inline-flex items-center gap-1.5 text-sm text-primary underline">
            {isMail ? <Mail size={14} aria-hidden /> : <Phone size={14} aria-hidden />}{l.contact}
          </a>
          {l.order ? (
            // AI-ın topladığı sifariş: sahələr cədvəl kimi (operator zəng edəndə hər şey gözünün önündədir)
            <div className="mt-2 rounded-lg border border-border bg-muted/40 p-3 text-sm">
              <p className="mb-1.5 flex items-center gap-1.5 font-medium"><ShoppingBag size={14} aria-hidden />{l.order.title}</p>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                {l.order.fields.map((f) => <div key={f.label} className="contents"><dt className="text-muted-foreground">{f.label}</dt><dd className="break-words">{f.value}</dd></div>)}
              </dl>
            </div>
          ) : l.question && <p className="mt-2 break-words text-sm text-muted-foreground">“{l.question}”</p>}
          <p className="mt-1 text-xs text-muted-foreground">{short(l.at)}</p>
        </div>
        <Button size="sm" variant="ghost" aria-label={t("Sil")} onClick={async () => { try { await deleteLead(l.id); toast.success(t("Silindi.")); reload(); } catch (e) { toast.error((e as Error).message); } }}><Trash2 size={14} aria-hidden /></Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <select aria-label={t("Vəziyyət")} disabled={busy} value={st} onChange={(e) => patch({ status: e.target.value as LeadStatus })} className={sel}>
          {STATUS_ORDER.map((x) => <option key={x} value={x}>{stLabel[x]}</option>)}
        </select>
        <select aria-label={t("Prioritet")} disabled={busy} value={pr} onChange={(e) => patch({ priority: e.target.value as "low" | "normal" | "high" })} className={sel}>
          {(["low", "normal", "high"] as const).map((x) => <option key={x} value={x}>{t("Prioritet")}: {prLabel[x]}</option>)}
        </select>
        <select aria-label={t("Məsul")} disabled={busy} value={l.assignee?.name ?? ""} onChange={(e) => patch({ assignee: e.target.value ? { name: e.target.value } : null })} className={sel}>
          <option value="">{t("Məsul: yoxdur")}</option>
          {[...new Set([...team, ...(l.assignee ? [l.assignee.name] : [])])].map((n) => <option key={n} value={n}>{t("Məsul")}: {n}</option>)}
        </select>
        {st !== "solved" && <Button size="sm" variant="outline" disabled={busy} onClick={() => patch({ status: "solved" }, t("Həll olundu."))}><Check size={14} aria-hidden />{t("Həll olundu")}</Button>}
        {st === "solved" && <Button size="sm" variant="ghost" disabled={busy} onClick={() => patch({ status: "open" })}><Undo2 size={14} aria-hidden />{t("Yenidən aç")}</Button>}
      </div>
      {!!l.conversation?.length && (
        <details className="text-sm">
          <summary className="cursor-pointer text-primary">{t("Söhbətə bax ({n} mesaj)", { n: l.conversation.length })}</summary>
          <ul className="mt-2 flex flex-col gap-1.5 rounded-md bg-muted/50 p-3">
            {l.conversation.map((m, i) => <li key={i} className="break-words"><span className="font-medium">{m.role === "user" ? t("Ziyarətçi") : t("Çat")}:</span> {m.text}</li>)}
          </ul>
        </details>
      )}
      <div className="flex flex-col gap-2 border-t border-border pt-3 text-sm">
        {(l.notes ?? []).map((n, i) => <p key={i} className="whitespace-pre-wrap break-words rounded-md bg-amber/10 p-2"><span className="block text-[10px] text-muted-foreground">{n.by} · {short(n.at)}</span>{n.text}</p>)}
        <form className="flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); const v = note.trim(); if (v) patch({ note: v }).then(() => setNote("")); }}>
          <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} placeholder={t("Daxili qeyd yaz… (yalnız komanda görür)")} aria-label={t("Daxili qeyd")} className="h-8 min-w-0 flex-1 rounded-md border border-border bg-card px-2.5 text-sm" />
          <Button size="sm" variant="outline" disabled={busy || !note.trim()}>{t("Əlavə et")}</Button>
        </form>
        {!!l.history?.length && (
          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer">{t("Tarixçə ({n})", { n: l.history.length })}</summary>
            <ul className="mt-1.5 flex flex-col gap-1">{[...l.history].reverse().map((h, i) => <li key={i}>{short(h.at)} · {h.by} · {evText(h.e)}</li>)}</ul>
          </details>
        )}
      </div>
    </li>
  );
}

function Leads({ rows, reload, empty }: { rows: LeadRow[]; reload: () => void; empty: string }) {
  const { me } = useSession();
  const [team, setTeam] = useState<string[]>([]);
  useEffect(() => {
    const mine = myNameOf(me?.email);
    getTeam().then((r) => setTeam([mine, ...r.members.filter((m) => m.joined).map((m) => myNameOf(m.email))])).catch(() => setTeam([mine]));
  }, [me?.email]);
  if (!rows.length) return <p className="text-sm text-muted-foreground">{empty}</p>;
  const order = { high: 0, normal: 1, low: 2 };
  return <ul className="flex flex-col gap-3">{[...rows].sort((a, b) => order[a.priority ?? "normal"] - order[b.priority ?? "normal"] || b.at.localeCompare(a.at)).map((l) => <LeadCard key={l.id} l={l} team={team} reload={reload} />)}</ul>;
}

/** Bloklanmış ziyarətçilər və kanal müştəriləri */
function Blocked() {
  const { t, short } = useI18n();
  const [items, setItems] = useState<BlockItem[] | null>(null);
  const load = useCallback(() => { getBlocks().then((r) => setItems(r.items)).catch(() => setItems([])); }, []);
  useEffect(() => { load(); }, [load]);
  if (!items) return null;
  if (!items.length) return <p className="text-sm text-muted-foreground">{t("Bloklanmış müştəri yoxdur. Spam və ya təhqir edən müştərini söhbətin sağ panelindən bloklaya bilərsən.")}</p>;
  const kind = (k: string) => (k.startsWith("tg:") ? "Telegram" : k.startsWith("wa:") ? "WhatsApp" : t("Sayt"));
  return (
    <ul className="divide-y divide-border rounded-xl border border-border bg-card">
      {items.map((b) => (
        <li key={b.key} className="flex items-center gap-3 px-4 py-3 text-sm">
          <Ban size={16} aria-hidden className="shrink-0 text-destructive" />
          <span className="min-w-0 flex-1"><span className="block truncate font-medium">{b.label}</span><span className="text-xs text-muted-foreground">{kind(b.key)} · {short(b.at)} · {b.by}</span></span>
          <Button size="sm" variant="outline" onClick={async () => { try { await unblock(b.key); toast.success(t("Blok götürüldü.")); load(); } catch (e) { toast.error((e as Error).message); } }}>{t("Bloku götür")}</Button>
        </li>
      ))}
    </ul>
  );
}

function Unanswered({ rows, reload }: { rows: UnansweredRow[]; reload: () => void }) {
  const { t } = useI18n();
  const { tenant } = useSession();
  if (!rows.length) return <p className="text-sm text-muted-foreground">{t("Cavabsız sual yoxdur. Çat bütün suallara cavab tapıb.")}</p>;
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">{t("Çatın cavab tapa bilmədiyi suallar. “Cavab ver” ilə düzgün cavabı bir dəfə yaz: köməkçi onu öyrənir və oxşar suallara özü cavab verir.")}</p>
      <KnowledgeGaps rows={rows} canAnswer={tenant?.config.profile?.mode !== "listings"} reload={reload} />
    </div>
  );
}

type FolderId = "ai" | "blocked" | "pending" | "open" | "mine" | "free" | "waiting" | "closed" | "site" | "telegram" | "whatsapp" | "vip" | "leads" | "handled" | "unanswered";
type Folder = FolderItem<FolderId> & { live?: LiveFolder; empty?: string };

const STORE = "inbox_folder";
const myNameOf = (email?: string) => (email || "").split("@")[0].slice(0, 40);

/**
 * Müraciətlər: bütün gələnlər bir yerdə. Solda qovluqlar (saylarla), ortada siyahı, sağda yazışma.
 * Canlı söhbətlər (vəziyyət və kanal üzrə), AI söhbətləri, əlaqə formasından gələn müraciətlər və cavabsız suallar.
 */
function Inbox() {
  const { t } = useI18n();
  const { me, isOperator } = useSession();
  const myName = myNameOf(me?.email);
  const [folder, setFolder] = useState<FolderId>("open");
  const [openId, setOpenId] = useState<string | undefined>();
  const [watchPid, setWatchPid] = useState("");
  const [live, setLive] = useState<Awaited<ReturnType<typeof getLiveCount>> | null>(null);
  const [items, setItems] = useState<LiveItem[]>([]);
  const [aiCount, setAiCount] = useState<number | undefined>();
  // Telegram/WhatsApp-da son 24 saatda botla yazışanlar (operatora ötürülməmişlər də)
  const [chCount, setChCount] = useState<{ telegram: number; whatsapp: number } | null>(null);
  const [leads, setLeads] = useState<Awaited<ReturnType<typeof getLeads>> | null>(null);
  const [un, setUn] = useState<Awaited<ReturnType<typeof getUnanswered>> | null>(null);
  const [error, setError] = useState("");

  // Son seçilən qovluq yadda qalır (yoxdursa: canlı söhbət açıqdırsa "Açıq", deyilsə "Müraciətlər")
  useEffect(() => {
    // Müştərilər səhifəsindən keçid: /inbox?chat=ID → həmin söhbət açılır
    const q = new URLSearchParams(window.location.search);
    const chat = q.get("chat"), f = q.get("f") as FolderId | null;
    if (chat) { setFolder(q.get("closed") ? "closed" : "open"); setOpenId(chat); return; }
    if (q.get("pid")) { setFolder("ai"); setWatchPid(q.get("pid")!); return; }
    if (f) { setFolder(f); return; }
    try { const v = localStorage.getItem(STORE) as FolderId | null; if (v) setFolder(v); } catch { /* yaddaş bağlıdır */ }
  }, []);
  const pick = (f: FolderId) => { setFolder(f); setOpenId(undefined); try { localStorage.setItem(STORE, f); } catch { /* yaddaş bağlıdır */ } };

  const loadLive = useCallback(() => {
    getChannelChats().then((r) => setChCount(r.counts)).catch(() => {});
    getLiveCount().then((c) => {
      setLive(c);
      if (c.enabled) {
        getLiveList("open").then((r) => setItems(r.items)).catch(() => {});
        getVisitors().then((r) => setAiCount(r.items.filter((v) => v.chat === "ai").length)).catch(() => {});
      } else { setItems([]); setAiCount(undefined); }
    }).catch(() => {});
  }, []);
  const loadForms = useCallback(() => {
    if (isOperator) return;
    Promise.all([getLeads(), getUnanswered()]).then(([l, u]) => { setLeads(l); setUn(u); setError(""); }).catch((e: Error) => setError(e.message));
  }, [isOperator]);
  useEffect(() => { loadLive(); loadForms(); const i = setInterval(loadLive, 15000); return () => clearInterval(i); }, [loadLive, loadForms]);
  useLiveEvents((e) => { if (e.t === "live" || e.t === "visitors" || e.t === "channels") loadLive(); }, true);
  useEffect(() => { if (live && !live.enabled && !isOperator && ["ai", "open", "mine", "free", "waiting"].includes(folder)) pick("leads"); }, [live?.enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  const isVip = (c: LiveItem) => !!c.tags?.some((g) => g.toLowerCase() === "vip");
  const n = (f: (c: LiveItem) => boolean) => items.filter(f).length;
  const lv = (who: LiveFolder["who"], ch: LiveFolder["ch"] = "all", status: LiveFolder["status"] = "open"): LiveFolder => ({ status, who, ch });
  const groups: { id: string; label: string; items: Folder[] }[] = [
    { id: "live", label: t("Canlı söhbət"), items: [
      { id: "ai", label: t("AI söhbətləri"), icon: Bot, color: "text-violet-600", count: aiCount },
      { id: "open", label: t("Açıq"), icon: MessagesSquare, count: items.length, live: lv("all"), empty: t("Açıq söhbət yoxdur. Ziyarətçi “Operatorla canlı yaz” bassa və ya Telegram/WhatsApp-da /operator yazsa burada görünəcək.") },
      { id: "waiting", label: t("Cavab gözləyir"), icon: Clock, alert: true, count: n((c) => c.waiting), live: lv("waiting"), empty: t("Hamısına cavab verilib.") },
      { id: "mine", label: t("Mənimkilər"), icon: UserRound, count: n((c) => c.assignee?.name === myName), live: lv("mine"), empty: t("Sənə təyin olunmuş söhbət yoxdur. Söhbəti açıb “Götür” bas.") },
      { id: "free", label: t("Təyin olunmamış"), icon: UserRoundX, count: n((c) => !c.assignee), live: lv("free"), empty: t("Bütün söhbətlərin operatoru var.") },
      { id: "closed", label: t("Bağlanmış"), icon: CheckCheck, live: lv("all", "all", "closed"), empty: t("Bağlanmış söhbət yoxdur.") },
      ...(isOperator ? [] : [{ id: "blocked" as const, label: t("Bloklanmış"), icon: Ban }]),
    ] },
    { id: "channels", label: t("Kanallar"), items: [
      { id: "site", label: t("Sayt"), icon: MessageCircle, count: n((c) => !c.channel), live: lv("all", "site"), empty: t("Saytdan açıq söhbət yoxdur.") },
      // Kanal qovluqları botun bütün yazışmalarını göstərir (əvvəl yalnız operatora ötürülənlər görünürdü)
      { id: "telegram", label: "Telegram", icon: Send, color: "text-[#229ED9]", count: chCount?.telegram },
      { id: "whatsapp", label: "WhatsApp", icon: Phone, color: "text-[#25D366]", count: chCount?.whatsapp },
      { id: "vip", label: "VIP", icon: Star, color: "text-amber", count: n(isVip), live: lv("all", "vip"), empty: t("VIP etiketli açıq söhbət yoxdur.") },
    ] },
    ...(isOperator ? [] : [{ id: "forms", label: t("Formalar və AI"), items: [
      { id: "leads" as const, label: t("Yeni və işdə"), icon: InboxIcon, count: leads?.items.filter((l) => ["new", "open"].includes(statusOf(l))).length },
      { id: "pending" as const, label: t("Gözləmədə"), icon: Hourglass, count: leads?.items.filter((l) => statusOf(l) === "pending").length },
      { id: "handled" as const, label: t("Həll olunmuş"), icon: Check },
      { id: "unanswered" as const, label: t("Cavabsız suallar"), icon: CircleHelp, count: un?.total },
    ] }]),
  ];
  const all = groups.flatMap((g) => g.items);
  const cur = all.find((f) => f.id === folder) ?? all[0]!;
  const liveFolder = Boolean(cur.live) || cur.id === "ai";

  const pane = (title: string, children: React.ReactNode) => <Pane title={title}>{children}</Pane>;

  let content: React.ReactNode;
  if (cur.live) content = live ? <LiveInbox key={cur.id} enabled={live.enabled} folder={cur.live} title={cur.label} empty={cur.empty ?? ""} open={openId} onChange={loadLive} /> : null;
  else if (cur.id === "telegram" || cur.id === "whatsapp") content = <ChannelChats key={cur.id} channel={cur.id} title={cur.label} liveEnabled={Boolean(live?.enabled)} onLive={(id) => { pick("open"); setOpenId(id); loadLive(); }} />;
  else if (cur.id === "ai") content = <AiWatch title={cur.label} initial={watchPid} onTaken={(id) => { pick("open"); setOpenId(id); loadLive(); }} />;
  else if (cur.id === "unanswered") content = pane(cur.label, un ? <Unanswered rows={un.items} reload={loadForms} /> : null);
  else if (cur.id === "blocked") content = pane(cur.label, <Blocked />);
  else {
    const want: LeadStatus[] = cur.id === "pending" ? ["pending"] : cur.id === "handled" ? ["solved"] : ["new", "open"];
    const empty = cur.id === "handled" ? t("Həll olunmuş müraciət yoxdur.") : cur.id === "pending" ? t("Gözləmədə müraciət yoxdur. Müştəridən cavab gözlədiyin müraciətləri bu vəziyyətə keçir.") : t("Hələ müraciət yoxdur. Çat cavab tapmayanda istifadəçi telefon və ya e-poçtunu burada qoyur.");
    content = pane(cur.label, leads ? <>{cur.id === "leads" && <p className="rounded-xl bg-muted/50 p-3 text-sm text-muted-foreground">{t("Müraciətləri Telegram qrupuna, Bitrix24-ə və ya Google Sheets-ə ötürmək indi Avtomatlaşdırmalar bölməsindədir.")} <Link href="/automations" className="font-medium text-foreground underline">{t("Avtomatlaşdırmalara keç")}</Link></p>}<Leads rows={leads.items.filter((l) => want.includes(statusOf(l)))} reload={loadForms} empty={empty} /></> : null);
  }

  const banner = <>
    {liveFolder && live?.enabled && live.openNow === false && (
      <p role="status" className="shrink-0 border-b border-amber/30 bg-amber/10 px-4 py-2 text-sm">
        {t("İndi işçi saatlarından kənardır: ziyarətçilərə “Operatorla canlı yaz” düyməsi göstərilmir, onlara əlaqə forması təklif olunur. Açıq söhbətlərə cavab verə bilərsən.")}{" "}
        <Link href="/embed#live" className="underline">{t("Saatları dəyiş")}</Link>
      </p>
    )}
    {error && <p role="alert" className="shrink-0 px-4 py-2 text-sm text-destructive">{error}</p>}
  </>;
  return <FolderPane title={t("Müraciətlər")} groups={groups} value={cur.id} onPick={pick} footer={<NotifyBar />} banner={banner}>{content}</FolderPane>;
}

export default function InboxPage() {
  return <RequireTenant><Inbox /></RequireTenant>;
}
