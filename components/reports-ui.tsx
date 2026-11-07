"use client";
// Hesabat səhifələrinin ümumi hissələri: dövr seçimi, müqayisəli göstərici kartı, CSAT kartı, bölmə, gündəlik bölgü cədvəli.
import { useEffect, useState } from "react";
import { ArrowDownRight, ArrowUpRight, BarChart3, ChevronDown, Download, Minus } from "lucide-react";
import { getReportData, type Csat, type DailyRow, type ReportData } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { FilterPills } from "@/components/page-header";
import { Button } from "@/components/ui/button";

export type Days = 7 | 30 | 90;
const STORE = "reports_days";

/** Seçilmiş dövr (yadda qalır) və hesabat məlumatı */
export function useReport() {
  const [days, setDaysState] = useState<Days>(7);
  const [data, setData] = useState<ReportData | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { try { const v = Number(localStorage.getItem(STORE)); if (v === 7 || v === 30 || v === 90) setDaysState(v); } catch { /* yaddaş bağlıdır */ } }, []);
  useEffect(() => {
    let live = true;
    setData(null); setError("");
    getReportData(days).then((r) => live && setData(r)).catch((e: Error) => live && setError(e.message));
    return () => { live = false; };
  }, [days]);
  const setDays = (d: Days) => { setDaysState(d); try { localStorage.setItem(STORE, String(d)); } catch { /* yaddaş bağlıdır */ } };
  return { days, setDays, data, error };
}

export function PeriodPills({ days, setDays }: { days: Days; setDays: (d: Days) => void }) {
  const { t } = useI18n();
  return <FilterPills value={String(days) as "7"} onChange={(v) => setDays(Number(v) as Days)} label={t("Dövr")} items={[{ value: "7", label: t("7 gün") }, { value: "30", label: t("30 gün") }, { value: "90", label: t("90 gün") }]} />;
}

/** "1–7 Noy vs 25–31 Okt" */
export function usePeriodLabel(d: ReportData | null) {
  if (!d) return "";
  // Bakı vaxtı ilə gün.ay (bəzi brauzerlər az dilində tarix formatını qəribə göstərir)
  const f = (iso: string, minus = 0) => { const x = new Date(new Date(iso).getTime() - minus + 4 * 3_600_000).toISOString(); return `${x.slice(8, 10)}.${x.slice(5, 7)}`; };
  return `${f(d.from)}–${f(d.to, 1)} vs ${f(d.prevFrom)}–${f(d.prevTo, 1)}`;
}

/** Saniyə → "45 san", "3 dəq 20 san", "2 saat 5 dəq", "3 gün 4 saat" */
export function useDur() {
  const { t } = useI18n();
  return (s: number | null) => {
    if (s === null) return "—";
    if (s < 60) return t("{n} san", { n: s });
    if (s < 3600) { const m = Math.floor(s / 60), r = s % 60; return r ? t("{m} dəq {s} san", { m, s: r }) : t("{n} dəq", { n: m }); }
    if (s < 86400) { const h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60); return m ? t("{h} saat {m} dəq", { h, m }) : t("{n} saat", { n: h }); }
    const d = Math.floor(s / 86400), h = Math.round((s % 86400) / 3600);
    return h ? t("{d} gün {h} saat", { d, h }) : t("{n} gün", { n: d });
  };
}

