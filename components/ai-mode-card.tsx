"use client";
import { useEffect, useState } from "react";
import { Bot } from "lucide-react";
import { toast } from "sonner";
import { getAiMode, saveAiMode, type AiMode, type AiModes } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";

/** Kanal üzrə AI rejimi: avtomatik / qaralama (operator bir kliklə göndərir) / söndürülüb */
export function AiModeCard() {
  const { t } = useI18n();
  const [m, setM] = useState<AiModes | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { getAiMode().then((r) => setM(r.aiMode)).catch(() => setM(null)); }, []);
  if (!m) return null;
  const opts: { value: AiMode; label: string }[] = [{ value: "auto", label: t("AI cavab verir") }, { value: "draft", label: t("AI qaralama yazır") }, { value: "off", label: t("Yalnız operator") }];
  const hint: Record<AiMode, string> = {
    auto: t("AI müştəriyə özü cavab verir, lazım olanda operatora ötürür."),
    draft: t("AI müştəriyə yazmır: hər mesaj Müraciətlər → Canlı söhbətə düşür, AI cavab qaralaması hazırlayır, operator bir kliklə (və ya düzəldib) göndərir."),
    off: t("AI söndürülüb: bütün mesajlar Müraciətlər → Canlı söhbətə düşür, operator cavab verir."),
  };
  async function set(ch: keyof AiModes, v: AiMode) {
    if (!m || busy) return;
    const prev = m, next = { ...m, [ch]: v };
    setM(next); setBusy(true);
    try { setM((await saveAiMode(next)).aiMode); toast.success(t("Saxlandı.")); }
    catch (e) { setM(prev); toast.error((e as Error).message); } finally { setBusy(false); }
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Bot size={18} aria-hidden />{t("AI rejimi")}</CardTitle>
        <CardDescription>{t("AI-a hələ tam güvənmirsənsə, əvvəl qaralama rejimində başla: AI cavabı hazırlayır, sən baxıb göndərirsən.")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {(["telegram", "whatsapp"] as const).map((ch) => (
          <div key={ch} className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium">{ch === "telegram" ? "Telegram" : "WhatsApp"}</span>
              <Segmented value={m[ch]} onChange={(v) => set(ch, v)} options={opts} label={ch === "telegram" ? "Telegram" : "WhatsApp"} />
            </div>
            <p className="text-xs text-muted-foreground">{hint[m[ch]]}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
