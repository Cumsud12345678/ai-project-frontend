"use client";
// Hesabatlar → Ümumi baxış: AI, canlı söhbət, müraciət və satışa təsir göstəriciləri əvvəlki dövrlə müqayisədə, gündəlik bölgü və ixrac.
import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { downloadExport, getReport, setReport, type ExportKind } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { RequireTenant } from "@/components/session";
import { PageHeader } from "@/components/page-header";
import { CsatCard, DailyTable, EmptyReport, Kpi, PeriodPills, ReportSection, usePeriodLabel, useReport } from "@/components/reports-ui";
import { TrendChart } from "@/components/charts";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Switch } from "@/components/ui/switch";

function ExportModal({ open, onClose, days }: { open: boolean; onClose: () => void; days: number }) {
  const { t } = useI18n();
  const [kind, setKind] = useState<ExportKind>("conversations");
  const [busy, setBusy] = useState(false);
  const [monthly, setMonthly] = useState<boolean | null>(null);
  useEffect(() => { if (open) getReport().then((r) => setMonthly(r.monthly)).catch(() => setMonthly(null)); }, [open]);
  async function go() {
    setBusy(true);
    try { const cut = await downloadExport(kind, days); toast.success(cut ? t("Fayl yükləndi (ilk 5000 sətir).") : t("Fayl yükləndi.")); }
    catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  async function toggle(v: boolean) {
    setMonthly(v);
    try { await setReport(v); toast.success(v ? t("Aylıq hesabat açıldı.") : t("Aylıq hesabat söndürüldü.")); } catch (e) { setMonthly(!v); toast.error((e as Error).message); }
  }
  return (
    <Modal open={open} onClose={onClose} title={t("İxrac")} description={t("Seçilmiş dövrün məlumatını CSV faylı kimi yüklə (Excel və Google Sheets açır).")}
      footer={<><Button variant="outline" onClick={onClose}>{t("Bağla")}</Button><Button onClick={go} disabled={busy}><Download size={15} aria-hidden />{busy ? t("Hazırlanır…") : t("Yüklə")}</Button></>}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1"><Label htmlFor="ex-kind">{t("Nə yüklənsin")}</Label>
          <select id="ex-kind" value={kind} onChange={(e) => setKind(e.target.value as ExportKind)} className="h-10 rounded-md border border-border bg-card px-3 text-sm">
            <option value="conversations">{t("Söhbətlər")}</option><option value="queries">{t("Suallar")}</option><option value="leads">{t("Müraciətlər")}</option><option value="unanswered">{t("Cavabsız suallar")}</option><option value="live">{t("Canlı söhbətlər")}</option>
          </select></div>
        {monthly !== null && (
          <div className="flex items-start gap-3 rounded-xl bg-muted/50 p-3 text-sm">
            <Switch checked={monthly} onChange={toggle} id="monthly" />
            <div><Label htmlFor="monthly">{t("Aylıq e-poçt hesabatı")}</Label><p className="text-xs text-muted-foreground">{t("Hər ayın 1-i son 30 günün qısa nəticəsi qeydiyyat e-poçtuna göndərilir.")} {t("Gündəlik xülasə üçün Avtomatlaşdırmalara bax.")}</p></div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function Overview() {
  const { t } = useI18n();
  const { days, setDays, data, error } = useReport();
  const period = usePeriodLabel(data);
  const [exp, setExp] = useState(false);
  const c = data?.cur, p = data?.prev;
  const pct = (a: number | null | undefined, b: number | null | undefined) => (a === null || a === undefined || !b ? null : Math.round((a / b) * 100));
  const empty = c && !c.questions && !c.liveNew && !c.leadsNew && !c.aiChats;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={<>{t("Ümumi baxış")} <span className="text-base font-normal text-muted-foreground">{period}</span></>}
        actions={<><PeriodPills days={days} setDays={setDays} /><Button variant="outline" onClick={() => setExp(true)}><Download size={16} aria-hidden />{t("İxrac")}</Button></>} />
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {!data ? <div className="grid gap-3 sm:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="h-36 animate-pulse rounded-2xl bg-muted" />)}</div> : (
        <>
          {!data.logOn && <p className="rounded-xl bg-amber/10 p-3 text-sm">{t("Sorğu jurnalı söndürülüb: AI göstəriciləri hesablanmır.")} <Link href="/settings/security" className="font-medium underline">{t("Ayarlar")}</Link></p>}
          <ReportSection title={t("Ümumi")}>
            <div className="grid overflow-hidden rounded-2xl border border-border bg-card sm:grid-cols-3 sm:divide-x sm:divide-border">
              <Kpi className="rounded-none border-0" label={t("AI söhbətləri")} value={c!.aiChats} prev={p?.aiChats} />
              <Kpi className="rounded-none border-0" label={t("Canlı söhbətlər")} value={c!.liveNew} prev={p?.liveNew} />
              <Kpi className="rounded-none border-0" label={t("Müraciətlər")} value={c!.leadsNew} prev={p?.leadsNew} />
            </div>
            {empty ? <EmptyReport text={t("Müştərilər çatla yazanda burada məlumat görünəcək.")} action={<Link href="/embed" className={buttonVariants({ variant: "outline", size: "sm" })}>{t("Vidjeti sayta qoş")}</Link>} />
              : data.daily.some((d) => d.questions) && (
                <div className="rounded-2xl border border-border bg-card p-4">
                  <p className="mb-2 text-sm font-medium">{t("Gündəlik suallar")}</p>
                  <TrendChart kind="bar" color="var(--foreground)" unit={t("sual")} data={data.daily.map((d) => ({ label: `${d.day.slice(8, 10)}.${d.day.slice(5, 7)}`, title: d.day, value: d.questions ?? 0 }))} fmt={(n) => String(n)} tick={(n) => String(n)} height={200} />
                </div>
              )}
          </ReportSection>

          <ReportSection title={t("AI köməkçi")}>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Kpi label={t("AI həll dərəcəsi")} kind="pct" value={c!.resolution} prev={p?.resolution} hint={t("operatora və formaya ötürülmədən")} />
              <Kpi label={t("Suallar")} value={c!.questions} prev={p?.questions} />
              <Kpi label={t("Cavabsız qalan")} kind="pct" better="down" value={pct(c!.unanswered, c!.questions)} prev={pct(p?.unanswered, p?.questions)} />
              <Kpi label={t("Müsbət rəy")} kind="pct" value={pct(c!.up, c!.up + c!.down)} prev={p ? pct(p.up, p.up + p.down) : undefined} />
            </div>
            <Link href="/reports/ai" className="self-start text-sm font-medium underline">{t("AI hesabatına keç")}</Link>
          </ReportSection>

          <ReportSection title={t("Canlı söhbətlər")}>
            <div className="grid gap-3 lg:grid-cols-3">
              <div className="grid gap-3 sm:grid-cols-2 lg:col-span-2">
                <Kpi label={t("İlk cavab vaxtı")} kind="sec" better="down" value={c!.firstResponseSec} prev={p?.firstResponseSec} hint={t("orta")} />
                <Kpi label={t("Söhbət müddəti")} kind="sec" better="none" value={c!.durationSec} prev={p?.durationSec} hint={t("orta")} />
                <Kpi label={t("Cavabsız qalan söhbətlər")} better="down" value={c!.missed} prev={p?.missed} hint={t("operator yazmadan bağlanan")} />
                <Kpi label={t("Bağlanan söhbətlər")} value={c!.liveClosed} prev={p?.liveClosed} />
              </div>
              <CsatCard title={t("Söhbət qiyməti (CSAT)")} c={c!.csat} prev={p?.csat} />
            </div>
          </ReportSection>

          <ReportSection title={t("Müraciətlər")}>
            <div className="grid gap-3 sm:grid-cols-3">
              <Kpi label={t("Yeni müraciətlər")} value={c!.leadsNew} prev={p?.leadsNew} />
              <Kpi label={t("Həll olunmuş")} value={c!.leadsSolved} prev={p?.leadsSolved} />
              <Kpi label={t("Orta həll müddəti")} kind="sec" better="down" value={c!.resolveSec} prev={p?.resolveSec} />
            </div>
          </ReportSection>

          <ReportSection title={t("Satışa təsir")}>
            <div className="grid gap-3 sm:grid-cols-3">
              <Kpi label={t("Kart klikləri")} value={c!.clicks} prev={p?.clicks} hint={t("Çatda göstərilən elan və ya məhsul kartına klik.")} />
              <Kpi label={t("İcra olunan əməliyyatlar")} value={c!.actionsDone} prev={p?.actionsDone} hint={t("İstifadəçinin kartda təsdiq verdiyi və uğurla bitən.")} />
              <Kpi label={t("Operatora ötürülən")} kind="pct" better="none" value={pct(c!.handoffs, c!.aiChats)} prev={p ? pct(p.handoffs, p.aiChats) : undefined} hint={t("canlı söhbət və ya əlaqə forması")} />
            </div>
          </ReportSection>

          <ReportSection title={t("Bölgü")}>
            <DailyTable rows={data.daily} />
          </ReportSection>
          <p className="text-center text-xs text-muted-foreground">{t("Hesabat {at} vaxtına olan məlumatı göstərir. Günlər Bakı vaxtı (UTC+4) ilə hesablanır.", { at: new Date(data.generatedAt).toLocaleString("az-AZ", { timeZone: "Asia/Baku" }) })}</p>
        </>
      )}
      <ExportModal open={exp} onClose={() => setExp(false)} days={days} />
    </div>
  );
}

export default function ReportsPage() {
  return <RequireTenant><Overview /></RequireTenant>;
}
