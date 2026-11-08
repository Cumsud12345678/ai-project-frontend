"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, MessageCircle, RefreshCw, Send, Smartphone } from "lucide-react";
import { adminChannels, type ChannelRow, type WhatsAppState } from "@/lib/api";
import { StatTile } from "@/components/stat-tile";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FilterPills, PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Data = Awaited<ReturnType<typeof adminChannels>>;

/** Bütün müştərilər üzrə Telegram və WhatsApp vəziyyəti: qırılan bağlantılar, xətalar, son söhbət. */
export default function AdminChannelsPage() {
  const { t, short } = useI18n();
  const [d, setD] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<"problems" | "all" | "telegram" | "whatsapp">("problems");
  const load = useCallback(async () => {
    setBusy(true);
    try { setD(await adminChannels()); setError(""); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const waLabel: Record<WhatsAppState, [string, string]> = {
    open: [t("qoşulub"), "bg-muted text-foreground"], connecting: [t("qoşulur"), "bg-amber/15 text-amber"], qr: [t("QR gözləyir"), "bg-amber/15 text-amber"],
    error: [t("qırılıb"), "bg-destructive/10 text-destructive"], replaced: [t("başqa yerdə açılıb"), "bg-destructive/10 text-destructive"], off: [t("işləmir"), "bg-destructive/10 text-destructive"],
  };
  const problemText: Record<ChannelRow["problems"][number], string> = {
    wa_down: t("WhatsApp bağlantısı yoxdur"), wa_connecting: t("WhatsApp yenidən qoşulur"), errors: t("24 saatda çox xəta"), suspended: t("hesab dayandırılıb"),
  };
  const ago = (iso: string | null) => (iso ? short(iso) : t("hələ söhbət yoxdur"));
  const pick = { problems: (r: ChannelRow) => r.problems.some((p) => p !== "suspended"), all: () => true, telegram: (r: ChannelRow) => Boolean(r.telegram), whatsapp: (r: ChannelRow) => Boolean(r.whatsapp) };
  const rows = d ? d.rows.filter(pick[view]) : [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("Kanallar")} description={t("Müştərilərin Telegram botları və WhatsApp nömrələri: hansı işləyir, hansı qırılıb.")}
        actions={<Button variant="outline" onClick={load} disabled={busy}><RefreshCw size={16} className={busy ? "animate-spin" : ""} aria-hidden />{t("Yenilə")}</Button>} />
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

      {!d && !error ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}</div> : d && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile icon={Send} tone={1} label="Telegram" value={d.summary.telegram} hint={t("qoşulmuş bot")} />
          <StatTile icon={Smartphone} tone={2} label="WhatsApp" value={<>{d.summary.waOpen} <span className="text-sm font-normal text-muted-foreground">/ {d.summary.whatsapp}</span></>} hint={t("hazırda qoşulu")} />
          <StatTile icon={AlertTriangle} tone={d.summary.problems ? 5 : 2} label={t("Problemli")} value={d.summary.problems} hint={t("diqqət tələb edir")} />
          <StatTile icon={MessageCircle} tone={3} label={t("WhatsApp tutumu")} value={<>{d.summary.waCapacity.used} <span className="text-sm font-normal text-muted-foreground">/ {d.summary.waCapacity.max}</span></>} hint={t("bir serverdə açıq sessiya")} />
        </div>
      )}

      {d && (
        <div className="flex flex-col gap-3">
          <FilterPills value={view} onChange={setView} label={t("Süzgəc")} items={[
            { value: "problems", label: t("Problemli"), count: d.rows.filter(pick.problems).length },
            { value: "all", label: t("Hamısı"), count: d.rows.length },
            { value: "telegram", label: "Telegram", count: d.rows.filter(pick.telegram).length },
            { value: "whatsapp", label: "WhatsApp", count: d.rows.filter(pick.whatsapp).length },
          ]} />
          {rows.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border px-6 py-8 text-center text-sm text-muted-foreground">{view === "problems" ? t("Problem yoxdur: bütün kanallar işləyir.") : t("Hələ heç bir müştəri Telegram və ya WhatsApp qoşmayıb.")}</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-border bg-card">
              <table className="w-full min-w-[820px] text-sm">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr className="border-b border-border"><th className="px-5 py-3 font-medium">{t("Müştəri")}</th><th className="px-3 py-2.5 font-medium">Telegram</th><th className="px-3 py-2.5 font-medium">WhatsApp</th><th className="px-3 py-2.5 text-right font-medium">{t("Xəta (24 saat)")}</th><th className="px-5 py-2.5 font-medium">{t("Problem")}</th></tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.tenantId} className="border-b border-border last:border-0 align-top">
                      <td className="max-w-[14rem] px-5 py-3">
                        <Link href={`/admin/users?q=${encodeURIComponent(r.tenantId)}`} className="block truncate font-medium hover:underline">{r.businessName}</Link>
                        <span className="block truncate text-xs text-muted-foreground">{r.domain} · {r.email}</span>
                      </td>
                      <td className="px-3 py-3">
                        {r.telegram ? <>
                          <span className="flex items-center gap-1.5"><span className="font-mono text-xs">@{r.telegram.bot}</span>{!r.telegram.enabled && <Badge>{t("söndürülüb")}</Badge>}</span>
                          <span className={cn("block text-xs", r.telegram.idle ? "text-amber" : "text-muted-foreground")}>{t("son söhbət:")} {ago(r.telegram.lastAt)}</span>
                        </> : <span className="text-muted-foreground">–</span>}
                      </td>
                      <td className="px-3 py-3">
                        {r.whatsapp ? <>
                          <span className="flex flex-wrap items-center gap-1.5"><span className="font-mono text-xs">{r.whatsapp.phone ?? "—"}</span><Badge className={waLabel[r.whatsapp.state][1]}>{waLabel[r.whatsapp.state][0]}</Badge>{!r.whatsapp.enabled && <Badge>{t("söndürülüb")}</Badge>}</span>
                          {r.whatsapp.error && <span className="block text-xs text-destructive">{r.whatsapp.error}</span>}
                          <span className={cn("block text-xs", r.whatsapp.idle ? "text-amber" : "text-muted-foreground")}>{t("son söhbət:")} {ago(r.whatsapp.lastAt)}</span>
                        </> : <span className="text-muted-foreground">–</span>}
                      </td>
                      <td className={cn("px-3 py-3 text-right tabular-nums", r.errors24h >= 5 ? "font-semibold text-destructive" : "text-muted-foreground")}>
                        {r.errors24h > 0 ? <Link href="/admin/errors" className="hover:underline">{r.errors24h}</Link> : 0}
                      </td>
                      <td className="px-5 py-3">
                        {r.problems.length === 0 ? <span className="text-xs text-muted-foreground">{t("hər şey qaydasındadır")}</span> : (
                          <ul className="flex flex-col gap-0.5 text-xs">{r.problems.map((p) => <li key={p} className={p === "suspended" ? "text-muted-foreground" : "text-destructive"}>{problemText[p]}</li>)}</ul>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-xs text-muted-foreground">{t("WhatsApp qırılanda müştəri paneldən QR ilə yenidən qoşmalıdır. 7 gündən çox söhbət olmayan kanal sarı ilə göstərilir.")}</p>
        </div>
      )}
    </div>
  );
}
