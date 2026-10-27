"use client";
import { useEffect, useState } from "react";
import { adminAudit, type AuditItem } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n";

/** Adminlərin etdiyi dəyişikliklərin izi: kim, nə vaxt, nəyi. */
export default function AdminAuditPage() {
  const { t, date } = useI18n();
  const [items, setItems] = useState<AuditItem[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { adminAudit().then((r) => setItems(r.items)).catch((e: Error) => setError(e.message)); }, []);
  const names: Record<string, string> = {
    "tenant.rotate_key": t("Müştəri açarı yeniləndi"), "billing.approve": t("Yükləmə sorğusu təsdiqləndi"), "billing.reject": t("Yükləmə sorğusu rədd edildi"),
    "billing.topup": t("Balans dəyişdirildi"), "billing.settings": t("Balans ayarları dəyişdi"), "user.role": t("İstifadəçi rolu dəyişdi"), "user.delete": t("İstifadəçi silindi"),
    "errors.clear": t("Xəta jurnalı təmizləndi"), "errors.delete_group": t("Xəta qrupu silindi"), "announcement.set": t("Elan yayımlandı"), "announcement.hide": t("Elan gizlədildi"),
    "announcement.delete": t("Elan silindi"), "users.export": t("İstifadəçi siyahısı yükləndi"),
  };
  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-2xl font-semibold">{t("Audit jurnalı")}</h1>
        <p className="text-sm text-muted-foreground">{t("Adminlərin etdiyi son 200 dəyişiklik. Qeydlər 1 il saxlanır.")}</p>
      </header>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {!items && !error && <Skeleton className="h-48" />}
      {items?.length === 0 && <p className="text-sm text-muted-foreground">{t("Hələ qeyd yoxdur.")}</p>}
      {items && items.length > 0 && (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border text-left text-xs text-muted-foreground"><th className="px-4 py-2.5 font-normal">{t("Vaxt")}</th><th className="px-3 py-2.5 font-normal">{t("Admin")}</th><th className="px-3 py-2.5 font-normal">{t("Əməliyyat")}</th><th className="px-3 py-2.5 font-normal">{t("Hədəf")}</th></tr></thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id} className="border-b border-border last:border-0 align-top">
                  <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">{date(i.at)}</td>
                  <td className="px-3 py-2.5">{i.actor}</td>
                  <td className="px-3 py-2.5 font-medium">{names[i.action] ?? i.action}</td>
                  <td className="px-3 py-2.5 text-muted-foreground"><span className="font-mono text-xs break-all">{i.target ?? ""}</span>{i.detail && <span className="block text-xs">{i.detail}</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
