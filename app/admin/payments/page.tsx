"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Check, Download, Hourglass, Plus, Search, X } from "lucide-react";
import { adminBillingRequests, adminLedger, adminLedgerCsvUrl, adminPaymentRequests, adminResolveRequest, adminTopup, adminUsers, type AdminTopupRequest, type AdminUser, type LedgerRow, type PaymentFilters, type PaymentRequestRow } from "@/lib/api";
import { FilterPills, PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Tab = "pending" | "ledger" | "requests";
const sel = "h-10 rounded-md border border-border bg-card px-3 text-sm";
const toNum = (s: string) => Number(s.replace(",", "."));

function useMoney() {
  const { locale } = useI18n();
  const f = useMemo(() => new Intl.NumberFormat(locale === "en" ? "en-US" : locale === "ru" ? "ru-RU" : locale === "tr" ? "tr-TR" : "az-Latn-AZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), [locale]);
  return (n: number) => `${f.format(n)} ₼`;
}

/** Əl ilə balans yükləmə: müştərini axtarıb seç, məbləği yaz. (Əvvəl bunun üçün İstifadəçilərə keçmək lazım idi.) */
function TopupModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const { t } = useI18n();
  const azn = useMoney();
  const [q, setQ] = useState("");
  const [found, setFound] = useState<AdminUser[] | null>(null);
  const [pick, setPick] = useState<NonNullable<AdminUser["tenant"]> | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (pick || q.trim().length < 2) { setFound(null); return; }
    const id = setTimeout(() => adminUsers({ q: q.trim(), filter: "tenants", limit: 6 }).then((r) => setFound(r.users.filter((u) => u.tenant))).catch(() => setFound([])), 300);
    return () => clearTimeout(id);
  }, [q, pick]);
  const v = toNum(amount);
  const ok = !!pick && amount.trim() !== "" && Number.isFinite(v) && v !== 0;
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ok || !pick) return;
    if (Math.abs(v) >= 100 && !confirm) { setConfirm(true); return; }
    setBusy(true);
    try { await adminTopup(pick.tenantId, v, note.trim(), Math.abs(v) >= 100); toast.success(t("Balans yeniləndi.")); onDone(); onClose(); }
    catch (err) { toast.error((err as Error).message); }
    finally { setBusy(false); }
  }
  return (
    <Modal open onClose={onClose} busy={busy} title={t("Balans yüklə")} description={t("Bank köçürməsi, nağd ödəniş və ya kompensasiya üçün. Mənfi məbləğ balansdan çıxır.")}
      footer={<><Button variant="outline" onClick={onClose} disabled={busy}>{t("Ləğv et")}</Button><Button type="submit" form="topup-form" variant={confirm ? "destructive" : "default"} disabled={!ok || busy}>{confirm ? t("Bəli, tətbiq et") : t("Tətbiq et")}</Button></>}>
      <form id="topup-form" onSubmit={submit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <Label htmlFor="tp-q">{t("Müştəri")}</Label>
          {pick ? (
            <div className="flex items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm">
              <span className="min-w-0 flex-1"><span className="block truncate font-medium">{pick.businessName}</span><span className="block truncate text-xs text-muted-foreground">{pick.domain} · {t("Balans")} {azn(pick.balance?.totalAzn ?? 0)}</span></span>
              <button type="button" onClick={() => { setPick(null); setConfirm(false); }} aria-label={t("Dəyiş")} className="grid size-7 cursor-pointer place-items-center rounded-md hover:bg-muted"><X size={15} aria-hidden /></button>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search size={15} aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input id="tp-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("ad, domen, e-poçt və ya ID")} className="pl-9" />
              </div>
              {found && (
                <ul className="divide-y divide-border rounded-lg border border-border">
                  {found.length === 0 && <li className="px-3 py-2 text-sm text-muted-foreground">{t("Heç nə tapılmadı.")}</li>}
                  {found.map((u) => (
                    <li key={u.id}><button type="button" onClick={() => setPick(u.tenant)} className="flex w-full cursor-pointer items-center gap-3 px-3 py-2 text-left text-sm hover:bg-muted/50">
                      <span className="min-w-0 flex-1"><span className="block truncate font-medium">{u.tenant!.businessName}</span><span className="block truncate text-xs text-muted-foreground">{u.tenant!.domain} · {u.email}</span></span>
                      <span className="tabular-nums text-muted-foreground">{azn(u.tenant!.balance?.totalAzn ?? 0)}</span>
                    </button></li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
          <div className="flex flex-col gap-1"><Label htmlFor="tp-a">{t("Məbləğ (AZN)")}</Label><Input id="tp-a" value={amount} onChange={(e) => { setAmount(e.target.value); setConfirm(false); }} inputMode="decimal" placeholder="20" /></div>
          <div className="flex flex-col gap-1"><Label htmlFor="tp-n">{t("Qeyd")}</Label><Input id="tp-n" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder={t("məs. bank köçürməsi, kompensasiya")} /></div>
        </div>
        {confirm && <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 p-2.5 text-sm">{v < 0 ? t("Balansdan {n} AZN çıxılacaq. Əminsən?", { n: Math.abs(v).toFixed(2) }) : t("Balansa {n} AZN əlavə olunacaq. Əminsən?", { n: v.toFixed(2) })}</p>}
      </form>
    </Modal>
  );
}

export default function AdminPaymentsPage() {
  const { t, short } = useI18n();
  const azn = useMoney();
  const [tab, setTab] = useState<Tab>("pending");
  const [pending, setPending] = useState<AdminTopupRequest[] | null>(null);
  const [kind, setKind] = useState("");
  const [status, setStatus] = useState("all");
  const [tenant, setTenant] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [applied, setApplied] = useState<PaymentFilters>({});
  const [ledger, setLedger] = useState<LedgerRow[] | null>(null);
  const [requests, setRequests] = useState<PaymentRequestRow[] | null>(null);
  const [next, setNext] = useState<string | null>(null);
  const [matched, setMatched] = useState<{ tenant: { businessName: string; domain: string } | null; others: number }>({ tenant: null, others: 0 });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [rev, setRev] = useState(0);
  const [resolve, setResolve] = useState<{ r: AdminTopupRequest; action: "approve" | "reject" } | null>(null);
  const [topup, setTopup] = useState(false);

  const loadPending = useCallback(() => adminBillingRequests("pending").then((r) => { setPending(r.requests); return r.requests; }).catch(() => { setPending([]); return []; }), []);
  // İlk açılışda gözləyən yoxdursa birbaşa hərəkətlər göstərilir
  useEffect(() => { void loadPending().then((r) => { if (!r.length) setTab("ledger"); }); }, [loadPending]);

  const filters: PaymentFilters = tab === "ledger" ? { ...applied, kind } : { ...applied, status };
  const load = useCallback(async (before?: string) => {
    if (tab === "pending") return;
    setBusy(true);
    try {
      if (tab === "ledger") {
        const r = await adminLedger({ ...filters, ...(before && { before }) });
        setLedger((cur) => (before && cur ? [...cur, ...r.entries] : r.entries));
        setNext(r.nextBefore); setMatched({ tenant: r.tenant, others: Math.max(0, r.matches.length - 1) });
      } else {
        const r = await adminPaymentRequests({ ...filters, ...(before && { before }) });
        setRequests((cur) => (before && cur ? [...cur, ...r.requests] : r.requests));
        setNext(r.nextBefore); setMatched({ tenant: r.tenant, others: Math.max(0, r.matches.length - 1) });
      }
      setError("");
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, kind, status, applied, rev]);
  useEffect(() => { setLedger(null); setRequests(null); setNext(null); void load(); }, [load]);

  async function act() {
    if (!resolve) return;
    setBusy(true);
    try {
      await adminResolveRequest(resolve.r.id, resolve.action);
      toast.success(resolve.action === "approve" ? t("Təsdiqləndi, balans yükləndi.") : t("Rədd edildi."));
      setResolve(null); await loadPending(); setRev((n) => n + 1);
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }

  const total = ledger?.reduce((s, x) => s + x.amountAzn, 0) ?? 0;
  const kindBadge: Record<LedgerRow["kind"], [string, string]> = { payment: [t("ödəniş"), "bg-foreground text-background"], manual: [t("əl ilə"), "bg-muted text-foreground"], adjust: [t("düzəliş"), "bg-destructive/10 text-destructive"] };
  const statusBadge: Record<string, [string, string]> = { pending: [t("gözləyir"), "bg-amber/15 text-amber"], approved: [t("təsdiqləndi"), "bg-muted text-foreground"], rejected: [t("rədd edildi"), "border border-border bg-transparent text-muted-foreground"] };
  const name = (s: string) => (s === "(silinib)" ? t("(silinib)") : s);
  const th = "px-4 py-3 font-medium";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("Ödənişlər")} description={t("Yükləmə sorğuları və balansdakı bütün hərəkətlər: ödənişlər, əl ilə əlavələr və düzəlişlər.")}
        actions={<>
          <a href={adminLedgerCsvUrl({ ...applied, kind })} download className={buttonVariants({ variant: "outline" })}><Download size={16} aria-hidden />CSV</a>
          <Button onClick={() => setTopup(true)}><Plus size={16} aria-hidden />{t("Balans yüklə")}</Button>
        </>} />

      <FilterPills value={tab} onChange={setTab} label={t("Ödənişlər")} items={[
        { value: "pending", label: t("Gözləyən"), count: pending?.length },
        { value: "ledger", label: t("Balans hərəkətləri") },
        { value: "requests", label: t("Bütün sorğular") },
      ]} />

      {tab === "pending" ? (
        !pending ? <Skeleton className="h-32" /> : pending.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border px-6 py-10 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-muted"><Hourglass size={22} aria-hidden /></span>
            <p className="text-sm text-muted-foreground">{t("Təsdiq gözləyən sorğu yoxdur.")}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="overflow-x-auto rounded-2xl border border-border bg-card">
              <table className="w-full min-w-[680px] text-sm">
                <thead className="border-b border-border text-left text-xs text-muted-foreground"><tr><th className={th}>{t("Müştəri")}</th><th className={cn(th, "text-right")}>{t("Məbləğ")}</th><th className={th}>{t("Tarix")}</th><th className={cn(th, "text-right")} /></tr></thead>
                <tbody className="divide-y divide-border">
                  {pending.map((r) => (
                    <tr key={r.id}>
                      <td className="max-w-[18rem] px-4 py-3"><Link href={`/admin/users?q=${encodeURIComponent(r.tenantId)}`} className="block truncate font-medium hover:underline">{name(r.businessName)}</Link><span className="block truncate text-xs text-muted-foreground">{r.email}</span></td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-base font-semibold tabular-nums">{azn(r.amountAzn)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{short(r.at)}</td>
                      <td className="px-4 py-3"><span className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => setResolve({ r, action: "reject" })}><X size={14} aria-hidden />{t("Rədd et")}</Button>
                        <Button size="sm" onClick={() => setResolve({ r, action: "approve" })}><Check size={14} aria-hidden />{t("Təsdiqlə")}</Button>
                      </span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground">{t("Təsdiqləməzdən əvvəl pulun hesaba gəldiyini bankda yoxla: təsdiq balansı dərhal artırır.")}</p>
          </div>
        )
      ) : (
        <>
          <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); setApplied({ tenant: tenant.trim(), from, to }); }}>
            {tab === "ledger" ? (
              <div className="flex flex-col gap-1"><Label htmlFor="pay-kind">{t("Növ")}</Label>
                <select id="pay-kind" value={kind} onChange={(e) => setKind(e.target.value)} className={sel}>
                  <option value="">{t("Hamısı")}</option><option value="payment">{t("Ödəniş")}</option><option value="manual">{t("Əl ilə əlavə")}</option><option value="adjust">{t("Düzəliş (mənfi)")}</option>
                </select></div>
            ) : (
              <div className="flex flex-col gap-1"><Label htmlFor="pay-status">{t("Status")}</Label>
                <select id="pay-status" value={status} onChange={(e) => setStatus(e.target.value)} className={sel}>
                  <option value="all">{t("Hamısı")}</option><option value="pending">{t("Gözləyir")}</option><option value="approved">{t("Təsdiqlənib")}</option><option value="rejected">{t("Rədd edilib")}</option>
                </select></div>
            )}
            <div className="flex flex-col gap-1"><Label htmlFor="pay-tenant">{t("Müştəri")}</Label><Input id="pay-tenant" type="search" value={tenant} onChange={(e) => setTenant(e.target.value)} placeholder={t("ad, domen və ya ID")} className="w-56" /></div>
            <div className="flex flex-col gap-1"><Label htmlFor="pay-from">{t("Başlanğıc")}</Label><Input id="pay-from" type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} className="w-40" /></div>
            <div className="flex flex-col gap-1"><Label htmlFor="pay-to">{t("Son")}</Label><Input id="pay-to" type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className="w-40" /></div>
            <Button variant="outline">{t("Süz")}</Button>
            {(applied.tenant || applied.from || applied.to) && <Button type="button" variant="ghost" onClick={() => { setTenant(""); setFrom(""); setTo(""); setApplied({}); }}>{t("Sıfırla")}</Button>}
          </form>

          {applied.tenant && (
            <p className="text-sm text-muted-foreground">
              {matched.tenant ? <>{t("Müştəri:")} <strong className="text-foreground">{matched.tenant.businessName}</strong> · {matched.tenant.domain}{matched.others > 0 && ` · ${t("daha {n} uyğun müştəri var, dəqiqləşdir", { n: matched.others })}`}</> : t("“{q}” adlı müştəri tapılmadı.", { q: applied.tenant })}
            </p>
          )}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

          {tab === "ledger" && (!ledger ? <Skeleton className="h-40" /> : ledger.length === 0 ? <p className="rounded-2xl border border-dashed border-border px-6 py-8 text-center text-sm text-muted-foreground">{t("Bu süzgəcə uyğun hərəkət yoxdur.")}</p> : (
            <div className="overflow-x-auto rounded-2xl border border-border bg-card">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="border-b border-border text-left text-xs text-muted-foreground"><tr><th className={th}>{t("Tarix")}</th><th className={th}>{t("Müştəri")}</th><th className={th}>{t("Növ")}</th><th className={cn(th, "text-right")}>{t("Məbləğ")}</th><th className={th}>{t("Qeyd")}</th></tr></thead>
                <tbody className="divide-y divide-border">
                  {ledger.map((x) => (
                    <tr key={x.id} className="align-top">
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{short(x.at)}</td>
                      <td className="max-w-[14rem] px-4 py-3"><Link href={`/admin/users?q=${encodeURIComponent(x.tenantId)}`} className="block truncate font-medium hover:underline">{name(x.businessName)}</Link><span className="block truncate text-xs text-muted-foreground">{x.domain}</span></td>
                      <td className="px-4 py-3"><Badge className={kindBadge[x.kind][1]}>{kindBadge[x.kind][0]}</Badge></td>
                      <td className={cn("whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums", x.amountAzn < 0 && "text-destructive")}>{x.amountAzn > 0 ? "+" : ""}{azn(x.amountAzn)}</td>
                      <td className="max-w-[16rem] px-4 py-3 text-muted-foreground"><span className="block truncate">{x.note || "–"}</span>{x.by && <span className="block truncate text-xs">{x.by}</span>}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr className="border-t border-border"><td colSpan={3} className="px-4 py-3 text-xs text-muted-foreground">{t("Göstərilənlərin cəmi ({n} sətir)", { n: ledger.length })}</td><td className="px-4 py-3 text-right font-semibold tabular-nums">{azn(total)}</td><td /></tr></tfoot>
              </table>
            </div>
          ))}

          {tab === "requests" && (!requests ? <Skeleton className="h-40" /> : requests.length === 0 ? <p className="rounded-2xl border border-dashed border-border px-6 py-8 text-center text-sm text-muted-foreground">{t("Bu süzgəcə uyğun sorğu yoxdur.")}</p> : (
            <div className="overflow-x-auto rounded-2xl border border-border bg-card">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="border-b border-border text-left text-xs text-muted-foreground"><tr><th className={th}>{t("Tarix")}</th><th className={th}>{t("Müştəri")}</th><th className={cn(th, "text-right")}>{t("Məbləğ")}</th><th className={th}>{t("Status")}</th><th className={th}>{t("Həll edən")}</th></tr></thead>
                <tbody className="divide-y divide-border">
                  {requests.map((x) => (
                    <tr key={x.id} className="align-top">
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{short(x.at)}</td>
                      <td className="max-w-[14rem] px-4 py-3"><span className="block truncate font-medium">{name(x.businessName)}</span><span className="block truncate text-xs text-muted-foreground">{x.email}</span></td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums">{azn(x.amountAzn)}</td>
                      <td className="px-4 py-3"><Badge className={statusBadge[x.status]?.[1]}>{statusBadge[x.status]?.[0] ?? x.status}</Badge></td>
                      <td className="px-4 py-3 text-muted-foreground">{x.resolvedBy ? <><span className="block">{x.resolvedBy}</span>{x.resolvedAt && <span className="block text-xs">{short(x.resolvedAt)}</span>}</> : "–"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

          {next && <div><Button variant="outline" disabled={busy} onClick={() => load(next)}>{busy ? t("Yüklənir…") : t("Daha çox göstər")}</Button></div>}
        </>
      )}

      <Modal open={!!resolve} onClose={() => setResolve(null)} busy={busy} size="sm"
        title={resolve?.action === "approve" ? t("Ödəniş təsdiqlənsin?") : t("Sorğu rədd edilsin?")}
        description={resolve ? `${name(resolve.r.businessName)} · ${resolve.r.email}` : undefined}
        footer={<><Button variant="outline" onClick={() => setResolve(null)} disabled={busy}>{t("Ləğv et")}</Button>
          <Button variant={resolve?.action === "reject" ? "destructive" : "default"} disabled={busy} onClick={act}>{resolve?.action === "approve" ? t("Ödəniş alındı, təsdiqlə") : t("Rədd et")}</Button></>}>
        {resolve && <p className="text-sm">{resolve.action === "approve" ? t("Müştərinin balansına {n} əlavə olunacaq.", { n: azn(resolve.r.amountAzn) }) : t("Sorğu bağlanır, balans dəyişmir.")}</p>}
      </Modal>

      {topup && <TopupModal onClose={() => setTopup(false)} onDone={() => setRev((n) => n + 1)} />}
    </div>
  );
}
