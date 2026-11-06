"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Bell, CircleCheck, CircleX, PauseCircle, PlayCircle, Send } from "lucide-react";
import { adminAiControl, adminAlerts, adminAlertsTelegram, adminAlertsTelegramOff, adminAlertsTest, adminSaveAlerts, adminSetAiControl, type AiControl, type AlertKind, type AlertsView } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Ümumi AI açarı: bütün müştərilər üçün AI sorğularını bir kliklə dayandırır. */
function AiControlCard() {
  const { t, date } = useI18n();
  const [c, setC] = useState<AiControl | null>(null);
  const [reason, setReason] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { adminAiControl().then(setC).catch(() => setC({ paused: false })); }, []);
  const set = async (paused: boolean) => {
    setBusy(true);
    try { setC(await adminSetAiControl(paused, reason.trim())); setConfirm(false); setReason(""); toast.success(paused ? t("AI dayandırıldı.") : t("AI yenidən işləyir.")); }
    catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <Card className={c?.paused ? "border-destructive/50" : ""}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">{c?.paused ? <PauseCircle size={17} className="text-destructive" aria-hidden /> : <PlayCircle size={17} className="text-chart-2" aria-hidden />}{t("AI açarı")}</CardTitle>
        <CardDescription>{t("Fövqəladə hal üçün: provayder çöküb, xərc qəfil artıb və ya səhv model yayımlanıb. Bütün müştərilərin vidjeti, kanalları və API sorğuları AI-sız qalır: vidjet əlaqə formasını göstərir.")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        {!c ? <Skeleton className="h-10" /> : c.paused ? (
          <>
            <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <strong className="text-destructive">{t("AI dayandırılıb")}</strong>{c.at && ` · ${date(c.at)}`}{c.by && ` · ${c.by}`}
              {c.reason && <span className="mt-1 block">{t("Səbəb:")} {c.reason}</span>}
            </p>
            <div><Button disabled={busy} onClick={() => set(false)}><PlayCircle size={15} aria-hidden />{t("AI-ı yenidən aç")}</Button></div>
          </>
        ) : !confirm ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-chart-2">{t("AI normal işləyir.")}</span>
            <Button variant="outline" className="border-destructive/50 text-destructive hover:bg-destructive/10" onClick={() => setConfirm(true)}><PauseCircle size={15} aria-hidden />{t("Bütün AI sorğularını dayandır")}</Button>
          </div>
        ) : (
          <form className="flex flex-col gap-2" onSubmit={(e) => { e.preventDefault(); void set(true); }}>
            <Label htmlFor="ai-reason">{t("Səbəb (adminlərə xəbər gedəcək)")}</Label>
            <Input id="ai-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} autoFocus placeholder={t("məs. Anthropic API cavab vermir")} />
            <div className="flex gap-2">
              <Button variant="destructive" disabled={busy || reason.trim().length < 3}>{t("Dayandır")}</Button>
              <Button type="button" variant="outline" onClick={() => setConfirm(false)}>{t("İmtina")}</Button>
            </div>
          </form>
        )}
        <p className="text-xs text-muted-foreground">{t("Müştəri başına gündəlik xərc limiti “İstifadəçilər” → “Balansı idarə et” bölməsindədir. Hamı üçün ümumi limit: BILLING_DAILY_LIMIT_AZN (AI servisi).")}</p>
      </CardContent>
    </Card>
  );
}

