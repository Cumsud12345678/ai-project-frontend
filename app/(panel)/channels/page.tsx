"use client";
import { useEffect, useState } from "react";
import { ExternalLink, Send, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { connectTelegram, disconnectTelegram, getTelegram, setTelegramEnabled, type TelegramStatus } from "@/lib/api";
import { RequireTenant } from "@/components/session";
import { FormSkeleton } from "@/components/skeletons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { SwitchRow } from "@/components/ui/switch";
import { useI18n } from "@/lib/i18n";
import { WhatsApp } from "./whatsapp";

function Telegram() {
  const { t, date } = useI18n();
  const [st, setSt] = useState<TelegramStatus | null>(null);
  const [error, setError] = useState("");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  useEffect(() => { getTelegram().then(setSt).catch((e: Error) => setError(e.message)); }, []);

  async function connect(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    try { setSt(await connectTelegram(token.trim())); setToken(""); toast.success(t("Telegram botu qoşuldu.")); }
    catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }
  async function toggle(v: boolean) {
    try { setSt(await setTelegramEnabled(v)); } catch (err) { toast.error((err as Error).message); }
  }
  async function disconnect() {
    setBusy(true);
    try { await disconnectTelegram(); setSt(await getTelegram()); setConfirm(false); toast.success(t("Telegram botu ayrıldı.")); }
    catch (err) { toast.error((err as Error).message); } finally { setBusy(false); }
  }

  if (!st && !error) return <FormSkeleton />;
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-lg bg-[#229ED9]/12 text-[#229ED9]"><Send size={20} aria-hidden /></span>
          <div><CardTitle>Telegram</CardTitle><CardDescription>{t("Sənin öz botun ziyarətçilərə saytdakı çatla eyni cavabları verir.")}</CardDescription></div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {st && !st.keyReady && <p role="alert" className="flex gap-2 rounded-lg border border-amber/40 bg-amber/10 p-3 text-sm"><TriangleAlert size={18} className="mt-0.5 shrink-0 text-amber" aria-hidden />{t("Serverdə CHANNEL_SECRET_KEY təyin edilməyib. Bunu admin .env faylına əlavə etməlidir, yoxsa bot qoşmaq olmur.")}</p>}
        {st && !st.httpsReady && <p role="alert" className="flex gap-2 rounded-lg border border-amber/40 bg-amber/10 p-3 text-sm"><TriangleAlert size={18} className="mt-0.5 shrink-0 text-amber" aria-hidden />{t("Telegram yalnız https ünvana mesaj göndərir. Serverdə PUBLIC_PORTAL_URL https olmalıdır.")}</p>}

        {st?.connected ? (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm">{t("Qoşulmuş bot")}: <strong>@{st.botUsername}</strong>{st.connectedAt && <span className="text-muted-foreground"> · {date(st.connectedAt)}</span>}</p>
              <a href={`https://t.me/${st.botUsername}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">{t("Telegram-da aç")} <ExternalLink size={14} aria-hidden /></a>
            </div>
            <SwitchRow checked={st.enabled} onChange={toggle} title={t("Bot cavab versin")} description={t("Söndürəndə bot mesajlara cavab vermir, amma qoşulu qalır.")} on={t("Aktivdir")} off={t("Söndürülüb")} />
            {confirm ? (
              <div className="flex flex-col gap-3 rounded-lg border border-destructive/40 p-3">
                <p className="text-sm">{t("Bot ayrılacaq və Telegram söhbətlərinin yaddaşı silinəcək. Botun özü Telegram-da qalır.")}</p>
                <div className="flex gap-2"><Button size="sm" variant="destructive" disabled={busy} onClick={disconnect}>{t("Bəli, ayır")}</Button><Button size="sm" variant="outline" disabled={busy} onClick={() => setConfirm(false)}>{t("Ləğv et")}</Button></div>
              </div>
            ) : <div><Button size="sm" variant="outline" onClick={() => setConfirm(true)}>{t("Botu ayır")}</Button></div>}
          </>
        ) : (
          <>
            <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-sm text-muted-foreground">
              <li>{t("Telegram-da @BotFather ilə söhbət aç və /newbot yaz.")}</li>
              <li>{t("Botun adını və “bot” ilə bitən istifadəçi adını seç.")}</li>
              <li>{t("BotFather-in verdiyi tokeni aşağıya yapışdır.")}</li>
            </ol>
            <form onSubmit={connect} className="flex flex-col gap-3">
              <div className="flex max-w-lg flex-col gap-1">
                <Label htmlFor="tg-token">{t("Bot tokeni")}</Label>
                <Input id="tg-token" type="password" autoComplete="off" spellCheck={false} placeholder="123456789:AA..." value={token} onChange={(e) => setToken(e.target.value)} disabled={busy} />
                <p className="text-xs text-muted-foreground">{t("Token şifrələnmiş saxlanır və bir daha göstərilmir.")}</p>
              </div>
              {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
              <div><Button disabled={busy || !token.trim() || !st?.keyReady || !st?.httpsReady}>{busy ? t("Qoşulur…") : t("Botu qoş")}</Button></div>
            </form>
          </>
        )}
        {st?.connected && error && <p role="alert" className="text-sm text-destructive">{error}</p>}

        <div className="border-t border-border pt-4">
          <p className="mb-2 text-sm font-medium">{t("Bilməli olduqların")}</p>
          <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm text-muted-foreground">
            <li>{t("Bot yalnız şəxsi yazışmada cavab verir, qruplarda yox.")}</li>
            <li>{t("Hələlik yalnız yazılı mesajlara cavab verir: səs və şəkil dəstəklənmir.")}</li>
            <li>{t("Cavab tapılmayanda bot telefon və ya e-poçt istəyir, müraciət “Müraciətlər” bölməsinə düşür və sənə e-poçt gəlir.")}</li>
            <li>{t("Sifariş və ödəniş kimi müştəri məlumatı Telegram-da işləmir (orada müştərini təsdiqləmək mümkün deyil).")}</li>
            <li>{t("Hər cavab saytdakı çat kimi balansdan çıxılır. Günlük limit “Saytına qoş” səhifəsindəki ziyarətçi limitidir.")}</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ChannelsPage() {
  const { t } = useI18n();
  return (
    <RequireTenant>
      <div className="flex flex-col gap-6">
        <header>
          <h1 className="text-2xl font-semibold">{t("Kanallar")}</h1>
          <p className="text-sm text-muted-foreground">{t("Köməkçini saytdan başqa harada işlətmək istədiyini seç.")}</p>
        </header>
        <WhatsApp />
        <Telegram />
      </div>
    </RequireTenant>
  );
}
