"use client";
// Plan və ödəniş: cari abunə və limit, aylıq planlar, yüksəltmə, növbəti dövrdən keçid, əlavə paketlər.
// Məbləği həmişə server hesablayır (sifarişdən əvvəl qiymət göstərilir). Ödəniş hələlik admin təsdiqi ilədir.
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Check, Clock, Package, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { getBilling, placeOrder, quoteOrder, setNextPlan, type Billing, type OrderInput, type OrderQuote, type Plan } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { RequireTenant } from "@/components/session";
import { CardSkeleton } from "@/components/skeletons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { PlanFeatureList, usePlanLabels } from "@/components/plan-ui";
import { cn } from "@/lib/utils";

const azn = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(2)} AZN`;
const ok = "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20";
const warnC = "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/20";
const bad = "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20";

function Body() {
  const { t, num, day } = useI18n();
  const L = usePlanLabels();
  const [b, setB] = useState<Billing | null>(null);
  const [error, setError] = useState("");
  const [order, setOrder] = useState<OrderInput | null>(null);
  const [downgrade, setDowngrade] = useState<Plan | null>(null);

  const load = useCallback(() => { getBilling().then(setB).catch((e: Error) => setError(e.message)); }, []);
  useEffect(load, [load]);

  if (error) return <p role="alert" className="text-sm text-destructive">{error}</p>;
  if (!b) return <CardSkeleton />;
  const cat = b.catalog;
  const sub = b.subscription ?? null;
  const live = Boolean(sub && sub.status !== "expired");
  const cur = live ? cat?.plans.find((p) => p.id === sub!.plan) : undefined;
  const typeLabel: Record<string, string> = { topup: t("Yükləmə"), adjust: t("Düzəliş"), free: t("Pulsuz balans"), charge: t("Sorğu xərci"), expire: t("Müddəti bitdi"), bonus: t("Bonus"), plan: t("Plan"), pack: t("Əlavə paket") };

  async function cancelNext() {
    try { await setNextPlan(null); toast.success(t("Keçid ləğv olundu.")); load(); } catch (e) { toast.error((e as Error).message); }
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold">{t("Plan və ödəniş")}</h1>
        <p className="text-sm text-muted-foreground">{t("Planın aylıq cavab limiti var. Limit dolmağa yaxın və dolanda e-poçtla xəbər veririk.")} <Link href="/legal/refund" target="_blank" className="font-medium text-foreground underline-offset-2 hover:underline">{t("Ödəniş qaydaları")}</Link></p>
      </header>

      <CurrentPlan b={b} onRenew={() => sub && setOrder({ kind: "plan", plan: sub.next ?? sub.plan, cycle: "month" })} onPack={() => cat?.packs[0] && setOrder({ kind: "pack", pack: cat.packs[0].id })} onCancelNext={cancelNext} />

      {cat && (
        <Card>
          <CardHeader>
            <CardTitle>{t("Planlar")}</CardTitle>
            <CardDescription>{t("Bütün planlar aylıqdır. Bahalı plana keçəndə yalnız qalan günlərin fərqini ödəyirsən.")}</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {cat.plans.map((p, i) => {
                const isCur = cur?.id === p.id;
                const up = Boolean(cur) && p.priceAzn > cur!.priceAzn;
                const down = Boolean(cur) && !isCur && p.priceAzn <= cur!.priceAzn;
                const featured = !cur && i === Math.floor(cat.plans.length / 2);
                return (
                  <li key={p.id} className={cn("flex flex-col gap-4 rounded-2xl border p-5", isCur || featured ? "border-foreground" : "border-border")}>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-lg font-semibold">{p.name}</h3>
                      {isCur ? <Badge className={ok}>{t("Cari plan")}</Badge> : featured ? <Badge className="bg-foreground text-background">{t("Ən çox seçilən")}</Badge> : null}
                    </div>
                    <div>
                      <p className="text-3xl font-semibold tabular-nums">{azn(p.priceAzn)}<span className="text-sm font-normal text-muted-foreground"> / {t("ay")}</span></p>
                    </div>
                    <PlanFeatureList plan={p} />
                    <div className="mt-auto">
                      {isCur ? (
                        !sub?.next || sub.next === p.id
                          ? <Button variant="outline" className="w-full" onClick={() => setOrder({ kind: "plan", plan: p.id, cycle: "month" })}>{t("Vaxtından əvvəl yenilə")}</Button>
                          : <Button variant="outline" className="w-full" onClick={cancelNext}>{t("Bu planda qal")}</Button>
                      ) : up ? (
                        <Button className="w-full" onClick={() => setOrder({ kind: "plan", plan: p.id, cycle: "month" })}>{t("Yüksəlt")}</Button>
                      ) : down ? (
                        sub?.next === p.id
                          ? <p className="text-center text-sm text-muted-foreground">{t("Növbəti dövrdən bu plana keçəcəksən")}</p>
                          : <Button variant="outline" className="w-full" onClick={() => setDowngrade(p)}>{t("Növbəti dövrdən keç")}</Button>
                      ) : (
                        <Button className="w-full" variant={featured ? "default" : "outline"} onClick={() => setOrder({ kind: "plan", plan: p.id, cycle: "month" })}>{t("Seç")}</Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      {cat && cat.packs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Package size={18} aria-hidden />{t("Əlavə cavab paketləri")}</CardTitle>
            <CardDescription>{t("Limit dövrün ortasında dolubsa, planı dəyişmədən əlavə cavab al. Paket {m} ay qüvvədədir və plan limiti bitəndən sonra işlənir.", { m: Math.round((cat.packDays ?? 365) / 30.4) })}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <ul className="flex flex-wrap gap-3">
              {cat.packs.map((k) => (
                <li key={k.id} className="flex items-center gap-4 rounded-xl border border-border px-4 py-3">
                  <div><p className="font-medium tabular-nums">+{num(k.replies)} {t("cavab")}</p><p className="text-sm text-muted-foreground tabular-nums">{azn(k.priceAzn)}</p></div>
                  <Button size="sm" variant="outline" disabled={!live} onClick={() => setOrder({ kind: "pack", pack: k.id })}>{t("Al")}</Button>
                </li>
              ))}
            </ul>
            {!live && <p className="text-sm text-muted-foreground">{t("Paket yalnız aktiv planla alınır.")}</p>}
            {(b.packs ?? []).length > 0 && (
              <ul className="divide-y divide-border rounded-md border border-border text-sm">
                {b.packs!.map((k, i) => (
                  <li key={i} className="flex flex-wrap justify-between gap-2 px-3 py-2 tabular-nums">
                    <span>{t("{n} cavab qalıb", { n: num(k.left) })} <span className="text-muted-foreground">· {t("alınıb {d}", { d: day(k.at) })}</span></span>
                    <span className="text-muted-foreground">{k.expiresAt ? t("{d} tarixinədək", { d: day(k.expiresAt) }) : t("müddətsiz")}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {b.pendingRequests.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Clock size={18} aria-hidden />{t("Gözləyən sifarişlər")}</CardTitle><CardDescription>{t("Ödəniş təsdiqlənən kimi plan avtomatik aktivləşir.")}</CardDescription></CardHeader>
          <ul className="divide-y divide-border text-sm">
            {b.pendingRequests.map((r) => (
              <li key={r.id} className="flex flex-wrap justify-between gap-2 px-5 py-2.5 tabular-nums">
                <span>{r.kind === "pack" ? t("Əlavə paket: +{n} cavab", { n: num(r.replies ?? 0) }) : r.kind === "plan" ? `${cat?.plans.find((p) => p.id === r.plan)?.name ?? r.plan}${r.orderType === "upgrade" ? ` · ${L.upgrade}` : ""}` : t("Balans yükləməsi")}
                  <span className="text-muted-foreground"> · {day(r.at)}</span></span>
                <span>{azn(r.amountAzn)}</span>
              </li>
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
                <span>{typeLabel[e.type] ?? e.type}{e.note ? ` · ${e.note}` : ""} <span className="text-xs text-muted-foreground">{day(e.at)}</span></span>
                <span className="tabular-nums">{e.amountAzn > 0 ? "+" : ""}{e.amountAzn.toFixed(2)} AZN</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <OrderModal input={order} plans={cat?.plans ?? []} onClose={() => setOrder(null)} onDone={() => { setOrder(null); load(); }} />
      <Modal open={Boolean(downgrade)} onClose={() => setDowngrade(null)} size="sm" title={t("Növbəti dövrdən {p} planına keç", { p: downgrade?.name ?? "" })}
        footer={<><Button variant="outline" onClick={() => setDowngrade(null)}>{t("Ləğv et")}</Button><Button onClick={async () => {
          try { await setNextPlan(downgrade!.id); toast.success(t("Qeyd olundu.")); setDowngrade(null); load(); } catch (e) { toast.error((e as Error).message); }
        }}>{t("Təsdiq et")}</Button></>}>
        <p className="text-sm text-muted-foreground">{t("Cari dövr ({d} tarixinədək) {c} planında davam edir. Növbəti ödəniş {p} planının qiyməti ilə olacaq. Bu plandakı bəzi imkanlar o vaxtdan bağlanacaq.", { d: sub ? day(sub.end) : "", c: cur?.name ?? "", p: downgrade?.name ?? "" })}</p>
        {downgrade && cur && <MissingFeatures from={cur} to={downgrade} />}
      </Modal>
    </div>
  );
}

function CurrentPlan({ b, onRenew, onPack, onCancelNext }: { b: Billing; onRenew: () => void; onPack: () => void; onCancelNext: () => void }) {
  const { t, num, day } = useI18n();
  const sub = b.subscription ?? null;
  const packLeft = b.packLeft ?? 0;
  if (!sub) {
    const tr = b.trial;
    const trialOn = Boolean(tr && tr.left > 0) || b.balance.totalAzn > 0;
    const tPct = tr && tr.total > 0 ? Math.min(100, Math.round(((tr.total - tr.left) / tr.total) * 100)) : 0;
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Sparkles size={18} aria-hidden />{trialOn ? t("Pulsuz sınaq") : t("Plan seçilməyib")} <Badge className={trialOn ? ok : bad}>{trialOn ? t("Aktiv") : t("Köməkçi dayanıb")}</Badge></CardTitle>
          <CardDescription>{trialOn
            ? tr?.until ? t("Bütün imkanlar açıqdır. Sınaq {d} tarixinədək və ya cavablar bitənədək davam edir.", { d: day(tr.until) }) : t("Bütün imkanlar açıqdır. Sınaq cavablar bitənədək davam edir.")
            : t("Köməkçi ziyarətçilərə cavab vermir, əvəzinə əlaqə forması göstərilir. Davam etmək üçün plan seç.")}</CardDescription>
        </CardHeader>
        {tr && trialOn && (
          <CardContent className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
              <span className="font-medium tabular-nums">{t("{n} pulsuz cavab qalıb", { n: num(tr.left) })}</span>
              <span className="text-muted-foreground tabular-nums">{t("{u} / {n} cavab", { u: num(tr.total - tr.left), n: num(tr.total) })}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-muted" aria-hidden><div className={cn("h-full rounded-full", tPct >= 80 ? "bg-amber-500" : "bg-emerald-500")} style={{ width: `${tPct}%` }} /></div>
          </CardContent>
        )}
      </Card>
    );
  }
  const pct = sub.included > 0 ? Math.min(100, Math.round((sub.used / sub.included) * 100)) : 0;
  const full = sub.used >= sub.included;
  const daysLeft = Math.max(0, Math.ceil((Date.parse(sub.end) - Date.now()) / 86_400_000));
  const badge = sub.status === "active" ? <Badge className={ok}>{t("Aktiv")}</Badge> : sub.status === "grace" ? <Badge className={warnC}>{t("Müddəti bitib · güzəşt")}</Badge> : <Badge className={bad}>{t("Müddəti bitib")}</Badge>;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">{sub.planName} {badge}</CardTitle>
        <CardDescription>
          {sub.status === "active" ? t("{d} tarixinədək ({n} gün qalıb)", { d: day(sub.end), n: daysLeft })
            : sub.status === "grace" ? t("Ödəniş müddəti {d} tarixində bitib. Köməkçi {g} tarixinədək işləyir, sonra dayanacaq.", { d: day(sub.end), g: day(sub.graceUntil) })
            : t("Köməkçi ziyarətçilərə cavab vermir. Bilik bazan və ayarların saxlanılıb: yeniləyən kimi davam edir.")}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {sub.status !== "expired" && (
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
              <span className="font-medium tabular-nums">{t("{u} / {n} cavab", { u: num(sub.used), n: num(sub.included) })}</span>
              <span className="text-muted-foreground">{t("Limit {d} tarixində yenilənir", { d: day(sub.windowEnd) })}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={t("Cavab limiti")}>
              <div className={cn("h-full rounded-full transition-all", pct >= 100 ? "bg-destructive" : pct >= 80 ? "bg-amber-500" : "bg-emerald-500")} style={{ width: `${pct}%` }} />
            </div>
            {packLeft > 0 && <p className="text-sm text-muted-foreground">{t("Əlavə paketdə {n} cavab var: limit dolanda istifadə olunur.", { n: num(packLeft) })}</p>}
            {full && packLeft <= 0 && <p role="status" className="rounded-md bg-red-50 p-3 text-sm text-red-800 ring-1 ring-inset ring-red-600/20">{t("Limit doldu: köməkçi ziyarətçilərə cavab vermir, əlaqə forması göstərilir. Əlavə paket al və ya planı yüksəlt.")}</p>}
          </div>
        )}
        {sub.next && sub.next !== sub.plan && (
          <p className="flex flex-wrap items-center gap-2 text-sm">
            <span>{t("Növbəti dövrdən {p} planına keçəcəksən.", { p: sub.nextName ?? sub.next })}</span>
            <button type="button" onClick={onCancelNext} className="cursor-pointer font-medium underline underline-offset-2">{t("Ləğv et")}</button>
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button onClick={onRenew}>{sub.status === "active" ? t("Növbəti dövrü indi ödə") : t("Planı yenilə")}</Button>
          {sub.status !== "expired" && <Button variant="outline" onClick={onPack}>{t("Əlavə paket al")}</Button>}
        </div>
      </CardContent>
    </Card>
  );
}

function MissingFeatures({ from, to }: { from: Plan; to: Plan }) {
  const L = usePlanLabels();
  const lost = (Object.keys(from.features) as (keyof Plan["features"])[]).filter((k) => from.features[k] && !to.features[k]);
  if (!lost.length && to.replies >= from.replies) return null;
  return (
    <ul className="mt-3 flex flex-col gap-1.5 text-sm">
      {to.replies < from.replies && <li className="flex gap-2"><X size={16} aria-hidden className="mt-0.5 shrink-0 text-muted-foreground" />{L.repliesShort(to.replies)}</li>}
      {lost.map((k) => <li key={k} className="flex gap-2"><X size={16} aria-hidden className="mt-0.5 shrink-0 text-muted-foreground" />{L.feature[k]}</li>)}
    </ul>
  );
}

/** Sifariş: əvvəl serverdən qiymət alınır, şərtlər qəbul olunur, sonra sorğu göndərilir */
function OrderModal({ input, plans, onClose, onDone }: { input: OrderInput | null; plans: Plan[]; onClose: () => void; onDone: () => void }) {
  const { t, num } = useI18n();
  const L = usePlanLabels();
  const [q, setQ] = useState<OrderQuote | null>(null);
  const [err, setErr] = useState("");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<{ instructions?: string } | null>(null);
  useEffect(() => {
    setQ(null); setErr(""); setAgree(false); setInfo(null);
    if (input) quoteOrder(input).then((r) => setQ(r.quote)).catch((e: Error) => setErr(e.message));
  }, [input]);
  const plan = plans.find((p) => p.id === q?.plan);
  async function submit() {
    if (!input || !agree) return;
    setBusy(true);
    try {
      const r = await placeOrder(input);
      if (r.checkoutUrl) { window.location.href = r.checkoutUrl; return; }
      setInfo({ instructions: r.instructions });
      toast.success(t("Sifariş göndərildi."));
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  const title = q?.kind === "pack" ? t("Əlavə paket") : q?.type === "upgrade" ? t("{p} planına yüksəlt", { p: plan?.name ?? "" }) : q?.type === "renew" ? t("Planı yenilə") : plan ? t("{p} planı", { p: plan.name }) : t("Sifariş");
  return (
    <Modal open={Boolean(input)} onClose={info ? onDone : onClose} size="sm" busy={busy} title={title}
      footer={info ? <Button onClick={onDone}>{t("Bağla")}</Button> : <><Button variant="outline" onClick={onClose} disabled={busy}>{t("Ləğv et")}</Button><Button onClick={submit} disabled={!q || !agree || busy}>{q ? t("{a} ödə", { a: azn(q.amountAzn) }) : t("Ödə")}</Button></>}>
      {err && <p role="alert" className="text-sm text-destructive">{err}</p>}
      {!q && !err && <p className="text-sm text-muted-foreground">{t("Qiymət hesablanır…")}</p>}
      {q && !info && (
        <div className="flex flex-col gap-4 text-sm">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
            {q.kind === "pack" ? (<><dt className="text-muted-foreground">{t("Paket")}</dt><dd>+{num(q.replies ?? 0)} {t("cavab")}</dd></>) : (<>
              <dt className="text-muted-foreground">{t("Plan")}</dt><dd>{plan?.name}</dd>
              <dt className="text-muted-foreground">{t("Limit")}</dt><dd>{plan ? L.repliesShort(plan.replies) : ""}</dd>
            </>)}
            <dt className="text-muted-foreground">{t("Məbləğ")}</dt><dd className="font-semibold tabular-nums">{azn(q.amountAzn)}</dd>
          </dl>
          <p className="text-muted-foreground">
            {q.kind === "pack" ? t("Cavablar dərhal əlavə olunur və plan limiti dolandan sonra işlənir.")
              : q.type === "upgrade" ? t("Qalan günlər üçün yalnız fərqi ödəyirsən. Yeni limit və imkanlar dərhal açılır, dövrün bitmə tarixi dəyişmir.")
              : q.type === "renew" ? t("Yeni dövr cari dövrün bitdiyi gündən başlayır: heç bir gün itmir.")
              : t("Plan ödəniş təsdiqlənən kimi aktivləşir.")}
          </p>
          <label className="flex cursor-pointer items-start gap-2">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 size-4 shrink-0 accent-foreground" />
            <span>{t("Başa düşürəm: ödənilmiş dövr geri qaytarılmır; plan avtomatik uzanmır, yeniləməsəm dövrün sonunda dayanır.")} <Link href="/legal/refund" target="_blank" className="font-medium underline underline-offset-2">{t("Qaydalar")}</Link></span>
          </label>
        </div>
      )}
      {info && (
        <div role="status" className="flex flex-col gap-2 text-sm">
          <p className="flex items-center gap-2 font-medium"><Check size={16} aria-hidden className="text-emerald-600" />{t("Sifariş qəbul olundu.")}</p>
          {info.instructions ? <p className="whitespace-pre-line text-muted-foreground">{info.instructions}</p> : <p className="text-muted-foreground">{t("Ödəniş təsdiqlənən kimi plan aktivləşəcək və e-poçtla xəbər verəcəyik.")}</p>}
        </div>
      )}
    </Modal>
  );
}

export default function BillingPage() { return <RequireTenant><Body /></RequireTenant>; }
