"use client";
import { useEffect, useState } from "react";
import { Headset } from "lucide-react";
import { toast } from "sonner";
import { getHandoff, saveHandoff, type HandoffSettings } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SwitchRow } from "@/components/ui/switch";

/** Ağıllı operator çağırışı: AI hansı hallarda söhbəti özü operatora ötürsün (sayt, Telegram, WhatsApp) */
export function HandoffCard() {
  const { t } = useI18n();
  const [h, setH] = useState<HandoffSettings | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { getHandoff().then((r) => setH(r.handoff)).catch(() => setH(null)); }, []);
  if (!h) return null;
  async function set(k: keyof HandoffSettings, v: boolean) {
    if (!h || busy) return;
    const prev = h, next = { ...h, [k]: v };
    setH(next); setBusy(true);
    try { setH((await saveHandoff(next)).handoff); toast.success(t("Saxlandı.")); }
    catch (e) { setH(prev); toast.error((e as Error).message); } finally { setBusy(false); }
  }
  const row = (k: keyof HandoffSettings, title: string, description: string) => (
    <SwitchRow checked={h[k]} onChange={(v) => set(k, v)} title={title} description={description} on={t("Aktiv")} off={t("Söndürülüb")} />
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Headset size={18} aria-hidden />{t("Ağıllı operator çağırışı")}</CardTitle>
        <CardDescription>{t("Müştəri operator istəyəndə AI həmişə ötürür. Aşağıdakı hallarda isə özü qərar verir. Operator işləyirsə söhbət canlı qutuya səbəb etiketi ilə düşür, işləmirsə bot “operator sizə yazacaq” deyir, əlaqəni alır və müraciət yaradır.")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {row("upset", t("😠 Müştəri narazı və ya əsəbidirsə"), t("Şikayət, “heç kim cavab vermir”, “pulumu qaytarın”. Müraciət yüksək prioritetlə yaranır."))}
        {row("ready", t("🔥 Almağa və ya ödəməyə hazırdırsa"), t("“Götürürəm”, “necə ödəyim”. Sifariş forması açıqdırsa AI əvvəl onu doldurur. Müraciət yüksək prioritetlə yaranır."))}
        {row("cantHelp", t("🤖 AI kömək edə bilmirsə"), t("Məlumat yoxdur və ya sual onun səlahiyyətindən kənardır."))}
        {row("misses", t("Ardıcıl 2 sual cavabsız qalsa"), t("Yalnız Telegram və WhatsApp-da işləyir."))}
      </CardContent>
    </Card>
  );
}
