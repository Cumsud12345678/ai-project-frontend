"use client";
// Hesabatlar → Komanda: canlı söhbət göstəriciləri və hər operator üzrə performans.
import Link from "next/link";
import { Users } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { RequireTenant } from "@/components/session";
import { PageHeader } from "@/components/page-header";
import { CsatCard, Kpi, PeriodPills, ReportSection, useDur, usePeriodLabel, useReport } from "@/components/reports-ui";
import { buttonVariants } from "@/components/ui/button";

function Team() {
  const { t } = useI18n();
  const dur = useDur();
  const { days, setDays, data, error } = useReport();
  const period = usePeriodLabel(data);
  const c = data?.cur, p = data?.prev;
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={<>{t("Komanda performansı")} <span className="text-base font-normal text-muted-foreground">{period}</span></>}
        actions={<PeriodPills days={days} setDays={setDays} />} />
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {data && (
        <>
          <div className="grid gap-3 lg:grid-cols-3">
            <div className="grid gap-3 sm:grid-cols-2 lg:col-span-2">
              <Kpi label={t("Canlı söhbətlər")} value={c!.liveNew} prev={p?.liveNew} />
              <Kpi label={t("İlk cavab vaxtı")} kind="sec" better="down" value={c!.firstResponseSec} prev={p?.firstResponseSec} hint={t("orta")} />
              <Kpi label={t("Söhbət müddəti")} kind="sec" better="none" value={c!.durationSec} prev={p?.durationSec} hint={t("orta")} />
              <Kpi label={t("Cavabsız qalan söhbətlər")} better="down" value={c!.missed} prev={p?.missed} hint={t("operator yazmadan bağlanan")} />
            </div>
            <CsatCard title={t("Söhbət qiyməti (CSAT)")} c={c!.csat} prev={p?.csat} />
          </div>
          <ReportSection title={t("Operatorlar")}>
            {data.team.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border px-6 py-10 text-center">
                <Users size={26} aria-hidden className="text-muted-foreground" />
                <p className="font-semibold">{t("Bu dövrdə operator söhbəti olmayıb")}</p>
                <p className="max-w-md text-sm text-muted-foreground">{t("Komanda üzvü canlı söhbətə cavab yazanda burada görünəcək.")}</p>
                <Link href="/settings/team" className={buttonVariants({ variant: "outline", size: "sm" })}>{t("Komandaya üzv əlavə et")}</Link>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-border bg-card">
                <table className="w-full min-w-[40rem] text-sm">
                  <thead className="border-b border-border text-left text-xs text-muted-foreground"><tr>
                    <th className="px-4 py-3 font-medium">{t("Operator")}</th><th className="px-4 py-3 text-right font-medium">{t("Söhbətlər")}</th><th className="px-4 py-3 text-right font-medium">{t("Mesajlar")}</th>
                    <th className="px-4 py-3 text-right font-medium">{t("İlk cavab")}</th><th className="px-4 py-3 text-right font-medium">{t("Müddət")}</th><th className="px-4 py-3 text-right font-medium">CSAT</th>
                  </tr></thead>
                  <tbody className="divide-y divide-border">
                    {data.team.map((r) => (
                      <tr key={r.name}>
                        <td className="px-4 py-3"><span className="flex items-center gap-2 font-medium"><span className="grid size-7 place-items-center rounded-full bg-muted text-xs">{r.name.slice(0, 1).toUpperCase()}</span>{r.name}</span></td>
                        <td className="px-4 py-3 text-right tabular-nums">{r.chats}</td><td className="px-4 py-3 text-right tabular-nums">{r.replies}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{dur(r.firstResponseSec)}</td><td className="px-4 py-3 text-right tabular-nums">{dur(r.durationSec)}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{r.csat.avg === null ? "—" : `${r.csat.avg}/5`}{r.csat.bad > 0 && <span className="ml-1 text-xs text-destructive">({t("{n} pis", { n: r.csat.bad })})</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ReportSection>
        </>
      )}
    </div>
  );
}

export default function Page() {
  return <RequireTenant><Team /></RequireTenant>;
}
