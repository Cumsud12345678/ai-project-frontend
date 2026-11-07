"use client";
// İndi saytda: vidjeti açıq olan ziyarətçilər real vaxtda (nə edir, harada, haradan gəlib) və operatorun ilk yazması.
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bot, Clock3, EyeOff, Globe, Headset, Monitor, MousePointer2, Radar, Send, Smartphone } from "lucide-react";
import { inviteVisitor, type SiteVisitor } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";

export type RtFilter = "all" | "ai" | "live" | "invited" | "browsing";
export const rtMatch = (v: SiteVisitor, f: RtFilter) =>
  f === "all" || (f === "ai" ? v.chat === "ai" : f === "live" ? v.chat === "live" : f === "invited" ? v.invited && v.chat !== "live" : v.chat === "none" && !v.invited);

function Activity({ v }: { v: SiteVisitor }) {
  const { t } = useI18n();
  const [cls, Icon, text] = v.chat === "live" ? ["bg-primary/10 text-primary", Headset, t("Operatorla yazışır")] as const
    : v.chat === "ai" ? ["bg-violet-500/10 text-violet-700 dark:text-violet-300", Bot, t("AI ilə yazışır")] as const
    : v.invited ? ["bg-amber/15 text-amber", Send, t("Dəvət göndərilib")] as const
    : ["bg-emerald-500/10 text-emerald-700 dark:text-emerald-400", MousePointer2, t("Baxır")] as const;
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <Badge className={cn("gap-1", cls)}><Icon size={11} aria-hidden />{text}</Badge>
      {v.hidden && <Badge className="gap-1 bg-muted text-muted-foreground" title={t("Sayt açıqdır, amma ziyarətçi başqa vərəqdədir")}><EyeOff size={11} aria-hidden />{t("başqa vərəqdə")}</Badge>}
    </span>
  );
}

/** Ziyarətçinin yerli vaxtı və şəhəri (saat qurşağından) */
function useWhere() {
  const { locale } = useI18n();
  const loc = locale === "en" ? "en-GB" : locale;
  return (v: SiteVisitor) => {
    if (!v.tz) return "";
    try {
      const time = new Intl.DateTimeFormat(loc, { timeZone: v.tz, hour: "2-digit", minute: "2-digit" }).format(new Date());
      return `${v.tz.split("/").pop()!.replace(/_/g, " ")} · ${time}`;
    } catch { return ""; }
  };
}

