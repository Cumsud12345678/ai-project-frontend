"use client";
// Kanallar → Telegram / WhatsApp: botun cavab verdiyi bütün yazışmalar (son 14 gün), operatora ötürülənlər də.
// Əvvəl bu qovluqlarda yalnız canlı (operator) söhbətlər görünürdü, ona görə müştəri botla yazışsa da sayğac 0 qalırdı.
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bot, Headset, Phone, Send, TriangleAlert, UserRound } from "lucide-react";
import { toast } from "sonner";
import { getChannelChats, getConversation, startLiveChat, type ChannelChat, type ConversationMsg, type ConvListing, type Listing } from "@/lib/api";
import { ListingCards } from "@/components/listing-cards";
import { useResizable } from "@/components/resizable";
import { useI18n } from "@/lib/i18n";
import { useLiveEvents } from "@/lib/live-socket";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Msg = { key: string; role: "user" | "model"; text: string; at?: string; warn?: boolean; listings?: Listing[] };
// Kanal ən çox 3 elan kartı göndərir (channel-chat.ts → formatReply), panel də eyni sayda göstərir
const CARD_LIMIT = 3;
const toListing = (l: ConvListing, i: number): Listing => ({ id: l.id ?? `l${i}`, title: l.title, price: l.price ?? null, currency: l.currency ?? null, url: l.url ?? null, image: l.image ?? null, year: l.year ?? null, mileage: l.mileage ?? null });

