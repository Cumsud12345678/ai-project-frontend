"use client";
import { useEffect, useState } from "react";
import { Flame, Frown, Meh, RefreshCw, Smile, Snowflake, Sparkles, Sun } from "lucide-react";
import { toast } from "sonner";
import type { SavedSummary } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * Söhbətin AI xülasəsi kartı. load(force) serverdən xülasəni alır: yeni mesaj yoxdursa saxlanmış nəticə gəlir (pulsuz),
 * "Yenilə" basanda yenidən hazırlanır. initial: söhbətlə birlikdə gələn saxlanmış xülasə (varsa).
 */
export function ChatSummaryCard({ initial, stale, load, compact }: { initial?: SavedSummary | null; stale?: boolean; load: (force: boolean) => Promise<{ summary: SavedSummary }>; compact?: boolean }) {
  const { t, short } = useI18n();
  const [s, setS] = useState<SavedSummary | null>(initial ?? null);
  const [old, setOld] = useState(Boolean(stale));
  const [busy, setBusy] = useState(false);
  // Söhbət yenilənəndə (yeni mesaj gəlib) serverin verdiyi vəziyyət kartda da görünsün
  useEffect(() => { if (initial) setS(initial); setOld(Boolean(stale)); }, [initial?.at, stale]); // eslint-disable-line react-hooks/exhaustive-deps
  async function run(force: boolean) {
    setBusy(true);
    try { const r = await load(force); setS(r.summary); setOld(false); }
    catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  const mood = { positive: [Smile, t("Müsbət"), "text-emerald-700"], neutral: [Meh, t("Neytral"), "text-muted-foreground"], negative: [Frown, t("Narazı"), "text-red-700"] } as const;
  const temp = { hot: [Flame, t("Almağa hazırdır"), "bg-red-50 text-red-700 ring-red-600/20"], warm: [Sun, t("Maraqlanır"), "bg-amber-50 text-amber-800 ring-amber-600/20"], cold: [Snowflake, t("Maraq azdır"), "bg-sky-50 text-sky-700 ring-sky-600/20"] } as const;

  if (!s) return (
    <Button type="button" size="sm" variant="outline" className="self-start" onClick={() => run(false)} disabled={busy} title={t("Niyyət, əhval, etirazlar və növbəti addım. Balansdan az xərc çıxır.")}>
      <Sparkles size={14} aria-hidden />{busy ? t("Hazırlanır…") : t("AI xülasə")}
    </Button>
  );
  const [MoodIcon, moodLabel, moodCls] = mood[s.mood];
  const [TempIcon, tempLabel, tempCls] = temp[s.temperature];
  return (
    <div className={cn("flex flex-col gap-2 rounded-lg border border-border bg-muted/40 text-sm", compact ? "p-2.5" : "p-3")}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase"><Sparkles size={12} aria-hidden />{t("AI xülasə")}</span>
        <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ring-1 ring-inset", tempCls)}><TempIcon size={12} aria-hidden />{tempLabel}</span>
        <span className={cn("inline-flex items-center gap-1 text-xs", moodCls)}><MoodIcon size={13} aria-hidden />{moodLabel}</span>
        <Button type="button" size="sm" variant="ghost" className="ml-auto h-7 px-2" onClick={() => run(true)} disabled={busy} aria-label={t("Xülasəni yenilə")} title={t("Xülasəni yenilə")}><RefreshCw size={13} className={busy ? "animate-spin" : ""} aria-hidden /></Button>
      </div>
      {s.intent && <p className="font-medium">{s.intent}</p>}
      <p className="text-muted-foreground">{s.summary}</p>
      {!!s.objections.length && <ul className="flex flex-wrap gap-1.5">{s.objections.map((o) => <li key={o} className="rounded-md bg-card px-2 py-0.5 text-xs ring-1 ring-inset ring-border">⚠ {o}</li>)}</ul>}
      {s.nextStep && <p className="rounded-md bg-card p-2"><span className="text-xs font-semibold text-muted-foreground">{t("Növbəti addım")}: </span>{s.nextStep}</p>}
      <p className="text-[11px] text-muted-foreground">{old ? t("Sonra yeni mesajlar gəlib: yeniləyin.") : t("Hazırlandı: {d}", { d: short(s.at) })}</p>
    </div>
  );
}
