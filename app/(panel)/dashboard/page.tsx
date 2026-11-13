"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Check, CircleHelp, Coins, Gauge, CircleCheck, PhoneCall, ThumbsUp, UserRound, Wallet, Zap } from "lucide-react";
import { getFeedback, getOverview, getUsage, type FeedbackSummary, type Overview, type Usage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { factsFromOverview, setupSteps } from "@/lib/setup-steps";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/components/session";
import { DashboardSkeleton } from "@/components/skeletons";
import { TrendChart, compact } from "@/components/charts";
import { StatTile } from "@/components/stat-tile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
  const router = useRouter();
  const { tenant } = useSession();
  const { t, num, day } = useI18n();
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
  const limit = usage?.limits?.monthlyRequests ?? 0;
  const left = limit ? Math.max(0, limit - used) : null;
  const pct = limit ? (used / limit) * 100 : 0;
  // Əsas məhdudiyyət planın cavab limitidir (plan yoxdursa pulsuz sınaq cavabları)
  const bill = overview?.billing ?? null;
  // Abunə: plan, limit faizi və xəbərdarlıq (plan yoxdursa sınaq balansı göstərilir)
  const plan = bill?.plan ?? null;
  const planPct = plan && plan.included > 0 ? Math.min(100, Math.round((plan.used / plan.included) * 100)) : 0;
  // Pulsuz sınaq (plan yoxdur): qalan cavab sayı
  const trial = !plan ? bill?.trial ?? null : null;
  const trialOver = Boolean(trial) && trial!.left <= 0;
  const planAlert = !plan ? (trialOver ? { bad: true, text: t("Pulsuz sınaq bitib: köməkçinin işləməsi üçün plan seç.") } : trial && trial.left <= 20 ? { bad: false, text: t("Pulsuz sınaqda {n} cavab qalıb.", { n: trial.left }) } : null)
    : plan.status === "expired" ? { bad: true, text: t("Planın müddəti bitib: köməkçi ziyarətçilərə cavab vermir.") }
    : plan.used >= plan.included && plan.packLeft <= 0 ? { bad: true, text: t("Cavab limiti doldu: köməkçi ziyarətçilərə cavab vermir.") }
    : plan.status === "grace" ? { bad: false, text: t("Planın müddəti bitib, güzəşt müddətindəsən. Köməkçi dayanmamış yenilə.") }
    : planPct >= 80 && plan.packLeft <= 0 ? { bad: false, text: t("Cavab limitinin {p}%-i işlənib.", { p: planPct }) } : null;
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
  // Quraşdırma sehirbazı ilə eyni addımlar, adlar və şərtlər (lib/setup-steps.ts)
  const facts = factsFromOverview(overview);
  const steps = s && facts ? setupSteps(facts, t) : [];
  const nextIdx = steps.findIndex((x) => !x.done);
  const q = overview?.quality;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold">{t("Bu ayın istifadəsi")}</h1>
        <p className="text-sm text-muted-foreground">{usage?.month ?? "…"}</p>
      </header>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

      {planAlert && (
        <div role="alert" className={cn("flex items-start gap-3 rounded-lg border p-4 text-sm", planAlert.bad ? "border-destructive/50 bg-destructive/10" : "border-amber/50 bg-amber/10")}>
          <AlertTriangle size={18} className={cn("mt-0.5 shrink-0", planAlert.bad ? "text-destructive" : "text-amber")} aria-hidden />
          <div>
            <p className="font-medium">{planAlert.text}</p>
            <Link href="/billing" className="text-primary underline">{t("Planı idarə et")}</Link>
          </div>
        </div>
      )}

      {!plan && !trial && overview?.billing && overview.billing.enforced && overview.billing.state !== "ok" && (
        <div role="alert" className={cn("flex items-start gap-3 rounded-lg border p-4 text-sm", overview.billing.state === "empty" ? "border-destructive/50 bg-destructive/10" : "border-amber/50 bg-amber/10")}>
          <AlertTriangle size={18} className={cn("mt-0.5 shrink-0", overview.billing.state === "empty" ? "text-destructive" : "text-amber")} aria-hidden />
          <div>
            <p className="font-medium">{overview.billing.state === "empty" ? t("Köməkçi dayanıb: davam etmək üçün plan seç.") : t("Köməkçi tezliklə dayanacaq: davam etmək üçün plan seç.")}</p>
            <Link href="/billing" className="text-primary underline">{t("Plan seç")}</Link>
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
              <li key={st.id}>
                <Link href={st.href} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/50">
                  <span className={cn("grid size-6 shrink-0 place-items-center rounded-full border text-xs font-medium", st.done ? "border-transparent bg-emerald-500 text-white" : i === nextIdx ? "border-primary text-primary" : "border-border text-muted-foreground")}>
                    {st.done ? <Check size={14} aria-hidden /> : i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cn("block text-sm", st.done && "text-muted-foreground line-through")}>{st.label}</span>
                    <span className="block text-xs text-muted-foreground">{st.note}</span>
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

      {fb && (fb.bad?.length ?? 0) > 0 && (
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
        {plan ? (<>
          <StatTile icon={Wallet} tone={3} label={t("Plan")} value={plan.name} hint={plan.status === "expired" ? t("müddəti bitib") : t("{d} tarixinədək", { d: day(plan.end) })} />
          <StatTile icon={Coins} tone={2} label={t("Cavab limiti")} value={`${num(plan.used)} / ${num(plan.included)}`} hint={plan.packLeft > 0 ? t("+{n} paketdə", { n: num(plan.packLeft) }) : t("{p}% işlənib", { p: planPct })} />
        </>) : (<>
          <StatTile icon={Wallet} tone={3} label={t("Pulsuz sınaq")} value={trial ? `${num(trial.left)} / ${num(trial.total)}` : "–"} hint={trial?.until ? t("{d} tarixinədək", { d: day(trial.until) }) : t("Plan seçilməyib")} />
          <StatTile icon={Coins} tone={2} label={t("Plan")} value={t("Seçilməyib")} hint={t("Plan və ödəniş bölməsindən seç")} />
        </>)}
        <StatTile icon={Zap} tone={1} label={t("Sorğu")} value={usage ? num(used) : "–"} hint={limit ? t("Admin limiti: {n}", { n: num(limit) }) : undefined} />
        <StatTile icon={Gauge} tone={4} label={t("Ziyarətçi limiti")} value={overview?.limits ? (overview.limits.perVisitorDay > 0 ? num(overview.limits.perVisitorDay) : t("limitsiz")) : "–"} hint={overview?.limits && overview.limits.perVisitorDay > 0 ? t("mesaj / gün") : undefined} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {bill && plan && (
          <Card>
            <CardHeader><CardTitle>{plan.name}</CardTitle><CardDescription>{t("Bu dövrün cavab limiti")}</CardDescription></CardHeader>
            <CardContent className="flex flex-col gap-3 py-6">
              <p className="text-3xl font-semibold tabular-nums">{num(plan.used)} <span className="text-base font-normal text-muted-foreground">/ {num(plan.included)}</span></p>
              <div className="h-2.5 overflow-hidden rounded-full bg-muted" aria-hidden><div className={cn("h-full rounded-full", planPct >= 100 ? "bg-destructive" : planPct >= 80 ? "bg-amber-500" : "bg-emerald-500")} style={{ width: `${planPct}%` }} /></div>
              <Link href="/billing" className="text-sm text-primary underline">{t("Planı idarə et")}</Link>
            </CardContent>
          </Card>
        )}
        {bill && !plan && (
          <Card>
            <CardHeader><CardTitle>{t("Pulsuz sınaq")}</CardTitle><CardDescription>{t("Bütün imkanlar açıqdır")}</CardDescription></CardHeader>
            <CardContent className="flex flex-col gap-3 py-6">
              <p className="text-3xl font-semibold tabular-nums">{num(trial?.left ?? 0)} <span className="text-base font-normal text-muted-foreground">{t("cavab qalıb")}</span></p>
              <Link href="/billing" className="text-sm text-primary underline">{t("Plan seç")}</Link>
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
