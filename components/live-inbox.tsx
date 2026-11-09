"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Ban, BookPlus, Clock, FileText, Paperclip, Globe, Hand, Inbox, Mail, MessageSquarePlus, MessagesSquare, PanelRight, Phone, Search, Send, Sparkles, Star, StickyNote, Trash2, Undo2, UserRound, X, XCircle } from "lucide-react";
import { toast } from "sonner";
import { blockLive, deleteLive, liveFileUrl, sendLiveFile, addLiveNote, claimLive, draftLive, getCanned, kbAddQa, setLiveTags, type CannedReply, closeLive, getLiveChat, getLiveContacts, getLiveList, releaseLive, sendLive, startLiveChat, type LiveChat, type LiveContact, type LiveItem } from "@/lib/api";
import { useSession } from "@/components/session";
import { useResizable } from "@/components/resizable";
import { useI18n } from "@/lib/i18n";
import { sendTyping, useLiveEvents } from "@/lib/live-socket";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { ConfirmButton, VisitorFacts } from "@/components/visitor-facts";

export type LiveFolder = { status: "open" | "closed"; who: "all" | "mine" | "free" | "waiting"; ch: "all" | "site" | "telegram" | "whatsapp" | "vip" };

/** Canlı söhbət: ortada siyahı, sağda yazışma və müştəri məlumatı. Hansı söhbətlərin göstəriləcəyini səhifənin qovluğu (folder) seçir. */
export function LiveInbox({ enabled, folder, title, empty, open: openId, onChange }: { enabled: boolean; folder: LiveFolder; title: string; empty: string; /** bu söhbəti aç (məs. "İndi saytda"dan başladılan) */ open?: string; onChange?: () => void }) {
  const { t, short, locale } = useI18n();
  const fmtTime = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : locale, { hour: "2-digit", minute: "2-digit" });
  const time = (iso: string) => fmtTime.format(new Date(iso));
  /** Siyahıda vaxt: "indi", "5 dəq", "3 saat", köhnələr tarix */
  const ago = (iso: string) => {
    const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    return m < 1 ? t("indi") : m < 60 ? t("{n} dəq", { n: m }) : m < 24 * 60 ? t("{n} saat", { n: Math.round(m / 60) }) : short(iso);
  };
  const { me, isOperator, tenant } = useSession();
  const canKb = !isOperator && (tenant?.config.profile?.mode ?? "listings") !== "listings";
  const [kb, setKb] = useState<{ q: string; a: string } | null>(null);
  const myName = (me?.email || "").split("@")[0].slice(0, 40);
  const { status, who, ch } = folder;
  const [q, setQ] = useState("");
  const [infoOpen, setInfoOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  const [contacts, setContacts] = useState<LiveContact[] | null>(null);
  const [pick, setPick] = useState("");
  const [first, setFirst] = useState("");
  const [items, setItems] = useState<LiveItem[] | null>(null);
  const [sel, setSel] = useState(openId ?? "");
  const listW = useResizable("list", 320, 260, 480, "right");
  const infoW = useResizable("info", 320, 260, 480, "left", "xl");
  useEffect(() => { if (openId) setSel(openId); }, [openId]);
  useEffect(() => { setSel((s) => (s && s === openId ? s : "")); setStarting(false); }, [status, who, ch]); // eslint-disable-line react-hooks/exhaustive-deps
  const [chat, setChat] = useState<LiveChat | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const [typing, setTyping] = useState(false);
  // "Sneak peek": ziyarətçinin hələ göndərmədiyi mətn (yalnız sayt çatında, canlı söhbət zamanı)
  const [peek, setPeek] = useState("");
  const typingTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [csatSum, setCsatSum] = useState<{ count: number; avg: number | null } | null>(null);
  const [canned, setCanned] = useState<CannedReply[]>([]);
  const [note, setNote] = useState("");
  const [tagIn, setTagIn] = useState("");
  const [drafting, setDrafting] = useState(false);
  // Operatorun faylı: şəkil və ya PDF (göndərilənədək yalnız brauzerdə)
  const [attach, setAttach] = useState<{ name: string; data: string; preview?: string; size: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const selRef = useRef("");
  selRef.current = sel;

  const loadList = useCallback(() => { getLiveList(status).then((r) => { setItems(r.items); setCsatSum(r.csat ?? null); }).catch(() => {}); }, [status]);
  const loadChat = useCallback(() => {
    if (!sel) return;
    getLiveChat(sel).then((r) => setChat(r.chat)).catch(() => setChat(null));
  }, [sel]);
  // Real vaxt siqnalı: yeni mesaj/söhbət/bağlanma və "ziyarətçi yazır"
  const live = useLiveEvents((e) => {
    if (e.t === "visitors") return; // "İndi saytda" bölməsi özü dinləyir
    if (e.t === "typing") {
      if (e.id !== selRef.current) return;
      clearTimeout(typingTimer.current);
      if (e.draft === "") { setTyping(false); setPeek(""); return; } // ziyarətçi yazdığını silib
      setTyping(true);
      if (typeof e.draft === "string") setPeek(e.draft);
      // Qaralama ziyarətçi dayananda da bir müddət görünür; adi "yazır…" 4 saniyəyə itir
      typingTimer.current = setTimeout(() => { setTyping(false); setPeek(""); }, e.draft ? 20000 : 4000);
      return;
    }
    if (e.t === "channels") return; // botun kanal cavabları canlı söhbət siyahısını dəyişmir
    loadList(); onChange?.();
    if (e.id === selRef.current) { if (e.t === "live" && e.kind === "message") { setTyping(false); setPeek(""); } loadChat(); }
  }, enabled);
  // Soket qoşuludursa polling yalnız ehtiyatdır
  useEffect(() => { setItems(null); loadList(); const i = setInterval(loadList, live ? 30000 : 5000); return () => clearInterval(i); }, [loadList, live]);

  useEffect(() => { if (enabled) getCanned().then((r) => setCanned(r.items)).catch(() => {}); }, [enabled]);
  useEffect(() => { setNote(""); setTagIn(""); setAttach(null); }, [sel]);
  useEffect(() => { setChat(null); setTyping(false); setPeek(""); setKb(null); stick.current = true; if (!sel) return; loadChat(); const i = setInterval(loadChat, live ? 20000 : 3000); return () => clearInterval(i); }, [sel, loadChat, live]);
  useEffect(() => { const el = logRef.current; if (el && stick.current) el.scrollTop = el.scrollHeight; }, [chat?.messages.length, peek, typing]);

  function pickFile(f: File | undefined) {
    if (!f) return;
    const pdf = f.type === "application/pdf" || /\.pdf$/i.test(f.name);
    const img = /^image\/(png|jpeg|webp)$/.test(f.type);
    if (!pdf && !img) { toast.error(t("Yalnız şəkil (PNG, JPG, WebP) və ya PDF göndərmək olar.")); return; }
    if (f.size > (pdf ? 4_000_000 : 2_000_000)) { toast.error(pdf ? t("PDF ən çox 4 MB ola bilər.") : t("Şəkil ən çox 2 MB ola bilər.")); return; }
    const r = new FileReader();
    r.onload = () => { const url = String(r.result); setAttach({ name: f.name, data: url.slice(url.indexOf(",") + 1), size: f.size, ...(img && { preview: url }) }); };
    r.readAsDataURL(f);
  }
  async function send(e: React.FormEvent) {
    e.preventDefault();
    const v = text.trim();
    if ((!v && !attach) || !chat || busy) return;
    setBusy(true);
    try {
      if (attach) { await sendLiveFile(chat.id, { data: attach.data, name: attach.name, ...(v && { text: v }) }); setAttach(null); }
      else await sendLive(chat.id, v);
      setText(""); stick.current = true; loadChat(); loadList(); onChange?.(); }
    catch (err) { toast.error((err as Error).message); }
    finally { setBusy(false); }
  }
  async function saveKb(e: React.FormEvent) {
    e.preventDefault();
    if (!kb || !kb.q.trim() || !kb.a.trim() || busy) return;
    setBusy(true);
    try { await kbAddQa([kb.q.trim()], kb.a.trim()); toast.success(t("Biliyə əlavə olundu. Eyni sual gələndə bu cavab veriləcək.")); setKb(null); }
    catch (err) { toast.error((err as Error).message); }
    finally { setBusy(false); }
  }
  /** Operatorun mesajına ən yaxın əvvəlki ziyarətçi sualı */
  const questionBefore = (idx: number) => {
    for (let j = idx - 1; j >= 0; j--) { const m = chat?.messages[j]; if (m?.from === "visitor" && m.text.trim()) return m.text.trim(); }
    return "";
  };
  async function claim(release: boolean) {
    if (!chat) return;
    try { await (release ? releaseLive(chat.id) : claimLive(chat.id)); loadChat(); loadList(); }
    catch (err) { toast.error((err as Error).message); }
  }
  async function addNote(e: React.FormEvent) {
    e.preventDefault();
    const v = note.trim();
    if (!v || !chat || busy) return;
    setBusy(true);
    try { await addLiveNote(chat.id, v); setNote(""); loadChat(); loadList(); }
    catch (err) { toast.error((err as Error).message); }
    finally { setBusy(false); }
  }
  async function saveTags(tags: string[]) {
    if (!chat) return;
    try { await setLiveTags(chat.id, tags); setTagIn(""); loadChat(); loadList(); }
    catch (err) { toast.error((err as Error).message); }
  }
  /** AI yalnız qaralama yazır: mətn sahəyə düşür, operator oxuyub özü göndərir. */
  async function aiDraft() {
    if (!chat || drafting) return;
    setDrafting(true);
    try { const r = await draftLive(chat.id); setText(r.draft); }
    catch (err) { toast.error((err as Error).message); }
    finally { setDrafting(false); }
  }
  function openStart() {
    setStarting(true); setPick(""); setFirst(""); setContacts(null);
    getLiveContacts().then((r) => setContacts(r.items)).catch((err) => { toast.error((err as Error).message); setContacts([]); });
  }
  async function startChat(e: React.FormEvent) {
    e.preventDefault();
    const c = contacts?.find((x) => `${x.channel}:${x.chatId}` === pick);
    if (!c || !first.trim() || busy) return;
    setBusy(true);
    try {
      const r = await startLiveChat({ channel: c.channel, chatId: c.chatId, text: first.trim() });
      setStarting(false); setSel(r.id); loadList(); onChange?.();
    } catch (err) { toast.error((err as Error).message); }
    finally { setBusy(false); }
  }
  // Bağlanmış söhbəti silmək (yalnız hesab sahibi): iki addımlı təsdiq
  const [askDel, setAskDel] = useState(false);
  useEffect(() => { setAskDel(false); }, [sel]);
  async function remove() {
    if (!chat) return;
    try { await deleteLive(chat.id); toast.success(t("Söhbət silindi.")); setSel(""); loadList(); onChange?.(); }
    catch (err) { toast.error((err as Error).message); }
  }
  async function close() {
    if (!chat) return;
    try { await closeLive(chat.id); toast.success(t("Söhbət bağlandı.")); setSel(""); loadList(); onChange?.(); }
    catch (err) { toast.error((err as Error).message); }
  }

  if (!enabled) return (
    <div className="m-auto flex max-w-md flex-col items-center gap-3 p-8 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground"><MessagesSquare size={22} aria-hidden /></span>
      <p className="text-sm font-medium">{t("Canlı operator söhbəti söndürülüb.")}</p>
      <p className="text-sm text-muted-foreground">{t("Açanda ziyarətçi çatda “Operatorla canlı yaz” düyməsini görür, Telegram və WhatsApp müştəriləri isə /operator yazır; sən buradan onlara real vaxtda cavab verirsən. Bu bölməyə baxa bildiyin vaxtlarda aç.")}</p>
      <Link href="/embed#live" className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">{t("Saytına qoş bölməsində aç")}</Link>
    </div>
  );

  const isVip = (tags?: string[]) => !!tags?.some((g) => g.toLowerCase() === "vip");
  const chOf = (c: LiveItem) => c.channel ?? "site";
  const needle = q.trim().toLocaleLowerCase();
  const shown = (items || [])
    .filter((c) => status !== "open" || who === "all" || (who === "waiting" ? c.waiting : who === "free" ? !c.assignee : c.assignee?.name === myName))
    .filter((c) => ch === "all" || (ch === "vip" ? isVip(c.tags) : chOf(c) === ch))
    .filter((c) => !needle || `${c.name} ${c.contact} ${c.last?.text ?? ""} ${(c.tags ?? []).join(" ")}`.toLocaleLowerCase().includes(needle));
  const initial = (n: string) => (n || "?").trim().charAt(0).toUpperCase();
  const chLabel = (c?: "telegram" | "whatsapp" | null) => (c === "telegram" ? "Telegram" : c === "whatsapp" ? "WhatsApp" : t("Sayt"));

  const list = (
    <section aria-label={title} style={listW.style} className={cn("relative flex min-h-0 w-full shrink-0 flex-col border-border md:w-[var(--pane-w)] md:border-r", sel && "hidden md:flex")}>{listW.handle}
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
        <h2 className="min-w-0 flex-1 truncate text-[15px] font-semibold">{title}</h2>
        {status === "open" && <Button size="sm" variant="outline" onClick={openStart} aria-label={t("Yeni söhbət")} title={t("Yeni söhbət")}><MessageSquarePlus size={15} aria-hidden /></Button>}
      </div>
      <div className="flex flex-col gap-2 border-b border-border p-3">
        <label className="flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-2.5 text-sm focus-within:ring-2 focus-within:ring-primary/30">
          <Search size={15} aria-hidden className="text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Söhbətlərdə axtar")} aria-label={t("Söhbətlərdə axtar")} className="min-w-0 flex-1 bg-transparent outline-none" />
        </label>
        <p className="flex items-center justify-between text-xs text-muted-foreground">
          <span><b className="font-semibold text-foreground">{shown.length}</b> {t("söhbət")}</span>
          {status === "closed" && csatSum && csatSum.count > 0 && csatSum.avg !== null && <span className="inline-flex items-center gap-1"><Star size={12} aria-hidden />{t("Orta qiymət: {avg} / 5 ({n} qiymət)", { avg: csatSum.avg, n: csatSum.count })}</span>}
        </p>
      </div>
      {starting && (
        <form onSubmit={startChat} className="flex flex-col gap-2 border-b border-border bg-muted/30 p-3">
          <p className="text-sm font-medium">{t("Müştəriyə özün yaz")}</p>
          <p className="text-xs text-muted-foreground">{t("Yalnız əvvəllər botla yazışmış müştərilərə yaza bilərsən (soyuq mesaj yoxdur).")}</p>
          {contacts === null ? <p className="text-sm text-muted-foreground">{t("Yüklənir…")}</p>
            : !contacts.length ? <p className="text-sm text-muted-foreground">{t("Hələ botla yazışan müştəri yoxdur.")}</p>
            : (
              <select value={pick} onChange={(e) => setPick(e.target.value)} aria-label={t("Müştəri")} className="h-10 rounded-md border border-border bg-card px-2 text-sm">
                <option value="">{t("Müştəri seç…")}</option>
                {contacts.map((c) => <option key={`${c.channel}:${c.chatId}`} value={`${c.channel}:${c.chatId}`}>{(c.name || t("Adsız ziyarətçi")) + " · " + (c.channel === "telegram" ? "Telegram" : "WhatsApp") + (c.last ? " · " + c.last.slice(0, 40) : "")}</option>)}
              </select>
            )}
          <Textarea value={first} onChange={(e) => setFirst(e.target.value)} maxLength={1000} rows={2} aria-label={t("İlk mesaj")} placeholder={t("İlk mesajını yaz…")} />
          <div className="flex gap-2">
            <Button size="sm" disabled={busy || !pick || !first.trim()}><Send size={14} aria-hidden />{t("Göndər")}</Button>
            <Button size="sm" type="button" variant="ghost" onClick={() => setStarting(false)}>{t("Ləğv et")}</Button>
          </div>
        </form>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {items === null ? <div className="flex flex-col gap-2 p-1">{[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />)}</div>
          : !shown.length ? (
            <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
              <span className="grid size-11 place-items-center rounded-full bg-muted text-muted-foreground">{needle ? <Search size={20} aria-hidden /> : <Inbox size={20} aria-hidden />}</span>
              <p className="text-sm font-medium">{needle ? t("Heç nə tapılmadı.") : t("Burada söhbət yoxdur")}</p>
              <p className="text-xs text-muted-foreground">{needle ? t("Axtarışı dəyiş və ya təmizlə.") : empty}</p>
              {needle && <Button size="sm" variant="outline" onClick={() => setQ("")}>{t("Axtarışı təmizlə")}</Button>}
            </div>
          ) : (
            <ul className="flex flex-col gap-0.5">
              {shown.map((c) => (
                <li key={c.id}>
                  <button type="button" onClick={() => setSel(c.id)} aria-current={sel === c.id}
                    className={cn("flex w-full cursor-pointer gap-3 rounded-lg px-3 py-2.5 text-left transition-colors", sel === c.id ? "bg-muted" : "hover:bg-muted/60")}>
                    <span className="relative mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {initial(c.name)}
                      {c.channel && <span className="absolute -right-0.5 -bottom-0.5 grid size-4 place-items-center rounded-full bg-card ring-1 ring-border"><ChannelDot ch={c.channel} /></span>}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="flex items-center gap-2">
                        <span className={cn("min-w-0 flex-1 truncate text-sm", c.waiting ? "font-semibold" : "font-medium")}>{c.name || t("Adsız ziyarətçi")}</span>
                        <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">{ago(c.updatedAt)}</span>
                      </span>
                      <span className={cn("truncate text-[13px]", c.waiting ? "text-foreground" : "text-muted-foreground")}>{c.last ? (c.last.from === "operator" ? `${t("Sən")}: ` : "") + (c.last.from === "system" ? (c.last.text === "visitor_left" ? t("Ziyarətçi söhbətdən çıxdı.") : t("Söhbət bitdi.")) : c.last.text) : t("Operator istəyir, hələ yazmayıb")}</span>
                      <span className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1"><UserRound size={11} aria-hidden />{c.assignee ? (c.assignee.name === myName ? t("Sən") : c.assignee.name) : t("Təyin olunmayıb")}</span>
                        {c.waiting && <span className="rounded-full bg-amber/15 px-1.5 font-medium text-amber">{t("Cavab gözləyir")}</span>}
                        {typeof c.csat === "number" && <span className="inline-flex items-center gap-0.5"><Star size={10} aria-hidden />{c.csat}/5</span>}
                        {(c.tags ?? []).slice(0, 2).map((g) => <span key={g} className={cn("rounded-full px-1.5", g.toLowerCase() === "vip" ? "bg-amber/15 text-amber" : "bg-primary/10 text-primary")}>{g}</span>)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
      </div>
    </section>
  );

  const info = chat && (
    <aside aria-label={t("Müştəri məlumatı")} style={infoW.style} className={cn("min-h-0 w-80 shrink-0 xl:w-[var(--pane-w)] flex-col overflow-y-auto border-l border-border bg-card", infoOpen ? "absolute inset-y-0 right-0 z-20 flex shadow-xl" : "hidden", "xl:static xl:flex xl:shadow-none")}>
      <div className="flex items-start gap-3 border-b border-border p-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary/10 text-base font-semibold text-primary">{initial(chat.name)}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{chat.name || t("Adsız ziyarətçi")}</p>
          <p className="text-xs text-muted-foreground">{chat.status === "open" ? t("Açıq") : t("Bağlanmış")} · {chLabel(chat.channel)}</p>
        </div>
        <Button size="sm" variant="ghost" className="xl:hidden" onClick={() => setInfoOpen(false)} aria-label={t("Bağla")}><X size={16} aria-hidden /></Button>
      </div>
      <dl className="flex flex-col gap-2.5 border-b border-border p-4 text-sm">
        <div className="flex items-center gap-2.5">{chat.contact.includes("@") ? <Mail size={15} aria-hidden className="text-muted-foreground" /> : <Phone size={15} aria-hidden className="text-muted-foreground" />}
          {chat.contact ? <a href={chat.contact.includes("@") ? `mailto:${chat.contact}` : `tel:${chat.contact.replace(/[^\d+]/g, "")}`} className="min-w-0 truncate text-primary underline">{chat.contact}</a> : <span className="text-muted-foreground">{t("Əlaqə yoxdur")}</span>}</div>
        {chat.page && <div className="flex items-start gap-2.5"><Globe size={15} aria-hidden className="mt-0.5 shrink-0 text-muted-foreground" /><span className="min-w-0 break-words" title={chat.page.path}>{chat.page.title ? `${chat.page.title} · ` : ""}<span className="text-muted-foreground">{chat.page.path}</span></span></div>}
        <div className="flex items-center gap-2.5"><Clock size={15} aria-hidden className="text-muted-foreground" />{short(chat.createdAt)}</div>
        {chat.csat && <div className="flex items-start gap-2.5"><Star size={15} aria-hidden className="mt-0.5 text-amber" />{t("Müştəri qiyməti: {n}/5", { n: chat.csat.rating })}{chat.csat.comment ? ` · ${chat.csat.comment}` : ""}</div>}
      </dl>
      {chat.visitor && <div className="border-b border-border p-4"><VisitorFacts v={chat.visitor} /></div>}
      <div className="flex flex-col gap-2 border-b border-border p-4 text-sm">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{t("Operator")}</p>
        <div className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate">{chat.assignee ? (chat.assignee.name === myName ? t("Sən") : chat.assignee.name) : t("Təyin olunmayıb")}</span>
          {chat.status === "open" && (chat.assignee
            ? (chat.assignee.name === myName || !isOperator) && <Button size="sm" variant="ghost" onClick={() => claim(true)}><Undo2 size={14} aria-hidden />{t("Burax")}</Button>
            : <Button size="sm" variant="outline" onClick={() => claim(false)}><Hand size={14} aria-hidden />{t("Götür")}</Button>)}
        </div>
      </div>
      <div className="flex flex-col gap-2 border-b border-border p-4 text-sm">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{t("Etiketlər")}</p>
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {(chat.tags ?? []).map((g) => (
            <Badge key={g} className={cn("gap-1", g.toLowerCase() === "vip" ? "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/20" : "bg-muted text-foreground")}>{g}
              <button type="button" className="cursor-pointer" aria-label={t("Etiketi sil")} onClick={() => saveTags((chat.tags ?? []).filter((x) => x !== g))}><X size={11} aria-hidden /></button>
            </Badge>
          ))}
          {!isVip(chat.tags) && (chat.tags?.length ?? 0) < 5 && <button type="button" onClick={() => saveTags([...(chat.tags ?? []), "VIP"])} className="h-7 cursor-pointer rounded-md border border-border px-2 text-xs text-muted-foreground hover:bg-muted/50">{t("VIP et")}</button>}
          {(chat.tags?.length ?? 0) < 5 && (
            <form onSubmit={(e) => { e.preventDefault(); const v = tagIn.trim(); if (v) saveTags([...(chat.tags ?? []), v]); }}>
              <input value={tagIn} onChange={(e) => setTagIn(e.target.value)} maxLength={24} aria-label={t("Etiket əlavə et")} placeholder={t("+ etiket")} className="h-7 w-24 rounded-md border border-border bg-card px-2 text-xs" />
            </form>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-2 border-b border-border p-4 text-sm">
        <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase"><StickyNote size={13} aria-hidden />{t("Daxili qeydlər ({n})", { n: chat.notes?.length ?? 0 })}</p>
        <p className="text-xs text-muted-foreground">{t("Yalnız komanda görür, müştəriyə getmir.")}</p>
        {(chat.notes ?? []).map((n, i) => <p key={i} className="whitespace-pre-wrap break-words rounded-md bg-amber/10 p-2"><span className="block text-[10px] text-muted-foreground">{n.by} · {short(n.at)}</span>{n.text}</p>)}
        <form onSubmit={addNote} className="flex flex-col gap-2">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} rows={2} aria-label={t("Daxili qeyd")} placeholder={t("Qeyd yaz…")} />
          <Button size="sm" variant="outline" className="self-start" disabled={busy || !note.trim()}>{t("Əlavə et")}</Button>
        </form>
      </div>
      <div className="border-b border-border p-4">
        {chat.blocked ? <p className="flex items-center gap-2 text-sm text-destructive"><Ban size={15} aria-hidden />{t("Bu müştəri bloklanıb.")}</p> : (
          <ConfirmButton label={t("Müştərini blokla")} yes={t("Bəli, blokla")} warning={t("Söhbət bağlanacaq, müştəri saytda çata və ya kanalda bota yaza bilməyəcək. Bloku Müraciətlər → Bloklanmış bölməsindən götürə bilərsən.")}
            onConfirm={async () => { await blockLive(chat.id); toast.success(t("Bloklandı.")); setSel(""); loadList(); onChange?.(); }} />
        )}
      </div>
      {!!chat.previous?.length && (
        <div className="flex flex-col gap-2 p-4 text-sm">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{t("Bu müştəri ilə əvvəlki söhbətlər ({n})", { n: chat.previous.length })}</p>
          {chat.previous.map((o) => (
            <button key={o.id} type="button" onClick={() => setSel(o.id)} className="flex w-full cursor-pointer flex-col rounded-md border border-border px-2.5 py-1.5 text-left text-xs hover:bg-muted/50">
              <span className="text-muted-foreground">{short(o.createdAt)} · {o.status === "open" ? t("Açıq") : t("Bağlanmış")}{o.csat ? ` · ${o.csat}/5` : ""}{o.tags.length ? ` · ${o.tags.join(", ")}` : ""}</span>
              <span className="truncate text-foreground">{o.first || "—"}</span>
            </button>
          ))}
        </div>
      )}
    </aside>
  );

  const thread = (
    <section className={cn("relative min-h-0 min-w-0 flex-1", sel ? "flex" : "hidden md:flex")}>
      {!sel ? (
        <div className="grid min-w-0 flex-1 place-items-center p-8 text-center">
          <div className="flex flex-col items-center gap-2">
            <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground"><MessagesSquare size={22} aria-hidden /></span>
            <p className="font-medium">{t("Söhbət seç")}</p>
            <p className="max-w-xs text-sm text-muted-foreground">{t("Soldakı siyahıdan söhbəti seç: yazışma burada, müştəri məlumatı sağda görünəcək.")}</p>
          </div>
        </div>
      ) : !chat ? <div className="flex-1 p-6"><div className="h-full animate-pulse rounded-xl bg-muted/50" /></div> : (
        <>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-3">
            <Button size="sm" variant="ghost" className="md:hidden" onClick={() => setSel("")} aria-label={t("Geri")}><ArrowLeft size={16} aria-hidden /></Button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold">{chat.name || t("Adsız ziyarətçi")}</p>
              <p className="truncate text-xs text-muted-foreground">{chLabel(chat.channel)}{chat.assignee ? ` · ${chat.assignee.name === myName ? t("Sən") : chat.assignee.name}` : ""}</p>
            </div>
            {chat.status === "open" && !chat.assignee && <Button size="sm" variant="outline" className="hidden sm:inline-flex" onClick={() => claim(false)}><Hand size={14} aria-hidden />{t("Götür")}</Button>}
            {chat.status === "open" && <Button size="sm" variant="outline" onClick={close}><XCircle size={14} aria-hidden /><span className="hidden sm:inline">{t("Söhbəti bitir")}</span></Button>}
            {chat.status === "closed" && !isOperator && (askDel
              ? <span className="flex items-center gap-1.5">
                  <span className="hidden text-xs text-muted-foreground sm:inline">{t("Həmişəlik silinsin?")}</span>
                  <Button size="sm" variant="outline" onClick={() => setAskDel(false)}>{t("Ləğv et")}</Button>
                  <Button size="sm" variant="destructive" onClick={() => void remove()}>{t("Sil")}</Button>
                </span>
              : <Button size="sm" variant="outline" className="text-destructive" onClick={() => setAskDel(true)} aria-label={t("Söhbəti sil")}><Trash2 size={14} aria-hidden /><span className="hidden sm:inline">{t("Sil")}</span></Button>)}
            <Button size="sm" variant="ghost" className="xl:hidden" onClick={() => setInfoOpen((v) => !v)} aria-label={t("Müştəri məlumatı")} aria-pressed={infoOpen}><PanelRight size={16} aria-hidden /></Button>
          </div>
          <div ref={logRef} onScroll={(e) => { const el = e.currentTarget; stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40; }}
            className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto bg-muted/25 px-4 py-4 md:px-6" role="log" aria-live="polite" aria-label={t("Söhbət")}>
            {!!chat.context.length && (
              <details className="mx-auto mb-2 w-full max-w-xl rounded-xl border border-border bg-card px-4 py-2 text-sm">
                <summary className="cursor-pointer text-primary">{t("Çatla əvvəlki yazışma ({n} mesaj)", { n: chat.context.length })}</summary>
                <ul className="mt-2 flex flex-col gap-1.5">
                  {chat.context.map((m, i) => <li key={i} className="break-words"><span className="font-medium">{m.role === "user" ? t("Ziyarətçi") : t("Çat")}:</span> {m.text}</li>)}
                </ul>
              </details>
            )}
            {chat.messages.map((m, i) => m.from === "system"
              ? <p key={i} className="self-center rounded-full bg-card px-3 py-1 text-xs text-muted-foreground ring-1 ring-border">{m.text === "visitor_left" ? t("Ziyarətçi söhbətdən çıxdı.") : t("Söhbət bitdi.")}</p>
              : (
                <div key={i} className={cn("flex max-w-[80%] flex-col gap-1", m.from === "operator" ? "self-end items-end" : "self-start")}>
                  <span className="px-1 text-[11px] text-muted-foreground">{m.from === "operator" ? (m.by || t("Sən")) : (chat.name || t("Ziyarətçi"))} · {time(m.at)}</span>
                  <div className={cn("whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm shadow-sm", m.from === "operator" ? "rounded-tr-md bg-primary text-primary-foreground" : "rounded-tl-md border border-border bg-card")}>
                    {m.file && (m.file.mime === "application/pdf" ? (
                      <a href={liveFileUrl(chat.id, m.file.id)} target="_blank" rel="noopener noreferrer" className={cn("flex items-center gap-2 rounded-lg px-2.5 py-2 font-medium underline-offset-2 hover:underline", m.from === "operator" ? "bg-white/15" : "bg-muted")}>
                        <FileText size={16} aria-hidden />{m.file.name || "PDF"}
                      </a>
                    ) : (
                      <a href={liveFileUrl(chat.id, m.file.id)} target="_blank" rel="noopener noreferrer" className="block" title={t("Şəkli tam ölçüdə aç")}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={liveFileUrl(chat.id, m.file.id)} alt={m.from === "operator" ? t("Göndərilən şəkil") : t("Ziyarətçinin göndərdiyi şəkil")} loading="lazy" className={cn("max-h-60 max-w-full rounded-lg object-contain", m.text !== "📷" && "mb-1.5")} />
                      </a>
                    ))}
                    {m.file && (m.text === "📷" || m.text === `📄 ${m.file.name}`) ? null : m.text}
                  </div>
                  {canKb && m.from === "operator" && !m.file && (
                    <button type="button" onClick={() => setKb({ q: questionBefore(i).slice(0, 300), a: m.text.slice(0, 3000) })} className="inline-flex cursor-pointer items-center gap-1 text-xs text-primary underline"><BookPlus size={12} aria-hidden />{t("Biliyə əlavə et")}</button>
                  )}
                </div>
              ))}
            {!chat.messages.length && <p className="self-center text-sm text-muted-foreground">{t("Ziyarətçi hələ mesaj yazmayıb.")}</p>}
            {peek ? (
              <div className="flex max-w-[80%] flex-col gap-1 self-start" aria-live="polite">
                <span className="text-[10px] font-medium text-muted-foreground">{t("Ziyarətçi yazır (hələ göndərməyib):")}</span>
                <div className="whitespace-pre-wrap break-words rounded-2xl border border-dashed border-border bg-card/60 px-3 py-2 text-sm italic text-muted-foreground">{peek}</div>
              </div>
            ) : typing && <p className="self-start text-xs italic text-muted-foreground" aria-live="polite">{t("Ziyarətçi yazır…")}</p>}
          </div>
          {kb && (
            <form onSubmit={saveKb} className="flex flex-col gap-2 border-t border-border bg-muted/40 p-3">
              <p className="text-sm font-medium">{t("Bu cavabı biliyə əlavə et")}</p>
              <Textarea value={kb.q} onChange={(e) => setKb({ ...kb, q: e.target.value })} maxLength={300} rows={2} aria-label={t("Müştərinin sualı")} placeholder={t("Müştəri belə soruşanda…")} />
              <Textarea value={kb.a} onChange={(e) => setKb({ ...kb, a: e.target.value })} maxLength={3000} rows={3} aria-label={t("Veriləcək cavab")} placeholder={t("…bu cavab verilsin")} />
              <div className="flex gap-2">
                <Button size="sm" disabled={busy || !kb.q.trim() || !kb.a.trim()}>{t("Əlavə et")}</Button>
                <Button size="sm" type="button" variant="ghost" onClick={() => setKb(null)}>{t("Ləğv et")}</Button>
              </div>
            </form>
          )}
          {chat.status === "open" ? (
            <form onSubmit={send} className="shrink-0 p-3">
              <div className="rounded-xl border border-border bg-card shadow-sm focus-within:ring-2 focus-within:ring-primary/25"
                onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); pickFile(e.dataTransfer.files?.[0]); }}>
                {attach && (
                  <div className="flex items-center gap-2.5 border-b border-border px-3 py-2 text-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {attach.preview ? <img src={attach.preview} alt="" className="size-10 rounded-md object-cover" /> : <span className="grid size-10 place-items-center rounded-md bg-muted"><FileText size={18} aria-hidden /></span>}
                    <span className="min-w-0 flex-1"><span className="block truncate font-medium">{attach.name}</span><span className="text-xs text-muted-foreground">{attach.size < 1_000_000 ? `${Math.max(1, Math.round(attach.size / 1024))} KB` : `${(attach.size / 1024 / 1024).toFixed(1)} MB`} · {t("mətn yazsan, faylın altında izah kimi gedəcək")}</span></span>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setAttach(null)} aria-label={t("Faylı sil")}><X size={14} aria-hidden /></Button>
                  </div>
                )}
                <textarea value={text} onChange={(e) => { setText(e.target.value); if (chat) sendTyping(chat.id); }} maxLength={1000} rows={2} aria-label={t("Cavabın")} placeholder={t("Cavabını yaz… (Enter göndərir, Shift+Enter yeni sətir)")}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }}
                  className="block w-full resize-none rounded-t-xl bg-transparent px-3.5 pt-3 text-sm outline-none" />
                <div className="flex flex-wrap items-center gap-2 px-2.5 pb-2.5">
                  <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,application/pdf" className="hidden" onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = ""; }} />
                  <Button type="button" size="sm" variant="ghost" onClick={() => fileRef.current?.click()} aria-label={t("Fayl əlavə et")} title={t("Şəkil və ya PDF (sürüşdürüb buraxmaq da olar)")}><Paperclip size={15} aria-hidden /></Button>
                  {!!canned.length && (
                    <select value="" onChange={(e) => { const c = canned.find((x) => x.id === e.target.value); if (c) setText(c.text); }} aria-label={t("Hazır cavab")} className="h-8 max-w-44 rounded-md border border-border bg-card px-2 text-xs">
                      <option value="">{t("Hazır cavab…")}</option>
                      {canned.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                    </select>
                  )}
                  <Button type="button" size="sm" variant="ghost" onClick={aiDraft} disabled={drafting || !chat.messages.some((m) => m.from === "visitor")} title={t("Qaralama yalnız sahəyə yazılır, sən oxuyub göndərirsən. Balansdan az xərc çıxır.")}><Sparkles size={14} aria-hidden />{drafting ? t("Hazırlanır…") : t("AI qaralaması")}</Button>
                  <Button size="sm" className="ml-auto" disabled={busy || (!text.trim() && !attach)}><Send size={14} aria-hidden />{t("Göndər")}</Button>
                </div>
              </div>
            </form>
          ) : <p className="shrink-0 border-t border-border p-3 text-center text-sm text-muted-foreground">{t("Bu söhbət bağlanıb.")}</p>}
          </div>
          {info && <div className="relative hidden w-0 shrink-0 xl:block">{infoW.handle}</div>}
          {info}
        </>
      )}
    </section>
  );

  return (
    <div className="flex h-full min-h-0">
      {list}
      {thread}
    </div>
  );
}

/** Kanal nişanı (siyahıda avatarın küncündə) */
function ChannelDot({ ch }: { ch: "telegram" | "whatsapp" }) {
  return <span aria-label={ch === "telegram" ? "Telegram" : "WhatsApp"} className={cn("size-2.5 rounded-full", ch === "telegram" ? "bg-[#229ED9]" : "bg-[#25D366]")} />;
}

