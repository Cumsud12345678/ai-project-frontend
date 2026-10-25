"use client";
import { useEffect, useState } from "react";
import { CalendarDays, CalendarRange, History } from "lucide-react";
import { adminUsageSummary, type UsageSummary } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Donut, TrendChart, chartColor, compact } from "@/components/charts";
import { StatTile } from "@/components/stat-tile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";

const MONTHS = ["yan", "fev", "mar", "apr", "may", "iyn", "iyl", "avq", "sen", "okt", "noy", "dek"]; // tərcümə açarları

/** Bütün müştərilərin ümumi token və sorğu statistikası: gündəlik (30 gün), aylıq (12 ay), müştəri üzrə. */
export function AdminUsage() {
  const { t, num } = useI18n();
  const [s, setS] = useState<UsageSummary | null>(null);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState<"daily" | "monthly">("daily");
  const [metric, setMetric] = useState<"tokens" | "requests">("tokens");
  useEffect(() => { adminUsageSummary().then(setS).catch((e: Error) => setError(e.message)); }, []);

  if (error) return <p role="alert" className="text-sm text-destructive">{error}</p>;
  if (!s) return <div className="flex flex-col gap-4" aria-busy="true"><div className="grid gap-3 sm:grid-cols-3"><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /></div><Skeleton className="h-72" /><Skeleton className="h-64" /></div>;

  const data = period === "daily"
    ? s.daily.map((d) => ({ label: `${d.date.slice(8, 10)}.${d.date.slice(5, 7)}`, title: d.date, value: d[metric] }))
    : s.monthly.map((m) => ({ label: t(MONTHS[Number(m.month.slice(5, 7)) - 1]), title: m.month, value: m[metric] }));
  const unit = metric === "tokens" ? t("token") : t("sorğu");
  const color = metric === "tokens" ? "var(--chart-2)" : "var(--chart-1)";

  const total = s.tenants.reduce((a, r) => a + r.tokens, 0);
  const name = (r: UsageSummary["tenants"][number]) => (r.businessName === "(silinib)" ? t("(silinib)") : r.businessName);
  const top = s.tenants.slice(0, 5).map((r) => ({ name: name(r), value: r.tokens }));
  const rest = s.tenants.slice(5).reduce((a, r) => a + r.tokens, 0);
  const slices = total ? (rest > 0 ? [...top, { name: t("Digər"), value: rest }] : top) : [];

  return (
    <section className="flex flex-col gap-4" aria-label={t("Ümumi istifadə statistikası")}>
      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile icon={CalendarDays} tone={1} label={t("Bu gün")} value={<>{num(s.today.tokens)} <span className="text-sm font-normal text-muted-foreground">{t("token")}</span></>} hint={`${num(s.today.requests)} ${t("sorğu")}`} />
        <StatTile icon={CalendarRange} tone={2} label={t("Bu ay ({m})", { m: s.thisMonth.month })} value={<>{num(s.thisMonth.tokens)} <span className="text-sm font-normal text-muted-foreground">{t("token")}</span></>} hint={`${num(s.thisMonth.requests)} ${t("sorğu")}`} />
        <StatTile icon={History} tone={3} label={t("Keçən ay ({m})", { m: s.lastMonth.month })} value={<>{num(s.lastMonth.tokens)} <span className="text-sm font-normal text-muted-foreground">{t("token")}</span></>} hint={`${num(s.lastMonth.requests)} ${t("sorğu")}`} />
      </div>

      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>{t("Ümumi istifadə")}</CardTitle>
            <CardDescription>{t("Bütün müştərilərin cəmi. Günlər UTC ilə sayılır, test söhbəti də daxildir.")}</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Segmented value={period} onChange={setPeriod} options={[{ value: "daily", label: t("Gündəlik (30 gün)") }, { value: "monthly", label: t("Aylıq (12 ay)") }]} />
            <Segmented value={metric} onChange={setMetric} options={[{ value: "tokens", label: t("Token") }, { value: "requests", label: t("Sorğu") }]} />
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 pt-5">
          <TrendChart data={data} unit={unit} color={color} kind={period === "daily" ? "area" : "bar"} height={280} fmt={num} tick={(n) => compact(n, t)} />
          {period === "daily" && metric === "tokens" && <p className="text-xs text-muted-foreground">{t("Gündəlik token sayğacı bu funksiya əlavə olunandan başlayır, ondan əvvəlki günlər 0 görünə bilər. Aylıq cəmlər dəqiqdir.")}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{t("Müştərilər üzrə (bu ay)")}</CardTitle></CardHeader>
        {s.tenants.length === 0 ? <CardContent><p className="text-sm text-muted-foreground">{t("Bu ay hələ sorğu yoxdur.")}</p></CardContent> : (
          <CardContent className="grid items-center gap-6 py-5 md:grid-cols-[220px_1fr]">
            <Donut data={slices} center={compact(total, t)} sub={t("token")} />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs text-muted-foreground"><th className="py-2 font-normal">{t("Sayt")}</th><th className="px-3 py-2 text-right font-normal">{t("Sorğu")}</th><th className="px-3 py-2 text-right font-normal">{t("Token")}</th><th className="w-36 py-2 pl-3 font-normal">{t("Pay")}</th></tr></thead>
                <tbody>
                  {s.tenants.map((row, i) => {
                    const share = total ? (row.tokens / total) * 100 : 0;
                    return (
                      <tr key={row.tenantId} className="border-t border-border">
                        <td className="py-2"><span className="mr-2 inline-block size-2.5 rounded-full align-middle" style={{ background: i < 5 ? chartColor(i) : "var(--muted-foreground)" }} aria-hidden /><span className="font-medium">{name(row)}</span> <span className="text-xs text-muted-foreground">{row.domain}</span></td>
                        <td className="px-3 py-2 text-right tabular-nums">{num(row.requests)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{num(row.tokens)}</td>
                        <td className="py-2 pl-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full" style={{ width: `${Math.max(2, share)}%`, background: i < 5 ? chartColor(i) : "var(--muted-foreground)" }} /></div>
                            <span className="w-9 text-right text-xs tabular-nums text-muted-foreground">{Math.round(share)}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        )}
      </Card>
    </section>
  );
}
