"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Bot, ExternalLink, Globe, Headset, MousePointerClick, Monitor, ShieldQuestion, Smartphone, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { blockVisitor, getConversation, getVisitors, inviteVisitor, type ConversationMsg, type SiteVisitor } from "@/lib/api";
import { useResizable } from "@/components/resizable";
import { useI18n } from "@/lib/i18n";
import { useLiveEvents } from "@/lib/live-socket";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ConfirmButton, VisitorFacts } from "@/components/visitor-facts";

/**
 * AI söhbətləri: hazırda saytda AI ilə yazışan ziyarətçilər. Operator yazışmanı canlı izləyir
 * və lazım olsa "ələ alır": ilk mesajı ziyarətçinin çatında görünür (≤15 san), söhbət canlı operatora keçir,
 * AI yazışması operator söhbətinə kontekst kimi düşür.
 */
export function AiWatch({ title, initial = "", onTaken }: { title: string; initial?: string; onTaken: (chatId: string) => void }) {
  const { t, locale } = useI18n();
  // Siyahının eni bütün söhbət səhifələrində ortaqdır və yadda qalır
  const listW = useResizable("list", 320, 260, 480, "right");
  const [items, setItems] = useState<SiteVisitor[] | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [sel, setSel] = useState(initial);
  useEffect(() => { if (initial) setSel(initial); }, [initial]);
  const [msgs, setMsgs] = useState<ConversationMsg[] | null>(null);
  const [convErr, setConvErr] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    getVisitors().then((r) => { setEnabled(r.enabled); setItems(r.items.filter((v) => v.chat === "ai")); }).catch(() => setItems([]));
  }, []);
  useEffect(() => { load(); const i = setInterval(load, 5000); return () => clearInterval(i); }, [load]);
  useLiveEvents((e) => { if (e.t === "visitors" || e.t === "live") load(); }, enabled);

  const cur = items?.find((v) => v.pid === sel) ?? null;
  const sid = cur?.sid ?? "";
  useEffect(() => {
    setMsgs(null); setConvErr("");
    if (!sid) return;
    let on = true;
    const f = () => getConversation(sid).then((r) => { if (on) { setMsgs(r.messages); setConvErr(""); } }).catch((e: Error) => { if (on) setConvErr(e.message); });
    f();
    const i = setInterval(f, 4000); // ziyarətçi yazdıqca yazışma yenilənir
    return () => { on = false; clearInterval(i); };
  }, [sid]);
  useEffect(() => { const el = logRef.current; if (el) el.scrollTop = el.scrollHeight; }, [msgs?.length]);

  const fmt = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : locale, { hour: "2-digit", minute: "2-digit" });
  const mins = (ms: number) => Math.max(1, Math.round((Date.now() - ms) / 60000));

  async function take(e: React.FormEvent) {
    e.preventDefault();
    const v = text.trim();
    if (!cur || !v || busy) return;
    setBusy(true);
    try {
      const r = await inviteVisitor(cur.pid, v);
      toast.success(t("Söhbət sənə keçdi. Mesajın ziyarətçinin çatında 15 saniyə ərzində görünəcək."));
      setText("");
      onTaken(r.id);
    } catch (err) { toast.error((err as Error).message); }
    finally { setBusy(false); }
  }

  if (!enabled) return (
    <div className="m-auto flex max-w-md flex-col items-center gap-2 p-8 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground"><Bot size={22} aria-hidden /></span>
      <p className="font-medium">{t("Canlı operator söhbəti söndürülüb.")}</p>
      <p className="text-sm text-muted-foreground">{t("AI söhbətlərini izləmək və ələ almaq üçün canlı operatoru aç: Saytına qoş → Canlı operator.")}</p>
    </div>
  );

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1">
      <section aria-label={title} style={listW.style} className={cn("relative flex min-h-0 w-full shrink-0 flex-col border-border md:w-[var(--pane-w)] md:border-r", sel && "hidden md:flex")}>{listW.handle}
        <div className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4"><h2 className="min-w-0 flex-1 truncate text-[15px] font-semibold">{title}</h2></div>
        <p className="border-b border-border px-4 py-2.5 text-xs text-muted-foreground">{t("Hazırda saytda AI ilə yazışan ziyarətçilər. Yazışmaya bax, lazım olsa söhbəti ələ al.")}</p>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {items === null ? <div className="flex flex-col gap-2 p-1">{[0, 1].map((i) => <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />)}</div>
            : !items.length ? (
              <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
                <span className="grid size-11 place-items-center rounded-full bg-muted text-muted-foreground"><Bot size={20} aria-hidden /></span>
                <p className="text-sm font-medium">{t("İndi AI ilə yazışan yoxdur")}</p>
                <p className="text-xs text-muted-foreground">{t("Ziyarətçi saytda çata yazan kimi burada görünəcək.")}</p>
              </div>
            ) : (
              <ul className="flex flex-col gap-0.5">
                {items.map((v) => (
                  <li key={v.pid}>
                    <button type="button" onClick={() => setSel(v.pid)} aria-current={sel === v.pid}
                      className={cn("flex w-full cursor-pointer gap-3 rounded-lg px-3 py-2.5 text-left transition-colors", sel === v.pid ? "bg-muted" : "hover:bg-muted/60")}>
                      <span className="relative mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-violet-500/10 text-violet-600"><Bot size={17} aria-hidden />
                        <span className={cn("absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full ring-2 ring-card", v.hidden ? "bg-amber" : "bg-chart-2")} aria-hidden /></span>
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="flex items-center gap-2"><span className="min-w-0 flex-1 truncate text-sm font-medium">{v.title || v.path}</span><span className="shrink-0 text-[11px] text-muted-foreground">{t("{n} dəq", { n: mins(v.since) })}</span></span>
                        <span className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                          {v.mobile ? <Smartphone size={11} aria-hidden /> : <Monitor size={11} aria-hidden />}{v.path}{v.pages > 1 ? ` · ${t("{n} səhifə", { n: v.pages })}` : ""}{v.hidden ? ` · ${t("başqa vərəqdədir")}` : ""}
                        </span>
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
              <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground"><Bot size={22} aria-hidden /></span>
              <p className="font-medium">{sel ? t("Ziyarətçi saytdan çıxıb və ya söhbəti bitirib.") : t("Söhbət seç")}</p>
              <p className="max-w-xs text-sm text-muted-foreground">{t("AI-nin cavablarını canlı izləyə və istədiyin an söhbəti ələ ala bilərsən.")}</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-3">
              <Button size="sm" variant="ghost" className="md:hidden" onClick={() => setSel("")} aria-label={t("Geri")}><ArrowLeft size={16} aria-hidden /></Button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold">{cur.title || cur.path}</p>
                <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground"><Globe size={11} aria-hidden />{cur.path}{cur.ref ? ` · ${t("gəldiyi yer")}: ${cur.ref}` : ""}</p>
              </div>
              <span className="hidden items-center gap-1.5 rounded-full bg-violet-500/10 px-2.5 py-1 text-xs font-medium text-violet-700 sm:inline-flex"><Bot size={13} aria-hidden />{t("AI cavab verir")}</span>
            </div>
            <div ref={logRef} className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto bg-muted/25 px-4 py-4 md:px-6" role="log" aria-live="polite" aria-label={t("Söhbət")}>
              {!sid ? <p className="self-center text-sm text-muted-foreground">{t("Yazışma hələ yüklənməyib: ziyarətçinin vidjeti köhnə versiyadır və ya hələ ilk sualı göndərməyib.")}</p>
                : convErr ? <p className="flex items-center gap-2 self-center text-sm text-muted-foreground"><TriangleAlert size={15} aria-hidden />{convErr}</p>
                : msgs === null ? <div className="h-24 animate-pulse rounded-xl bg-muted/60" />
                : msgs.map((m) => (
                  <div key={m.id} className="flex flex-col gap-2">
                    <div className="flex max-w-[80%] flex-col gap-1 self-start">
                      <span className="px-1 text-[11px] text-muted-foreground">{t("Ziyarətçi")} · {fmt.format(new Date(m.at))}</span>
                      <div className="whitespace-pre-wrap break-words rounded-2xl rounded-tl-md border border-border bg-card px-3.5 py-2 text-sm shadow-sm">{m.message}</div>
                    </div>
                    {m.answer !== null && (
                      <div className="flex max-w-[80%] flex-col items-end gap-1 self-end">
                        <span className="flex items-center gap-1 px-1 text-[11px] text-muted-foreground"><Bot size={11} aria-hidden />AI{m.error ? ` · ${t("xəta")}` : m.results === 0 ? ` · ${t("nəticə tapılmadı")}` : ""}</span>
                        <div className={cn("whitespace-pre-wrap break-words rounded-2xl rounded-tr-md px-3.5 py-2 text-sm shadow-sm", m.error || m.results === 0 ? "border border-amber/40 bg-amber/10" : "bg-violet-500/10")}>{m.answer}</div>
                        {/* AI-nin göstərdiyi elanlar: ziyarətçinin keçdiyi elan işarələnir */}
                        {!!m.listings?.length && (
                          <ul className="flex max-w-full flex-wrap justify-end gap-1.5">
                            {m.listings.map((l, i) => {
                              const clicked = m.clicks?.some((c) => c.id === l.id);
                              const body = (
                                <>
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  {l.image && <img src={l.image} alt="" loading="lazy" referrerPolicy="no-referrer" className="size-8 shrink-0 rounded object-cover" />}
                                  <span className="min-w-0"><span className="block max-w-44 truncate font-medium">{l.title}</span>{typeof l.price === "number" && <span className="block text-muted-foreground">{l.price.toLocaleString(locale)} {l.currency ?? ""}</span>}</span>
                                  {clicked ? <MousePointerClick size={13} aria-label={t("Ziyarətçi bu elana keçdi")} className="shrink-0 text-chart-2" /> : l.url && <ExternalLink size={12} aria-hidden className="shrink-0 text-muted-foreground" />}
                                </>
                              );
                              const cls = cn("flex items-center gap-2 rounded-lg border bg-card px-2 py-1.5 text-xs", clicked ? "border-chart-2/50 ring-1 ring-chart-2/30" : "border-border");
                              return <li key={l.id ?? i}>{l.url ? <a href={l.url} target="_blank" rel="noopener noreferrer" className={cn(cls, "hover:bg-muted/50")}>{body}</a> : <span className={cls}>{body}</span>}</li>;
                            })}
                          </ul>
                        )}
                        {m.confirm && (
                          <div className="flex max-w-xs items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs">
                            <ShieldQuestion size={14} aria-hidden className="mt-0.5 shrink-0 text-primary" />
                            <span><b className="block">{t("Təsdiq istədi: {title}", { title: m.confirm.title })}</b>{m.confirm.summary}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
            </div>
            <details className="shrink-0 border-t border-border px-4 py-2 text-sm">
              <summary className="cursor-pointer text-muted-foreground">{t("Ziyarətçi haqqında")}</summary>
              <div className="flex flex-wrap items-start justify-between gap-3 pt-2">
                <VisitorFacts v={{ ...(cur.tz && { tz: cur.tz }), ...(cur.first && { first: cur.first }), ...(cur.visits && { visits: cur.visits }), lang: cur.lang, mobile: cur.mobile, ...(cur.ref && { ref: cur.ref }) }} />
                <ConfirmButton label={t("Blokla")} yes={t("Bəli, blokla")} warning={t("Ziyarətçi saytda çata yaza bilməyəcək. Bloku Müraciətlər → Bloklanmış bölməsindən götürə bilərsən.")}
                  onConfirm={async () => { await blockVisitor(cur.pid); toast.success(t("Bloklandı.")); setSel(""); load(); }} />
              </div>
            </details>
            <form onSubmit={take} className="shrink-0 p-3">
              <div className="rounded-xl border border-border bg-card shadow-sm focus-within:ring-2 focus-within:ring-primary/25">
                <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} rows={2} aria-label={t("Ziyarətçiyə ilk mesajın")}
                  placeholder={t("Salam! Mən operatoram, sualınıza mən kömək edim…")} className="block w-full resize-none rounded-t-xl bg-transparent px-3.5 pt-3 text-sm outline-none" />
                <div className="flex items-center gap-2 px-2.5 pb-2.5">
                  <span className="min-w-0 flex-1 text-xs text-muted-foreground">{t("Göndərəndə söhbət sənə keçir, AI susur.")}</span>
                  <Button size="sm" disabled={busy || !text.trim() || cur.invited}><Headset size={14} aria-hidden />{cur.invited ? t("Cavab gözlənilir…") : t("Söhbəti ələ al")}</Button>
                </div>
              </div>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
