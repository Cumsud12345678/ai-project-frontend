"use client";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Copy, HandCoins, Link2, Search, UserPlus, Wallet } from "lucide-react";
import { getMyPartner, type MyPartner, type PartnerEntry } from "@/lib/api";
import { FilterPills, PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Partnyorun səhifəsi: kodu və linki, qazancı, gətirdiyi saytlar. Pul hələlik buradan çıxarılmır. */
export default function PartnerPage() {
  const { t, locale, short, day } = useI18n();
  const [d, setD] = useState<MyPartner | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"sites" | "entries">("sites");
  const [q, setQ] = useState("");
  useEffect(() => { getMyPartner().then(setD).catch((e: Error) => setError(e.message)); }, []);
  const money = useMemo(() => new Intl.NumberFormat(locale === "en" ? "en-US" : locale === "ru" ? "ru-RU" : locale === "tr" ? "tr-TR" : "az-Latn-AZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), [locale]);
  const azn = (n: number) => `${money.format(n)} ₼`;
  const copy = async (text: string) => { try { await navigator.clipboard.writeText(text); toast.success(t("Kopyalandı.")); } catch { toast.error(t("Kopyalamaq alınmadı")); } };
  const kind: Record<PartnerEntry["kind"], [string, string]> = { commission: [t("komissiya"), "bg-foreground text-background"], adjust: [t("düzəliş"), "bg-muted text-foreground"], payout: [t("ödənildi"), "border border-border bg-transparent text-muted-foreground"] };

  if (error) return <p role="alert" className="text-sm text-destructive">{error}</p>;
  if (!d) return <div className="flex flex-col gap-4"><Skeleton className="h-10 w-60" /><Skeleton className="h-32" /><Skeleton className="h-48" /></div>;

  const needle = q.trim().toLowerCase();
  const sites = d.customers.filter((c) => !needle || [c.email, c.site?.businessName, c.site?.domain].some((x) => x?.toLowerCase().includes(needle)));
  const activeN = d.customers.filter((c) => c.active).length;
  const kpis = [
    { icon: Wallet, label: t("Balans"), value: azn(d.totals.balance), hint: t("hələlik yalnız görünür, ödənişi admin edir") },
    { icon: HandCoins, label: t("Cəmi qazanc"), value: azn(d.totals.earned + d.totals.adjust), hint: d.totals.paidOut > 0 ? `${t("ödənilib")} ${azn(d.totals.paidOut)}` : t("hələ ödəniş edilməyib") },
    { icon: UserPlus, label: t("Gətirdiyin saytlar"), value: d.customers.length, hint: t("{n} aktiv pəncərədə", { n: activeN }) },
  ];
  const steps = [
    t("Linki və ya kodu paylaş: video, story, söhbət."),
    t("Linklə gələn ziyarətçi 90 gün ərzində qeydiyyatdan keçsə sənə yazılır."),
    t("{m} ay ərzində onun hər real ödənişindən {r}% qazanırsan.", { m: d.settings.months, r: d.partner.rate }),
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("Partnyor proqramı")}
        description={t("Linkinlə və ya kodunla gələn saytların ödənişlərindən {r}% qazanırsan, {m} ay ərzində.", { r: d.partner.rate, m: d.settings.months })}
        actions={<><Button variant="outline" onClick={() => copy(d.partner.code)}><Copy size={16} aria-hidden />{t("Kodu kopyala")}</Button><Button onClick={() => copy(d.link)}><Link2 size={16} aria-hidden />{t("Linki kopyala")}</Button></>} />

      {!d.partner.active && <p role="alert" className="rounded-xl border border-amber/40 bg-amber/10 px-4 py-3 text-sm">{t("Partnyorluğun hazırda dayandırılıb: yeni komissiya yazılmır, kodun qeydiyyatda qəbul olunmur.")}</p>}

      <section className="grid gap-4 rounded-2xl border border-border bg-card p-5 lg:grid-cols-[1fr_1.2fr]">
        <div className="flex min-w-0 flex-col gap-3">
          <h2 className="font-semibold">{t("Sənin linkin və kodun")}</h2>
          <div className="flex min-w-0 items-center gap-2 rounded-xl border border-border bg-muted/40 p-1.5 pl-3">
            <code className="min-w-0 flex-1 truncate font-mono text-[13px]">{d.link}</code>
            <button type="button" onClick={() => copy(d.link)} aria-label={t("Linki kopyala")} className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg hover:bg-card"><Copy size={15} aria-hidden /></button>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{t("Promo kod:")}</span>
            <button type="button" onClick={() => copy(d.partner.code)} title={t("Kopyala")} className="cursor-pointer rounded-lg border border-dashed border-foreground/40 px-3 py-1 font-mono text-base font-semibold tracking-wider hover:bg-muted">{d.partner.code}</button>
          </div>
          <p className="text-xs text-muted-foreground">
            {d.settings.bonusPct > 0 ? `${t("Gələn sayt ilk yükləməsində +{p}% bonus balans alır (ən çox {cap} AZN).", { p: d.settings.bonusPct, cap: d.settings.bonusCapAzn })} ` : ""}
            {t("Video, story və ya söhbətdə link itə bilər: kodu da de. Qeydiyyat zamanı “Promo kodun var?” bölməsinə yazılır.")}
          </p>
        </div>
        <div className="flex flex-col gap-3 rounded-xl bg-muted/50 p-4">
          <p className="text-sm font-semibold">{t("Necə işləyir")}</p>
          <ol className="flex flex-col gap-3">
            {steps.map((s, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-foreground text-xs font-semibold text-background">{i + 1}</span>
                <span className="pt-0.5">{s}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        {kpis.map((k) => (
          <div key={k.label} className="flex flex-col gap-1 rounded-2xl border border-border bg-card p-4">
            <p className="flex items-center gap-2 text-sm text-muted-foreground"><k.icon size={15} aria-hidden />{k.label}</p>
            <p className="text-2xl font-semibold tabular-nums">{k.value}</p>
            <p className="text-xs text-muted-foreground tabular-nums">{k.hint}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <FilterPills value={tab} onChange={setTab} label={t("Partnyor proqramı")} items={[
          { value: "sites", label: t("Gətirdiyin saytlar"), count: d.customers.length },
          { value: "entries", label: t("Hərəkətlər"), count: d.entries.length },
        ]} />
        {tab === "sites" && d.customers.length > 5 && (
          <div className="relative ml-auto w-full max-w-xs">
            <Search size={15} aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Axtar")} aria-label={t("Axtar")} className="pl-9" />
          </div>
        )}
      </div>

      {tab === "sites" ? (
        d.customers.length === 0 ? (
          <Empty icon={UserPlus} title={t("Hələ heç kim sənin linkinlə qeydiyyatdan keçməyib.")} note={t("Komissiya yalnız real ödənişlərdən hesablanır: bonus və pulsuz balans sayılmır.")} />
        ) : (
          <div className="flex flex-col gap-2">
            <div className="overflow-x-auto rounded-2xl border border-border bg-card">
              <table className="w-full min-w-[620px] text-sm">
                <thead className="border-b border-border text-left text-xs text-muted-foreground"><tr><th className="px-4 py-3 font-medium">{t("Sayt")}</th><th className="px-4 py-3 font-medium">{t("Qoşulub")}</th><th className="px-4 py-3 font-medium">{t("Status")}</th><th className="px-4 py-3 text-right font-medium">{t("Ödəyib")}</th><th className="px-4 py-3 text-right font-medium">{t("Sənin qazancın")}</th></tr></thead>
                <tbody className="divide-y divide-border tabular-nums">
                  {sites.map((c) => (
                    <tr key={c.id}>
                      <td className="max-w-[16rem] px-4 py-3">
                        <span className="block truncate font-medium">{c.site ? c.site.businessName : t("Sayt hələ qurulmayıb")}</span>
                        <span className="block truncate text-xs text-muted-foreground">{c.site?.domain ?? c.email}</span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{day(c.joinedAt)}</td>
                      <td className="px-4 py-3">
                        <Badge className={c.active ? "bg-muted text-foreground" : "bg-amber/15 text-amber"}>{c.active ? t("{d} tarixinədək", { d: day(c.until) }) : t("müddət bitib")}</Badge>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">{azn(c.paidAzn)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-medium">{azn(c.earnedAzn)}</td>
                    </tr>
                  ))}
                  {!sites.length && <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">{t("Heç nə tapılmadı.")}</td></tr>}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground">{t("Komissiya yalnız real ödənişlərdən hesablanır: bonus və pulsuz balans sayılmır.")}</p>
          </div>
        )
      ) : d.entries.length === 0 ? (
        <Empty icon={HandCoins} title={t("Hələ hərəkət yoxdur.")} />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="border-b border-border text-left text-xs text-muted-foreground"><tr><th className="px-4 py-3 font-medium">{t("Tarix")}</th><th className="px-4 py-3 font-medium">{t("Növ")}</th><th className="px-4 py-3 font-medium">{t("Qeyd")}</th><th className="px-4 py-3 text-right font-medium">{t("Məbləğ")}</th></tr></thead>
            <tbody className="divide-y divide-border">
              {d.entries.map((e) => (
                <tr key={e.id}>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground tabular-nums">{short(e.at)}</td>
                  <td className="px-4 py-3"><Badge className={kind[e.kind][1]}>{kind[e.kind][0]}</Badge></td>
                  <td className="max-w-0 px-4 py-3 text-muted-foreground"><p className="truncate">{e.kind === "commission" && e.baseAzn != null ? `${e.note ?? ""} · ${azn(e.baseAzn)} × ${e.rate}%` : e.note || "—"}</p></td>
                  <td className={cn("whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums", e.amountAzn < 0 && "text-muted-foreground")}>{e.amountAzn > 0 ? "+" : ""}{azn(e.amountAzn)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Empty({ icon: Icon, title, note }: { icon: React.ElementType; title: string; note?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border px-6 py-10 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-muted"><Icon size={22} aria-hidden /></span>
      <h3 className="font-semibold">{title}</h3>
      {note && <p className="max-w-md text-sm text-muted-foreground">{note}</p>}
    </div>
  );
}
