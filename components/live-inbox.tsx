"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BookPlus, Hand, Mail, MessageSquarePlus, Phone, Send, Sparkles, Star, StickyNote, Undo2, X, XCircle } from "lucide-react";
import { toast } from "sonner";
import { addLiveNote, claimLive, draftLive, getCanned, kbAddQa, setLiveTags, type CannedReply, closeLive, getLiveChat, getLiveContacts, getLiveList, releaseLive, sendLive, startLiveChat, type LiveChat, type LiveContact, type LiveItem } from "@/lib/api";
import { useSession } from "@/components/session";
import { useI18n } from "@/lib/i18n";
import { sendTyping, useLiveEvents } from "@/lib/live-socket";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";

/** Canlı operator söhbəti: solda söhbətlər, sağda yazışma. Yeni mesaj WebSocket siqnalı ilə dərhal gəlir; bağlantı yoxdursa siyahı 5, açıq söhbət 3 saniyədən bir yenilənir. */
export function LiveInbox({ enabled, onChange }: { enabled: boolean; onChange?: () => void }) {
  const { t, short } = useI18n();
  const { me, isOperator, tenant } = useSession();
  const canKb = !isOperator && (tenant?.config.profile?.mode ?? "listings") !== "listings";
  const [kb, setKb] = useState<{ q: string; a: string } | null>(null);
  const myName = (me?.email || "").split("@")[0].slice(0, 40);
  const [who, setWho] = useState<"all" | "mine" | "free">("all");
  const [starting, setStarting] = useState(false);
  const [contacts, setContacts] = useState<LiveContact[] | null>(null);
  const [pick, setPick] = useState("");
  const [first, setFirst] = useState("");
  const [status, setStatus] = useState<"open" | "closed">("open");
  const [items, setItems] = useState<LiveItem[] | null>(null);
  const [sel, setSel] = useState("");
  const [chat, setChat] = useState<LiveChat | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const [typing, setTyping] = useState(false);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [csatSum, setCsatSum] = useState<{ count: number; avg: number | null } | null>(null);
  const [canned, setCanned] = useState<CannedReply[]>([]);
  const [note, setNote] = useState("");
  const [tagIn, setTagIn] = useState("");
  const [drafting, setDrafting] = useState(false);
  const selRef = useRef("");
  selRef.current = sel;

  const loadList = useCallback(() => { getLiveList(status).then((r) => { setItems(r.items); setCsatSum(r.csat ?? null); }).catch(() => {}); }, [status]);
  const loadChat = useCallback(() => {
    if (!sel) return;
    getLiveChat(sel).then((r) => setChat(r.chat)).catch(() => setChat(null));
  }, [sel]);
  // Real vaxt siqnalı: yeni mesaj/söhbət/bağlanma və "ziyarətçi yazır"
  const live = useLiveEvents((e) => {
    if (e.t === "typing") {
      if (e.id !== selRef.current) return;
      setTyping(true); clearTimeout(typingTimer.current); typingTimer.current = setTimeout(() => setTyping(false), 4000);
      return;
    }
    loadList(); onChange?.();
    if (e.id === selRef.current) { setTyping(false); loadChat(); }
  }, enabled);
  // Soket qoşuludursa polling yalnız ehtiyatdır
  useEffect(() => { setItems(null); loadList(); const i = setInterval(loadList, live ? 30000 : 5000); return () => clearInterval(i); }, [loadList, live]);

  useEffect(() => { if (enabled) getCanned().then((r) => setCanned(r.items)).catch(() => {}); }, [enabled]);
  useEffect(() => { setNote(""); setTagIn(""); }, [sel]);
  useEffect(() => { setChat(null); setTyping(false); setKb(null); stick.current = true; if (!sel) return; loadChat(); const i = setInterval(loadChat, live ? 20000 : 3000); return () => clearInterval(i); }, [sel, loadChat, live]);
  useEffect(() => { const el = logRef.current; if (el && stick.current) el.scrollTop = el.scrollHeight; }, [chat?.messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const v = text.trim();
    if (!v || !chat || busy) return;
    setBusy(true);
    try { await sendLive(chat.id, v); setText(""); stick.current = true; loadChat(); loadList(); onChange?.(); }
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
      setStarting(false); setStatus("open"); setSel(r.id); loadList(); onChange?.();
    } catch (err) { toast.error((err as Error).message); }
    finally { setBusy(false); }
  }
  async function close() {
    if (!chat) return;
    try { await closeLive(chat.id); toast.success(t("Söhbət bağlandı.")); setSel(""); loadList(); onChange?.(); }
    catch (err) { toast.error((err as Error).message); }
  }

  if (!enabled) return (
    <div className="flex flex-col items-start gap-3 rounded-lg border border-border bg-card p-5">
      <p className="text-sm font-medium">{t("Canlı operator söhbəti söndürülüb.")}</p>
      <p className="text-sm text-muted-foreground">{t("Açanda ziyarətçi çatda “Operatorla canlı yaz” düyməsini görür, Telegram və WhatsApp müştəriləri isə /operator yazır; sən buradan onlara real vaxtda cavab verirsən. Bu bölməyə baxa bildiyin vaxtlarda aç.")}</p>
      <Link href="/embed" className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">{t("Saytına qoş bölməsində aç")}</Link>
    </div>
  );

  const shown = (items || []).filter((c) => status !== "open" || who === "all" || (who === "free" ? !c.assignee : c.assignee?.name === myName));
  const list = (
    <div className={cn("flex flex-col gap-3", sel && "hidden md:flex")}>
      <div className="inline-flex self-start rounded-lg border border-border bg-muted p-1 text-sm">
        {(["open", "closed"] as const).map((s) => (
          <button key={s} type="button" aria-pressed={status === s} onClick={() => { setStatus(s); setSel(""); }}
            className={cn("cursor-pointer rounded-md px-3 py-1 font-medium", status === s ? "bg-card text-primary shadow-sm" : "text-muted-foreground")}>
            {s === "open" ? t("Açıq söhbətlər") : t("Bağlanmış")}
          </button>
        ))}
      </div>
      {status === "open" && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-border bg-muted p-1 text-xs">
            {(["all", "mine", "free"] as const).map((w) => (
              <button key={w} type="button" aria-pressed={who === w} onClick={() => setWho(w)}
                className={cn("cursor-pointer rounded-md px-2 py-1 font-medium", who === w ? "bg-card text-primary shadow-sm" : "text-muted-foreground")}>
                {w === "all" ? t("Hamısı") : w === "mine" ? t("Mənimkilər") : t("Təyin olunmamış")}
              </button>
            ))}
          </div>
          <Button size="sm" variant="outline" onClick={openStart}><MessageSquarePlus size={14} aria-hidden />{t("Yeni söhbət")}</Button>
        </div>
      )}
      {status === "closed" && csatSum && csatSum.count > 0 && csatSum.avg !== null && (
        <p className="text-sm text-muted-foreground">{t("Orta qiymət: {avg} / 5 ({n} qiymət)", { avg: csatSum.avg, n: csatSum.count })}</p>
      )}
      {starting && (
        <form onSubmit={startChat} className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
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
            <Button disabled={busy || !pick || !first.trim()}><Send size={14} aria-hidden />{t("Göndər")}</Button>
            <Button type="button" variant="ghost" onClick={() => setStarting(false)}>{t("Ləğv et")}</Button>
          </div>
        </form>
      )}
      {items === null ? <p className="text-sm text-muted-foreground">{t("Yüklənir…")}</p>
        : !shown.length ? <p className="text-sm text-muted-foreground">{status === "open" ? t("Açıq söhbət yoxdur. Ziyarətçi “Operatorla canlı yaz” bassa və ya Telegram/WhatsApp-da /operator yazsa burada görünəcək.") : t("Bağlanmış söhbət yoxdur.")}</p>
        : (
          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
            {shown.map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => setSel(c.id)} aria-current={sel === c.id}
                  className={cn("flex w-full cursor-pointer flex-col gap-1 px-4 py-3 text-left hover:bg-muted/50", sel === c.id && "bg-primary/5")}>
                  <span className="flex items-center gap-2 text-sm font-medium">
                    {c.name || t("Adsız ziyarətçi")}
                    {c.channel && <Badge className="bg-primary/10 text-primary">{c.channel === "telegram" ? "Telegram" : "WhatsApp"}</Badge>}
                    {c.assignee && <Badge className="bg-muted text-muted-foreground">{c.assignee.name === myName ? t("Sən") : c.assignee.name}</Badge>}
                    {c.waiting && <Badge className="bg-amber/15 text-amber">{t("Cavab gözləyir")}</Badge>}
                    {typeof c.csat === "number" && <Badge className="bg-muted text-muted-foreground"><Star size={11} aria-hidden className="mr-0.5 inline" />{c.csat}/5</Badge>}
                  </span>
                  {!!c.tags?.length && <span className="flex flex-wrap gap-1">{c.tags.map((g) => <Badge key={g} className="bg-primary/10 text-primary">{g}</Badge>)}</span>}
                  <span className="truncate text-sm text-muted-foreground">{c.last ? (c.last.from === "operator" ? `${t("Sən")}: ` : "") + (c.last.from === "system" ? "—" : c.last.text) : t("Hələ mesaj yoxdur")}</span>
                  <span className="text-xs text-muted-foreground">{short(c.updatedAt)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
    </div>
  );

  const thread = !sel ? (
    <div className="hidden place-items-center rounded-lg border border-dashed border-border p-8 text-sm text-muted-foreground md:grid">{t("Söhbət seç.")}</div>
  ) : !chat ? <p className="text-sm text-muted-foreground">{t("Yüklənir…")}</p> : (
    <div className="flex min-h-[28rem] flex-col overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
        <Button size="sm" variant="ghost" className="md:hidden" onClick={() => setSel("")} aria-label={t("Geri")}><ArrowLeft size={16} aria-hidden /></Button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{chat.name || t("Adsız ziyarətçi")}{chat.channel && <span className="ml-2 text-xs font-normal text-muted-foreground">{chat.channel === "telegram" ? "Telegram" : "WhatsApp"}</span>}</p>
          {chat.contact && (
            <a href={chat.contact.includes("@") ? `mailto:${chat.contact}` : `tel:${chat.contact.replace(/[^\d+]/g, "")}`} className="inline-flex items-center gap-1.5 text-xs text-primary underline">
              {chat.contact.includes("@") ? <Mail size={12} aria-hidden /> : <Phone size={12} aria-hidden />}{chat.contact}
            </a>
          )}
        </div>
        {chat.status === "open" && (chat.assignee
          ? (chat.assignee.name === myName || !isOperator) && <Button size="sm" variant="ghost" onClick={() => claim(true)}><Undo2 size={14} aria-hidden />{t("Burax")}</Button>
          : <Button size="sm" variant="outline" onClick={() => claim(false)}><Hand size={14} aria-hidden />{t("Götür")}</Button>)}
        {chat.status === "open" && <Button size="sm" variant="outline" onClick={close}><XCircle size={14} aria-hidden />{t("Söhbəti bitir")}</Button>}
      </div>
      {!!chat.context.length && (
        <details className="border-b border-border px-4 py-2 text-sm">
          <summary className="cursor-pointer text-primary">{t("Çatla əvvəlki yazışma ({n} mesaj)", { n: chat.context.length })}</summary>
          <ul className="mt-2 flex flex-col gap-1.5 rounded-md bg-muted/50 p-3">
            {chat.context.map((m, i) => <li key={i} className="break-words"><span className="font-medium">{m.role === "user" ? t("Ziyarətçi") : t("Çat")}:</span> {m.text}</li>)}
          </ul>
        </details>
      )}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-border px-4 py-2 text-xs">
        {(chat.tags ?? []).map((g) => (
          <Badge key={g} className="gap-1 bg-primary/10 text-primary">{g}
            <button type="button" className="cursor-pointer" aria-label={t("Etiketi sil")} onClick={() => saveTags((chat.tags ?? []).filter((x) => x !== g))}><X size={11} aria-hidden /></button>
          </Badge>
        ))}
        {(chat.tags?.length ?? 0) < 5 && (
          <form onSubmit={(e) => { e.preventDefault(); const v = tagIn.trim(); if (v) saveTags([...(chat.tags ?? []), v]); }}>
            <input value={tagIn} onChange={(e) => setTagIn(e.target.value)} maxLength={24} aria-label={t("Etiket əlavə et")} placeholder={t("+ etiket")} className="h-7 w-24 rounded-md border border-border bg-card px-2 text-xs" />
          </form>
        )}
        {chat.csat && <span className="ml-auto inline-flex items-center gap-1 text-muted-foreground"><Star size={12} aria-hidden />{t("Müştəri qiyməti: {n}/5", { n: chat.csat.rating })}{chat.csat.comment ? ` · ${chat.csat.comment}` : ""}</span>}
      </div>
      <details className="border-b border-border px-4 py-2 text-sm">
        <summary className="inline-flex cursor-pointer items-center gap-1.5 text-primary"><StickyNote size={14} aria-hidden />{t("Daxili qeydlər ({n})", { n: chat.notes?.length ?? 0 })}</summary>
        <p className="mt-1 text-xs text-muted-foreground">{t("Yalnız komanda görür, müştəriyə getmir.")}</p>
        <ul className="mt-2 flex flex-col gap-1.5">
          {(chat.notes ?? []).map((n, i) => <li key={i} className="whitespace-pre-wrap break-words rounded-md bg-amber/10 p-2"><span className="block text-[10px] text-muted-foreground">{n.by} · {short(n.at)}</span>{n.text}</li>)}
        </ul>
        <form onSubmit={addNote} className="mt-2 flex items-end gap-2">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} rows={2} className="min-h-0 flex-1" aria-label={t("Daxili qeyd")} placeholder={t("Qeyd yaz…")} />
          <Button size="sm" variant="outline" disabled={busy || !note.trim()}>{t("Əlavə et")}</Button>
        </form>
      </details>
      <div ref={logRef} onScroll={(e) => { const el = e.currentTarget; stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40; }}
        className="flex max-h-[28rem] flex-1 flex-col gap-2 overflow-y-auto bg-muted/30 p-4" role="log" aria-live="polite" aria-label={t("Söhbət")}>
        {chat.messages.map((m, i) => m.from === "system"
          ? <p key={i} className="self-center text-xs text-muted-foreground">{t("Söhbət bitdi.")}</p>
          : (
            <div key={i} className={cn("flex max-w-[85%] flex-col gap-1", m.from === "operator" ? "self-end items-end" : "self-start")}>
              <div className={cn("whitespace-pre-wrap break-words rounded-xl px-3 py-2 text-sm", m.from === "operator" ? "bg-primary text-primary-foreground" : "border border-border bg-card")}>{m.from === "operator" && m.by && <span className="mb-0.5 block text-[10px] opacity-70">{m.by}</span>}{m.text}</div>
              {canKb && m.from === "operator" && (
                <button type="button" onClick={() => setKb({ q: questionBefore(i).slice(0, 300), a: m.text.slice(0, 3000) })} className="inline-flex cursor-pointer items-center gap-1 text-xs text-primary underline"><BookPlus size={12} aria-hidden />{t("Biliyə əlavə et")}</button>
              )}
            </div>
          ))}
        {!chat.messages.length && <p className="text-sm text-muted-foreground">{t("Ziyarətçi hələ mesaj yazmayıb.")}</p>}
        {typing && <p className="self-start text-xs italic text-muted-foreground" aria-live="polite">{t("Ziyarətçi yazır…")}</p>}
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
        <form onSubmit={send} className="flex flex-wrap items-end gap-2 border-t border-border p-3">
          <div className="flex w-full flex-wrap items-center gap-2">
            {!!canned.length && (
              <select value="" onChange={(e) => { const c = canned.find((x) => x.id === e.target.value); if (c) setText(c.text); }} aria-label={t("Hazır cavab")} className="h-8 max-w-48 rounded-md border border-border bg-card px-2 text-xs">
                <option value="">{t("Hazır cavab…")}</option>
                {canned.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            )}
            <Button type="button" size="sm" variant="outline" onClick={aiDraft} disabled={drafting || !chat.messages.some((m) => m.from === "visitor")}><Sparkles size={14} aria-hidden />{drafting ? t("Hazırlanır…") : t("AI qaralaması")}</Button>
            <span className="text-xs text-muted-foreground">{t("Qaralama yalnız sahəyə yazılır, sən oxuyub göndərirsən. Balansdan az xərc çıxır.")}</span>
          </div>
          <Textarea value={text} onChange={(e) => { setText(e.target.value); if (chat) sendTyping(chat.id); }} maxLength={1000} rows={2} className="min-h-0 flex-1" aria-label={t("Cavabın")} placeholder={t("Cavabını yaz…")}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }} />
          <Button disabled={busy || !text.trim()}><Send size={16} aria-hidden />{t("Göndər")}</Button>
        </form>
      ) : <p className="border-t border-border p-3 text-sm text-muted-foreground">{t("Bu söhbət bağlanıb.")}</p>}
    </div>
  );

  return (
    <div className="grid gap-4 md:grid-cols-[18rem_1fr]">
      {list}
      {thread}
    </div>
  );
}