export function RealtimeVisitors({ items, enabled, filter, reload }: { items: SiteVisitor[] | null; enabled: boolean; filter: RtFilter; reload: () => void }) {
  const { t } = useI18n();
  const router = useRouter();
  const where = useWhere();
  const [writing, setWriting] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  if (!enabled) return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border px-6 py-14 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary"><Radar size={22} aria-hidden /></span>
      <h3 className="text-lg font-semibold">{t("Saytında indi kimin olduğunu gör")}</h3>
      <p className="max-w-md text-sm text-muted-foreground">{t("Canlı operator söhbəti açıq olanda vidjet ziyarətçiləri real vaxtda göstərir: hansı səhifədədir, AI ilə yazışır, ya sadəcə baxır. İstədiyinə özün ilk yaza bilərsən.")}</p>
      <Link href="/embed#live" className={buttonVariants()}>{t("Canlı söhbəti aç")}</Link>
    </div>
  );
  if (!items) return <p className="text-sm text-muted-foreground">{t("Yüklənir…")}</p>;
  const rows = items.filter((v) => rtMatch(v, filter));
  if (!rows.length) return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border px-6 py-14 text-center text-sm text-muted-foreground">
      <Radar size={26} aria-hidden />
      {items.length ? t("Bu qovluqda hazırda ziyarətçi yoxdur.") : t("Hazırda saytda vidjeti açıq olan ziyarətçi yoxdur. Kimsə gələndə burada dərhal görünəcək.")}
    </div>
  );

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const v = text.trim();
    if (!v || !writing || busy) return;
    setBusy(true);
    try {
      const r = await inviteVisitor(writing, v);
      toast.success(t("Mesaj göndərildi. Ziyarətçi onu 15 saniyə ərzində görəcək."));
      setWriting(""); setText(""); reload();
      router.push(`/inbox?chat=${encodeURIComponent(r.id)}`);
    } catch (err) { toast.error((err as Error).message); reload(); }
    finally { setBusy(false); }
  }
  const mins = (since: number) => Math.max(1, Math.round((Date.now() - since) / 60000));
  const action = (v: SiteVisitor) => v.chat === "ai" ? <Link href={`/inbox?pid=${v.pid}`} className={buttonVariants({ variant: "outline", size: "sm" })}>{t("Söhbətə bax")}</Link>
    : v.chat === "live" ? <Link href="/inbox?f=open" className={buttonVariants({ variant: "outline", size: "sm" })}>{t("Söhbətə keç")}</Link>
    : v.invited ? <span className="text-xs text-muted-foreground">{t("Cavab gözlənilir…")}</span>
    : <Button size="sm" variant="outline" onClick={() => { setWriting(v.pid); setText(""); }}><Send size={13} aria-hidden />{t("İlk sən yaz")}</Button>;
  const form = (
    <form onSubmit={send} className="flex flex-col gap-2 rounded-lg bg-muted/50 p-3">
      <Textarea autoFocus value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} rows={2} className="min-h-0 text-sm" aria-label={t("Ziyarətçiyə ilk mesaj")} placeholder={t("məs. Salam! Bu elanla bağlı sualınız var?")} />
      <div className="flex gap-2">
        <Button size="sm" disabled={busy || !text.trim()}><Send size={13} aria-hidden />{t("Göndər")}</Button>
        <Button size="sm" type="button" variant="ghost" onClick={() => { setWriting(""); setText(""); }}>{t("Ləğv et")}</Button>
      </div>
    </form>
  );
  const Device = ({ v }: { v: SiteVisitor }) => v.mobile ? <Smartphone size={15} aria-label={t("Telefon")} className="shrink-0 text-muted-foreground" /> : <Monitor size={15} aria-label={t("Kompüter")} className="shrink-0 text-muted-foreground" />;
  const visits = (v: SiteVisitor) => (!v.visits || v.visits === 1 ? t("Yeni") : t("Ziyarət sayı: {n}", { n: v.visits }));

  return (
    <>
      {/* Kompüter: cədvəl */}
      <div className="hidden overflow-hidden rounded-xl border border-border bg-card lg:block">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
            <tr><th className="px-4 py-2.5 font-medium">{t("Ziyarətçi")}</th><th className="px-4 py-2.5 font-medium">{t("Fəaliyyət")}</th><th className="px-4 py-2.5 font-medium">{t("Hazırkı səhifə")}</th><th className="px-4 py-2.5 font-medium">{t("Saytda")}</th><th className="px-4 py-2.5 font-medium">{t("Gəldiyi yer")}</th><th className="px-4 py-2.5" /></tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((v) => (
              <tr key={v.pid} className="align-top">
                <td className="whitespace-nowrap px-4 py-3">
                  <div className="flex items-center gap-2"><Device v={v} /><span className="font-medium">{visits(v)}</span></div>
                  {where(v) && <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground"><Clock3 size={11} aria-hidden />{where(v)}</p>}
                </td>
                <td className="px-4 py-3"><Activity v={v} /></td>
                <td className="max-w-[18rem] px-4 py-3"><p className="truncate" title={v.title}>{v.title || v.path}</p><p className="truncate text-xs text-muted-foreground">{v.path}</p></td>
                <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{t("{n} dəq", { n: mins(v.since) })} · {t("{n} səhifə", { n: v.pages })}</td>
                <td className="max-w-[10rem] truncate px-4 py-3 text-muted-foreground">{v.ref || t("Birbaşa")}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right">{writing === v.pid ? null : action(v)}</td>
              </tr>
            )).flatMap((row, i) => (writing === rows[i]!.pid ? [row, <tr key={`${rows[i]!.pid}-f`}><td colSpan={6} className="px-4 pb-3">{form}</td></tr>] : [row]))}
          </tbody>
        </table>
      </div>
      {/* Telefon və planşet: kartlar */}
      <ul className="flex flex-col gap-2 lg:hidden">
        {rows.map((v) => (
          <li key={v.pid} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3 text-sm">
            <div className="flex items-center gap-2"><Device v={v} /><span className="font-medium">{visits(v)}</span><span className="ml-auto"><Activity v={v} /></span></div>
            <p className="truncate">{v.title || v.path} <span className="text-xs text-muted-foreground">{v.path}</span></p>
            <p className="flex flex-wrap gap-x-2 text-xs text-muted-foreground">
              <span>{t("{n} dəq", { n: mins(v.since) })} · {t("{n} səhifə", { n: v.pages })}</span>
              {where(v) && <span>{where(v)}</span>}
              {v.ref && <span className="inline-flex items-center gap-1"><Globe size={11} aria-hidden />{v.ref}</span>}
            </p>
            {writing === v.pid ? form : <div>{action(v)}</div>}
          </li>
        ))}
      </ul>
    </>
  );
}
