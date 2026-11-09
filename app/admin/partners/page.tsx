"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Banknote, Eye, HandCoins, Link2, Pause, Play, Plus, RefreshCw, Search, Settings2, Unlink, Wallet } from "lucide-react";
import {
  adminCreatePartner, adminPartner, adminPartnerEntry, adminPartnerReferral, adminPartners, adminPartnerSettings, adminPartnerSync, adminUpdatePartner,
  type AdminPartner, type PartnerCustomer, type PartnerEntry, type PartnerSettings,
} from "@/lib/api";
import { FilterPills, PageHeader } from "@/components/page-header";
import { StatTile } from "@/components/stat-tile";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { RowMenu } from "@/components/ui/row-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const num = (s: string) => Number(s.replace(",", "."));
const codeOf = (s: string) => s.toUpperCase().replace(/[^A-Z0-9_-]/g, "");
const rateOk = (s: string) => s.trim() === "" || (Number.isFinite(num(s)) && num(s) >= 0 && num(s) <= 100);
type DTab = "settings" | "balance" | "customers" | "entries";

function useMoney() {
  const { locale } = useI18n();
  const f = useMemo(() => new Intl.NumberFormat(locale === "en" ? "en-US" : locale === "ru" ? "ru-RU" : locale === "tr" ? "tr-TR" : "az-Latn-AZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), [locale]);
  return (n: number) => `${f.format(n)} ₼`;
}

/** Bir partnyorun pəncərəsi: ayarlar, balans əməliyyatları, müştərilər, hərəkətlər */
function PartnerModal({ p, tab, setTab, onClose, onChange }: { p: AdminPartner; tab: DTab; setTab: (t: DTab) => void; onClose: () => void; onChange: () => void }) {
  const { t, short, day } = useI18n();
  const azn = useMoney();
  const [d, setD] = useState<{ customers: PartnerCustomer[]; entries: PartnerEntry[] } | null>(null);
  const [code, setCode] = useState(p.code);
  const [rate, setRate] = useState(String(p.rate));
  const [note, setNote] = useState(p.note);
  const [op, setOp] = useState<"payout" | "adjust">("payout");
  const [amount, setAmount] = useState("");
  const [why, setWhy] = useState("");
  const [busy, setBusy] = useState(false);
  const [unlink, setUnlink] = useState<PartnerCustomer | null>(null);
  const load = useCallback(() => adminPartner(p.id).then((r) => setD({ customers: r.customers, entries: r.entries })).catch((e: Error) => toast.error(e.message)), [p.id]);
  useEffect(() => { void load(); }, [load]);
  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try { await fn(); toast.success(ok); await load(); onChange(); return true; } catch (e) { toast.error((e as Error).message); return false; } finally { setBusy(false); }
  };
  const kind: Record<PartnerEntry["kind"], [string, string]> = { commission: [t("komissiya"), "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20"], adjust: [t("düzəliş"), "bg-muted text-foreground"], payout: [t("ödənildi"), "border border-border bg-transparent text-muted-foreground"] };
  const src: Record<PartnerCustomer["source"], string> = { link: t("link"), code: t("kod"), admin: t("admin") };
  const v = num(amount);
  // Ödəniş balansdan çox ola bilməz (partnyor mənfiyə düşməsin)
  const overpay = op === "payout" && Number.isFinite(v) && Math.abs(v) > p.totals.balance + 0.001;
  const amountOk = amount.trim() !== "" && Number.isFinite(v) && v !== 0 && !overpay && (op === "payout" || why.trim().length >= 2);
  const settingsDirty = code !== p.code || rate !== String(p.rate) || note !== p.note;

  return (
    <Modal open onClose={onClose} size="xl" focusFirst={false}
      title={<span className="flex items-center gap-2"><code className="font-mono">{p.code}</code>{!p.active && <Badge className="bg-muted text-muted-foreground">{t("dayandırılıb")}</Badge>}</span>}
      description={`${p.email} · ${p.rate}% · ${t("{n} müştəri", { n: p.customers })}`}>
      <div className="flex flex-col gap-4">
        <FilterPills value={tab} onChange={setTab} label={t("Partnyor")} items={[
          { value: "balance", label: t("Balans") },
          { value: "customers", label: t("Müştərilər"), count: d?.customers.length },
          { value: "entries", label: t("Hərəkətlər"), count: d?.entries.length },
          { value: "settings", label: t("Ayarlar") },
        ]} />

        {tab === "balance" && (
          <form className="flex flex-col gap-4" onSubmit={(e) => {
            e.preventDefault();
            if (!amountOk) return;
            void run(async () => { await adminPartnerEntry(p.id, { kind: op, amountAzn: op === "payout" ? Math.abs(v) : v, note: why.trim() }); setAmount(""); setWhy(""); }, op === "payout" ? t("Ödəniş qeyd olundu.") : t("Balans yeniləndi."));
          }}>
            <div className="grid gap-3 sm:grid-cols-4">
              {[[t("Balans"), p.totals.balance], [t("Qazanılan"), p.totals.earned], [t("Düzəlişlər"), p.totals.adjust], [t("Ödənilib"), p.totals.paidOut]].map(([l, n]) => (
                <div key={l as string} className="rounded-xl bg-muted/50 p-3"><p className="text-xs text-muted-foreground">{l}</p><p className="text-lg font-semibold tabular-nums">{azn(n as number)}</p></div>
              ))}
            </div>
            <FilterPills value={op} onChange={(o) => { setOp(o); setAmount(""); }} label={t("Əməliyyat")} items={[{ value: "payout", label: t("Ödədim (balansdan çıx)") }, { value: "adjust", label: t("Düzəliş (+/−)") }]} />
            <div className="grid gap-3 sm:grid-cols-[12rem_1fr]">
              <div className="flex flex-col gap-1"><Label htmlFor="pa-amt">{op === "payout" ? t("Ödənilən məbləğ (AZN)") : t("Məbləğ (AZN, mənfi = azalt)")}</Label><Input id="pa-amt" value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder={op === "payout" ? p.totals.balance.toFixed(2) : "-5"} /></div>
              <div className="flex flex-col gap-1"><Label htmlFor="pa-why">{op === "payout" ? t("Qeyd (məs. kartla, nağd)") : t("Səbəb")}</Label><Input id="pa-why" value={why} onChange={(e) => setWhy(e.target.value)} maxLength={200} /></div>
            </div>
            {overpay && <p className="text-xs text-destructive">{t("Ödəniş balansdan ({n}) çox ola bilməz.", { n: azn(p.totals.balance) })}</p>}
            <div className="flex justify-end gap-2">
              {op === "payout" && p.totals.balance > 0 && <Button type="button" variant="outline" onClick={() => setAmount(p.totals.balance.toFixed(2))}>{t("Bütün balans")}</Button>}
              <Button disabled={busy || !amountOk}>{op === "payout" ? t("Ödənişi qeyd et") : t("Tətbiq et")}</Button>
            </div>
          </form>
        )}

        {tab === "customers" && (!d ? <Skeleton className="h-24" /> : d.customers.length === 0 ? <p className="text-sm text-muted-foreground">{t("Hələ müştəri yoxdur.")}</p> : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="border-b border-border text-left text-xs text-muted-foreground"><tr><th className="px-4 py-3 font-medium">{t("Müştəri")}</th><th className="px-4 py-3 font-medium">{t("Bağlanıb")}</th><th className="px-4 py-3 text-right font-medium">{t("Ödəyib")}</th><th className="px-4 py-3 text-right font-medium">{t("Komissiya")}</th><th className="w-12" /></tr></thead>
              <tbody className="divide-y divide-border tabular-nums">
                {d.customers.map((c) => (
                  <tr key={c.id} className="align-top">
                    <td className="max-w-[16rem] px-4 py-3"><span className="block truncate font-medium">{c.site?.businessName ?? t("Sayt hələ qurulmayıb")}</span><span className="block truncate text-xs text-muted-foreground">{c.email}{c.site && ` · ${c.site.domain}`}</span></td>
                    <td className="px-4 py-3 text-muted-foreground"><span className="block">{day(c.joinedAt)} · {src[c.source]}</span><span className={cn("block text-xs", !c.active && "text-amber")}>{c.active ? t("{d} tarixinədək", { d: day(c.until) }) : t("müddət bitib")}{c.bonus && ` · ${t("bonus verilib")}`}</span></td>
                    <td className="px-4 py-3 text-right">{azn(c.paidAzn)}</td>
                    <td className="px-4 py-3 text-right font-medium">{azn(c.earnedAzn)}</td>
                    <td className="px-2 py-2 text-right"><RowMenu items={[{ label: t("Partnyordan ayır"), icon: Unlink, danger: true, run: () => setUnlink(c) }]} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

        {tab === "entries" && (!d ? <Skeleton className="h-24" /> : d.entries.length === 0 ? <p className="text-sm text-muted-foreground">{t("Hələ hərəkət yoxdur.")}</p> : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="border-b border-border text-left text-xs text-muted-foreground"><tr><th className="px-4 py-3 font-medium">{t("Tarix")}</th><th className="px-4 py-3 font-medium">{t("Növ")}</th><th className="px-4 py-3 font-medium">{t("Qeyd")}</th><th className="px-4 py-3 text-right font-medium">{t("Məbləğ")}</th></tr></thead>
              <tbody className="divide-y divide-border">
                {d.entries.map((e) => (
                  <tr key={e.id}>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground tabular-nums">{short(e.at)}</td>
                    <td className="px-4 py-3"><Badge className={kind[e.kind][1]}>{kind[e.kind][0]}</Badge></td>
                    <td className="max-w-0 px-4 py-3 text-muted-foreground"><p className="truncate">{e.kind === "commission" && e.baseAzn != null ? `${e.note ?? ""} · ${azn(e.baseAzn)} × ${e.rate}%` : `${e.note ?? ""}${e.by ? ` · ${e.by}` : ""}` || "—"}</p></td>
                    <td className={cn("whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums", e.amountAzn < 0 && "text-muted-foreground")}>{e.amountAzn > 0 ? "+" : ""}{azn(e.amountAzn)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

        {tab === "settings" && (
          <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); if (rateOk(rate) && code.length >= 3) void run(() => adminUpdatePartner(p.id, { code, rate: num(rate), note }), t("Yadda saxlandı.")); }}>
            <div className="grid gap-3 sm:grid-cols-[10rem_8rem_1fr]">
              <div className="flex flex-col gap-1"><Label htmlFor="pc">{t("Kod")}</Label><Input id="pc" value={code} onChange={(e) => setCode(codeOf(e.target.value))} maxLength={20} className="font-mono" /></div>
              <div className="flex flex-col gap-1"><Label htmlFor="pr">{t("Faiz (%)")}</Label><Input id="pr" value={rate} onChange={(e) => setRate(e.target.value)} inputMode="decimal" /></div>
              <div className="flex flex-col gap-1"><Label htmlFor="pn">{t("Qeyd (yalnız admin görür)")}</Label><Input id="pn" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} /></div>
            </div>
            {!rateOk(rate) && <p className="text-xs text-destructive">{t("Faiz 0 ilə 100 arasında olmalıdır.")}</p>}
            <p className="text-xs text-muted-foreground">{t("Faiz dəyişəndə yalnız sonrakı ödənişlərə tətbiq olunur. Kod dəyişəndə köhnə link işləməz.")}</p>
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" disabled={busy} className={p.active ? "border-destructive/50 text-destructive hover:bg-destructive/10" : ""}
                onClick={() => run(() => adminUpdatePartner(p.id, { active: !p.active }), p.active ? t("Partnyorluq dayandırıldı.") : t("Partnyorluq bərpa olundu."))}>
                {p.active ? <><Pause size={15} aria-hidden />{t("Dayandır")}</> : <><Play size={15} aria-hidden />{t("Bərpa et")}</>}
              </Button>
              <Button disabled={busy || !settingsDirty || !rateOk(rate) || code.length < 3}>{t("Saxla")}</Button>
            </div>
          </form>
        )}
      </div>

      <Modal open={!!unlink} onClose={() => setUnlink(null)} busy={busy} size="sm" title={t("Partnyordan ayrılsın?")}
        footer={<><Button variant="outline" onClick={() => setUnlink(null)} disabled={busy}>{t("Ləğv et")}</Button><Button variant="destructive" disabled={busy} onClick={async () => { if (unlink && await run(() => adminPartnerReferral({ email: unlink.email, code: "" }), t("Ayrıldı."))) setUnlink(null); }}>{t("Ayır")}</Button></>}>
        <p className="text-sm">{unlink && t("{email} bu partnyordan ayrılsın? Yazılmış komissiya qalır, yenisi yazılmır.", { email: unlink.email })}</p>
      </Modal>
    </Modal>
  );
}

export default function AdminPartnersPage() {
  const { t } = useI18n();
  const azn = useMoney();
  const [data, setData] = useState<{ settings: PartnerSettings; partners: AdminPartner[] } | null>(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState<{ id: string; tab: DTab } | null>(null);
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState<"new" | "link" | "rules" | null>(null);
  const [filter, setFilter] = useState<"all" | "due" | "active" | "paused">("all");
  const [q, setQ] = useState("");
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
    try { await fn(); toast.success(ok); await load(); return true; } catch (e) { toast.error((e as Error).message); return false; } finally { setBusy(false); }
  };
  const partners = data?.partners ?? [];
  const totals = partners.reduce((a, p) => ({ balance: a.balance + p.totals.balance, earned: a.earned + p.totals.earned, paidOut: a.paidOut + p.totals.paidOut }), { balance: 0, earned: 0, paidOut: 0 });
  const test = { all: () => true, due: (p: AdminPartner) => p.totals.balance > 0, active: (p: AdminPartner) => p.active, paused: (p: AdminPartner) => !p.active };
  const needle = q.trim().toLowerCase();
  const shown = partners.filter(test[filter]).filter((p) => !needle || p.code.toLowerCase().includes(needle) || p.email.toLowerCase().includes(needle));
  const cur = open ? partners.find((p) => p.id === open.id) ?? null : null;
  const sNums = s ? Object.values(s).map(num) : [];
  const sOk = !!s && sNums.every((n) => Number.isFinite(n) && n >= 0) && num(s.defaultRate) <= 100 && num(s.bonusPct) <= 100 && num(s.months) >= 1;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("Partnyorlar")} description={t("Partnyorun kodu ilə gələn saytların real ödənişlərindən komissiya yazılır. Ödənişi özün edib balansdan çıxırsan.")}
        actions={<>
          <Button variant="outline" onClick={() => setModal("rules")}><Settings2 size={16} aria-hidden />{t("Proqram qaydaları")}</Button>
          <Button variant="outline" onClick={() => setModal("link")}><Link2 size={16} aria-hidden />{t("Müştərini bağla")}</Button>
          <Button onClick={() => setModal("new")}><Plus size={16} aria-hidden />{t("Yeni partnyor")}</Button>
        </>} />
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

      {data && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatTile icon={Wallet} label={t("Ödənilməli (cəmi balans)")} value={azn(totals.balance)} hint={t("{n} partnyora", { n: partners.filter(test.due).length })} />
          <StatTile icon={HandCoins} label={t("Cəmi komissiya")} value={azn(totals.earned)} />
          <StatTile icon={Banknote} label={t("Ödənilib")} value={azn(totals.paidOut)} />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <FilterPills value={filter} onChange={setFilter} label={t("Süzgəc")} items={[
          { value: "all", label: t("Hamısı"), count: partners.length },
          { value: "due", label: t("Ödənilməli"), count: partners.filter(test.due).length },
          { value: "active", label: t("Aktiv"), count: partners.filter(test.active).length },
          { value: "paused", label: t("Dayandırılıb"), count: partners.filter(test.paused).length },
        ]} />
        <Button variant="ghost" size="sm" disabled={busy} onClick={() => run(adminPartnerSync, t("Komissiyalar yeniləndi."))}><RefreshCw size={14} className={busy ? "animate-spin" : ""} aria-hidden />{t("İndi hesabla")}</Button>
        {partners.length > 5 && (
          <div className="relative ml-auto w-full max-w-xs">
            <Search size={15} aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Kod və ya e-poçt")} aria-label={t("Axtar")} className="pl-9" />
          </div>
        )}
      </div>

      {!data ? <Skeleton className="h-40" /> : partners.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border px-6 py-10 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-muted"><HandCoins size={22} aria-hidden /></span>
          <h3 className="font-semibold">{t("Hələ partnyor yoxdur")}</h3>
          <p className="max-w-md text-sm text-muted-foreground">{t("Partnyor əvvəlcə qeydiyyatdan keçib e-poçtunu təsdiqləməlidir.")}</p>
          <Button onClick={() => setModal("new")}><Plus size={16} aria-hidden />{t("Yeni partnyor")}</Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-border text-left text-xs text-muted-foreground">
              <tr><th className="px-4 py-3 font-medium">{t("Partnyor")}</th><th className="px-4 py-3 text-right font-medium">{t("Faiz")}</th><th className="px-4 py-3 text-right font-medium">{t("Müştərilər")}</th><th className="px-4 py-3 text-right font-medium">{t("Komissiya")}</th><th className="px-4 py-3 text-right font-medium">{t("Balans")}</th><th className="w-12" /></tr>
            </thead>
            <tbody className="divide-y divide-border tabular-nums">
              {shown.map((p) => (
                <tr key={p.id} className="cursor-pointer hover:bg-muted/40" onClick={() => setOpen({ id: p.id, tab: "balance" })}>
                  <td className="max-w-[18rem] px-4 py-3">
                    <span className="flex items-center gap-2"><code className="font-mono font-semibold">{p.code}</code>{!p.active && <Badge className="bg-muted text-muted-foreground">{t("dayandırılıb")}</Badge>}</span>
                    <span className="block truncate text-xs text-muted-foreground">{p.email}{p.note && ` · ${p.note}`}</span>
                  </td>
                  <td className="px-4 py-3 text-right">{p.rate}%</td>
                  <td className="px-4 py-3 text-right">{p.customers}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-muted-foreground">{azn(p.totals.earned)}</td>
                  <td className={cn("whitespace-nowrap px-4 py-3 text-right font-semibold", p.totals.balance <= 0 && "font-normal text-muted-foreground")}>{azn(p.totals.balance)}</td>
                  <td className="px-2 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                    <RowMenu items={[
                      { label: t("Ətraflı"), icon: Eye, run: () => setOpen({ id: p.id, tab: "customers" }) },
                      { label: t("Ödənişi qeyd et"), icon: Banknote, run: () => setOpen({ id: p.id, tab: "balance" }), disabled: p.totals.balance <= 0 },
                      { label: t("Ayarlar"), icon: Settings2, run: () => setOpen({ id: p.id, tab: "settings" }) },
                      { label: p.active ? t("Dayandır") : t("Bərpa et"), icon: p.active ? Pause : Play, danger: p.active, run: () => void run(() => adminUpdatePartner(p.id, { active: !p.active }), p.active ? t("Partnyorluq dayandırıldı.") : t("Partnyorluq bərpa olundu.")) },
                    ]} />
                  </td>
                </tr>
              ))}
              {!shown.length && <tr><td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">{t("Heç nə tapılmadı.")}</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {cur && open && <PartnerModal key={cur.id} p={cur} tab={open.tab} setTab={(tab) => setOpen({ ...open, tab })} onClose={() => setOpen(null)} onChange={() => void load()} />}

      <Modal open={modal === "new"} onClose={() => setModal(null)} busy={busy} title={t("Yeni partnyor")} description={t("Partnyor əvvəlcə qeydiyyatdan keçib e-poçtunu təsdiqləməlidir.")}
        footer={<><Button variant="outline" onClick={() => setModal(null)} disabled={busy}>{t("Ləğv et")}</Button><Button type="submit" form="np-form" disabled={busy || !nEmail.trim() || !rateOk(nRate)}>{t("Əlavə et")}</Button></>}>
        <form id="np-form" className="grid gap-3 sm:grid-cols-[1fr_9rem_7rem]" onSubmit={async (e) => { e.preventDefault(); if (await run(() => adminCreatePartner({ email: nEmail.trim(), ...(nCode && { code: nCode }), ...(nRate && { rate: num(nRate) }) }), t("Partnyor əlavə olundu."))) { setNEmail(""); setNCode(""); setNRate(""); setModal(null); } }}>
          <div className="flex flex-col gap-1"><Label htmlFor="np-email">{t("E-poçt")}</Label><Input id="np-email" type="email" value={nEmail} onChange={(e) => setNEmail(e.target.value)} required /></div>
          <div className="flex flex-col gap-1"><Label htmlFor="np-code">{t("Kod")}</Label><Input id="np-code" value={nCode} onChange={(e) => setNCode(codeOf(e.target.value))} maxLength={20} placeholder={t("avtomatik")} className="font-mono" /></div>
          <div className="flex flex-col gap-1"><Label htmlFor="np-rate">{t("Faiz (%)")}</Label><Input id="np-rate" value={nRate} onChange={(e) => setNRate(e.target.value)} inputMode="decimal" placeholder={data ? String(data.settings.defaultRate) : ""} /></div>
          {!rateOk(nRate) && <p className="text-xs text-destructive sm:col-span-3">{t("Faiz 0 ilə 100 arasında olmalıdır.")}</p>}
        </form>
      </Modal>

      <Modal open={modal === "link"} onClose={() => setModal(null)} busy={busy} title={t("Müştərini partnyora bağla")} description={t("Kodu yazmadan qeydiyyatdan keçən müştəri üçün. Əl ilə bağlananda bonus verilmir.")}
        footer={<><Button variant="outline" onClick={() => setModal(null)} disabled={busy}>{t("Ləğv et")}</Button><Button type="submit" form="ap-form" disabled={busy || !aEmail.trim() || !aCode}>{t("Bağla")}</Button></>}>
        <form id="ap-form" className="flex flex-col gap-3" onSubmit={async (e) => { e.preventDefault(); if (await run(() => adminPartnerReferral({ email: aEmail.trim(), code: aCode, countPast: aPast }), t("Bağlandı."))) { setAEmail(""); setACode(""); setAPast(false); setModal(null); } }}>
          <div className="grid gap-3 sm:grid-cols-[1fr_10rem]">
            <div className="flex flex-col gap-1"><Label htmlFor="ap-email">{t("Müştərinin e-poçtu")}</Label><Input id="ap-email" type="email" value={aEmail} onChange={(e) => setAEmail(e.target.value)} required /></div>
            <div className="flex flex-col gap-1"><Label htmlFor="ap-code">{t("Partnyor kodu")}</Label>
              <Input id="ap-code" list="ap-codes" value={aCode} onChange={(e) => setACode(codeOf(e.target.value))} maxLength={20} className="font-mono" required />
              <datalist id="ap-codes">{partners.filter((p) => p.active).map((p) => <option key={p.id} value={p.code}>{p.email}</option>)}</datalist>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={aPast} onChange={(e) => setAPast(e.target.checked)} className="size-4" />{t("Keçmiş ödənişləri də say (müştərinin qeydiyyat tarixindən)")}</label>
        </form>
      </Modal>

      <Modal open={modal === "rules"} onClose={() => setModal(null)} busy={busy} title={t("Proqram qaydaları")} description={t("Komissiya yalnız real ödənişlərdən (təsdiqlənmiş yükləmə və ödəniş şlüzü) hesablanır. Bonus, hədiyyə və pulsuz balans sayılmır.")}
        footer={<><Button variant="outline" onClick={() => setModal(null)} disabled={busy}>{t("Ləğv et")}</Button><Button type="submit" form="ps-form" disabled={busy || !sOk}>{t("Saxla")}</Button></>}>
        {s && (
          <form id="ps-form" className="flex flex-col gap-3" onSubmit={async (e) => { e.preventDefault(); if (sOk && await run(() => adminPartnerSettings({ defaultRate: num(s.defaultRate), bonusPct: num(s.bonusPct), bonusCapAzn: num(s.bonusCapAzn), months: Math.round(num(s.months)) }), t("Ayarlar yadda saxlandı."))) setModal(null); }}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1"><Label htmlFor="ps-rate">{t("Yeni partnyor üçün faiz")}</Label><Input id="ps-rate" value={s.defaultRate} onChange={(e) => setS({ ...s, defaultRate: e.target.value })} inputMode="decimal" /></div>
              <div className="flex flex-col gap-1"><Label htmlFor="ps-months">{t("Müddət (ay)")}</Label><Input id="ps-months" value={s.months} onChange={(e) => setS({ ...s, months: e.target.value })} inputMode="numeric" /></div>
              <div className="flex flex-col gap-1"><Label htmlFor="ps-bonus">{t("Yeni müştəri bonusu (%)")}</Label><Input id="ps-bonus" value={s.bonusPct} onChange={(e) => setS({ ...s, bonusPct: e.target.value })} inputMode="decimal" /></div>
              <div className="flex flex-col gap-1"><Label htmlFor="ps-cap">{t("Bonus tavanı (AZN)")}</Label><Input id="ps-cap" value={s.bonusCapAzn} onChange={(e) => setS({ ...s, bonusCapAzn: e.target.value })} inputMode="decimal" /></div>
            </div>
            {!sOk && <p className="text-xs text-destructive">{t("Rəqəmlər düzgün deyil.")}</p>}
            <p className="text-xs text-muted-foreground">{t("Bonus 0 olsa yeni müştəriyə heç nə verilmir. Müddət dəyişəndə artıq bağlı müştərilərə də tətbiq olunur.")}</p>
          </form>
        )}
      </Modal>
    </div>
  );
}
