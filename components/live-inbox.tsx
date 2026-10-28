"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, Phone, Send, XCircle } from "lucide-react";
import { toast } from "sonner";
import { closeLive, getLiveChat, getLiveList, sendLive, type LiveChat, type LiveItem } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { sendTyping, useLiveEvents } from "@/lib/live-socket";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";

/** Canlı operator söhbəti: solda söhbətlər, sağda yazışma. Yeni mesaj WebSocket siqnalı ilə dərhal gəlir; bağlantı yoxdursa siyahı 5, açıq söhbət 3 saniyədən bir yenilənir. */
export function LiveInbox({ enabled, onChange }: { enabled: boolean; onChange?: () => void }) {
  const { t, short } = useI18n();
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
  const selRef = useRef("");
  selRef.current = sel;

  const loadList = useCallback(() => { getLiveList(status).then((r) => setItems(r.items)).catch(() => {}); }, [status]);
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

  useEffect(() => { setChat(null); setTyping(false); stick.current = true; if (!sel) return; loadChat(); const i = setInterval(loadChat, live ? 20000 : 3000); return () => clearInterval(i); }, [sel, loadChat, live]);
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
      {items === null ? <p className="text-sm text-muted-foreground">{t("Yüklənir…")}</p>
        : !items.length ? <p className="text-sm text-muted-foreground">{status === "open" ? t("Açıq söhbət yoxdur. Ziyarətçi “Operatorla canlı yaz” bassa və ya Telegram/WhatsApp-da /operator yazsa burada görünəcək.") : t("Bağlanmış söhbət yoxdur.")}</p>
        : (
          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
            {items.map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => setSel(c.id)} aria-current={sel === c.id}
                  className={cn("flex w-full cursor-pointer flex-col gap-1 px-4 py-3 text-left hover:bg-muted/50", sel === c.id && "bg-primary/5")}>
                  <span className="flex items-center gap-2 text-sm font-medium">
                    {c.name || t("Adsız ziyarətçi")}
                    {c.channel && <Badge className="bg-primary/10 text-primary">{c.channel === "telegram" ? "Telegram" : "WhatsApp"}</Badge>}
                    {c.waiting && <Badge className="bg-amber/15 text-amber">{t("Cavab gözləyir")}</Badge>}
                  </span>
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
      <div ref={logRef} onScroll={(e) => { const el = e.currentTarget; stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40; }}
        className="flex max-h-[28rem] flex-1 flex-col gap-2 overflow-y-auto bg-muted/30 p-4" role="log" aria-live="polite" aria-label={t("Söhbət")}>
        {chat.messages.map((m, i) => m.from === "system"
          ? <p key={i} className="self-center text-xs text-muted-foreground">{t("Söhbət bitdi.")}</p>
          : (
            <div key={i} className={cn("max-w-[85%] whitespace-pre-wrap break-words rounded-xl px-3 py-2 text-sm", m.from === "operator" ? "self-end bg-primary text-primary-foreground" : "self-start border border-border bg-card")}>{m.text}</div>
          ))}
        {!chat.messages.length && <p className="text-sm text-muted-foreground">{t("Ziyarətçi hələ mesaj yazmayıb.")}</p>}
        {typing && <p className="self-start text-xs italic text-muted-foreground" aria-live="polite">{t("Ziyarətçi yazır…")}</p>}
      </div>
      {chat.status === "open" ? (
        <form onSubmit={send} className="flex items-end gap-2 border-t border-border p-3">
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
