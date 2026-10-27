"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Bug, CircleCheck, CircleX, Coins, Hourglass, MessagesSquare, RefreshCw, UserPlus, Users, Store } from "lucide-react";
import { adminHealth, adminOverview, type AdminHealth, type AdminOverview } from "@/lib/api";
import { AdminUsage } from "@/components/admin-usage";
import { TrendChart, compact } from "@/components/charts";
import { StatTile } from "@/components/stat-tile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

function Health() {
  const { t, num } = useI18n();
  const [h, setH] = useState<AdminHealth | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => { setBusy(true); try { setH(await adminHealth()); } catch { setH(null); } finally { setBusy(false); } }, []);
  useEffect(() => { void load(); }, [load]);
  const up = (s: number) => (s >= 86400 ? t("{n} gün", { n: Math.floor(s / 86400) }) : s >= 3600 ? t("{n} saat", { n: Math.floor(s / 3600) }) : t("{n} dəq", { n: Math.max(1, Math.floor(s / 60)) }));
  const Row = ({ label, ok, detail }: { label: string; ok: boolean; detail: string }) => (
    <li className="flex items-center gap-3 py-2.5 text-sm">
      {ok ? <CircleCheck size={18} className="shrink-0 text-chart-2" aria-hidden /> : <CircleX size={18} className="shrink-0 text-destructive" aria-hidden />}
      <span className="flex-1 font-medium">{label}</span>
      <span className={cn("text-xs tabular-nums", ok ? "text-muted-foreground" : "text-destructive")}>{detail}</span>
    </li>
  );
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>{t("Sistem vəziyyəti")}</CardTitle>
        <Button size="sm" variant="outline" onClick={load} disabled={busy} aria-label={t("Yenilə")}><RefreshCw size={14} className={busy ? "animate-spin" : ""} aria-hidden /></Button>
      </CardHeader>
      <CardContent className="py-1">
        {!h ? <Skeleton className="my-3 h-24" /> : (
          <ul className="divide-y divide-border">
            <Row label={t("Verilənlər bazası")} ok={h.database.ok} detail={h.database.ok ? `${h.database.ms} ms` : h.database.error ?? t("Xəta")} />
            <Row label={t("AI servisi")} ok={h.ai.ok} detail={h.ai.ok ? `${h.ai.ms} ms` : h.ai.error ?? t("Xəta")} />
            <Row label={t("E-poçt (Resend)")} ok={h.mail.configured || !h.server.production} detail={h.mail.configured ? t("qoşulub") : t("açar yoxdur, konsola yazılır")} />
            <Row label={t("Server")} ok detail={`${t("işləyir")}: ${up(h.server.uptimeSec)} · ${num(h.server.memoryMb)} MB · ${h.server.node}`} />
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminOverviewPage() {
  const { t, num } = useI18n();
  const [o, setO] = useState<AdminOverview | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { adminOverview().then(setO).catch((e: Error) => setError(e.message)); }, []);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold">{t("Ümumi baxış")}</h1>
        <p className="text-sm text-muted-foreground">{t("Müştərilər, istifadə, gəlir və sistemin sağlamlığı bir yerdə.")}</p>
      </header>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

      {o && o.pendingTopups > 0 && (
        <Link href="/admin/users" className="flex items-center gap-3 rounded-xl border border-amber/40 bg-amber/10 px-4 py-3 text-sm hover:bg-amber/15">
          <Hourglass size={18} className="text-amber" aria-hidden />
          <span className="flex-1"><strong>{t("{n} yükləmə sorğusu təsdiq gözləyir", { n: o.pendingTopups })}</strong></span>
          <span className="text-primary">{t("Bax")} →</span>
        </Link>
      )}

      {!o && !error ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /></div> : o && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <StatTile icon={Users} tone={1} label={t("İstifadəçilər")} value={num(o.users.total)} hint={`${num(o.users.verified)} ${t("təsdiqli")} · ${num(o.users.admins)} ${t("admin")}`} />
          <StatTile icon={UserPlus} tone={4} label={t("Yeni qeydiyyat")} value={<>{num(o.users.last7d)} <span className="text-sm font-normal text-muted-foreground">{t("7 gündə")}</span></>} hint={`${num(o.users.last30d)} ${t("30 gündə")}`} />
          <StatTile icon={Store} tone={2} label={t("Müştəri saytları")} value={num(o.tenants.total)} hint={`${num(o.tenants.widgetActive7d)} ${t("vidjet son 7 gündə aktiv")}${o.tenants.emptyBalance ? ` · ${num(o.tenants.emptyBalance)} ${t("balansı bitib")}` : ""}`} />
          <StatTile icon={MessagesSquare} tone={1} label={t("Bu ay sorğu")} value={o.usage ? num(o.usage.thisMonth.requests) : "–"} hint={o.usage ? `${compact(o.usage.thisMonth.tokens, t)} ${t("token")} · ${t("bu gün")} ${num(o.usage.today.requests)}` : t("AI servisi cavab vermir")} />
          <StatTile icon={Coins} tone={3} label={t("Yüklənmiş balans (cəmi)")} value={<>{num(o.revenueAzn)} <span className="text-sm font-normal text-muted-foreground">AZN</span></>} />
          <Link href="/admin/errors" className="block rounded-xl focus-visible:outline-2 focus-visible:outline-primary">
            <StatTile icon={Bug} tone={5} label={t("Xətalar (24 saat)")} value={num(o.errors.last24h)} hint={`${num(o.errors.last7d)} ${t("son 7 gündə")}`} />
          </Link>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader><CardTitle>{t("Yeni qeydiyyatlar")}</CardTitle><CardDescription>{t("Son 30 gün, günlər UTC ilə.")}</CardDescription></CardHeader>
          <CardContent className="pt-5">
            {o ? <TrendChart data={o.signups.map((d) => ({ label: `${d.date.slice(8, 10)}.${d.date.slice(5, 7)}`, title: d.date, value: d.users }))} unit={t("hesab")} color="var(--chart-4)" kind="bar" height={220} fmt={num} tick={(n) => String(n)} /> : <Skeleton className="h-[220px]" />}
          </CardContent>
        </Card>
        <Health />
      </div>

      {o && o.topTenants.length > 0 && (
        <Card>
          <CardHeader><CardTitle>{t("Bu ay ən aktiv saytlar")}</CardTitle></CardHeader>
          <CardContent className="py-2">
            <ol className="divide-y divide-border">
              {o.topTenants.map((r, i) => (
                <li key={r.tenantId} className="flex items-center gap-3 py-2.5 text-sm">
                  <span className="grid size-6 place-items-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">{i + 1}</span>
                  <span className="flex-1 truncate font-medium">{r.businessName === "(silinib)" ? t("(silinib)") : r.businessName}</span>
                  <span className="tabular-nums text-muted-foreground">{num(r.requests)} {t("sorğu")}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      <AdminUsage />
    </div>
  );
}
