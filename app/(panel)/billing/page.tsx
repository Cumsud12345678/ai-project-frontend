"use client";
import { useCallback, useEffect, useState } from "react";
import { Wallet } from "lucide-react";
import { toast } from "sonner";
import { getBilling, requestTopup, type Billing } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { RequireTenant } from "@/components/session";
import { CardSkeleton } from "@/components/skeletons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";

const azn = (n: number, d = 2) => `${n.toFixed(d)} AZN`;

function Body() {
  const { t, num, short } = useI18n();
  const [b, setB] = useState<Billing | null>(null);
  const [error, setError] = useState("");
  const [amount, setAmount] = useState("10");
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<{ instructions?: string; checkoutUrl?: string; amount: number } | null>(null);

  const load = useCallback(() => { getBilling().then(setB).catch((e: Error) => setError(e.message)); }, []);
  useEffect(load, [load]);

  if (error) return <p role="alert" className="text-sm text-destructive">{error}</p>;
  if (!b) return <CardSkeleton />;

  const per = b.spend.avgPerRequestAzn ?? b.spend.defaultAvgAzn;
  const approx = (n: number) => Math.max(1, Math.round(n / per / 10) * 10);
  const amt = Number(amount.replace(",", "."));
  const valid = Number.isFinite(amt) && amt >= b.minTopupAzn && amt <= b.maxTopupAzn;
  const stateBadge = b.state === "empty" ? <Badge className="bg-destructive/15 text-destructive">{t("Balans bitib")}</Badge>
    : b.state === "low" ? <Badge className="bg-amber/15 text-amber">{t("Balans azalır")}</Badge>
    : <Badge className="bg-primary/15 text-primary">{t("Aktiv")}</Badge>;
  const typeLabel: Record<string, string> = { topup: t("Yükləmə"), adjust: t("Düzəliş"), free: t("Pulsuz balans"), charge: t("Sorğu xərci") };

  async function submit() {
    if (!valid) return;
    setBusy(true);
    try {
      const r = await requestTopup(amt);
      setInfo({ instructions: r.instructions, checkoutUrl: r.checkoutUrl, amount: amt });
      toast.success(t("Yükləmə sorğusu göndərildi."));
      if (r.checkoutUrl) window.location.href = r.checkoutUrl;
      load();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold">{t("Balans")}</h1>
        <p className="text-sm text-muted-foreground">{t("Çat yalnız istifadə etdiyin qədər xərcləyir. Aylıq abunə və gizli ödəniş yoxdur.")}</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Wallet size={18} aria-hidden />{t("Cari balans")} {stateBadge}</CardTitle>
          <CardDescription>{b.state === "empty" && b.enforced ? t("Balans bitib: çat ziyarətçilərə cavab vermir, əvəzinə əlaqə forması göstərilir.") : t("Balans bitəndə çat dayanır, gözlənilməz borc yaranmır.")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-4xl font-semibold tabular-nums">{azn(b.balance.totalAzn)}</p>
          <dl className="grid gap-3 text-sm sm:grid-cols-3">
            <div><dt className="text-muted-foreground">{t("Pulsuz hissə")}</dt><dd className="tabular-nums">{azn(b.balance.freeAzn)}</dd></div>
            <div><dt className="text-muted-foreground">{t("Yüklənmiş hissə")}</dt><dd className="tabular-nums">{azn(b.balance.paidAzn)}</dd></div>
            <div><dt className="text-muted-foreground">{t("Bu ay xərc")}</dt><dd className="tabular-nums">{azn(b.spend.monthAzn)} · {num(b.spend.monthRequests)} {t("sorğu")}</dd></div>
          </dl>
          <p className="text-sm text-muted-foreground">
            {b.allowance.period === "monthly"
              ? t("Hər ay {n} AZN pulsuz balans verilir; əvvəlcə o xərclənir.", { n: b.allowance.freeAzn })
              : t("Qeydiyyatda {n} AZN pulsuz balans verilir; əvvəlcə o xərclənir.", { n: b.allowance.freeAzn })}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("Orta xərc")}</CardTitle>
          <CardDescription>
            {b.spend.avgPerRequestAzn
              ? t("Son 30 gündə bir sorğunun orta qiyməti {p} AZN olub.", { p: per.toFixed(3) })
              : t("Hələ real məlumat yoxdur. Təxmini bir sorğu {p} AZN-dir.", { p: per.toFixed(3) })}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-1 text-sm">
          <p>{t("{a} AZN təxminən {n} sorğuya çatır.", { a: 10, n: num(approx(10)) })}</p>
          {b.spend.projectedMonthAzn != null && <p className="text-muted-foreground">{t("Bu tempdə ay sonuna təxmini xərc: {a} AZN.", { a: b.spend.projectedMonthAzn.toFixed(2) })}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{t("Balansı yüklə")}</CardTitle><CardDescription>{t("Minimum {min} AZN. Yüklənən məbləğ ödənişdən sonra balansa əlavə olunur.", { min: b.minTopupAzn })}</CardDescription></CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {[10, 20, 50].filter((n) => n >= b.minTopupAzn).map((n) => (
              <Button key={n} type="button" size="sm" variant={amt === n ? "default" : "outline"} onClick={() => setAmount(String(n))}>{n} AZN</Button>
            ))}
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="amt">{t("Məbləğ (AZN)")}</Label>
            <Input id="amt" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className="max-w-40" aria-invalid={!valid} />
            {!valid && <p className="text-xs text-destructive">{t("Məbləğ {min} ilə {max} AZN arasında olmalıdır.", { min: b.minTopupAzn, max: b.maxTopupAzn })}</p>}
          </div>
          <div><Button onClick={submit} disabled={!valid || busy}>{t("Yükləmə sorğusu göndər")}</Button></div>
          {info && (
            <div role="status" className="rounded-md border border-border bg-muted/40 p-3 text-sm">
              <p className="font-medium">{t("{a} AZN üçün sorğu qəbul olundu.", { a: info.amount })}</p>
              {info.instructions ? <p className="mt-1 whitespace-pre-line text-muted-foreground">{info.instructions}</p> : <p className="mt-1 text-muted-foreground">{t("Ödəniş təsdiqləndikdən sonra balans yenilənəcək.")}</p>}
            </div>
          )}
          {b.pendingRequests.length > 0 && (
            <div>
              <p className="text-sm font-medium">{t("Gözləyən sorğular")}</p>
              <ul className="mt-1 text-sm text-muted-foreground">{b.pendingRequests.map((r) => <li key={r.id} className="tabular-nums">{azn(r.amountAzn)} · {short(r.at)}</li>)}</ul>
            </div>
          )}
        </CardContent>
      </Card>

      {!!b.days?.length && (
        <Card>
          <CardHeader><CardTitle>{t("Gündəlik xərc")}</CardTitle></CardHeader>
          <ul className="divide-y divide-border text-sm">
            {b.days.slice(0, 14).map((d) => (
              <li key={d.date} className="flex justify-between px-5 py-2 tabular-nums"><span>{d.date}</span><span>{azn(d.spentAzn, 3)} · {num(d.requests)} {t("sorğu")}</span></li>
            ))}
          </ul>
        </Card>
      )}

      {!!b.ledger?.length && (
        <Card>
          <CardHeader><CardTitle>{t("Əməliyyatlar")}</CardTitle></CardHeader>
          <ul className="divide-y divide-border text-sm">
            {b.ledger.map((e) => (
              <li key={e.id} className="flex flex-wrap justify-between gap-2 px-5 py-2">
                <span>{typeLabel[e.type] ?? e.type}{e.note ? ` · ${e.note}` : ""} <span className="text-xs text-muted-foreground">{short(e.at)}</span></span>
                <span className="tabular-nums">{e.amountAzn > 0 ? "+" : ""}{azn(e.amountAzn)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

export default function BillingPage() { return <RequireTenant><Body /></RequireTenant>; }
