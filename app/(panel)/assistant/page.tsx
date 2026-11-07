"use client";
// Köməkçi → Ümumi baxış: işə salma addımları, bilik və bacarıqlar, son 7 günün nəticələri (əvvəlki 7 günlə) və bilik boşluqları.
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, BookOpen, Check, ChevronRight, CircleCheck, Database, Minus, Rocket, Sparkles, Wand2 } from "lucide-react";
import { getFunnel, getKb, getOverview, getUnanswered, getWidget, type Funnel, type KbInfo, type Overview, type UnansweredRow, type WidgetResponse } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { RequireTenant, useSession } from "@/components/session";
import { KnowledgeGaps } from "@/components/knowledge-gaps";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Kpi = { label: string; hint: string; cur: number | null; prev: number | null; pct?: boolean; better: "up" | "down" };

/** Əvvəlki dövr = son 14 gün − son 7 gün (saylar toplanır) */
function prevOf(f14: Funnel, f7: Funnel) {
  const d = (a: number | null, b: number | null) => (a === null || b === null ? null : Math.max(0, a - b));
  return { conversations: d(f14.conversations, f7.conversations), handoffs: d(f14.handoffs, f7.handoffs), up: f14.feedbackUp - f7.feedbackUp, down: f14.feedbackDown - f7.feedbackDown };
}
const rate = (a: number | null, b: number | null) => (a === null || !b ? null : Math.round((a / b) * 100));

