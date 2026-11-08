"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Ban, Bug, ChevronRight, CircleCheck, CircleX, Coins, Hourglass, MailWarning, MessagesSquare, PauseCircle, RefreshCw, Store, UserPlus, Users, WalletCards } from "lucide-react";
import { adminHealth, adminOverview, type AdminHealth, type AdminOverview } from "@/lib/api";
import { AdminUsage } from "@/components/admin-usage";
import { TrendChart, compact } from "@/components/charts";
import { FilterPills, PageHeader } from "@/components/page-header";
import { StatTile } from "@/components/stat-tile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

function Health({ h, busy }: { h: AdminHealth | null; busy: boolean }) {
  const { t, num } = useI18n();
  const up = (s: number) => (s >= 86400 ? t("{n} gün", { n: Math.floor(s / 86400) }) : s >= 3600 ? t("{n} saat", { n: Math.floor(s / 3600) }) : t("{n} dəq", { n: Math.max(1, Math.floor(s / 60)) }));
  const Row = ({ label, ok, detail }: { label: string; ok: boolean; detail: string }) => (
    <li className="flex items-center gap-3 py-2.5 text-sm">
      {ok ? <CircleCheck size={18} className="shrink-0 text-emerald-600" aria-hidden /> : <CircleX size={18} className="shrink-0 text-destructive" aria-hidden />}
      <span className="flex-1 font-medium">{label}</span>
      <span className={cn("text-xs tabular-nums", ok ? "text-muted-foreground" : "text-destructive")}>{detail}</span>
    </li>
  );
  return (
    <Card>
      <CardHeader><CardTitle>{t("Sistem vəziyyəti")}</CardTitle></CardHeader>
      <CardContent className="py-1">
        {!h || busy ? <Skeleton className="my-3 h-32" /> : (
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

/** Admindən iş tələb edən hər şey bir siyahıda: hər sətir müvafiq səhifəyə aparır */
function Attention({ o, h }: { o: AdminOverview; h: AdminHealth | null }) {
  const { t, num } = useI18n();
  const items = [
    o.aiControl?.paused && { icon: PauseCircle, tone: "red", title: t("AI bütün müştərilər üçün dayandırılıb"), note: o.aiControl.reason ?? "", href: "/admin/settings" },
    h && (!h.database.ok || !h.ai.ok) && { icon: CircleX, tone: "red", title: t("Sistemdə nasazlıq var"), note: [!h.database.ok && t("Verilənlər bazası"), !h.ai.ok && t("AI servisi")].filter(Boolean).join(" · "), href: "/admin/errors" },
    o.pendingTopups > 0 && { icon: Hourglass, tone: "amber", title: t("{n} yükləmə sorğusu təsdiq gözləyir", { n: o.pendingTopups }), note: t("Müştəri pulu köçürüb, balans hələ artırılmayıb."), href: "/admin/payments" },
    o.errors.last24h > 0 && { icon: Bug, tone: "amber", title: t("Son 24 saatda {n} xəta", { n: num(o.errors.last24h) }), note: t("Təkrarlanan xətalar qruplaşdırılıb."), href: "/admin/errors" },
    o.tenants.emptyBalance > 0 && { icon: WalletCards, tone: "muted", title: t("{n} saytın balansı bitib", { n: num(o.tenants.emptyBalance) }), note: t("Köməkçi bu saytlarda cavab vermir; xəbərdarlıq etmək olar."), href: "/admin/users?f=lowbal" },
    o.users.total - o.users.verified > 0 && { icon: MailWarning, tone: "muted", title: t("{n} hesab e-poçtunu təsdiqləməyib", { n: num(o.users.total - o.users.verified) }), note: t("Qeydiyyatdan keçib, amma məktubdakı linkə klikləməyib."), href: "/admin/users?f=unverified" },
    (o.tenants.suspended ?? 0) > 0 && { icon: Ban, tone: "muted", title: t("{n} sayt dayandırılıb", { n: num(o.tenants.suspended ?? 0) }), note: t("Səbəb və bərpa İstifadəçilər bölməsindədir."), href: "/admin/users?f=suspended" },
  ].filter(Boolean) as { icon: typeof Bug; tone: "red" | "amber" | "muted"; title: string; note: string; href: string }[];
  return (
    <section className="flex flex-col gap-3">
      <h2 className="flex items-center gap-2 font-semibold">{t("Diqqət tələb edir")} <span className="rounded-full bg-muted px-2 text-xs tabular-nums text-muted-foreground">{items.length}</span></h2>
      {items.length === 0 ? (
        <p className="flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground"><CircleCheck size={16} className="text-emerald-600" aria-hidden />{t("Hər şey qaydasındadır.")}</p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {items.map((i) => (
            <li key={i.title}>
              <Link href={i.href} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40">
                <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg", i.tone === "red" ? "bg-destructive/10 text-destructive" : i.tone === "amber" ? "bg-amber/15 text-amber" : "bg-muted text-foreground")}><i.icon size={16} aria-hidden /></span>
                <span className="min-w-0 flex-1"><span className="block text-sm font-medium">{i.title}</span>{i.note && <span className="block truncate text-xs text-muted-foreground">{i.note}</span>}</span>
                <ChevronRight size={16} aria-hidden className="text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function AdminOverviewPage() {
  const { t, num } = useI18n();
  const [o, setO] = useState<AdminOverview | null>(null);
  const [h, setH] = useState<AdminHealth | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"main" | "usage">("main");
  const load = useCallback(async () => {
    setBusy(true);
    await Promise.all([adminOverview().then((r) => { setO(r); setError(""); }).catch((e: Error) => setError(e.message)), adminHealth().then(setH).catch(() => setH(null))]);
    setBusy(false);
  }, []);
  useEffect(() => { void load(); }, [load]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("Ümumi baxış")} description={t("Müştərilər, istifadə, gəlir və sistemin sağlamlığı bir yerdə.")}
        actions={<Button variant="outline" onClick={() => void load()} disabled={busy}><RefreshCw size={16} className={busy ? "animate-spin" : ""} aria-hidden />{t("Yenilə")}</Button>} />
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

      <FilterPills value={tab} onChange={setTab} label={t("Ümumi baxış")} items={[{ value: "main", label: t("Vəziyyət") }, { value: "usage", label: t("AI istifadəsi") }]} />

      {tab === "usage" ? <AdminUsage /> : (
        <>
          {!o && !error ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-24" />)}</div> : o && (
            <>
              <Attention o={o} h={h} />
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Link href="/admin/users" className="block rounded-2xl hover:ring-1 hover:ring-foreground/20"><StatTile icon={Users} label={t("İstifadəçilər")} value={num(o.users.total)} hint={`${num(o.users.verified)} ${t("təsdiqli")} · ${num(o.users.admins)} ${t("admin")}`} /></Link>
                <StatTile icon={UserPlus} label={t("Yeni qeydiyyat")} value={<>{num(o.users.last7d)} <span className="text-sm font-normal text-muted-foreground">{t("7 gündə")}</span></>} hint={`${num(o.users.last30d)} ${t("30 gündə")}`} />
                <Link href="/admin/users?f=tenants" className="block rounded-2xl hover:ring-1 hover:ring-foreground/20"><StatTile icon={Store} label={t("Müştəri saytları")} value={num(o.tenants.total)} hint={`${num(o.tenants.widgetActive7d)} ${t("vidjet son 7 gündə aktiv")}`} /></Link>
                <StatTile icon={MessagesSquare} label={t("Bu ay sorğu")} value={o.usage ? num(o.usage.thisMonth.requests) : "–"} hint={o.usage ? `${compact(o.usage.thisMonth.tokens, t)} ${t("token")} · ${t("bu gün")} ${num(o.usage.today.requests)}` : t("AI servisi cavab vermir")} />
                <Link href="/admin/finance" className="block rounded-2xl hover:ring-1 hover:ring-foreground/20">
                  <StatTile icon={Coins} label={t("Daxil olan pul (cəmi)")}
                    value={o.revenueAzn == null ? "–" : <>{num(o.revenueAzn)} <span className="text-sm font-normal text-muted-foreground">AZN</span></>}
                    hint={o.revenueAzn == null ? t("AI servisi cavab vermir") : `${t("bu ay")} ${num(o.revenueMonthAzn ?? 0)} · ${t("mənfəət")} ${num(o.monthProfitAzn ?? 0)} AZN`} />
                </Link>
                <Link href="/admin/errors" className="block rounded-2xl hover:ring-1 hover:ring-foreground/20"><StatTile icon={Bug} label={t("Xətalar (24 saat)")} value={num(o.errors.last24h)} hint={`${num(o.errors.last7d)} ${t("son 7 gündə")}`} /></Link>
              </div>
            </>
          )}

          <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
            <Card>
              <CardHeader><CardTitle>{t("Yeni qeydiyyatlar")}</CardTitle><CardDescription>{t("Son 30 gün, günlər UTC ilə.")}</CardDescription></CardHeader>
              <CardContent className="pt-5">
                {o ? <TrendChart data={o.signups.map((d) => ({ label: `${d.date.slice(8, 10)}.${d.date.slice(5, 7)}`, title: d.date, value: d.users }))} unit={t("hesab")} color="var(--foreground)" kind="bar" height={220} fmt={num} tick={(n) => String(n)} /> : <Skeleton className="h-[220px]" />}
              </CardContent>
            </Card>
            <Health h={h} busy={busy && !h} />
          </div>

          {o && o.topTenants.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="font-semibold">{t("Bu ay ən aktiv saytlar")}</h2>
              <div className="overflow-x-auto rounded-2xl border border-border bg-card">
                <table className="w-full text-sm">
                  <thead className="border-b border-border text-left text-xs text-muted-foreground"><tr><th className="w-12 px-4 py-3 font-medium">#</th><th className="px-4 py-3 font-medium">{t("Sayt")}</th><th className="px-4 py-3 text-right font-medium">{t("Sorğu")}</th><th className="px-4 py-3 text-right font-medium">{t("Token")}</th></tr></thead>
                  <tbody className="divide-y divide-border tabular-nums">
                    {o.topTenants.map((r, i) => (
                      <tr key={r.tenantId}>
                        <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                        <td className="px-4 py-3 font-medium">{r.businessName === "(silinib)" ? t("(silinib)") : <Link href={`/admin/users?q=${encodeURIComponent(r.tenantId)}`} className="hover:underline">{r.businessName}</Link>}</td>
                        <td className="px-4 py-3 text-right">{num(r.requests)}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{compact(r.tokens, t)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
