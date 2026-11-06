"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Download, Hourglass } from "lucide-react";
import { adminBillingRequests, adminLedger, adminLedgerCsvUrl, adminPaymentRequests, adminResolveRequest, type AdminTopupRequest, type LedgerRow, type PaymentFilters, type PaymentRequestRow } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Gözləyən yükləmə sorğuları: ödəniş gəlibsə təsdiq (balans yüklənir), gəlməyibsə rədd. */
function Pending({ onChange }: { onChange: () => void }) {
  const { t, short } = useI18n();
  const [rows, setRows] = useState<AdminTopupRequest[] | null>(null);
  const [busy, setBusy] = useState("");
  const load = useCallback(() => adminBillingRequests("pending").then((r) => setRows(r.requests)).catch(() => setRows([])), []);
  useEffect(() => { void load(); }, [load]);
  const act = async (id: string, action: "approve" | "reject") => {
    setBusy(id);
    try { await adminResolveRequest(id, action); toast.success(action === "approve" ? t("Təsdiqləndi, balans yükləndi.") : t("Rədd edildi.")); await load(); onChange(); }
    catch (e) { toast.error((e as Error).message); } finally { setBusy(""); }
  };
  if (!rows) return <Skeleton className="h-24" />;
  return (
    <Card className={rows.length ? "border-amber/50" : ""}>
      <CardHeader className="flex-row items-center gap-2">
        <Hourglass size={16} className={rows.length ? "text-amber" : "text-muted-foreground"} aria-hidden />
        <CardTitle>{t("Gözləyən sorğular")}</CardTitle>
        {rows.length > 0 && <Badge className="bg-amber/15 text-amber">{rows.length}</Badge>}
      </CardHeader>
      <CardContent className={rows.length ? "px-0 py-0" : ""}>
        {rows.length === 0 ? <p className="text-sm text-muted-foreground">{t("Təsdiq gözləyən sorğu yoxdur.")}</p> : (
          <ul className="divide-y divide-border">
            {rows.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
                <strong className="w-28 tabular-nums">{r.amountAzn.toFixed(2)} AZN</strong>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{r.businessName === "(silinib)" ? t("(silinib)") : r.businessName}</span>
                  <span className="block truncate text-xs text-muted-foreground">{r.email} · {short(r.at)}</span>
                </span>
                <span className="flex gap-2">
                  <Button size="sm" disabled={busy === r.id} onClick={() => act(r.id, "approve")}>{t("Ödəniş alındı, təsdiqlə")}</Button>
                  <Button size="sm" variant="outline" disabled={busy === r.id} onClick={() => act(r.id, "reject")}>{t("Rədd et")}</Button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminPaymentsPage() {
  const { t, locale, short } = useI18n();
  const [tab, setTab] = useState<"ledger" | "requests">("ledger");
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

  const money = useMemo(() => new Intl.NumberFormat(locale === "en" ? "en-US" : locale === "ru" ? "ru-RU" : locale === "tr" ? "tr-TR" : "az-Latn-AZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), [locale]);
  const filters: PaymentFilters = tab === "ledger" ? { ...applied, kind } : { ...applied, status };

  const load = useCallback(async (before?: string) => {
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
  useEffect(() => { setLedger(null); setRequests(null); void load(); }, [load]);

  const total = ledger?.reduce((s, x) => s + x.amountAzn, 0) ?? 0;
  const kindBadge: Record<LedgerRow["kind"], [string, string]> = { payment: [t("ödəniş"), "bg-chart-2/10 text-chart-2"], manual: [t("əl ilə"), "bg-primary/10 text-primary"], adjust: [t("düzəliş"), "bg-destructive/10 text-destructive"] };
  const statusBadge: Record<string, [string, string]> = { pending: [t("gözləyir"), "bg-amber/15 text-amber"], approved: [t("təsdiqləndi"), "bg-chart-2/10 text-chart-2"], rejected: [t("rədd edildi"), "bg-muted text-muted-foreground"] };
  const name = (s: string) => (s === "(silinib)" ? t("(silinib)") : s);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold">{t("Ödənişlər")}</h1>
        <p className="text-sm text-muted-foreground">{t("Yükləmə sorğuları və balansdakı bütün hərəkətlər: ödənişlər, əl ilə əlavələr və düzəlişlər.")}</p>
      </header>

      <Pending onChange={() => setRev((n) => n + 1)} />

      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>{t("Tarixçə")}</CardTitle>
            <CardDescription>{tab === "ledger" ? t("Balansa daxil olan və çıxılan pul (istifadə xərcləri bura düşmür).") : t("Müştərilərin göndərdiyi bütün yükləmə sorğuları.")}</CardDescription>
          </div>
          <Segmented value={tab} onChange={setTab} label={t("Görünüş")} options={[{ value: "ledger", label: t("Balans hərəkətləri") }, { value: "requests", label: t("Sorğular") }]} />
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); setApplied({ tenant: tenant.trim(), from, to }); }}>
            {tab === "ledger" ? (
              <div className="flex flex-col gap-1">
                <Label htmlFor="pay-kind">{t("Növ")}</Label>
                <select id="pay-kind" value={kind} onChange={(e) => setKind(e.target.value)} className="h-10 rounded-md border border-border bg-card px-3 text-sm">
                  <option value="">{t("Hamısı")}</option><option value="payment">{t("Ödəniş")}</option><option value="manual">{t("Əl ilə əlavə")}</option><option value="adjust">{t("Düzəliş (mənfi)")}</option>
                </select>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <Label htmlFor="pay-status">{t("Status")}</Label>
                <select id="pay-status" value={status} onChange={(e) => setStatus(e.target.value)} className="h-10 rounded-md border border-border bg-card px-3 text-sm">
                  <option value="all">{t("Hamısı")}</option><option value="pending">{t("Gözləyir")}</option><option value="approved">{t("Təsdiqlənib")}</option><option value="rejected">{t("Rədd edilib")}</option>
                </select>
              </div>
            )}
            <div className="flex flex-col gap-1"><Label htmlFor="pay-tenant">{t("Müştəri")}</Label><Input id="pay-tenant" type="search" value={tenant} onChange={(e) => setTenant(e.target.value)} placeholder={t("ad, domen və ya ID")} className="w-56" /></div>
            <div className="flex flex-col gap-1"><Label htmlFor="pay-from">{t("Başlanğıc")}</Label><Input id="pay-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" /></div>
            <div className="flex flex-col gap-1"><Label htmlFor="pay-to">{t("Son")}</Label><Input id="pay-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" /></div>
            <Button variant="outline">{t("Süz")}</Button>
            {tab === "ledger" && <a href={adminLedgerCsvUrl(filters)} download className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-card px-3 text-sm font-medium hover:bg-muted"><Download size={15} aria-hidden />CSV</a>}
          </form>

          {applied.tenant && (
            <p className="text-sm text-muted-foreground">
              {matched.tenant ? <>{t("Müştəri:")} <strong className="text-foreground">{matched.tenant.businessName}</strong> · {matched.tenant.domain}{matched.others > 0 && ` · ${t("daha {n} uyğun müştəri var, dəqiqləşdir", { n: matched.others })}`}</> : t("“{q}” adlı müştəri tapılmadı.", { q: applied.tenant })}
            </p>
          )}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

          {tab === "ledger" && (!ledger ? <Skeleton className="h-40" /> : ledger.length === 0 ? <p className="text-sm text-muted-foreground">{t("Bu süzgəcə uyğun hərəkət yoxdur.")}</p> : (
            <div className="-mx-5 overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr className="border-b border-border"><th className="px-5 py-2 font-medium">{t("Tarix")}</th><th className="px-3 py-2 font-medium">{t("Müştəri")}</th><th className="px-3 py-2 font-medium">{t("Növ")}</th><th className="px-3 py-2 text-right font-medium">{t("Məbləğ")}</th><th className="px-5 py-2 font-medium">{t("Qeyd")}</th></tr>
                </thead>
                <tbody>
                  {ledger.map((x) => (
                    <tr key={x.id} className="border-b border-border last:border-0 align-top">
                      <td className="whitespace-nowrap px-5 py-2.5 text-muted-foreground">{short(x.at)}</td>
                      <td className="max-w-[14rem] px-3 py-2.5"><Link href={`/admin/users?q=${encodeURIComponent(x.tenantId)}`} className="block truncate font-medium hover:underline">{name(x.businessName)}</Link><span className="block truncate text-xs text-muted-foreground">{x.domain}</span></td>
                      <td className="px-3 py-2.5"><Badge className={kindBadge[x.kind][1]}>{kindBadge[x.kind][0]}</Badge></td>
                      <td className={cn("px-3 py-2.5 text-right font-medium tabular-nums", x.amountAzn < 0 ? "text-destructive" : "")}>{x.amountAzn > 0 ? "+" : ""}{money.format(x.amountAzn)} ₼</td>
                      <td className="max-w-[16rem] px-5 py-2.5 text-muted-foreground"><span className="block truncate">{x.note || "–"}</span>{x.by && <span className="block truncate text-xs">{x.by}</span>}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr className="border-t border-border"><td colSpan={3} className="px-5 py-2.5 text-xs text-muted-foreground">{t("Göstərilənlərin cəmi ({n} sətir)", { n: ledger.length })}</td><td className="px-3 py-2.5 text-right font-semibold tabular-nums">{money.format(total)} ₼</td><td /></tr></tfoot>
              </table>
            </div>
          ))}

          {tab === "requests" && (!requests ? <Skeleton className="h-40" /> : requests.length === 0 ? <p className="text-sm text-muted-foreground">{t("Bu süzgəcə uyğun sorğu yoxdur.")}</p> : (
            <div className="-mx-5 overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr className="border-b border-border"><th className="px-5 py-2 font-medium">{t("Tarix")}</th><th className="px-3 py-2 font-medium">{t("Müştəri")}</th><th className="px-3 py-2 text-right font-medium">{t("Məbləğ")}</th><th className="px-3 py-2 font-medium">{t("Status")}</th><th className="px-5 py-2 font-medium">{t("Həll edən")}</th></tr>
                </thead>
                <tbody>
                  {requests.map((x) => (
                    <tr key={x.id} className="border-b border-border last:border-0 align-top">
                      <td className="whitespace-nowrap px-5 py-2.5 text-muted-foreground">{short(x.at)}</td>
                      <td className="max-w-[14rem] px-3 py-2.5"><span className="block truncate font-medium">{name(x.businessName)}</span><span className="block truncate text-xs text-muted-foreground">{x.email}</span></td>
                      <td className="px-3 py-2.5 text-right font-medium tabular-nums">{money.format(x.amountAzn)} ₼</td>
                      <td className="px-3 py-2.5"><Badge className={statusBadge[x.status]?.[1]}>{statusBadge[x.status]?.[0] ?? x.status}</Badge></td>
                      <td className="px-5 py-2.5 text-muted-foreground">{x.resolvedBy ? <><span className="block">{x.resolvedBy}</span>{x.resolvedAt && <span className="block text-xs">{short(x.resolvedAt)}</span>}</> : "–"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

          {next && <div><Button variant="outline" disabled={busy} onClick={() => load(next)}>{busy ? t("Yüklənir…") : t("Daha çox göstər")}</Button></div>}
        </CardContent>
      </Card>
    </div>
  );
}
