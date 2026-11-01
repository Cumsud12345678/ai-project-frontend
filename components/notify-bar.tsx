"use client";
import { useEffect, useRef, useState } from "react";
import { Bell, BellOff, Send, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { getNotify, linkTelegramNotify, unlinkTelegramNotify, type NotifyView } from "@/lib/api";
import { alertSoundOn, askBrowserNotify, browserNotifyState, playChime, setAlertSound, type BrowserNotifyState } from "@/lib/live-alerts";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const chip = "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium disabled:cursor-default disabled:opacity-60";
const on = "border-primary/40 bg-primary/10 text-primary";
const off = "border-border text-muted-foreground hover:bg-muted/50";

/** Operatorun bildiriş ayarları: səs, brauzer bildirişi və Telegram. Hamısı yalnız bu istifadəçiyə aiddir. */
export function NotifyBar() {
  const { t } = useI18n();
  const [sound, setSound] = useState(true);
  const [browser, setBrowser] = useState<BrowserNotifyState>("unsupported");
  const [tg, setTg] = useState<NotifyView | null>(null);
  const [linking, setLinking] = useState(false);
  const poll = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    setSound(alertSoundOn()); setBrowser(browserNotifyState());
    getNotify().then(setTg).catch(() => {});
    return () => clearInterval(poll.current);
  }, []);

  function toggleSound() {
    const v = !sound; setSound(v); setAlertSound(v);
    if (v) setTimeout(() => playChime("message"), 50); // nümunə səs
  }
  async function enableBrowser() {
    const s = await askBrowserNotify(); setBrowser(s);
    if (s === "denied") toast.error(t("Brauzer bildirişləri bloklanıb. Ünvan sətrindəki kilid ikonundan icazə ver."));
  }
  async function linkTg() {
    setLinking(true);
    try {
      const r = await linkTelegramNotify();
      window.open(r.url, "_blank", "noopener");
      // Operator botda Start basana qədər hər 3 saniyədə yoxlanır (ən çox 10 dəqiqə)
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

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
      <span className="mr-1 text-xs font-medium text-muted-foreground">{t("Yeni söhbət bildirişləri:")}</span>
      <button type="button" aria-pressed={sound} onClick={toggleSound} className={cn(chip, sound ? on : off)}>
        {sound ? <Volume2 size={14} aria-hidden /> : <VolumeX size={14} aria-hidden />}{sound ? t("Səs açıqdır") : t("Səs bağlıdır")}
      </button>
      {browser !== "unsupported" && (
        browser === "granted"
          ? <span className={cn(chip, on, "cursor-default")}><Bell size={14} aria-hidden />{t("Brauzer bildirişi açıqdır")}</span>
          : <button type="button" onClick={enableBrowser} className={cn(chip, off)} title={browser === "denied" ? t("Brauzer bildirişləri bloklanıb. Ünvan sətrindəki kilid ikonundan icazə ver.") : undefined}>
              <BellOff size={14} aria-hidden />{browser === "denied" ? t("Brauzer bildirişi bloklanıb") : t("Brauzer bildirişini aç")}
            </button>
      )}
      {tg?.available && (
        tg.telegram
          ? <span className={cn(chip, on, "cursor-default")}><Send size={14} aria-hidden />{t("Telegram: {name}", { name: tg.telegram.name || t("bağlıdır") })}
              <button type="button" onClick={unlinkTg} className="ml-1 cursor-pointer underline">{t("Ayır")}</button></span>
          : <button type="button" onClick={linkTg} disabled={linking} className={cn(chip, off)}><Send size={14} aria-hidden />{linking ? t("Telegram-da Start bas…") : t("Telegram-da bildiriş al")}</button>
      )}
    </div>
  );
}
