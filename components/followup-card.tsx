"use client";
import { useEffect, useState } from "react";
import { BellRing } from "lucide-react";
import { toast } from "sonner";
import { getFollowup, saveFollowup, type FollowupSettings } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { SwitchRow } from "@/components/ui/switch";

/** Telegram/WhatsApp: AI cavab verib, müştəri susubsa seçilən müddətdən sonra bir dəfə yumşaq xatırlatma */
export function FollowupCard() {
  const { t } = useI18n();
  const [f, setF] = useState<FollowupSettings | null>(null);
  const [delays, setDelays] = useState<number[]>([30, 60, 120, 240, 720]);
  const [saved, setSaved] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { getFollowup().then((r) => { setF(r.followup); setDelays(r.delays); setSaved(JSON.stringify(r.followup)); }).catch(() => setF(null)); }, []);
  if (!f) return null;
  const label = (m: number) => (m < 60 ? t("{n} dəqiqə", { n: m }) : t("{n} saat", { n: m / 60 }));
  const dirty = JSON.stringify(f) !== saved;
  async function save(next: FollowupSettings) {
    setBusy(true);
    try { const r = await saveFollowup({ ...next, ...(next.text?.trim() ? { text: next.text.trim() } : { text: undefined }) }); setF(r.followup); setSaved(JSON.stringify(r.followup)); toast.success(t("Saxlandı.")); }
    catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><BellRing size={18} aria-hidden />{t("Susan müştəriyə xatırlatma")}</CardTitle>
        <CardDescription>{t("Müştəri sual verib, cavab aldıqdan sonra yazmırsa, bot bir dəfə yumşaq xatırladır. Müştəri “sağ ol”, “tamam” yazıbsa, operatorla yazışırsa və ya 23 saatdan çox keçibsə göndərilmir.")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <SwitchRow checked={f.enabled} onChange={(v) => save({ ...f, enabled: v })} title={t("Xatırlatma göndər")} description={t("Telegram və WhatsApp-da işləyir.")} on={t("Aktiv")} off={t("Söndürülüb")} />
        <div className="grid gap-4 sm:grid-cols-[12rem_1fr]">
          <div className="flex flex-col gap-1">
            <Label htmlFor="fu-delay">{t("Nə qədər sonra")}</Label>
            <select id="fu-delay" value={f.delayMin} disabled={busy} onChange={(e) => setF({ ...f, delayMin: Number(e.target.value) })} className="h-10 rounded-md border border-border bg-card px-2 text-sm">
              {delays.map((m) => <option key={m} value={m}>{label(m)}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="fu-text">{t("Mətn (boş qalsa müştərinin dilində standart mətn)")}</Label>
            <Input id="fu-text" value={f.text ?? ""} maxLength={300} disabled={busy} onChange={(e) => setF({ ...f, text: e.target.value })} placeholder={t("Sualınız qaldımı? Kömək lazım olsa yazın, məmnuniyyətlə cavab verərəm 🙂")} />
          </div>
        </div>
        {dirty && <div><Button onClick={() => save(f)} disabled={busy}>{busy ? t("Saxlanır…") : t("Saxla")}</Button></div>}
      </CardContent>
    </Card>
  );
}
