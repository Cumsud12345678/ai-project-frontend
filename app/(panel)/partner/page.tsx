"use client";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Copy, HandCoins, Users, Wallet } from "lucide-react";
import { getMyPartner, type MyPartner, type PartnerEntry } from "@/lib/api";
import { StatTile } from "@/components/stat-tile";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Partnyorun səhifəsi: kodu və linki, qazancı, gətirdiyi saytlar. Pul hələlik buradan çıxarılmır. */
export default function PartnerPage() {
  const { t, locale, short } = useI18n();
  const [d, setD] = useState<MyPartner | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { getMyPartner().then(setD).catch((e: Error) => setError(e.message)); }, []);
  const money = useMemo(() => new Intl.NumberFormat(locale === "en" ? "en-US" : locale === "ru" ? "ru-RU" : locale === "tr" ? "tr-TR" : "az-Latn-AZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), [locale]);
  const azn = (n: number) => `${money.format(n)} ₼`;
  const copy = async (text: string) => { try { await navigator.clipboard.writeText(text); toast.success(t("Kopyalandı.")); } catch { toast.error(t("Kopyalamaq alınmadı")); } };
  const kind: Record<PartnerEntry["kind"], [string, string]> = { commission: [t("komissiya"), "bg-chart-2/10 text-chart-2"], adjust: [t("düzəliş"), "bg-primary/10 text-primary"], payout: [t("ödənildi"), "bg-muted text-muted-foreground"] };

  if (error) return <p role="alert" className="text-sm text-destructive">{error}</p>;
  if (!d) return <div className="flex flex-col gap-4"><Skeleton className="h-10 w-60" /><Skeleton className="h-32" /><Skeleton className="h-48" /></div>;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold">{t("Partnyor proqramı")}</h1>
        <p className="text-sm text-muted-foreground">{t("Linkinlə və ya kodunla gələn saytların ödənişlərindən {r}% qazanırsan, {m} ay ərzində.", { r: d.partner.rate, m: d.settings.months })}</p>
      </header>

      {!d.partner.active && <p role="alert" className="rounded-lg border border-amber/40 bg-amber/10 px-4 py-3 text-sm">{t("Partnyorluğun hazırda dayandırılıb: yeni komissiya yazılmır, kodun qeydiyyatda qəbul olunmur.")}</p>}

      <Card>
        <CardHeader>
          <CardTitle>{t("Sənin linkin və kodun")}</CardTitle>
          <CardDescription>{d.settings.bonusPct > 0 ? t("Gələn sayt ilk yükləməsində +{p}% bonus balans alır (ən çox {cap} AZN).", { p: d.settings.bonusPct, cap: d.settings.bonusCapAzn }) : t("Linklə gələn ziyarətçi 90 gün ərzində qeydiyyatdan keçsə sənə yazılır.")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-md border border-border bg-muted/50 px-3 py-2 font-mono text-[13px]">{d.link}</code>
            <Button size="sm" variant="outline" onClick={() => copy(d.link)}><Copy size={14} aria-hidden />{t("Linki kopyala")}</Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground">{t("Promo kod:")}</span>
            <code className="rounded-md border border-border bg-muted/50 px-3 py-1.5 font-mono text-base font-semibold tracking-wider">{d.partner.code}</code>
            <Button size="sm" variant="outline" onClick={() => copy(d.partner.code)}><Copy size={14} aria-hidden />{t("Kopyala")}</Button>
          </div>
          <p className="text-xs text-muted-foreground">{t("Video, story və ya söhbətdə link itə bilər: kodu da de. Qeydiyyat zamanı “Promo kodun var?” bölməsinə yazılır.")}</p>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile icon={Wallet} tone={2} label={t("Balans")} value={azn(d.totals.balance)} hint={t("hələlik yalnız görünür, ödənişi admin edir")} />
        <StatTile icon={HandCoins} tone={1} label={t("Cəmi qazanc")} value={azn(d.totals.earned + d.totals.adjust)} hint={d.totals.paidOut > 0 ? `${t("ödənilib")} ${azn(d.totals.paidOut)}` : t("hələ ödəniş edilməyib")} />
        <StatTile icon={Users} tone={3} label={t("Gətirdiyin saytlar")} value={d.customers.length} hint={t("{n} aktiv pəncərədə", { n: d.customers.filter((c) => c.active).length })} />
      </div>

      <Card>
        <CardHeader><CardTitle>{t("Gətirdiyin saytlar")}</CardTitle><CardDescription>{t("Komissiya yalnız real ödənişlərdən hesablanır: bonus və pulsuz balans sayılmır.")}</CardDescription></CardHeader>
        <CardContent className={d.customers.length ? "px-0 py-0" : ""}>
          {d.customers.length === 0 ? <p className="text-sm text-muted-foreground">{t("Hələ heç kim sənin linkinlə qeydiyyatdan keçməyib.")}</p> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="text-left text-xs text-muted-foreground"><tr className="border-b border-border"><th className="px-5 py-2 font-medium">{t("Sayt")}</th><th className="px-3 py-2 font-medium">{t("Qoşulub")}</th><th className="px-3 py-2 text-right font-medium">{t("Ödəyib")}</th><th className="px-5 py-2 text-right font-medium">{t("Sənin qazancın")}</th></tr></thead>
                <tbody className="tabular-nums">
                  {d.customers.map((c) => (
                    <tr key={c.id} className="border-b border-border last:border-0 align-top">
                      <td className="max-w-[16rem] px-5 py-2.5">
                        <span className="block truncate font-medium">{c.site ? c.site.businessName : t("Sayt hələ qurulmayıb")}</span>
                        <span className="block truncate text-xs text-muted-foreground">{c.site?.domain ?? c.email}</span>
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground"><span className="block">{short(c.joinedAt)}</span><span className={cn("block text-xs", !c.active && "text-amber")}>{c.active ? t("{d} tarixinədək", { d: short(c.until) }) : t("müddət bitib")}</span></td>
                      <td className="px-3 py-2.5 text-right">{azn(c.paidAzn)}</td>
                      <td className="px-5 py-2.5 text-right font-medium">{azn(c.earnedAzn)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{t("Hərəkətlər")}</CardTitle></CardHeader>
        <CardContent className={d.entries.length ? "px-0 py-0" : ""}>
          {d.entries.length === 0 ? <p className="text-sm text-muted-foreground">{t("Hələ hərəkət yoxdur.")}</p> : (
            <ul className="divide-y divide-border text-sm">
              {d.entries.map((e) => (
                <li key={e.id} className="flex flex-wrap items-center gap-3 px-5 py-2.5">
                  <span className="w-28 shrink-0 text-muted-foreground tabular-nums">{short(e.at)}</span>
                  <Badge className={kind[e.kind][1]}>{kind[e.kind][0]}</Badge>
                  <span className="min-w-0 flex-1 truncate text-muted-foreground">{e.kind === "commission" && e.baseAzn != null ? `${e.note} · ${azn(e.baseAzn)} × ${e.rate}%` : e.note}</span>
                  <span className={cn("font-medium tabular-nums", e.amountAzn < 0 && "text-muted-foreground")}>{e.amountAzn > 0 ? "+" : ""}{azn(e.amountAzn)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