export function ChannelChats({ channel, title, liveEnabled, onLive }: { channel: "telegram" | "whatsapp"; title: string; liveEnabled: boolean; onLive: (liveId: string) => void }) {
  const { t, locale } = useI18n();
  // Siyahının eni bütün söhbət səhifələrində ortaqdır və yadda qalır
  const listW = useResizable("list", 320, 260, 480, "right");
  const [items, setItems] = useState<ChannelChat[] | null>(null);
  const [connected, setConnected] = useState(true);
  const [sel, setSel] = useState("");
  const [msgs, setMsgs] = useState<Msg[] | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const name = channel === "telegram" ? "Telegram" : "WhatsApp";
  const Icon = channel === "telegram" ? Send : Phone;

  const load = useCallback(() => {
    getChannelChats(channel).then((r) => { setItems(r.items); setConnected(r.enabled[channel]); }).catch(() => setItems([]));
  }, [channel]);
  useEffect(() => { load(); const i = setInterval(load, 10_000); return () => clearInterval(i); }, [load]);
  useLiveEvents((e) => { if (e.t === "channels" || e.t === "live") load(); }, true);

  const cur = items?.find((c) => c.chatId === sel) ?? null;
  // Tam yazışma sorğu jurnalından (sid ilə); jurnal söndürülübsə botun qısa yaddaşı (son 10 mesaj)
  useEffect(() => {
    setMsgs(null);
    if (!cur) return;
    let on = true;
    const fallback = (): Msg[] => cur.history.map((m, i) => ({ key: `h${i}`, role: m.role, text: m.text }));
    const sids = cur.sids?.length ? cur.sids : [cur.sid];
    // Uzun fasilədən sonra kanal yeni söhbət ID-si açır: hamısını köhnədən yeniyə birləşdiririk
    const f = () => Promise.all(sids.map((s) => getConversation(s).then((r) => r.messages).catch(() => [] as ConversationMsg[])))
      .then((parts) => {
        if (!on) return;
        const full = parts.flat().flatMap((m: ConversationMsg): Msg[] => [
          { key: `${m.id}q`, role: "user", text: m.message, at: m.at },
          ...(m.answer !== null ? [{ key: `${m.id}a`, role: "model" as const, text: m.answer, at: m.at, warn: m.error || m.results === 0, listings: (m.listings ?? []).slice(0, CARD_LIMIT).map(toListing) }] : []),
        ]);
        setMsgs(full.length ? full : fallback());
      })
      .catch(() => { if (on) setMsgs(fallback()); });
    f();
    const i = setInterval(f, 6000);
    return () => { on = false; clearInterval(i); };
  }, [cur?.sid, cur?.sids?.length, cur?.updatedAt]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const el = logRef.current; if (el) el.scrollTop = el.scrollHeight; }, [msgs?.length]);

  const time = (iso: string) => {
    const d = new Date(iso);
    const same = d.toDateString() === new Date().toDateString();
    return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : locale, same ? { hour: "2-digit", minute: "2-digit" } : { day: "numeric", month: "short" }).format(d);
  };
  const who = (c: ChannelChat) => c.name || (channel === "whatsapp" && c.phone ? `+${c.phone}` : t("{ch} istifadəçisi", { ch: name }));
  // WhatsApp-da operator yalnız nömrəsi məlum olan müştəriyə yaza bilir
  const canTake = Boolean(cur && liveEnabled && (channel === "telegram" || cur.ref));

  async function take(e: React.FormEvent) {
    e.preventDefault();
    const v = text.trim();
    if (!cur || !v || busy) return;
    setBusy(true);
    try {
      const r = await startLiveChat({ channel, chatId: cur.chatId, text: v });
      setText("");
      toast.success(r.existing ? t("Bu müştəri ilə canlı söhbət artıq açıqdır.") : t("Mesaj göndərildi, söhbət sənə keçdi."));
      onLive(r.id);
    } catch (err) { toast.error((err as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1">
      <section aria-label={title} style={listW.style} className={cn("relative flex min-h-0 w-full shrink-0 flex-col border-border md:w-[var(--pane-w)] md:border-r", sel && "hidden md:flex")}>{listW.handle}
        <div className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4"><h2 className="min-w-0 flex-1 truncate text-[15px] font-semibold">{title}</h2></div>
        <p className="border-b border-border px-4 py-2.5 text-xs text-muted-foreground">{t("{ch}-da botla yazışan müştərilər (son 14 gün). Yazışmaya bax, lazım olsa söhbəti ələ al.", { ch: name })}</p>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {items === null ? <div className="flex flex-col gap-2 p-1">{[0, 1, 2].map((i) => <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />)}</div>
            : !items.length ? (
              <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
                <span className="grid size-11 place-items-center rounded-full bg-muted text-muted-foreground"><Icon size={20} aria-hidden /></span>
                <p className="text-sm font-medium">{connected ? t("Hələ yazışma yoxdur") : t("{ch} qoşulmayıb", { ch: name })}</p>
                <p className="text-xs text-muted-foreground">{connected ? t("Müştəri {ch}-da yazan kimi burada görünəcək.", { ch: name }) : t("Botu Kanallar bölməsindən qoş.")}</p>
                {!connected && <Link href="/channels" className="mt-1 text-sm font-medium underline-offset-2 hover:underline">{t("Kanallara keç")}</Link>}
              </div>
            ) : (
              <ul className="flex flex-col gap-0.5">
                {items.map((c) => (
                  <li key={c.chatId}>
                    <button type="button" onClick={() => setSel(c.chatId)} aria-current={sel === c.chatId}
                      className={cn("flex w-full cursor-pointer gap-3 rounded-lg px-3 py-2.5 text-left transition-colors", sel === c.chatId ? "bg-muted" : "hover:bg-muted/60")}>
                      <span className={cn("mt-0.5 grid size-9 shrink-0 place-items-center rounded-full", c.liveId ? "bg-chart-2/15 text-chart-2" : "bg-violet-500/10 text-violet-600")}>
                        {c.liveId ? <Headset size={16} aria-hidden /> : <Bot size={17} aria-hidden />}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="flex items-center gap-2"><span className="min-w-0 flex-1 truncate text-sm font-medium">{who(c)}</span><span className="shrink-0 text-[11px] text-muted-foreground">{time(c.updatedAt)}</span></span>
                        <span className="truncate text-xs text-muted-foreground">{c.liveId ? `${t("Operatorda")} · ` : ""}{c.last || c.lastAnswer || "—"}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
        </div>
      </section>

      <section className={cn("min-h-0 min-w-0 flex-1 flex-col", sel ? "flex" : "hidden md:flex")}>
        {!cur ? (
          <div className="grid flex-1 place-items-center p-8 text-center">
            <div className="flex flex-col items-center gap-2">
              <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground"><Icon size={22} aria-hidden /></span>
              <p className="font-medium">{t("Söhbət seç")}</p>
              <p className="max-w-xs text-sm text-muted-foreground">{t("Botun müştəriyə nə cavab verdiyini görə və istədiyin an söhbəti ələ ala bilərsən.")}</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-3">
              <Button size="sm" variant="ghost" className="md:hidden" onClick={() => setSel("")} aria-label={t("Geri")}><ArrowLeft size={16} aria-hidden /></Button>
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-muted"><UserRound size={15} aria-hidden /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold">{who(cur)}</p>
                <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground"><Icon size={11} aria-hidden />{name}{channel === "whatsapp" && cur.phone ? ` · +${cur.phone}` : ""}</p>
              </div>
              {cur.liveId
                ? <Button size="sm" onClick={() => onLive(cur.liveId!)}><Headset size={14} aria-hidden />{t("Canlı söhbətə keç")}</Button>
                : <span className="hidden items-center gap-1.5 rounded-full bg-violet-500/10 px-2.5 py-1 text-xs font-medium text-violet-700 sm:inline-flex"><Bot size={13} aria-hidden />{t("AI cavab verir")}</span>}
            </div>
            <div ref={logRef} className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto bg-muted/25 px-4 py-4 md:px-6" role="log" aria-live="polite" aria-label={t("Söhbət")}>
              {msgs === null ? <div className="h-24 animate-pulse rounded-xl bg-muted/60" />
                : !msgs.length ? <p className="self-center text-sm text-muted-foreground">{t("Yazışma tapılmadı.")}</p>
                : msgs.map((m) => m.role === "user" ? (
                  <div key={m.key} className="flex max-w-[80%] flex-col gap-1 self-start">
                    <span className="px-1 text-[11px] text-muted-foreground">{t("Müştəri")}{m.at ? ` · ${time(m.at)}` : ""}</span>
                    <div className="whitespace-pre-wrap break-words rounded-2xl rounded-tl-md border border-border bg-card px-3.5 py-2 text-sm shadow-sm">{m.text}</div>
                  </div>
                ) : (
                  <div key={m.key} className="flex max-w-[80%] flex-col items-end gap-1 self-end">
                    <span className="flex items-center gap-1 px-1 text-[11px] text-muted-foreground"><Bot size={11} aria-hidden />AI{m.warn ? ` · ${t("nəticə tapılmadı")}` : ""}</span>
                    <div className={cn("whitespace-pre-wrap break-words rounded-2xl rounded-tr-md px-3.5 py-2 text-sm shadow-sm", m.warn ? "border border-amber/40 bg-amber/10" : "bg-violet-500/10")}>{m.text}</div>
                    {/* Botun müştəriyə göndərdiyi elan kartları */}
                    {!!m.listings?.length && <div className="w-80 max-w-full"><ListingCards listings={m.listings} /></div>}
                  </div>
                ))}
            </div>
            {!cur.liveId && (
              liveEnabled ? (
                <form onSubmit={take} className="shrink-0 p-3">
                  <div className="rounded-xl border border-border bg-card shadow-sm focus-within:ring-2 focus-within:ring-primary/25">
                    <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} rows={2} disabled={!canTake} aria-label={t("Müştəriyə mesajın")}
                      placeholder={t("Salam! Mən operatoram, sualınıza mən kömək edim…")} className="block w-full resize-none rounded-t-xl bg-transparent px-3.5 pt-3 text-sm outline-none disabled:opacity-60" />
                    <div className="flex items-center gap-2 px-2.5 pb-2.5">
                      <span className="min-w-0 flex-1 text-xs text-muted-foreground">{canTake ? t("Göndərəndə söhbət sənə keçir, AI susur.") : t("Bu müştərinin nömrəsi məlum deyil, ona yalnız o yenidən yazanda cavab vermək olar.")}</span>
                      <Button size="sm" disabled={busy || !text.trim() || !canTake}><Headset size={14} aria-hidden />{t("Söhbəti ələ al")}</Button>
                    </div>
                  </div>
                </form>
              ) : (
                <p className="flex shrink-0 items-center gap-2 border-t border-border px-4 py-3 text-xs text-muted-foreground">
                  <TriangleAlert size={14} aria-hidden />{t("Söhbəti ələ almaq üçün canlı operatoru aç.")} <Link href="/setup?step=launch" className="font-medium text-foreground underline-offset-2 hover:underline">{t("Aç")}</Link>
                </p>
              )
            )}
          </>
        )}
      </section>
    </div>
  );
}