function KpiCard({ k }: { k: Kpi }) {
  const { t } = useI18n();
  const fmt = (v: number | null) => (v === null ? "—" : k.pct ? `${v}%` : String(v));
  const diff = k.cur !== null && k.prev !== null ? k.cur - k.prev : null;
  const good = diff === null || diff === 0 ? null : (diff > 0) === (k.better === "up");
  const Icon = diff === null || diff === 0 ? Minus : diff > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border/60">
      <p className="text-sm font-medium">{k.label}</p>
      <div className="flex items-center gap-2">
        <span className="text-3xl font-semibold tabular-nums">{fmt(k.cur)}</span>
        <span className={cn("inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums", good === null ? "bg-muted text-muted-foreground" : good ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-destructive/10 text-destructive")}>
          <Icon size={12} aria-hidden />{diff === null || diff === 0 ? "" : `${Math.abs(diff)}${k.pct ? " pp" : ""}`}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">{t("əvvəlki dövrdə {v}", { v: fmt(k.prev) })} · {k.hint}</p>
    </div>
  );
}

function Assistant() {
  const { t, locale } = useI18n();
  const { tenant } = useSession();
  const mode = tenant?.config.profile?.mode ?? "listings";
  const name = tenant?.config.profile?.agentName || t("Köməkçi");
  const [ov, setOv] = useState<Overview | null>(null);
  const [kb, setKb] = useState<KbInfo | null>(null);
  const [w, setW] = useState<WidgetResponse | null>(null);
  const [f, setF] = useState<{ f7: Funnel; f14: Funnel } | null>(null);
  const [gaps, setGaps] = useState<UnansweredRow[] | null>(null);
  const loadGaps = useCallback(() => { getUnanswered().then((r) => setGaps(r.items)).catch(() => setGaps([])); }, []);
  useEffect(() => {
    getOverview().then(setOv).catch(() => {});
    getKb().then(setKb).catch(() => {});
    getWidget().then(setW).catch(() => {});
    Promise.all([getFunnel(7), getFunnel(14)]).then(([f7, f14]) => setF({ f7, f14 })).catch(() => {});
    loadGaps();
  }, [loadGaps]);

  // İşə salma addımları
  const s = ov?.setup;
  const steps = s ? [
    { done: s.dataReady, title: mode === "support" ? t("Bilik bazasına məlumat əlavə et") : t("Elan və ya məhsul mənbəyini qoş"), desc: t("Köməkçi yalnız sənin məlumatından cavab verir."), href: mode === "support" ? "/knowledge" : "/connection", cta: t("Mənbə əlavə et") },
    { done: s.firstQuestion, title: t("Köməkçini yoxla"), desc: t("Sınaq çatında bir neçə sual ver və cavabların sənə uyğun olduğuna bax."), href: "/assistant/profile", cta: t("Sınaq et") },
    { done: s.widgetInstalled && s.widgetEnabled, title: t("Vidjeti sayta qoş"), desc: t("Bir sətir kodu saytına əlavə et, köməkçi ziyarətçilərə cavab verməyə başlasın."), href: "/embed", cta: t("Kodu götür") },
    { done: Boolean(w && (w.widget.live?.enabled)), optional: true, title: t("Operatorla canlı söhbəti aç (ixtiyari)"), desc: t("Köməkçi cavab verə bilməyəndə söhbəti komandana ötürsün."), href: "/assistant/skills", cta: t("Bacarıqlara keç") },
  ] : [];
  const required = steps.filter((x) => !("optional" in x && x.optional));
  const ready = required.length > 0 && required.every((x) => x.done);

  // Bacarıqlar: aktiv olanların sayı
  const p = tenant?.config.profile;
  const skillsOn = [true, true, Boolean(w?.widget.live?.enabled), p?.generalKnowledge !== false, p?.imageSearch === true, Boolean(w?.widget.proactive?.enabled)].filter(Boolean).length + (kb?.totals.proc ?? 0);
  const sources = kb ? kb.sources.filter((x) => x.type !== "qa" && x.type !== "proc").length + (kb.totals.qa ?? 0) : null;

  // Nəticələr
  let kpis: Kpi[] = [];
  if (f) {
    const c = f.f7, pv = prevOf(f.f14, f.f7);
    kpis = [
      { label: t("AI həll dərəcəsi"), hint: t("operatora və formaya ötürülmədən"), cur: rate(c.withoutHandoff, c.conversations), prev: pv.conversations === null || pv.handoffs === null ? null : rate(Math.max(0, pv.conversations - pv.handoffs), pv.conversations), pct: true, better: "up" },
      { label: t("AI söhbətləri"), hint: t("söhbət sayı"), cur: c.conversations, prev: pv.conversations, better: "up" },
      { label: t("Müsbət rəy"), hint: t("👍 / (👍 + 👎)"), cur: rate(c.feedbackUp, c.feedbackUp + c.feedbackDown), prev: rate(pv.up, pv.up + pv.down), pct: true, better: "up" },
      { label: t("Ötürülən söhbətlər"), hint: t("operatora və ya formaya"), cur: rate(c.handoffs, c.conversations), prev: rate(pv.handoffs, pv.conversations), pct: true, better: "down" },
    ];
  }
  // Rəqəmli format: bəzi brauzerlər az dilində ay adını "M11" kimi göstərir
  const fmt = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : locale, { day: "2-digit", month: "2-digit" });
  const day = (n: number) => fmt.format(new Date(Date.now() - n * 86_400_000));
  const period = `${day(6)}–${day(0)} vs ${day(13)}–${day(7)}`;
  const card = "flex flex-col gap-3 rounded-2xl border border-border bg-card p-5";

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-center gap-3">
        <span className="grid size-11 place-items-center rounded-full bg-primary text-primary-foreground"><Sparkles size={20} aria-hidden /></span>
        <h1 className="flex-1 text-2xl font-semibold">{name}</h1>
        {ov && <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium", ready ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-primary/10 text-primary")}>
          {ready ? <CircleCheck size={15} aria-hidden /> : <Rocket size={15} aria-hidden />}{ready ? t("İşləyir") : t("İşə salmağa hazırlanır")}
        </span>}
      </header>

      {ov && !ready && (
        <section className="flex flex-col gap-3 rounded-2xl bg-muted/50 p-5">
          <h2 className="font-semibold">{t("Köməkçini işə sal")} <span className="font-normal text-muted-foreground">{required.filter((x) => x.done).length}/{required.length}</span></h2>
          <ol className="flex flex-col gap-2">
            {steps.map((x, i) => (
              <li key={i} className={cn("flex flex-wrap items-center gap-3 rounded-xl bg-card px-4 py-3 ring-1 ring-border/60", x.done && "opacity-70")}>
                <span className={cn("grid size-6 shrink-0 place-items-center rounded-full border", x.done ? "border-transparent bg-emerald-500 text-white" : "border-border")}>{x.done && <Check size={14} aria-hidden />}</span>
                <div className="min-w-0 flex-1"><p className={cn("font-medium", x.done && "line-through decoration-muted-foreground/50")}>{x.title}</p>{!x.done && <p className="text-sm text-muted-foreground">{x.desc}</p>}</div>
                {!x.done && <Link href={x.href} className={buttonVariants({ size: "sm", variant: i === steps.findIndex((y) => !y.done) ? "default" : "outline" })}>{x.cta}</Link>}
              </li>
            ))}
          </ol>
        </section>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <div className={card}>
          <p className="flex items-center gap-2 font-medium"><BookOpen size={16} aria-hidden className="text-primary" />{t("Bilik mənbələri")} <span className="font-normal text-muted-foreground">{sources ?? "…"}</span></p>
          <p className="flex-1 text-sm text-muted-foreground">{t("Sayt səhifələri, fayllar, mətnlər və sual-cavablar: köməkçi şirkət haqqında suallara bunlardan cavab verir.")}</p>
          <Link href="/knowledge" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "self-start")}>{t("Bilik bazası")}</Link>
        </div>
        <div className={card}>
          <p className="flex items-center gap-2 font-medium"><Wand2 size={16} aria-hidden className="text-primary" />{t("Bacarıqlar")} <span className="font-normal text-muted-foreground">{t("{n} aktiv", { n: skillsOn })}</span></p>
          <p className="flex-1 text-sm text-muted-foreground">{t("Operatora ötürmə, şəkillə axtarış, ssenarilər: köməkçinin nə edə biləcəyini seç.")}</p>
          <Link href="/assistant/skills" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "self-start")}>{t("Bacarıqlara bax")}</Link>
        </div>
        {mode !== "support" ? (
          <div className={card}>
            <p className="flex items-center gap-2 font-medium"><Database size={16} aria-hidden className="text-primary" />{t("Kataloq")} <span className="font-normal text-muted-foreground">{s ? s.dataCount : "…"}</span></p>
            <p className="flex-1 text-sm text-muted-foreground">{t("Köməkçinin axtardığı elan, məhsul və ya xidmətlər.")}</p>
            <Link href="/connection" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "self-start")}>{t("Elan mənbəyi")}</Link>
          </div>
        ) : (
          <div className={card}>
            <p className="flex items-center gap-2 font-medium"><Sparkles size={16} aria-hidden className="text-primary" />{t("Profil")}</p>
            <p className="flex-1 text-sm text-muted-foreground">{t("Ad, dil, ton və cavab uzunluğu.")}</p>
            <Link href="/assistant/profile" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "self-start")}>{t("Profilə keç")}</Link>
          </div>
        )}
      </div>

      <section className="flex flex-col gap-4 rounded-2xl bg-muted/50 p-5">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="flex-1 font-semibold">{t("Nəticələr")} <span className="font-normal text-muted-foreground">{period}</span></h2>
          <Link href="/reports/ai" className={buttonVariants({ variant: "outline", size: "sm" })}>{t("Tam hesabat")}<ChevronRight size={14} aria-hidden /></Link>
        </div>
        {f && f.f7.conversations === null && <p className="text-sm text-muted-foreground">{t("Sorğu jurnalı söndürülüb, ona görə söhbət sayı hesablanmır. Ayarlar bölməsindən aça bilərsən.")}</p>}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {f ? kpis.map((k) => <KpiCard key={k.label} k={k} />) : Array.from({ length: 4 }, (_, i) => <div key={i} className="h-32 animate-pulse rounded-2xl bg-card" />)}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="font-semibold">{t("Bilik boşluqları")}</h2>
          <p className="text-sm text-muted-foreground">{t("Köməkçinin cavab tapmadığı suallar. Bir dəfə öyrət, oxşar suallara özü cavab versin.")}</p>
        </div>
        {gaps === null ? <div className="h-24 animate-pulse rounded-2xl bg-muted" />
          : gaps.length ? <KnowledgeGaps rows={gaps} canAnswer={mode !== "listings"} reload={loadGaps} limit={5} />
          : <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-5 text-sm"><CircleCheck size={20} aria-hidden className="text-emerald-600" /><div><p className="font-medium">{t("Hələlik boşluq yoxdur.")}</p><p className="text-muted-foreground">{t("Köməkçi cavab tapa bilməyəndə sual burada görünəcək, sən də bir kliklə öyrədəcəksən.")}</p></div></div>}
      </section>
    </div>
  );
}

export default function AssistantPage() {
  return <RequireTenant><Assistant /></RequireTenant>;
}