export default function AdminSettingsPage() {
  const { t, date } = useI18n();
  const [v, setV] = useState<AlertsView | null>(null);
  const [error, setError] = useState("");
  const [threshold, setThreshold] = useState("");
  const [link, setLink] = useState<string | null>(null);
  const load = () => adminAlerts().then((r) => { setV(r); setThreshold(String(r.settings.errorThreshold)); }).catch((e: Error) => setError(e.message));
  useEffect(() => { void load(); }, []);
  const save = async (patch: Parameters<typeof adminSaveAlerts>[0]) => {
    try { const r = await adminSaveAlerts(patch); setV(r); setThreshold(String(r.settings.errorThreshold)); toast.success(t("Ayarlar yadda saxlandı.")); } catch (e) { toast.error((e as Error).message); }
  };

  const kinds: Record<AlertKind, [string, string]> = {
    errors: [t("Xəta artımı"), t("15 dəqiqədə xəta sayı həddi keçəndə (saatda ən çox bir dəfə).")],
    health: [t("Servis əlçatmazdır"), t("AI servisi və ya baza ardıcıl 2 yoxlamada cavab verməyəndə və bərpa olanda.")],
    topup: [t("Yeni yükləmə sorğusu"), t("Müştəri balans yükləmək istəyəndə.")],
    channel: [t("Kanal qırıldı"), t("Müştərinin WhatsApp bağlantısı düşəndə (müştəri üzrə 6 saatda bir).")],
    limit: [t("Gündəlik limit"), t("Müştəri gündəlik xərc limitinə çatanda: qəfil artım ola bilər.")],
  };

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold">{t("Ayarlar")}</h1>
        <p className="text-sm text-muted-foreground">{t("Xəbərdarlıqlar və AI-ın ümumi idarəsi.")}</p>
      </header>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

      <AiControlCard />

      {!v ? <Skeleton className="h-64" /> : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Bell size={17} aria-hidden />{t("Xəbərdarlıqlar")}</CardTitle>
              <CardDescription>{t("Problem olanda bütün adminlərə xəbər gedir. Telegram ən sürətlisidir, e-poçt ehtiyat yoldur.")}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-5 text-sm">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-4">
                  <span><span className="font-medium">Telegram</span><span className="block text-xs text-muted-foreground">{v.telegram.available ? t("@{bot} botu vasitəsilə", { bot: v.telegram.bot ?? "" }) : t("Serverdə NOTIFY_TELEGRAM_TOKEN yoxdur")}</span></span>
                  {v.telegram.available ? <Switch checked={v.settings.telegram} onChange={(x) => save({ telegram: x })} label="Telegram" /> : <span className="text-xs text-muted-foreground">{t("əlçatan deyil")}</span>}
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span><span className="font-medium">{t("E-poçt")}</span><span className="block text-xs text-muted-foreground">{v.mailConfigured ? t("Telegram bağlı olmayan adminlərə də gedir") : t("RESEND_API_KEY yoxdur: məktub göndərilmir")}</span></span>
                  <Switch checked={v.settings.email} onChange={(x) => save({ email: x })} label={t("E-poçt")} />
                </div>
                <p className="text-xs text-muted-foreground">{t("Hər ikisi söndürülsə də, Telegram-ı bağlı admin yoxdursa məktub yenə göndərilir: xəbər itməsin.")}</p>
              </div>

              <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
                {v.kinds.map((k) => (
                  <div key={k} className="flex items-center justify-between gap-4 px-4 py-3">
                    <span><span className="font-medium">{kinds[k][0]}</span><span className="block text-xs text-muted-foreground">{kinds[k][1]}</span></span>
                    <Switch checked={v.settings.kinds[k]} onChange={(x) => save({ kinds: { [k]: x } })} label={kinds[k][0]} />
                  </div>
                ))}
              </div>

              <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); void save({ errorThreshold: Number(threshold) }); }}>
                <div className="flex flex-col gap-1"><Label htmlFor="al-th">{t("Xəta həddi (15 dəqiqədə)")}</Label><Input id="al-th" inputMode="numeric" value={threshold} onChange={(e) => setThreshold(e.target.value.replace(/\D/g, ""))} className="w-28" /></div>
                <Button variant="outline" disabled={!threshold || Number(threshold) === v.settings.errorThreshold}>{t("Yadda saxla")}</Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("Mənim Telegram-ım")}</CardTitle>
              <CardDescription>{t("Xəbərdarlıqları telefonda almaq üçün Telegram-ı hesabına bağla. Hər admin özü bağlayır.")}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              {v.telegram.me ? (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex items-center gap-1.5 text-chart-2"><CircleCheck size={16} aria-hidden />{t("Bağlıdır: {name}", { name: v.telegram.me.name || "Telegram" })}</span>
                  <Button size="sm" variant="outline" onClick={async () => { try { setV(await adminAlertsTelegramOff()); } catch (e) { toast.error((e as Error).message); } }}>{t("Ayır")}</Button>
                </div>
              ) : link ? (
                <p>{t("Linki aç və botda “Start” bas (10 dəqiqə etibarlıdır):")} <a href={link} target="_blank" rel="noreferrer" className="font-medium text-primary underline">{link.replace("https://", "")}</a> <button type="button" className="ml-2 cursor-pointer text-xs text-muted-foreground underline" onClick={() => { setLink(null); void load(); }}>{t("Bağladım, yoxla")}</button></p>
              ) : (
                <div><Button size="sm" variant="outline" disabled={!v.telegram.available} onClick={async () => { try { setLink((await adminAlertsTelegram()).url); } catch (e) { toast.error((e as Error).message); } }}><Send size={14} aria-hidden />{t("Telegram-ı bağla")}</Button></div>
              )}
              <div className="flex flex-wrap items-center gap-3 border-t border-border pt-3">
                <Button size="sm" variant="outline" onClick={async () => { try { const r = await adminAlertsTest(); toast.success(t("Göndərildi: Telegram {tg}, e-poçt {em}.", { tg: r.telegram, em: r.email })); void load(); } catch (e) { toast.error((e as Error).message); } }}>{t("Mənə sınaq bildirişi göndər")}</Button>
              </div>
              <div>
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">{t("Alıcılar")}</p>
                <ul className="flex flex-wrap gap-2">{v.recipients.map((r) => <li key={r.email} className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs">{r.email}{r.telegram && <Send size={11} className="text-primary" aria-label="Telegram" />}</li>)}</ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>{t("Son xəbərdarlıqlar")}</CardTitle><CardDescription>{t("Server yenidən başlayanda bu siyahı sıfırlanır.")}</CardDescription></CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <div className="flex flex-wrap gap-4">
                {(["ai", "db"] as const).map((k) => (
                  <span key={k} className={cn("flex items-center gap-1.5", v.health[k].down ? "text-destructive" : "text-chart-2")}>
                    {v.health[k].down ? <CircleX size={16} aria-hidden /> : <CircleCheck size={16} aria-hidden />}
                    {k === "ai" ? t("AI servisi") : t("Verilənlər bazası")}: {v.health[k].down ? t("əlçatmazdır") : t("işləyir")}
                  </span>
                ))}
              </div>
              {v.log.length === 0 ? <p className="text-muted-foreground">{t("Hələ xəbərdarlıq göndərilməyib.")}</p> : (
                <ul className="divide-y divide-border">
                  {v.log.map((l, i) => (
                    <li key={i} className="flex flex-wrap items-baseline justify-between gap-2 py-2">
                      <span className="font-medium">{l.title}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">{date(l.at)} · Telegram {l.telegram} · {t("e-poçt")} {l.email}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
