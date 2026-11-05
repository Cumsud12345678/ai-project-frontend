"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Banknote, Coins, PiggyBank, TrendingDown, TrendingUp } from "lucide-react";
import { adminFinance, type AdminFinance } from "@/lib/api";
import { StatTile } from "@/components/stat-tile";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const axis = { fontSize: 11, fill: "var(--muted-foreground)" };
const MONTHS = ["yan", "fev", "mar", "apr", "may", "iyn", "iyl", "avq", "sen", "okt", "noy", "dek"];

/** Maliyyə: balansa daxil olan pul, AI-ın real xərci və mənfəət; model və müştəri üzrə bölgü. */
export default function AdminFinancePage() {
  const { t, locale } = useI18n();
  const [range, setRange] = useState<"3" | "6" | "12">("6");
  const [f, setF] = useState<AdminFinance | null>(null);
  const [error, setError] = useState("");
  const [losingOnly, setLosingOnly] = useState(false);

  useEffect(() => {
    setF(null); setError("");
    adminFinance(Number(range)).then(setF).catch((e: Error) => setError(e.message));
  }, [range]);

  const money = useMemo(() => new Intl.NumberFormat(locale === "en" ? "en-US" : locale === "ru" ? "ru-RU" : locale === "tr" ? "tr-TR" : "az-Latn-AZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), [locale]);
  const azn = (n: number) => `${money.format(n)} ₼`;
  const monthLabel = (m: string) => `${t(MONTHS[Number(m.slice(5, 7)) - 1]!)} ${m.slice(2, 4)}`;

  const cur = f?.months.at(-1);
  const totalModelCost = f?.models.reduce((s, m) => s + m.costAzn, 0) ?? 0;
  const tenants = f ? (losingOnly ? f.tenants.filter((x) => x.profitAzn < 0) : f.tenants) : [];
  const losing = f?.tenants.filter((x) => x.profitAzn < 0).length ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t("Maliyyə")}</h1>
          <p className="text-sm text-muted-foreground">{t("Daxil olan pul, AI xərci və mənfəət. Məbləğlər AZN ilədir.")}</p>
        </div>
        <Segmented value={range} onChange={setRange} label={t("Dövr")} options={[{ value: "3", label: t("{n} ay", { n: 3 }) }, { value: "6", label: t("{n} ay", { n: 6 }) }, { value: "12", label: t("{n} ay", { n: 12 }) }]} />
      </header>

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

      {!f && !error ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}</div>
      ) : f && cur && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile icon={Banknote} tone={2} label={t("Daxil olan pul (cəmi)")} value={azn(f.totals.cashInAzn)} hint={`${t("bu ay")} ${azn(f.totals.cashInMonthAzn)}`} />
          <StatTile icon={Coins} tone={1} label={t("Bu ay gəlir")} value={azn(cur.revenueAzn)} hint={`${t("AI xərci")} ${azn(cur.costAzn)}`} />
          <StatTile icon={cur.profitAzn >= 0 ? TrendingUp : TrendingDown} tone={cur.profitAzn >= 0 ? 2 : 5} label={t("Bu ay mənfəət")} value={azn(cur.profitAzn)}
            hint={cur.marginPct == null ? t("hələ gəlir yoxdur") : t("marja {n}%", { n: cur.marginPct })} />
          <StatTile icon={PiggyBank} tone={3} label={t("Xərclənməmiş balans")} value={azn(f.totals.outstandingPaidAzn)}
            hint={f.totals.creditUsedAzn > 0 ? `${t("kredit borcu")} ${azn(f.totals.creditUsedAzn)}` : t("müştərilərin hələ istifadə etmədiyi pul")} />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t("Aylar üzrə")}</CardTitle>
          <CardDescription>{t("Gəlir: istifadəyə görə müştəriyə yazılan məbləğ, pulsuz aylıq hissə çıxılmaqla. Mənfəət: gəlir − AI xərci.")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {!f ? <Skeleton className="h-[240px]" /> : (
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={f.months.map((m) => ({ label: monthLabel(m.month), cash: m.cashIn.totalAzn, revenue: m.revenueAzn, cost: m.costAzn }))} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 4" />
                  <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={false} />
                  <YAxis tick={axis} tickLine={false} axisLine={false} width={52} />
                  <Tooltip formatter={(v: number) => azn(v)} contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} cursor={{ fill: "var(--muted)", opacity: 0.5 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />
                  <Bar dataKey="cash" name={t("Daxil olan pul")} fill="var(--chart-2)" radius={[4, 4, 0, 0]} maxBarSize={22} />
                  <Bar dataKey="revenue" name={t("Gəlir")} fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={22} />
                  <Bar dataKey="cost" name={t("AI xərci")} fill="var(--chart-5)" radius={[4, 4, 0, 0]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          {f && (
            <div className="-mx-5 overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="px-5 py-2 font-medium">{t("Ay")}</th>
                    <th className="px-3 py-2 text-right font-medium">{t("Daxil olan pul")}</th>
                    <th className="px-3 py-2 text-right font-medium">{t("Müştəriyə yazılan")}</th>
                    <th className="px-3 py-2 text-right font-medium">{t("Pulsuz hissə")}</th>
                    <th className="px-3 py-2 text-right font-medium">{t("Gəlir")}</th>
                    <th className="px-3 py-2 text-right font-medium">{t("AI xərci")}</th>
                    <th className="px-3 py-2 text-right font-medium">{t("Mənfəət")}</th>
                    <th className="px-5 py-2 text-right font-medium">{t("Marja")}</th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {[...f.months].reverse().map((m) => (
                    <tr key={m.month} className="border-b border-border last:border-0">
                      <td className="px-5 py-2.5 font-medium">{monthLabel(m.month)}</td>
                      <td className="px-3 py-2.5 text-right" title={`${t("ödəniş")} ${azn(m.cashIn.paidAzn)} · ${t("əl ilə")} ${azn(m.cashIn.manualAzn)} · ${t("düzəliş")} ${azn(m.cashIn.adjustAzn)}`}>
                        {azn(m.cashIn.totalAzn)}
                        {m.cashIn.manualAzn !== 0 && <span className="block text-xs text-muted-foreground">{t("əl ilə")} {azn(m.cashIn.manualAzn)}</span>}
                      </td>
                      <td className="px-3 py-2.5 text-right">{azn(m.billedAzn)}</td>
                      <td className="px-3 py-2.5 text-right text-muted-foreground">{azn(m.freeAzn)}</td>
                      <td className="px-3 py-2.5 text-right">{azn(m.revenueAzn)}</td>
                      <td className="px-3 py-2.5 text-right">{azn(m.costAzn)}</td>
                      <td className={cn("px-3 py-2.5 text-right font-medium", m.profitAzn < 0 ? "text-destructive" : "text-chart-2")}>{azn(m.profitAzn)}</td>
                      <td className="px-5 py-2.5 text-right text-muted-foreground">{m.marginPct == null ? "–" : `${m.marginPct}%`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-xs text-muted-foreground">{t("AI xərci provayderin qiymət cədvəlinə görə hesablanır (AI_PRICES). Pulsuz hissə bu yeniləmədən sonra ayrıca yazılır: əvvəlki aylarda gəlirə daxildir.")}</p>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <Card>
          <CardHeader>
            <CardTitle>{t("Model üzrə xərc")}</CardTitle>
            <CardDescription>{t("Seçilmiş dövrdə hər modelə gedən real xərc.")}</CardDescription>
          </CardHeader>
          <CardContent>
            {!f ? <Skeleton className="h-32" /> : f.models.length === 0 ? <p className="text-sm text-muted-foreground">{t("Hələ məlumat yoxdur. Statistika bu yeniləmədən sonra yığılır.")}</p> : (
              <ul className="flex flex-col gap-4">
                {f.models.map((m) => {
                  const pct = totalModelCost > 0 ? Math.round((m.costAzn / totalModelCost) * 100) : 0;
                  return (
                    <li key={m.model}>
                      <div className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="min-w-0 truncate font-mono text-[13px]">{m.model}</span>
                        <span className="shrink-0 font-medium tabular-nums">{azn(m.costAzn)}</span>
                      </div>
                      <div className="mt-1.5 h-2 rounded-full bg-muted"><div className="h-2 rounded-full" style={{ width: `${Math.max(2, pct)}%`, background: m.provider === "anthropic" ? "var(--chart-4)" : m.provider === "google" ? "var(--chart-1)" : "var(--chart-3)" }} /></div>
                      <p className="mt-1 text-xs text-muted-foreground tabular-nums">{pct}% · {m.calls.toLocaleString()} {t("çağırış")} · {m.provider === "anthropic" ? "Anthropic" : m.provider === "google" ? "Google" : t("digər")}</p>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>{t("Müştərilər (son 30 gün)")}</CardTitle>
              <CardDescription>{losing > 0 ? t("{n} müştəri zərərə işləyir: xərci gəlirindən çoxdur.", { n: losing }) : t("Ən az mənfəət gətirənlər yuxarıdadır.")}</CardDescription>
            </div>
            <Segmented value={losingOnly ? "losing" : "all"} onChange={(v) => setLosingOnly(v === "losing")} label={t("Süzgəc")} options={[{ value: "all", label: t("Hamısı") }, { value: "losing", label: t("Zərərdə") }]} />
          </CardHeader>
          <CardContent className="px-0 py-0">
            {!f ? <Skeleton className="m-5 h-32" /> : tenants.length === 0 ? <p className="px-5 py-4 text-sm text-muted-foreground">{losingOnly ? t("Zərərə işləyən müştəri yoxdur.") : t("Son 30 gündə istifadə yoxdur.")}</p> : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead className="text-left text-xs text-muted-foreground">
                    <tr className="border-b border-border">
                      <th className="px-5 py-2 font-medium">{t("Sayt")}</th>
                      <th className="px-3 py-2 text-right font-medium">{t("Gəlir")}</th>
                      <th className="px-3 py-2 text-right font-medium">{t("AI xərci")}</th>
                      <th className="px-3 py-2 text-right font-medium">{t("Mənfəət")}</th>
                      <th className="px-5 py-2 text-right font-medium">{t("Vuruq")}</th>
                    </tr>
                  </thead>
                  <tbody className="tabular-nums">
                    {tenants.map((x) => (
                      <tr key={x.tenantId} className="border-b border-border last:border-0">
                        <td className="max-w-[14rem] px-5 py-2.5">
                          <Link href={`/admin/users?q=${encodeURIComponent(x.tenantId)}`} className="block truncate font-medium hover:underline">{x.businessName === "(silinib)" ? t("(silinib)") : x.businessName}</Link>
                          <span className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">{x.domain}{x.suspended && <Badge className="bg-destructive/10 px-1.5 py-0 text-destructive">{t("dayandırılıb")}</Badge>}</span>
                        </td>
                        <td className="px-3 py-2.5 text-right">{azn(x.revenueAzn)}{x.freeAzn > 0 && <span className="block text-xs text-muted-foreground">{t("pulsuz")} {azn(x.freeAzn)}</span>}</td>
                        <td className="px-3 py-2.5 text-right">{azn(x.costAzn)}</td>
                        <td className={cn("px-3 py-2.5 text-right font-medium", x.profitAzn < 0 ? "text-destructive" : "text-chart-2")}>{azn(x.profitAzn)}</td>
                        <td className="px-5 py-2.5 text-right">×{x.markup}{x.customMarkup && <span className="block text-xs text-muted-foreground">{t("fərdi")}</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
