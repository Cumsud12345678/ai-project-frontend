"use client";
import { useCallback, useEffect, useState } from "react";
import { adminAudit, type AuditItem } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { FilterPills, PageHeader } from "@/components/page-header";
import { Input, Label } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n";

/** Adminlərin etdiyi dəyişikliklərin izi: kim, nə vaxt, nəyi. Süzgəc və səhifələmə serverdə. */
export default function AdminAuditPage() {
  const { t, date } = useI18n();
  const [items, setItems] = useState<AuditItem[] | null>(null);
  const [next, setNext] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [action, setAction] = useState("");
  const [actor, setActor] = useState("");
  const [q, setQ] = useState("");
  const [applied, setApplied] = useState({ action: "", actor: "", q: "" });

  const names: Record<string, string> = {
    "tenant.rotate_key": t("Müştəri açarı yeniləndi"), "billing.approve": t("Yükləmə sorğusu təsdiqləndi"), "billing.reject": t("Yükləmə sorğusu rədd edildi"),
    "billing.topup": t("Balans dəyişdirildi"), "billing.settings": t("Balans ayarları dəyişdi"), "user.role": t("İstifadəçi rolu dəyişdi"), "user.delete": t("İstifadəçi silindi"),
    "errors.clear": t("Xəta jurnalı təmizləndi"), "errors.delete_group": t("Xəta qrupu silindi"), "announcement.set": t("Elan yayımlandı"), "announcement.hide": t("Elan gizlədildi"),
    "announcement.delete": t("Elan silindi"), "users.export": t("İstifadəçi siyahısı yükləndi"),
    "tenant.suspend": t("Müştəri dayandırıldı"), "tenant.unsuspend": t("Müştəri bərpa olundu"), "user.revoke_sessions": t("İstifadəçi cihazlardan çıxarıldı"), "user.reset_2fa": t("2FA sıfırlandı"),
    "branding.set": t("Brend yazısı dəyişdi"), "alerts.settings": t("Xəbərdarlıq ayarları dəyişdi"), "ai.pause": t("AI dayandırıldı"), "ai.resume": t("AI yenidən açıldı"), "payments.export": t("Ödənişlər yükləndi"),
    "partner.create": t("Partnyor əlavə olundu"), "partner.update": t("Partnyor dəyişdi"), "partner.payout": t("Partnyora ödəniş"), "partner.adjust": t("Partnyor balansı düzəldildi"),
    "partner.attach": t("Müştəri partnyora bağlandı"), "partner.detach": t("Müştəri partnyordan ayrıldı"), "partner.settings": t("Partnyor qaydaları dəyişdi"),
  };
  const groups: [string, string][] = [["", t("Hamısı")], ["billing", t("Balans")], ["tenant", t("Müştəri")], ["user", t("İstifadəçi")], ["ai", "AI"], ["partner", t("Partnyor")], ["alerts", t("Xəbərdarlıq")], ["announcement", t("Elan")], ["errors", t("Xətalar")]];

  const load = useCallback(async (before?: string) => {
    setBusy(true);
    try {
      const r = await adminAudit({ ...applied, ...(before && { before }) });
      setItems((cur) => (before && cur ? [...cur, ...r.items] : r.items));
      setNext(r.nextBefore);
      setError("");
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }, [applied]);
  useEffect(() => { setItems(null); void load(); }, [load]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("Audit jurnalı")} description={t("Adminlərin etdiyi dəyişikliklər. Qeydlər 1 il saxlanır.")} />

      <FilterPills value={action} onChange={(v) => { setAction(v); setApplied((a) => ({ ...a, action: v })); }} label={t("Əməliyyat")} items={groups.map(([v, l]) => ({ value: v, label: l }))} />

      <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); setApplied({ action, actor: actor.trim(), q: q.trim() }); }}>
        <div className="flex flex-col gap-1"><Label htmlFor="au-actor">{t("Admin")}</Label><Input id="au-actor" value={actor} onChange={(e) => setActor(e.target.value)} placeholder="boss@…" className="w-48" /></div>
        <div className="flex flex-col gap-1"><Label htmlFor="au-q">{t("Hədəf və ya təfərrüat")}</Label><Input id="au-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("müştəri ID, e-poçt, məbləğ…")} className="w-64" /></div>
        <Button variant="outline">{t("Axtar")}</Button>
        {(applied.actor || applied.q) && <Button type="button" variant="ghost" onClick={() => { setActor(""); setQ(""); setApplied((a) => ({ ...a, actor: "", q: "" })); }}>{t("Sıfırla")}</Button>}
      </form>

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {!items && !error && <Skeleton className="h-48" />}
      {items?.length === 0 && <p className="rounded-2xl border border-dashed border-border px-6 py-8 text-center text-sm text-muted-foreground">{applied.action || applied.actor || applied.q ? t("Süzgəcə uyğun qeyd yoxdur.") : t("Hələ qeyd yoxdur.")}</p>}
      {items && items.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[680px] text-sm">
            <thead><tr className="border-b border-border text-left text-xs text-muted-foreground"><th className="px-4 py-3 font-medium">{t("Vaxt")}</th><th className="px-4 py-3 font-medium">{t("Admin")}</th><th className="px-4 py-3 font-medium">{t("Əməliyyat")}</th><th className="px-4 py-3 font-medium">{t("Hədəf")}</th></tr></thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id} className="border-b border-border last:border-0 align-top">
                  <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">{date(i.at)}</td>
                  <td className="px-3 py-2.5">{i.actor}</td>
                  <td className="px-4 py-3 font-medium">{names[i.action] ?? i.action}</td>
                  <td className="px-3 py-2.5 text-muted-foreground"><span className="font-mono text-xs break-all">{i.target ?? ""}</span>{i.detail && <span className="block text-xs">{i.detail}</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {next && <div><Button variant="outline" disabled={busy} onClick={() => load(next)}>{busy ? t("Yüklənir…") : t("Daha çox göstər")}</Button></div>}
    </div>
  );
}