export type KpiKind = "count" | "pct" | "sec" | "rating";
/** Müqayisəli göstərici: dəyər, fərq nişanı (yaxşı yaşıl, pis qırmızı), "əvvəlki dövrdə X" */
export function Kpi({ label, value, prev, kind = "count", better = "up", hint, className }: { label: string; value: number | null; prev?: number | null; kind?: KpiKind; better?: "up" | "down" | "none"; hint?: string; className?: string }) {
  const { t } = useI18n();
  const dur = useDur();
  const fmt = (v: number | null | undefined) => (v === null || v === undefined ? "—" : kind === "pct" ? `${v}%` : kind === "sec" ? dur(v) : kind === "rating" ? `${v}/5` : String(v));
  const diff = value !== null && prev !== null && prev !== undefined ? Math.round((value - prev) * 10) / 10 : null;
  const good = diff === null || diff === 0 || better === "none" ? null : (diff > 0) === (better === "up");
  const Icon = diff === null || diff === 0 ? Minus : diff > 0 ? ArrowUpRight : ArrowDownRight;
  const dtext = diff === null || diff === 0 ? "" : kind === "pct" ? `${Math.abs(diff)} pp` : kind === "sec" ? dur(Math.abs(diff)) : String(Math.abs(diff));
  return (
    <div className={cn("flex flex-col gap-2 rounded-2xl border border-border bg-card p-5", className)}>
      <p className="text-sm font-medium">{label}</p>
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn("text-3xl font-semibold tabular-nums", value === null && "text-muted-foreground")}>{fmt(value)}</span>
        {prev !== undefined && <span className={cn("inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums", good === null ? "bg-muted text-muted-foreground" : good ? "bg-emerald-500/10 text-emerald-700" : "bg-destructive/10 text-destructive")}><Icon size={12} aria-hidden />{dtext}</span>}
      </div>
      {prev !== undefined && <p className="text-xs text-muted-foreground">{t("əvvəlki dövrdə {v}", { v: fmt(prev) })}</p>}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** CSAT: dairə (yaxşı qiymətlərin faizi) və yaxşı / neytral / pis sayları */
export function CsatCard({ title, c, prev }: { title: string; c: Csat; prev?: Csat | null }) {
  const { t } = useI18n();
  const total = c.good + c.neutral + c.bad;
  const pct = total ? Math.round((c.good / total) * 100) : null;
  const ppct = prev && prev.good + prev.neutral + prev.bad ? Math.round((prev.good / (prev.good + prev.neutral + prev.bad)) * 100) : null;
  const r = 44, circ = 2 * Math.PI * r;
  const row = (color: string, label: string, v: number, pv?: number) => (
    <li className="flex items-center gap-2 text-sm"><span className={cn("size-2.5 rounded-sm", color)} /><span className="flex-1">{label}</span><span className="tabular-nums">{v}</span>{pv !== undefined && <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">{pv}</span>}</li>
  );
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-4">
        <div className="relative size-24 shrink-0">
          <svg viewBox="0 0 100 100" className="size-full -rotate-90"><circle cx="50" cy="50" r={r} fill="none" stroke="var(--muted)" strokeWidth="7" />{pct !== null && <circle cx="50" cy="50" r={r} fill="none" stroke="#16a34a" strokeWidth="7" strokeLinecap="round" strokeDasharray={`${(pct / 100) * circ} ${circ}`} />}</svg>
          <span className="absolute inset-0 grid place-content-center text-lg font-semibold tabular-nums text-muted-foreground">{pct === null ? t("Yox") : <span className="text-foreground">{pct}%</span>}</span>
        </div>
        <div><p className="font-medium">{title}</p><p className="text-xs text-muted-foreground">{c.avg !== null ? t("orta qiymət {v}/5", { v: c.avg }) : t("hələ qiymət yoxdur")}</p>{prev !== undefined && <p className="text-xs text-muted-foreground">{t("əvvəlki dövrdə {v}", { v: ppct === null ? "—" : `${ppct}%` })}</p>}</div>
      </div>
      <ul className="flex flex-col gap-1.5 border-t border-border pt-3">
        {row("bg-emerald-600", t("Yaxşı (4-5)"), c.good, prev?.good)}
        {row("bg-zinc-400", t("Neytral (3)"), c.neutral, prev?.neutral)}
        {row("bg-red-500", t("Pis (1-2)"), c.bad, prev?.bad)}
      </ul>
    </div>
  );
}

/** Açılıb-bağlanan bölmə (text.com-dakı kimi) */
export function ReportSection({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="flex flex-col gap-3">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex cursor-pointer items-center justify-between rounded-lg py-1 text-left">
        <h2 className="text-lg font-semibold">{title}</h2><ChevronDown size={18} aria-hidden className={cn("text-muted-foreground transition-transform", !open && "-rotate-90")} />
      </button>
      {open && children}
    </section>
  );
}

export function EmptyReport({ text, action }: { text: string; action?: React.ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card px-6 py-12 text-center">
      <BarChart3 size={28} aria-hidden className="text-muted-foreground" />
      <p className="font-semibold">{t("Bu dövrdə hesabat üçün məlumat yoxdur")}</p>
      <p className="max-w-md text-sm text-muted-foreground">{text}</p>
      {action}
    </div>
  );
}

/** Gündəlik bölgü: sətirlər göstəricilər, sütunlar günlər; CSV yüklə */
export function DailyTable({ rows }: { rows: DailyRow[] }) {
  const { t } = useI18n();
  const series: { key: keyof DailyRow; label: string }[] = [
    { key: "questions", label: t("Suallar") }, { key: "unanswered", label: t("Cavabsız suallar") }, { key: "live", label: t("Canlı söhbətlər") }, { key: "leads", label: t("Müraciətlər") }, { key: "csatBad", label: t("Pis qiymətlər") },
  ];
  const d = (day: string) => `${day.slice(8, 10)}.${day.slice(5, 7)}`;
  function csv() {
    const cell = (v: unknown) => { const s = v === null || v === undefined ? "" : String(v); return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const lines = [[t("Göstərici"), ...rows.map((r) => r.day)].map(cell).join(";"), ...series.map((s) => [s.label, ...rows.map((r) => r[s.key])].map(cell).join(";"))];
    const url = URL.createObjectURL(new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = `hesabat-${rows[0]?.day ?? ""}-${rows.at(-1)?.day ?? ""}.csv`; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <h3 className="font-medium">{t("Gündəlik bölgü")}</h3>
        <Button size="sm" variant="outline" onClick={csv}><Download size={14} aria-hidden />{t("CSV yüklə")}</Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-xs text-muted-foreground"><th className="sticky left-0 bg-card px-4 py-2.5 text-left font-medium">{t("Göstərici")}</th>{rows.map((r, i) => <th key={r.day} className={cn("px-3 py-2.5 text-right font-medium tabular-nums", i % 2 === 0 && "bg-muted/40")}>{d(r.day)}</th>)}</tr></thead>
          <tbody className="divide-y divide-border">
            {series.map((s) => (
              <tr key={s.key}><td className="sticky left-0 whitespace-nowrap bg-card px-4 py-2.5">{s.label}</td>{rows.map((r, i) => <td key={r.day} className={cn("px-3 py-2.5 text-right tabular-nums", i % 2 === 0 && "bg-muted/40", !r[s.key] && "text-muted-foreground")}>{r[s.key] ?? "—"}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
