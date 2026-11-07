"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Ban, CalendarClock, Clock3, Languages, Link2, Monitor, Repeat, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { VisitorInfo } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

/** Ziyarətçi haqqında (brauzerin bildirdiyi): yerli vaxt və şəhər (saat qurşağından), ilk ziyarət, ziyarət sayı, cihaz, dil, gəldiyi sayt. */
export function VisitorFacts({ v, className = "" }: { v: VisitorInfo; className?: string }) {
  const { t, locale } = useI18n();
  const loc = locale === "en" ? "en-GB" : locale;
  const rows: { icon: typeof Clock3; text: string }[] = [];
  if (v.tz) {
    try {
      const time = new Intl.DateTimeFormat(loc, { timeZone: v.tz, hour: "2-digit", minute: "2-digit" }).format(new Date());
      const city = v.tz.split("/").pop()!.replace(/_/g, " ");
      rows.push({ icon: Clock3, text: t("Yerli vaxt {time} · {city}", { time, city }) });
    } catch { /* tanınmayan qurşaq */ }
  }
  if (v.first) {
    const days = Math.floor((Date.now() - v.first) / 86_400_000);
    rows.push({ icon: CalendarClock, text: days < 1 ? t("İlk ziyarət: bu gün") : t("İlk ziyarət: {n} gün əvvəl", { n: days }) });
  }
  if (v.visits) rows.push({ icon: Repeat, text: v.visits === 1 ? t("İlk dəfə gəlib") : t("Ziyarət sayı: {n}", { n: v.visits }) });
  if (v.mobile !== undefined) rows.push({ icon: v.mobile ? Smartphone : Monitor, text: v.mobile ? t("Telefon") : t("Kompüter") });
  if (v.lang) {
    let name = v.lang;
    try { name = new Intl.DisplayNames([loc], { type: "language" }).of(v.lang.split("-")[0]!) ?? v.lang; } catch { /* köhnə brauzer */ }
    rows.push({ icon: Languages, text: name });
  }
  if (v.ref) rows.push({ icon: Link2, text: t("Gəldiyi yer: {ref}", { ref: v.ref }) });
  if (!rows.length) return null;
  return (
    <ul className={`flex flex-col gap-2 text-sm ${className}`}>
      {rows.map((r, i) => <li key={i} className="flex items-center gap-2.5"><r.icon size={15} aria-hidden className="shrink-0 text-muted-foreground" /><span className="min-w-0 truncate">{r.text}</span></li>)}
    </ul>
  );
}


/** İki addımlı təsdiq düyməsi (bloklama kimi geri qaytarıla bilən, amma ciddi addımlar üçün) */
export function ConfirmButton({ label, warning, yes, onConfirm }: { label: string; warning: string; yes: string; onConfirm: () => Promise<void> }) {
  const { t } = useI18n();
  const [step, setStep] = useState<"idle" | "ask" | "busy">("idle");
  if (step === "idle") return <Button type="button" size="sm" variant="outline" className="text-destructive" onClick={() => setStep("ask")}><Ban size={14} aria-hidden />{label}</Button>;
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
      <p>{warning}</p>
      <div className="flex gap-2">
        <Button type="button" size="sm" variant="destructive" disabled={step === "busy"} onClick={async () => { setStep("busy"); try { await onConfirm(); } catch (e) { toast.error((e as Error).message); } setStep("idle"); }}>{yes}</Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setStep("idle")}>{t("Ləğv et")}</Button>
      </div>
    </div>
  );
}
