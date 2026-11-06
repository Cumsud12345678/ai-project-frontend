"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronDown, ChevronRight, HandCoins, Link2, RefreshCw, UserPlus } from "lucide-react";
import {
  adminCreatePartner, adminPartner, adminPartnerEntry, adminPartnerReferral, adminPartners, adminPartnerSettings, adminPartnerSync, adminUpdatePartner,
  type AdminPartner, type PartnerCustomer, type PartnerEntry, type PartnerSettings,
} from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const num = (s: string) => Number(s.replace(",", "."));

function useMoney() {
  const { locale } = useI18n();
  const f = useMemo(() => new Intl.NumberFormat(locale === "en" ? "en-US" : locale === "ru" ? "ru-RU" : locale === "tr" ? "tr-TR" : "az-Latn-AZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), [locale]);
  return (n: number) => `${f.format(n)} ₼`;
}

/** Bir partnyorun təfərrüatı: ayarlar, balans əməliyyatları, müştərilər, hərəkətlər */
function PartnerDetail({ p, onChange }: { p: AdminPartner; onChange: () => void }) {
  const { t, short } = useI18n();
  const azn = useMoney();
  const [d, setD] = useState<{ customers: PartnerCustomer[]; entries: PartnerEntry[] } | null>(null);
  const [code, setCode] = useState(p.code);
  const [rate, setRate] = useState(String(p.rate));
  const [note, setNote] = useState(p.note);
  const [op, setOp] = useState<"payout" | "adjust">("payout");
  const [amount, setAmount] = useState("");
  const [why, setWhy] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => adminPartner(p.id).then((r) => setD({ customers: r.customers, entries: r.entries })).catch((e: Error) => toast.error(e.message)), [p.id]);
  useEffect(() => { void load(); }, [load]);
  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try { await fn(); toast.success(ok); await load(); onChange(); } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };
  const kind: Record<PartnerEntry["kind"], [string, string]> = { commission: [t("komissiya"), "bg-chart-2/10 text-chart-2"], adjust: [t("düzəliş"), "bg-primary/10 text-primary"], payout: [t("ödənildi"), "bg-muted text-muted-foreground"] };
  const src: Record<PartnerCustomer["source"], string> = { link: t("link"), code: t("kod"), admin: t("admin") };

  return (
    <div className="flex flex-col gap-5 border-t border-border bg-muted/30 px-5 py-4 text-sm">
      <div className="grid gap-4 lg:grid-cols-2">
        <form className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4" onSubmit={(e) => { e.preventDefault(); void run(() => adminUpdatePartner(p.id, { code, rate: num(rate), note }), t("Yadda saxlandı.")); }}>
          <p className="font-medium">{t("Ayarlar")}</p>
          <div className="flex flex-wrap gap-3">
            <div className="flex flex-col gap-1"><Label htmlFor={`pc-${p.id}`}>{t("Kod")}</Label><Input id={`pc-${p.id}`} value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""))} maxLength={20} className="w-36 font-mono" /></div>
            <div className="flex flex-col gap-1"><Label htmlFor={`pr-${p.id}`}>{t("Faiz (%)")}</Label><Input id={`pr-${p.id}`} value={rate} onChange={(e) => setRate(e.target.value)} inputMode="decimal" className="w-24" /></div>
            <div className="flex min-w-40 flex-1 flex-col gap-1"><Label htmlFor={`pn-${p.id}`}>{t("Qeyd (yalnız admin görür)")}</Label><Input id={`pn-${p.id}`} value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} /></div>
          </div>
          <p className="text-xs text-muted-foreground">{t("Faiz dəyişəndə yalnız sonrakı ödənişlərə tətbiq olunur. Kod dəyişəndə köhnə link işləməz.")}</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={busy}>{t("Yadda saxla")}</Button>
            <Button size="sm" type="button" variant="outline" disabled={busy} className={p.active ? "border-destructive/50 text-destructive hover:bg-destructive/10" : ""}
              onClick={() => run(() => adminUpdatePartner(p.id, { active: !p.active }), p.active ? t("Partnyorluq dayandırıldı.") : t("Partnyorluq bərpa olundu."))}>
              {p.active ? t("Dayandır") : t("Bərpa et")}
            </Button>
          </div>
        </form>

        <form className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4" onSubmit={(e) => {
          e.preventDefault();
          const v = num(amount);
          void run(async () => { await adminPartnerEntry(p.id, { kind: op, amountAzn: op === "payout" ? Math.abs(v) : v, note: why.trim() }); setAmount(""); setWhy(""); }, op === "payout" ? t("Ödəniş qeyd olundu.") : t("Balans yeniləndi."));
        }}>
          <div className="flex items-baseline justify-between gap-3"><p className="font-medium">{t("Balans")}</p><p className="text-lg font-semibold tabular-nums">{azn(p.totals.balance)}</p></div>
          <div className="flex gap-1 rounded-lg bg-muted p-1 text-xs" role="radiogroup" aria-label={t("Əməliyyat")}>
            {(["payout", "adjust"] as const).map((k) => (
              <button key={k} type="button" role="radio" aria-checked={op === k} onClick={() => setOp(k)} className={cn("flex-1 cursor-pointer rounded-md px-2 py-1.5", op === k ? "bg-card font-medium shadow-sm" : "text-muted-foreground")}>
                {k === "payout" ? t("Ödədim (balansdan çıx)") : t("Düzəliş (+/−)")}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="flex flex-col gap-1"><Label htmlFor={`pa-${p.id}`}>{op === "payout" ? t("Ödənilən məbləğ (AZN)") : t("Məbləğ (AZN, mənfi = azalt)")}</Label><Input id={`pa-${p.id}`} value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" className="w-32" placeholder={op === "payout" ? p.totals.balance.toFixed(2) : "-5"} /></div>
            <div className="flex min-w-40 flex-1 flex-col gap-1"><Label htmlFor={`pw-${p.id}`}>{op === "payout" ? t("Qeyd (məs. kartla, nağd)") : t("Səbəb")}</Label><Input id={`pw-${p.id}`} value={why} onChange={(e) => setWhy(e.target.value)} maxLength={200} /></div>
          </div>
          <div><Button size="sm" disabled={busy || !amount.trim() || !Number.isFinite(num(amount)) || num(amount) === 0 || (op === "adjust" && why.trim().length < 2)}>{op === "payout" ? t("Ödənişi qeyd et") : t("Tətbiq et")}</Button></div>
          <p className="text-xs text-muted-foreground">{t("Qazanılan {e} · düzəlişlər {a} · ödənilən {o}", { e: azn(p.totals.earned), a: azn(p.totals.adjust), o: azn(p.totals.paidOut) })}</p>
        </form>
      </div>

      <div>
        <p className="mb-2 font-medium">{t("Gətirdiyi müştərilər")}</p>
        {!d ? <Skeleton className="h-20" /> : d.customers.length === 0 ? <p className="text-muted-foreground">{t("Hələ müştəri yoxdur.")}</p> : (
          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full min-w-[640px]">
              <thead className="text-left text-xs text-muted-foreground"><tr className="border-b border-border"><th className="px-4 py-2 font-medium">{t("Müştəri")}</th><th className="px-3 py-2 font-medium">{t("Bağlanıb")}</th><th className="px-3 py-2 text-right font-medium">{t("Ödəyib")}</th><th className="px-3 py-2 text-right font-medium">{t("Komissiya")}</th><th className="px-4 py-2 font-medium" /></tr></thead>
              <tbody className="tabular-nums">
                {d.customers.map((c) => (
                  <tr key={c.id} className="border-b border-border last:border-0 align-top">
                    <td className="max-w-[16rem] px-4 py-2.5"><span className="block truncate font-medium">{c.site?.businessName ?? t("Sayt hələ qurulmayıb")}</span><span className="block truncate text-xs text-muted-foreground">{c.email}{c.site && ` · ${c.site.domain}`}</span></td>
                    <td className="px-3 py-2.5 text-muted-foreground"><span className="block">{short(c.joinedAt)} · {src[c.source]}</span><span className={cn("block text-xs", !c.active && "text-amber")}>{c.active ? t("{d} tarixinədək", { d: short(c.until) }) : t("müddət bitib")}{c.bonus && ` · ${t("bonus verilib")}`}</span></td>
                    <td className="px-3 py-2.5 text-right">{azn(c.paidAzn)}</td>
                    <td className="px-3 py-2.5 text-right font-medium">{azn(c.earnedAzn)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <button type="button" className="cursor-pointer text-xs text-destructive hover:underline" onClick={() => { if (window.confirm(t("{email} bu partnyordan ayrılsın? Yazılmış komissiya qalır, yenisi yazılmır.", { email: c.email }))) void run(() => adminPartnerReferral({ email: c.email, code: "" }), t("Ayrıldı.")); }}>{t("Ayır")}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <p className="mb-2 font-medium">{t("Hərəkətlər")}</p>
        {!d ? <Skeleton className="h-20" /> : d.entries.length === 0 ? <p className="text-muted-foreground">{t("Hələ hərəkət yoxdur.")}</p> : (
          <ul className="max-h-80 divide-y divide-border overflow-y-auto rounded-lg border border-border bg-card">
            {d.entries.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-3 px-4 py-2">
                <span className="w-28 shrink-0 text-muted-foreground tabular-nums">{short(e.at)}</span>
                <Badge className={kind[e.kind][1]}>{kind[e.kind][0]}</Badge>
                <span className="min-w-0 flex-1 truncate text-muted-foreground">{e.kind === "commission" && e.baseAzn != null ? `${e.note} · ${azn(e.baseAzn)} × ${e.rate}%` : `${e.note ?? ""}${e.by ? ` · ${e.by}` : ""}`}</span>
                <span className={cn("font-medium tabular-nums", e.amountAzn < 0 && "text-muted-foreground")}>{e.amountAzn > 0 ? "+" : ""}{azn(e.amountAzn)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function AdminPartnersPage() {
  const { t } = useI18n();
  const azn = useMoney();
  const [data, setData] = useState<{ settings: PartnerSettings; partners: AdminPartner[] } | null>(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Yeni partnyor
  const [nEmail, setNEmail] = useState("");
  const [nCode, setNCode] = useState("");
  const [nRate, setNRate] = useState("");
  // Müştərini əl ilə bağlamaq
  const [aEmail, setAEmail] = useState("");
  const [aCode, setACode] = useState("");
  const [aPast, setAPast] = useState(false);
  // Proqram ayarları
  const [s, setS] = useState<Record<keyof PartnerSettings, string> | null>(null);

  const load = useCallback(() => adminPartners().then((r) => {
    setData(r); setError("");
    setS({ defaultRate: String(r.settings.defaultRate), bonusPct: String(r.settings.bonusPct), bonusCapAzn: String(r.settings.bonusCapAzn), months: String(r.settings.months) });
  }).catch((e: Error) => setError(e.message)), []);
  useEffect(() => { void load(); }, [load]);
  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try { await fn(); toast.success(ok); await load(); } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };
  const totals = data?.partners.reduce((a, p) => ({ balance: a.balance + p.totals.balance, earned: a.earned + p.totals.earned, paidOut: a.paidOut + p.totals.paidOut }), { balance: 0, earned: 0, paidOut: 0 });

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t("Partnyorlar")}</h1>
          <p className="text-sm text-muted-foreground">{t("Partnyorun kodu ilə gələn saytların real ödənişlərindən komissiya yazılır. Ödənişi özün edib balansdan çıxırsan.")}</p>
        </div>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => run(adminPartnerSync, t("Komissiyalar yeniləndi."))}><RefreshCw size={14} className={busy ? "animate-spin" : ""} aria-hidden />{t("İndi hesabla")}</Button>
      </header>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

      {data && totals && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Card><CardContent className="py-4"><p className="text-xs text-muted-foreground">{t("Ödənilməli (cəmi balans)")}</p><p className="text-xl font-semibold tabular-nums">{azn(totals.balance)}</p></CardContent></Card>
          <Card><CardContent className="py-4"><p className="text-xs text-muted-foreground">{t("Cəmi komissiya")}</p><p className="text-xl font-semibold tabular-nums">{azn(totals.earned)}</p></CardContent></Card>
          <Card><CardContent className="py-4"><p className="text-xs text-muted-foreground">{t("Ödənilib")}</p><p className="text-xl font-semibold tabular-nums">{azn(totals.paidOut)}</p></CardContent></Card>
        </div>
      )}

      <Card>
        <CardHeader><CardTitle>{t("Partnyorlar")}</CardTitle></CardHeader>
        <CardContent className="px-0 py-0">
          {!data ? <Skeleton className="m-5 h-24" /> : data.partners.length === 0 ? <p className="px-5 pb-5 text-sm text-muted-foreground">{t("Hələ partnyor yoxdur. Aşağıdan əlavə et.")}</p> : (
            <ul className="divide-y divide-border">
              {data.partners.map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => setOpen(open === p.id ? null : p.id)} aria-expanded={open === p.id}
                    className="flex w-full cursor-pointer flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-left text-sm hover:bg-muted/40">
                    {open === p.id ? <ChevronDown size={16} aria-hidden /> : <ChevronRight size={16} aria-hidden />}
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2"><code className="font-mono font-semibold">{p.code}</code>{!p.active && <Badge className="bg-muted text-muted-foreground">{t("dayandırılıb")}</Badge>}</span>
                      <span className="block truncate text-xs text-muted-foreground">{p.email}{p.note && ` · ${p.note}`}</span>
                    </span>
                    <span className="w-16 text-right tabular-nums">{p.rate}%</span>
                    <span className="w-24 text-right text-muted-foreground tabular-nums">{t("{n} müştəri", { n: p.customers })}</span>
                    <span className="w-28 text-right font-semibold tabular-nums">{azn(p.totals.balance)}</span>
                  </button>
                  {open === p.id && <PartnerDetail p={p} onChange={load} />}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><UserPlus size={16} aria-hidden />{t("Partnyor əlavə et")}</CardTitle><CardDescription>{t("Partnyor əvvəlcə qeydiyyatdan keçib e-poçtunu təsdiqləməlidir.")}</CardDescription></CardHeader>
          <CardContent>
            <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); void run(async () => { await adminCreatePartner({ email: nEmail.trim(), ...(nCode && { code: nCode }), ...(nRate && { rate: num(nRate) }) }); setNEmail(""); setNCode(""); setNRate(""); }, t("Partnyor əlavə olundu.")); }}>
              <div className="flex min-w-48 flex-1 flex-col gap-1"><Label htmlFor="np-email">{t("E-poçt")}</Label><Input id="np-email" type="email" value={nEmail} onChange={(e) => setNEmail(e.target.value)} required /></div>
              <div className="flex flex-col gap-1"><Label htmlFor="np-code">{t("Kod")}</Label><Input id="np-code" value={nCode} onChange={(e) => setNCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""))} maxLength={20} placeholder={t("avtomatik")} className="w-32 font-mono" /></div>
              <div className="flex flex-col gap-1"><Label htmlFor="np-rate">{t("Faiz (%)")}</Label><Input id="np-rate" value={nRate} onChange={(e) => setNRate(e.target.value)} inputMode="decimal" placeholder={data ? String(data.settings.defaultRate) : ""} className="w-20" /></div>
              <Button disabled={busy || !nEmail.trim()}>{t("Əlavə et")}</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Link2 size={16} aria-hidden />{t("Müştərini partnyora bağla")}</CardTitle><CardDescription>{t("Kodu yazmadan qeydiyyatdan keçən müştəri üçün. Əl ilə bağlananda bonus verilmir.")}</CardDescription></CardHeader>
          <CardContent>
            <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); void run(async () => { await adminPartnerReferral({ email: aEmail.trim(), code: aCode, countPast: aPast }); setAEmail(""); setACode(""); setAPast(false); }, t("Bağlandı.")); }}>
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex min-w-48 flex-1 flex-col gap-1"><Label htmlFor="ap-email">{t("Müştərinin e-poçtu")}</Label><Input id="ap-email" type="email" value={aEmail} onChange={(e) => setAEmail(e.target.value)} required /></div>
                <div className="flex flex-col gap-1"><Label htmlFor="ap-code">{t("Partnyor kodu")}</Label><Input id="ap-code" value={aCode} onChange={(e) => setACode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""))} maxLength={20} className="w-32 font-mono" required /></div>
                <Button disabled={busy || !aEmail.trim() || !aCode}>{t("Bağla")}</Button>
              </div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={aPast} onChange={(e) => setAPast(e.target.checked)} className="size-4 accent-[var(--primary)]" />{t("Keçmiş ödənişləri də say (müştərinin qeydiyyat tarixindən)")}</label>
            </form>
          </CardContent>
        </Card>
      </div>

      {s && data && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><HandCoins size={16} aria-hidden />{t("Proqram qaydaları")}</CardTitle><CardDescription>{t("Komissiya yalnız real ödənişlərdən (təsdiqlənmiş yükləmə və ödəniş şlüzü) hesablanır. Bonus, hədiyyə və pulsuz balans sayılmır.")}</CardDescription></CardHeader>
          <CardContent>
            <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); void run(() => adminPartnerSettings({ defaultRate: num(s.defaultRate), bonusPct: num(s.bonusPct), bonusCapAzn: num(s.bonusCapAzn), months: num(s.months) }), t("Ayarlar yadda saxlandı.")); }}>
              <div className="flex flex-col gap-1"><Label htmlFor="ps-rate">{t("Yeni partnyor üçün faiz")}</Label><Input id="ps-rate" value={s.defaultRate} onChange={(e) => setS({ ...s, defaultRate: e.target.value })} inputMode="decimal" className="w-28" /></div>
              <div className="flex flex-col gap-1"><Label htmlFor="ps-months">{t("Müddət (ay)")}</Label><Input id="ps-months" value={s.months} onChange={(e) => setS({ ...s, months: e.target.value })} inputMode="numeric" className="w-24" /></div>
              <div className="flex flex-col gap-1"><Label htmlFor="ps-bonus">{t("Yeni müştəri bonusu (%)")}</Label><Input id="ps-bonus" value={s.bonusPct} onChange={(e) => setS({ ...s, bonusPct: e.target.value })} inputMode="decimal" className="w-28" /></div>
              <div className="flex flex-col gap-1"><Label htmlFor="ps-cap">{t("Bonus tavanı (AZN)")}</Label><Input id="ps-cap" value={s.bonusCapAzn} onChange={(e) => setS({ ...s, bonusCapAzn: e.target.value })} inputMode="decimal" className="w-28" /></div>
              <Button variant="outline" disabled={busy}>{t("Yadda saxla")}</Button>
            </form>
            <p className="mt-3 text-xs text-muted-foreground">{t("Bonus 0 olsa yeni müştəriyə heç nə verilmir. Müddət dəyişəndə artıq bağlı müştərilərə də tətbiq olunur.")}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
