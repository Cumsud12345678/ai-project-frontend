"use client";
// Hesabatlar → AI köməkçi: həll dərəcəsi, suallar, cavabsız qalanlar, rəylər, ən çox verilən suallar və mövzular.
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { RequireTenant } from "@/components/session";
import { PageHeader } from "@/components/page-header";
import { Insights } from "@/components/insights";
import { Kpi, PeriodPills, ReportSection, usePeriodLabel, useReport, type Days } from "@/components/reports-ui";
import { buttonVariants } from "@/components/ui/button";

function TopList({ title, hint, rows }: { title: string; hint: string; rows: { message: string; count: number }[] }) {
  const { t } = useI18n();
  return (
    <section className="flex flex-col gap-1 rounded-2xl border border-border bg-card p-5">
      <h3 className="font-medium">{title}</h3>
      <p className="mb-2 text-xs text-muted-foreground">{hint}</p>
      {rows.length === 0 ? <p className="text-sm text-muted-foreground">{t("Hələ yoxdur.")}</p> : (
        <ol className="flex flex-col divide-y divide-border text-sm">
          {rows.map((r) => <li key={r.message} className="flex items-baseline justify-between gap-3 py-2"><span className="min-w-0 break-words">{r.message}</span><span className="tabular-nums text-muted-foreground">{r.count}×</span></li>)}
        </ol>
      )}
    </section>
  );
}

function AiReport() {
  const { t } = useI18n();
  const { days, setDays, data, error } = useReport();
  const period = usePeriodLabel(data);
  const c = data?.cur, p = data?.prev;
  const pct = (a: number | null | undefined, b: number | null | undefined) => (a === null || a === undefined || !b ? null : Math.round((a / b) * 100));
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={<>{t("AI köməkçi")} <span className="text-base font-normal text-muted-foreground">{period}</span></>}
        actions={<><PeriodPills days={days} setDays={setDays} /><Link href="/assistant/profile" className={buttonVariants()}>{t("Köməkçini ayarla")}</Link></>} />
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {data && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi label={t("AI həll dərəcəsi")} kind="pct" value={c!.resolution} prev={p?.resolution} hint={t("operatora və formaya ötürülmədən")} />
            <Kpi label={t("AI söhbətləri")} value={c!.aiChats} prev={p?.aiChats} />
            <Kpi label={t("Müsbət rəy")} kind="pct" value={pct(c!.up, c!.up + c!.down)} prev={p ? pct(p.up, p.up + p.down) : undefined} hint={`👍 ${c!.up} · 👎 ${c!.down}`} />
            <Kpi label={t("Ötürülən söhbətlər")} kind="pct" better="down" value={pct(c!.handoffs, c!.aiChats)} prev={p ? pct(p.handoffs, p.aiChats) : undefined} />
            <Kpi label={t("Suallar")} value={c!.questions} prev={p?.questions} />
            <Kpi label={t("Cavabsız qalan")} better="down" value={c!.unanswered} prev={p?.unanswered} />
            <Kpi label={t("Kart klikləri")} value={c!.clicks} prev={p?.clicks} />
            <Kpi label={t("İcra olunan əməliyyatlar")} value={c!.actionsDone} prev={p?.actionsDone} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <TopList title={t("Ən çox verilən suallar")} hint={t("Eyni sual təkrar olunduqca yuxarı qalxır.")} rows={data.top} />
            <TopList title={t("Ən çox cavabsız qalanlar")} hint={t("Bunlara cavab əlavə et: Köməkçi → Ümumi baxış → Bilik boşluqları.")} rows={data.topNoResults} />
          </div>
        </>
      )}
      <ReportSection title={t("Söhbət mövzuları")}>
        <Insights days={days} onDays={(d) => setDays((d === 7 || d === 30 || d === 90 ? d : 30) as Days)} enabled={data?.logOn ?? true} />
      </ReportSection>
    </div>
  );
}

export default function Page() {
  return <RequireTenant><AiReport /></RequireTenant>;
}
