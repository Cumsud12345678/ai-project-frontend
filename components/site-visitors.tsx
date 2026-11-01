"use client";
import { useCallback, useEffect, useState } from "react";
import { Bot, Globe, Headset, Monitor, Send, Smartphone, Users } from "lucide-react";
import { toast } from "sonner";
import { getVisitors, inviteVisitor, type SiteVisitor } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useLiveEvents } from "@/lib/live-socket";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";

/**
 * "İndi saytda kim var": çat vidjeti açıq olan ziyarətçilər. Operator istədiyinə özü ilk yaza bilər:
 * mesaj ziyarətçinin ekranında 15 saniyə ərzində çat düyməsinin yanında görünür və canlı söhbət başlayır.
 */
export function SiteVisitors({ onStarted }: { onStarted: (chatId: string) => void }) {
  const { t } = useI18n();
  const [items, setItems] = useState<SiteVisitor[] | null>(null);
  const [writing, setWriting] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [, tick] = useState(0);

  const load = useCallback(() => { getVisitors().then((r) => setItems(r.enabled ? r.items : [])).catch(() => {}); }, []);
  const live = useLiveEvents((e) => { if (e.t === "visitors" || (e.t === "live" && e.kind === "start")) load(); });
  useEffect(() => { load(); const i = setInterval(load, live ? 15000 : 10000); return () => clearInterval(i); }, [load, live]);
  useEffect(() => { const i = setInterval(() => tick((x) => x + 1), 30000); return () => clearInterval(i); }, []); // "neçə dəqiqədir saytda" yenilənsin

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const v = text.trim();
    if (!v || !writing || busy) return;
    setBusy(true);
    try {
      const r = await inviteVisitor(writing, v);
      toast.success(t("Mesaj göndərildi. Ziyarətçi onu 15 saniyə ərzində görəcək."));
      setWriting(""); setText(""); load(); onStarted(r.id);
    } catch (err) { toast.error((err as Error).message); load(); }
    finally { setBusy(false); }
  }

  const mins = (since: number) => Math.max(1, Math.round((Date.now() - since) / 60000));
  return (
    <details open className="group rounded-lg border border-border bg-card">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 text-sm font-medium [&::-webkit-details-marker]:hidden">
        <Users size={15} aria-hidden className="text-primary" />{t("İndi saytda")}
        <Badge className={cn("ml-auto", items?.length ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" : "bg-muted text-muted-foreground")}>{items?.length ?? "…"}</Badge>
      </summary>
      <div className="border-t border-border">
        {items === null ? <p className="px-3 py-2 text-xs text-muted-foreground">{t("Yüklənir…")}</p>
          : !items.length ? <p className="px-3 py-2 text-xs text-muted-foreground">{t("Hazırda çat açıq olan ziyarətçi yoxdur. Saytda kimsə olanda burada görünəcək.")}</p>
          : (
            <ul className="max-h-72 divide-y divide-border overflow-y-auto">
              {items.map((v) => (
                <li key={v.pid} className="flex flex-col gap-1 px-3 py-2 text-xs">
                  <div className="flex items-center gap-1.5">
                    {v.mobile ? <Smartphone size={13} aria-label={t("Telefon")} className="shrink-0 text-muted-foreground" /> : <Monitor size={13} aria-label={t("Kompüter")} className="shrink-0 text-muted-foreground" />}
                    <span className="min-w-0 flex-1 truncate font-medium text-foreground" title={`${v.title} · ${v.path}`}>{v.title || v.path}</span>
                    {v.chat === "live" ? <Badge className="bg-primary/10 text-primary"><Headset size={11} aria-hidden className="mr-0.5 inline" />{t("Operatorla")}</Badge>
                      : v.chat === "ai" ? <Badge className="bg-muted text-muted-foreground"><Bot size={11} aria-hidden className="mr-0.5 inline" />{t("AI ilə yazışır")}</Badge> : null}
                  </div>
                  <span className="truncate text-muted-foreground">
                    {v.path} · {t("{n} dəq saytda", { n: mins(v.since) })} · {t("{n} səhifə", { n: v.pages })}
                    {v.ref && <> · <Globe size={11} aria-hidden className="inline align-[-1px]" /> {v.ref}</>}
                  </span>
                  {writing === v.pid ? (
                    <form onSubmit={send} className="mt-1 flex flex-col gap-1.5">
                      <Textarea autoFocus value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} rows={2} className="min-h-0 text-sm" aria-label={t("Ziyarətçiyə ilk mesaj")} placeholder={t("məs. Salam! Bu elanla bağlı sualınız var?")} />
                      <div className="flex gap-1.5">
                        <Button size="sm" disabled={busy || !text.trim()}><Send size={13} aria-hidden />{t("Göndər")}</Button>
                        <Button size="sm" type="button" variant="ghost" onClick={() => { setWriting(""); setText(""); }}>{t("Ləğv et")}</Button>
                      </div>
                    </form>
                  ) : v.chat !== "live" && (
                    <button type="button" disabled={v.invited} onClick={() => { setWriting(v.pid); setText(""); }}
                      className="self-start cursor-pointer text-primary underline disabled:cursor-default disabled:text-muted-foreground disabled:no-underline">
                      {v.invited ? t("Mesaj göndərilib, gözlənilir…") : t("İlk sən yaz")}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
      </div>
    </details>
  );
}
