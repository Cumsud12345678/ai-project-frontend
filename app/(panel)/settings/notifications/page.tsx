"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { getNotify, linkTelegramNotify, unlinkTelegramNotify, type NotifyView } from "@/lib/api";
import { alertPrefs, alertSoundOn, askBrowserNotify, browserNotifyState, playChime, setAlertPref, setAlertSound, type AlertEvent, type BrowserNotifyState } from "@/lib/live-alerts";
import { PageHeader } from "@/components/page-header";
import { SettingsBody } from "@/components/settings-ui";
import { useI18n } from "@/lib/i18n";
import { RequireTenant, useSession } from "@/components/session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

function Row({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0"><p className="text-sm font-medium">{title}</p>{note && <p className="mt-0.5 text-xs text-muted-foreground">{note}</p>}</div>
      <div className="flex shrink-0 items-center gap-2">{children}</div>
    </div>
  );
}

function Notifications() {
  const { t } = useI18n();
  const { me } = useSession();
  const [prefs, setPrefs] = useState<Record<AlertEvent, boolean> | null>(null);
  const [sound, setSound] = useState(true);
  const [browser, setBrowser] = useState<BrowserNotifyState>("unsupported");
  const [tg, setTg] = useState<NotifyView | null>(null);
  const [linking, setLinking] = useState(false);
  const poll = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    setPrefs(alertPrefs()); setSound(alertSoundOn()); setBrowser(browserNotifyState());
    getNotify().then(setTg).catch(() => {});
    return () => clearInterval(poll.current);
  }, []);

  const toggle = (k: AlertEvent, v: boolean) => { setAlertPref(k, v); setPrefs(alertPrefs()); };
  function toggleSound(v: boolean) { setSound(v); setAlertSound(v); if (v) setTimeout(() => playChime("message"), 50); }
  async function enableBrowser() {
    const s = await askBrowserNotify(); setBrowser(s);
    if (s === "denied") toast.error(t("Brauzer bildirişləri bloklanıb. Ünvan sətrindəki kilid ikonundan icazə ver."));
  }
  async function linkTg() {
    setLinking(true);
    try {
      const r = await linkTelegramNotify();
      window.open(r.url, "_blank", "noopener");
      clearInterval(poll.current);
      const until = Date.now() + r.expiresInS * 1000;
      poll.current = setInterval(() => {
        if (Date.now() > until) { clearInterval(poll.current); setLinking(false); return; }
        getNotify().then((v) => { if (v.telegram) { clearInterval(poll.current); setTg(v); setLinking(false); toast.success(t("Telegram bildirişləri qoşuldu.")); } }).catch(() => {});
      }, 3000);
    } catch (err) { toast.error((err as Error).message); setLinking(false); }
  }
  async function unlinkTg() {
    try { setTg(await unlinkTelegramNotify()); toast.success(t("Telegram bildirişləri ayrıldı.")); }
    catch (err) { toast.error((err as Error).message); }
  }

  const events: { k: AlertEvent; title: string; note: string }[] = [
    { k: "start", title: t("Yeni canlı söhbət"), note: t("Ziyarətçi operatorla yazışmaya başlayanda") },
    { k: "message", title: t("Söhbətdə yeni mesaj"), note: t("Açıq söhbətdə ziyarətçi yazanda") },
    { k: "visitor", title: t("Yeni ziyarətçi"), note: t("Sayta ilk dəfə kimsə girəndə (30 saniyədə ən çox bir dəfə)") },
    { k: "returning", title: t("Qayıdan ziyarətçi"), note: t("Əvvəl gəlmiş ziyarətçi yenidən girəndə") },
  ];

  return (
    <SettingsBody>
      <PageHeader title={t("Bildirişlər")} description={t("Nə baş verəndə xəbər alacağını seç. Səs və brauzer ayarları yalnız bu brauzerə aiddir.")} />

      <Card>
        <CardHeader><CardTitle>{t("Hadisələr")}</CardTitle><CardDescription>{t("Panel açıq olanda bu hadisələr səs və brauzer bildirişi ilə xəbər verir.")}</CardDescription></CardHeader>
        <CardContent className="divide-y divide-border">
          {prefs && events.map((e) => <Row key={e.k} title={e.title} note={e.note}><Switch checked={prefs[e.k]} onChange={(v) => toggle(e.k, v)} label={e.title} /></Row>)}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{t("Necə xəbər verilsin")}</CardTitle></CardHeader>
        <CardContent className="divide-y divide-border">
          <Row title={t("Səs")} note={t("Qısa siqnal; tab arxa planda olsa da çalır.")}><Switch checked={sound} onChange={toggleSound} label={t("Səs")} /></Row>
          <Row title={t("Brauzer bildirişi")} note={t("Tab gizli olanda ekranın küncündə görünür.")}>
            {browser === "unsupported" ? <span className="text-xs text-muted-foreground">{t("Bu brauzer dəstəkləmir")}</span>
              : browser === "granted" ? <Badge tone="success">{t("Açıq")}</Badge>
              : browser === "denied" ? <span className="text-xs text-destructive">{t("Brauzer bildirişi bloklanıb")}</span>
              : <Button size="sm" variant="outline" onClick={enableBrowser}>{t("İcazə ver")}</Button>}
          </Row>
          {tg?.available && (
            <Row title={t("Telegram")} note={tg.telegram ? t("Telegram: {name}", { name: tg.telegram.name || t("bağlıdır") }) : t("Panel bağlı olanda da yeni söhbət və müraciətləri telefonda al.")}>
              {tg.telegram
                ? <Button size="sm" variant="outline" onClick={unlinkTg}>{t("Ayır")}</Button>
                : <Button size="sm" variant="outline" onClick={linkTg} disabled={linking}><Send size={14} aria-hidden />{linking ? t("Telegram-da Start bas…") : t("Qoş")}</Button>}
            </Row>
          )}
          <Row title={t("E-poçt")} note={t("Yeni müraciət və yeni canlı söhbət {email} ünvanına gedir.", { email: me.email })}><Badge tone="success">{t("Açıq")}</Badge></Row>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        {t("Gündəlik xülasə, pis qiymət və bağlanan söhbət üçün e-poçt və ya Telegram qrupuna mesajı Avtomatlaşdırmalarda qur.")}{" "}
        <Link href="/automations" className="font-medium text-foreground underline underline-offset-2">{t("Avtomatlaşdırmalara keç")}</Link>
      </p>
    </SettingsBody>
  );
}

export default function NotificationsPage() {
  return <RequireTenant><Notifications /></RequireTenant>;
}
