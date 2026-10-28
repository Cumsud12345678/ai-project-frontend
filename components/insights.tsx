"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, MessageCircleQuestion, Sparkles, ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { analyzeInsights, getInsightsTrend, type InsightsResult, type InsightsTrend, type TrendDay } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { TrendChart } from "@/components/charts";
import { StatTile } from "@/components/stat-tile";
import { Button } from "@/components/ui/button";

const fmtDay = (d: string) => `${d.slice(8, 10)}.${d.slice(5, 7)}`;

/** Analitika: gündəlik trend, həll olunma və bəyənmə faizi (pulsuz); mövzular və biliyə əlavə təklifləri (AI, sahib basanda). */
export function Insights({ days, onDays, enabled }: { days: number; onDays: (d: number) => void; enabled: boolean }) {
  const { t, short } = useI18n();
  const [trend, setTrend] = useState<InsightsTrend | null>(null);
  const [res, setRes] = useState<InsightsResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    setTrend(null); setRes(null); setError("");
    getInsightsTrend(days).then((r) => live && setTrend(r)).catch((e: Error) => live && setError(e.message));
    return () => { live = false; };
  }, [days]);

  async function analyze(fresh: boolean) {
    setBusy(true);
    try { setRes(await analyzeInsights(days, fresh)); }
    catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }

  if (!enabled) return <p className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">{t("Sorğu jurnalı söndürülüb, analitika üçün məlumat yoxdur.")}</p>;
  if (error) return <p role="alert" className="text-sm text-destructive">{error}</p>;
  if (!trend) return <p className="text-sm text-muted-foreground">{t("Yüklənir…")}</p>;

  const total = trend.daily.reduce((a, d) => a + d.total, 0);
  const unanswered = trend.daily.reduce((a, d) => a + d.unanswered, 0);
  const solved = total ? Math.round(((total - unanswered) / total) * 100) : null;
  const sat = trend.feedback.satisfaction;
  const pts = (pick: (d: TrendDay) => number) => trend.daily.map((d) => ({ label: fmtDay(d.day), title: d.day, value: pick(d) }));
  const maxTopic = Math.max(1, ...(res?.topics ?? []).map((x) => x.count));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2 text-sm">
        <label htmlFor="ins-days">{t("Dövr")}</label>
        <select id="ins-days" value={days} onChange={(e) => onDays(Number(e.target.value))} className="h-9 rounded-md border border-border bg-card px-3 text-sm">
          <option value={7}>{t("Son 7 gün")}</option><option value={30}>{t("Son 30 gün")}</option><option value={90}>{t("Son 90 gün")}</option>
        </select>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile icon={MessageCircleQuestion} tone={1} label={t("Suallar")} value={total} hint={t("son {days} gün", { days })} />
        <StatTile icon={CheckCircle2} tone={2} label={t("Həll olunma")} value={solved === null ? "–" : `${solved}%`} hint={total ? t("{n} sual cavabsız qaldı", { n: unanswered }) : undefined} />
        <StatTile icon={ThumbsUp} tone={3} label={t("Bəyənmə")} value={sat === null ? "–" : `${sat}%`} hint={sat === null ? t("Hələ qiymət verən yoxdur") : t("{up} bəyəndi, {down} bəyənmədi", { up: trend.feedback.up, down: trend.feedback.down })} />
      </div>

      {total === 0 ? <p className="text-sm text-muted-foreground">{t("Bu dövrdə sual yoxdur.")}</p> : (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-lg border border-border bg-card p-4">
            <h2 className="mb-2 font-medium">{t("Gündəlik suallar")}</h2>
            <TrendChart data={pts((d) => d.total)} unit={t("sual")} kind="bar" height={180} fmt={(n) => String(n)} tick={(n) => String(n)} />
          </section>
          <section className="rounded-lg border border-border bg-card p-4">
            <h2 className="mb-2 font-medium">{t("Cavabsız qalanlar")}</h2>
            <TrendChart data={pts((d) => d.unanswered)} color="var(--chart-4)" unit={t("sual")} kind="bar" height={180} fmt={(n) => String(n)} tick={(n) => String(n)} />
          </section>
        </div>
      )}

      <section className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-medium">{t("Mövzular və çatışmayan bilik")}</h2>
            <p className="text-sm text-muted-foreground">{t("AI sualları mövzulara bölür və biliyə nə əlavə etməli olduğunu deyir. Balansdan kiçik məbləğ çıxılır; nəticə 6 saat saxlanır.")}</p>
          </div>
          <Button onClick={() => analyze(Boolean(res))} disabled={busy || total === 0}><Sparkles size={16} aria-hidden />{busy ? t("Təhlil edilir…") : res ? t("Yenidən təhlil et") : t("AI ilə təhlil et")}</Button>
        </div>
        {res?.tooFew && <p className="text-sm text-muted-foreground">{t("Təhlil üçün ən azı {n} sual lazımdır.", { n: res.minQuestions ?? 5 })}</p>}
        {res && !res.tooFew && (
          <>
            {res.analyzedAt && <p className="text-xs text-muted-foreground">{t("Təhlil vaxtı: {date}", { date: short(res.analyzedAt) })}{res.cached ? ` · ${t("keşdən")}` : ""}</p>}
            <ul className="flex flex-col gap-3">
              {res.topics.map((x) => (
                <li key={x.name} className="flex flex-col gap-1">
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="font-medium">{x.name}</span>
                    <span className="tabular-nums text-muted-foreground">{x.count}{x.unanswered ? ` · ${t("{n} cavabsız", { n: x.unanswered })}` : ""}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted" role="img" aria-label={`${x.name}: ${x.count}`}>
                    <div className="h-full rounded-full" style={{ width: `${Math.max(3, (x.count / maxTopic) * 100)}%`, background: "var(--chart-1)" }} />
                  </div>
                  {!!x.examples.length && <p className="truncate text-xs text-muted-foreground">{x.examples.join(" · ")}</p>}
                </li>
              ))}
            </ul>
            {!!res.gaps.length && (
              <div className="flex flex-col gap-2 border-t border-border pt-3">
                <h3 className="text-sm font-medium">{t("Biliyə əlavə et")}</h3>
                <ul className="flex flex-col gap-2">
                  {res.gaps.map((g) => (
                    <li key={g.title} className="rounded-md border border-border p-3 text-sm">
                      <p className="font-medium">{g.title} <span className="font-normal text-muted-foreground">· {t("{n} dəfə", { n: g.count })}</span></p>
                      {g.why && <p className="text-muted-foreground">{g.why}</p>}
                      {!!g.examples.length && <p className="mt-1 truncate text-xs text-muted-foreground">{g.examples.join(" · ")}</p>}
                    </li>
                  ))}
                </ul>
                <Link href="/knowledge" className="self-start text-sm text-primary underline">{t("Bilik bazasına keç")}</Link>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
