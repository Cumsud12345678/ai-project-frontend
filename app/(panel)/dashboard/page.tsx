"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Check, CircleHelp, Coins, Gauge, CircleCheck, PhoneCall, ThumbsUp, UserRound, Wallet, Zap } from "lucide-react";
import { getFeedback, getOverview, getUsage, type FeedbackSummary, type Overview, type Usage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/components/session";
import { DashboardSkeleton } from "@/components/skeletons";
import { TrendChart, compact } from "@/components/charts";
import { StatTile } from "@/components/stat-tile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
  const router = useRouter();
  const { tenant } = useSession();
  const { t, num } = useI18n();
  const [usage, setUsage] = useState<Usage | null>(null);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [fb, setFb] = useState<FeedbackSummary | null>(null);
  const [error, setError] = useState("");

  // Yeni istifadəçi: quraşdırma sehrbazına
  useEffect(() => { if (!tenant) router.replace("/setup"); }, [tenant, router]);
  useEffect(() => {
    if (!tenant) return;
    getUsage().then(setUsage).catch((e: Error) => setError(e.message));
    getOverview().then(setOverview).catch(() => {}); // əlavə bloklar yüklənməsə də səhifə işləyir
    getFeedback(30).then(setFb).catch(() => {});
  }, [tenant]);
  if (!tenant) return null;
  if (!usage && !error) return <DashboardSkeleton />;

  const used = usage?.requests ?? 0;
  const limit = usage?.limits.monthlyRequests ?? 0;
  const left = limit ? Math.max(0, limit - used) : null;
  const pct = limit ? (used / limit) * 100 : 0;
  // Əsas məhdudiyyət balansdır (AZN, hər sorğunun real xərcinə görə). Sorğu sayı yalnız məlumat üçündür.
  const bill = overview?.billing ?? null;
  const avgCost = bill && used >= 20 && bill.monthAzn > 0 ? bill.monthAzn / used : 0;
  const approxLeft = bill && avgCost > 0 ? Math.floor(bill.balanceAzn / avgCost) : null;
  const data = (usage?.daily ?? []).map((d) => ({ label: `${d.date.slice(8, 10)}.${d.date.slice(5, 7)}`, title: d.date, value: d.requests }));

  const supportMode = overview ? overview.mode !== "listings" : false;
  const att = overview?.attention ?? [];
  const attText: Record<string, { text: string; href: string }> = {
    widgetOff: { text: t("Çat vidjeti söndürülüb: saytında görünmür."), href: "/embed" },
    live: { text: t("{n} canlı söhbət cavab gözləyir.", { n: att.find((a) => a.kind === "live")?.count ?? 0 }), href: "/inbox" },
    leads: { text: t("{n} həll olunmamış müraciət var.", { n: att.find((a) => a.kind === "leads")?.count ?? 0 }), href: "/inbox" },
    unanswered: { text: t("Son 7 gündə {n} sual cavabsız qaldı: çatışan məlumatı əlavə et.", { n: att.find((a) => a.kind === "unanswered")?.count ?? 0 }), href: "/inbox" },
    sourceErrors: { text: t("{n} mənbə oxuna bilmədi.", { n: att.find((a) => a.kind === "sourceErrors")?.count ?? 0 }), href: "/knowledge" },
    noResults: { text: t("Son 30 gündə {n} sorğuya uyğun elan tapılmadı.", { n: att.find((a) => a.kind === "noResults")?.count ?? 0 }), href: "/queries" },
  };
  const s = overview?.setup;
  const steps = s ? [
    { done: s.dataReady, label: overview!.mode === "listings" ? t("Elan mənbəyi qoşulub") : t("Bilik bazasına məlumat əlavə et (fayl, sayt linki və ya mətn)"), href: overview!.mode === "listings" ? "/connection" : "/knowledge" },
    { done: s.widgetInstalled, label: t("Çat scriptini saytına qoy"), href: "/embed", hint: t("Əvvəlcə “Sınaq söhbəti”ndə yoxlaya bilərsən.") },
    ...(s.queriesLogged ? [{ done: s.firstQuestion, label: t("İlk real sual gəlsin"), href: "/playground", hint: t("Saytında çatı özün sına.") }] : []),
  ] : [];
  const nextIdx = steps.findIndex((x) => !x.done);
  const q = overview?.quality;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold">{t("Bu ayın istifadəsi")}</h1>
        <p className="text-sm text-muted-foreground">{usage?.month ?? "…"}</p>
      </header>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

      {overview?.billing && overview.billing.enforced && overview.billing.state !== "ok" && (
        <div role="alert" className={cn("flex items-start gap-3 rounded-lg border p-4 text-sm", overview.billing.state === "empty" ? "border-destructive/50 bg-destructive/10" : "border-amber/50 bg-amber/10")}>
          <AlertTriangle size={18} className={cn("mt-0.5 shrink-0", overview.billing.state === "empty" ? "text-destructive" : "text-amber")} aria-hidden />
          <div>
            <p className="font-medium">{overview.billing.state === "empty" ? t("Balans bitib: çat ziyarətçilərə cavab vermir.") : t("Balans azalır: {a} AZN qalıb.", { a: overview.billing.balanceAzn.toFixed(2) })}</p>
            <Link href="/billing" className="text-primary underline">{t("Balansı yüklə")}</Link>
          </div>
        </div>
      )}

      {limit > 0 && pct >= 80 && (
        <div role="alert" className={cn("flex items-start gap-3 rounded-lg border p-4 text-sm", pct >= 100 ? "border-destructive/50 bg-destructive/10" : "border-amber/50 bg-amber/10")}>
          <AlertTriangle size={18} className={cn("mt-0.5 shrink-0", pct >= 100 ? "text-destructive" : "text-amber")} aria-hidden />
          <div>
            <p className="font-medium">{pct >= 100 ? t("Aylıq limit dolub: çat istifadəçilərə cavab vermir.") : t("Aylıq limitin {pct}%-i istifadə olunub.", { pct: Math.round(pct) })}</p>
            <p className="text-muted-foreground">{pct >= 100 ? t("Limit növbəti ayın əvvəlində yenilənir. Daha tez davam etmək üçün limiti artırmaq barədə administratorla əlaqə saxla.") : t("Qalan {n} sorğu bitəndə çat cavab verməyəcək. Limiti artırmaq üçün administratorla əlaqə saxla.", { n: num(left ?? 0) })}</p>
          </div>
        </div>
      )}

      {steps.length > 0 && nextIdx >= 0 && (
        <Card>
          <CardHeader><CardTitle>{t("Quraşdırma")}</CardTitle><CardDescription>{t("{done}/{total} addım tamamlandı", { done: steps.filter((x) => x.done).length, total: steps.length })}</CardDescription></CardHeader>
          <ol className="divide-y divide-border">
            {steps.map((st, i) => (
              <li key={i}>
                <Link href={st.href} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/50">
                  <span className={cn("grid size-6 shrink-0 place-items-center rounded-full border text-xs font-medium", st.done ? "border-primary bg-primary text-primary-foreground" : i === nextIdx ? "border-primary text-primary" : "border-border text-muted-foreground")}>
                    {st.done ? <Check size={14} aria-hidden /> : i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cn("block text-sm", st.done && "text-muted-foreground line-through")}>{st.label}</span>
                    {!st.done && i === nextIdx && "hint" in st && st.hint && <span className="block text-xs text-muted-foreground">{st.hint}</span>}
                  </span>
                  {!st.done && <ArrowRight size={16} className="shrink-0 text-muted-foreground" aria-hidden />}
                </Link>
              </li>
            ))}
          </ol>
        </Card>
      )}

      {att.length > 0 && (
        <Card>
          <CardHeader><CardTitle>{t("Diqqət tələb edir")}</CardTitle></CardHeader>
          <ul className="divide-y divide-border">
            {att.map((a) => (
              <li key={a.kind}>
                <Link href={attText[a.kind]!.href} className="flex items-center gap-3 px-5 py-3 text-sm hover:bg-muted/50">
                  <span className="min-w-0 flex-1">{attText[a.kind]!.text}</span>
                  <ArrowRight size={16} className="shrink-0 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {q && q.total > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">{t("Keyfiyyət (son 30 gün)")}</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile icon={CircleCheck} tone={1} label={supportMode ? t("Cavab verilən sorğular") : t("Nəticə tapılan sorğular")} value={q.answerRate === null ? "–" : `${q.answerRate}%`} hint={t("{n} sorğudan", { n: num(q.total) })} />
            <StatTile icon={CircleHelp} tone={3} label={supportMode ? t("Cavabsız qalanlar") : t("Nəticəsiz sorğular")} value={num(q.noResults)} />
            {supportMode && q.handoffs !== null && <StatTile icon={PhoneCall} tone={2} label={t("Operatora yönləndirilən")} value={num(q.handoffs)} hint={t("müraciət")} />}
            {fb && fb.up + fb.down > 0 && <StatTile icon={ThumbsUp} tone={4} label={t("Faydalı cavab")} value={`${Math.round((fb.up / (fb.up + fb.down)) * 100)}%`} hint={t("{n} rəydən", { n: num(fb.up + fb.down) })} />}
            {overview?.live?.enabled && <StatTile icon={UserRound} tone={5} label={t("Açıq canlı söhbət")} value={num(overview.live.open)} hint={overview.live.waiting ? t("{n} cavab gözləyir", { n: num(overview.live.waiting) }) : undefined} />}
          </div>
        </div>
      )}

      {fb && fb.bad.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("Faydalı olmayan cavablar")}</CardTitle>
            <CardDescription>{t("Ziyarətçilər bu cavablara 👎 verib. Çatışan məlumatı Bilik bazasına əlavə et.")}</CardDescription>
          </CardHeader>
          <ul className="divide-y divide-border">
            {fb.bad.slice(0, 5).map((b, i) => (
              <li key={i} className="px-5 py-3 text-sm">
                <p className="font-medium">{b.question}</p>
                {b.answer && <p className="mt-0.5 line-clamp-2 text-muted-foreground">{b.answer}</p>}
              </li>
            ))}
          </ul>
          <CardContent className="border-t border-border"><Link href="/knowledge" className="text-sm text-primary underline">{t("Bilik bazasına əlavə et")}</Link></CardContent>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile icon={Wallet} tone={3} label={t("Balans")} value={bill ? `${bill.balanceAzn.toFixed(2)} AZN` : "–"} hint={bill ? `${t("Pulsuz hissə")}: ${bill.freeAzn.toFixed(2)} · ${t("Yüklənmiş hissə")}: ${bill.paidAzn.toFixed(2)}` : undefined} />
        <StatTile icon={Coins} tone={2} label={t("Bu ay xərc")} value={bill ? `${bill.monthAzn.toFixed(2)} AZN` : "–"} hint={t("Ətraflı: Balans bölməsi")} />
        <StatTile icon={Zap} tone={1} label={t("Sorğu")} value={usage ? num(used) : "–"} hint={limit ? t("Admin limiti: {n}", { n: num(limit) }) : undefined} />
        <StatTile icon={Gauge} tone={4} label={t("Ziyarətçi limiti")} value={overview?.limits ? (overview.limits.perVisitorDay > 0 ? num(overview.limits.perVisitorDay) : t("limitsiz")) : "–"} hint={overview?.limits && overview.limits.perVisitorDay > 0 ? t("mesaj / gün") : undefined} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {bill && (
          <Card>
            <CardHeader><CardTitle>{t("Balans")}</CardTitle><CardDescription>{t("Hər sorğunun real xərcinə görə çıxılır")}</CardDescription></CardHeader>
            <CardContent className="flex flex-col gap-3 py-6">
              <p className="text-3xl font-semibold tabular-nums">{bill.balanceAzn.toFixed(2)} <span className="text-base font-normal text-muted-foreground">AZN</span></p>
              {approxLeft !== null && <p className="text-sm text-muted-foreground">{t("Bu ayın orta xərcinə görə təxminən {n} sorğuya çatır.", { n: num(approxLeft) })}</p>}
              {bill.enforced && <Link href="/billing" className="text-sm text-primary underline">{t("Balansı yüklə")}</Link>}
            </CardContent>
          </Card>
        )}
        <Card className={bill ? "lg:col-span-2" : "lg:col-span-3"}>
          <CardHeader>
            <CardTitle>{t("Son 14 gün")}</CardTitle>
            <CardDescription>{t("Günlər UTC ilə sayılır. Test söhbəti və çat vidjeti də sorğu kimi sayılır.")}</CardDescription>
          </CardHeader>
          <CardContent>
            {data.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">{t("Günlük statistika hələ yoxdur.")}</p>
            ) : (
              <TrendChart data={data} unit={t("sorğu")} color="var(--chart-1)" fmt={num} tick={(n) => compact(n, t)} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
