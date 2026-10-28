"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { clearQueries, downloadExport, getFunnel, getQueries, getQueryStats, getReport, setReport, type ExportKind, type Funnel, type QueryRow, type QueryStats } from "@/lib/api";
import { Conversations } from "@/components/conversations";
import { Insights } from "@/components/insights";
import { useI18n } from "@/lib/i18n";
import { DangerAction } from "@/components/danger-action";
import { RequireTenant, useSession } from "@/components/session";
import { QueriesSkeleton } from "@/components/skeletons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

function Stat({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return <div className="rounded-lg border border-border bg-card px-4 py-3"><p className="text-xs text-muted-foreground">{label}</p><p className="text-xl font-semibold tabular-nums">{value}</p>{hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}</div>;
}

function TopList({ title, hint, rows }: { title: string; hint: string; rows: { message: string; count: number }[] }) {
  const { t } = useI18n();
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <h2 className="font-medium">{title}</h2>
      <p className="mb-3 text-xs text-muted-foreground">{hint}</p>
      {rows.length === 0 ? <p className="text-sm text-muted-foreground">{t("Hələ yoxdur.")}</p> : (
        <ol className="flex flex-col gap-1.5 text-sm">
          {rows.map((r) => <li key={r.message} className="flex items-baseline justify-between gap-3"><span className="min-w-0 break-words">{r.message}</span><span className="tabular-nums text-muted-foreground">{r.count}×</span></li>)}
        </ol>
      )}
    </section>
  );
}

const PAGE = 30;

function Queries() {
  const { t, short } = useI18n();
  const { tenant } = useSession();
  const supportMode = tenant?.config.profile?.mode === "support";
  const [days, setDays] = useState(30);
  const [onlyEmpty, setOnlyEmpty] = useState(false);
  const [q, setQ] = useState("");
  const [applied, setApplied] = useState("");
  const [stats, setStats] = useState<QueryStats | null>(null);
  const [rows, setRows] = useState<QueryRow[] | null>(null);
  const [meta, setMeta] = useState<{ enabled: boolean; retentionDays: number; hasMore: boolean; nextCursor: string | null }>({ enabled: true, retentionDays: 30, hasMore: false, nextCursor: null });
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"questions" | "conversations" | "analytics">("questions");
  const [funnel, setFunnel] = useState<Funnel | null>(null);
  const [report, setReportOn] = useState<boolean | null>(null);
  const [exportKind, setExportKind] = useState<ExportKind>("queries");
  const [exporting, setExporting] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const seq = useRef(0);

  // Statistika yalnız dövrdən asılıdır; siyahı filtrlərdən. Hər biri müstəqil yüklənir, siyahı isə 30-30 gəlir.
  useEffect(() => {
    let live = true;
    getQueryStats(days).then((s) => live && setStats(s)).catch((e: Error) => live && setError(e.message));
    return () => { live = false; };
    getFunnel(days).then((f) => live && setFunnel(f)).catch(() => live && setFunnel(null));
  }, [days]);
  useEffect(() => { getReport().then((r) => setReportOn(r.monthly)).catch(() => setReportOn(null)); }, []);

  async function doExport() {
    setExporting(true);
    try { const cut = await downloadExport(exportKind, days); toast.success(cut ? t("Fayl yükləndi (ilk 5000 sətir).") : t("Fayl yükləndi.")); }
    catch (e) { toast.error((e as Error).message); }
    finally { setExporting(false); }
  }
  async function toggleReport(v: boolean) {
    setReportOn(v);
    try { await setReport(v); toast.success(v ? t("Aylıq hesabat açıldı.") : t("Aylıq hesabat söndürüldü.")); }
    catch (e) { setReportOn(!v); toast.error((e as Error).message); }
  }

  const loadFirst = useCallback(() => {
    const id = ++seq.current;
    setLoadingList(true); setError("");
    getQueries({ days, noResults: onlyEmpty, q: applied, limit: PAGE })
      .then((l) => { if (id !== seq.current) return; setRows(l.queries); setMeta({ enabled: l.enabled, retentionDays: l.retentionDays, hasMore: l.hasMore, nextCursor: l.nextCursor }); })
      .catch((e: Error) => { if (id === seq.current) setError(e.message); })
      .finally(() => { if (id === seq.current) setLoadingList(false); });
  }, [days, onlyEmpty, applied]);
  useEffect(() => loadFirst(), [loadFirst]);

  async function more() {
    if (!meta.nextCursor || loadingMore) return;
    const id = seq.current;
    setLoadingMore(true);
    try {
      const l = await getQueries({ days, noResults: onlyEmpty, q: applied, limit: PAGE, before: meta.nextCursor });
      if (id !== seq.current) return;
      setRows((cur) => { const have = new Set((cur ?? []).map((r) => r.id)); return [...(cur ?? []), ...l.queries.filter((r) => !have.has(r.id))]; });
      setMeta((m) => ({ ...m, hasMore: l.hasMore, nextCursor: l.nextCursor }));
    } catch (e) { setError((e as Error).message); }
    finally { setLoadingMore(false); }
  }

  if (!stats || !rows) {
    return error ? <p role="alert" className="text-sm text-destructive">{error}</p> : <QueriesSkeleton />;
  }
  const list = { ...meta, queries: rows };

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold">{t("Sorğular")}</h1>
        <p className="text-sm text-muted-foreground">{t("Saytının istifadəçiləri məsləhətçidən nə soruşur. Nəticə tapılmayan suallar sənə hansı elanların çatışmadığını göstərir.")}</p>
      </header>

      {!stats.enabled && (
        <p role="status" className="rounded-md border border-border bg-muted px-3 py-2 text-sm">
          {t("Sorğuların saxlanması söndürülüb, yeni suallar qeyd olunmur. Açmaq üçün")} <Link href="/settings" className="underline">{t("Ayarlar")}</Link> {t("bölməsinə keç.")}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label={t("Sual")} value={stats.total} />
        <Stat label={t("Nəticəsiz")} value={stats.noResults} />
        <Stat label={t("Xəta")} value={stats.errors} />
        <Stat label={t("Keşdən (pulsuz)")} value={stats.cached} />
      </div>
      
      {funnel && (
        <section className="flex flex-col gap-3">
          <div>
            <h2 className="font-medium">{t("Çat nə qədər müraciət gətirdi")}</h2>
            <p className="text-xs text-muted-foreground">{t("Söhbət edənlərin neçəsi operatora yazdı və ya əlaqə qoydu. Satışın özü saytında baş verdiyi üçün burada görünmür, “emal olunub” işarəsi isə sənin qeydindir.")}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label={t("Söhbət")} value={funnel.conversations ?? "–"} />
            <Stat label={t("Operatora yönəldi")} value={funnel.handoffs} hint={t("{live} canlı, {leads} əlaqə forması", { live: funnel.live, leads: funnel.leads })} />
            <Stat label={t("Yönəlmə faizi")} value={funnel.handoffRate === null ? "–" : `${funnel.handoffRate}%`} />
            <Stat label={t("Emal olunub")} value={funnel.handledRate === null ? "–" : `${funnel.handledRate}%`} hint={funnel.leads ? t("{a} / {b} müraciət", { a: funnel.leadsHandled, b: funnel.leads }) : undefined} />
          </div>
        </section>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <TopList title={t("Ən çox verilən suallar")} hint={t("Eyni sual təkrar olunduqca yuxarı qalxır.")} rows={stats.top} />
        <TopList title={t("Ən çox nəticəsiz qalanlar")} hint={t("Bu sorğulara uyğun elan yox idi.")} rows={stats.topNoResults} />
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div role="tablist" className="inline-flex rounded-md border border-border p-0.5 text-sm">
          {(["questions", "conversations", "analytics"] as const).map((k) => (
            <button key={k} role="tab" type="button" aria-selected={tab === k} onClick={() => setTab(k)} className={`rounded px-3 py-1.5 ${tab === k ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{k === "questions" ? t("Suallar") : k === "conversations" ? t("Söhbətlər") : t("Analitika")}</button>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1"><Label htmlFor="exp">{t("CSV ixracı")}</Label>
            <select id="exp" value={exportKind} onChange={(e) => setExportKind(e.target.value as ExportKind)} className="h-9 rounded-md border border-border bg-card px-3 text-sm">
              <option value="queries">{t("Suallar")}</option><option value="conversations">{t("Söhbətlər")}</option><option value="leads">{t("Müraciətlər")}</option><option value="unanswered">{t("Cavabsız suallar")}</option><option value="live">{t("Canlı söhbətlər")}</option>
            </select>
          </div>
          <Button type="button" variant="outline" onClick={doExport} disabled={exporting}>{exporting ? t("Hazırlanır…") : t("Yüklə")}</Button>
        </div>
      </div>

      {tab === "analytics" ? <Insights days={days} onDays={setDays} enabled={stats.enabled} /> : tab === "conversations" ? <Conversations days={days} enabled={stats.enabled} /> : (<>
      <form onSubmit={(e) => { e.preventDefault(); if (q.trim() === applied) loadFirst(); else setApplied(q.trim()); }} className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1"><Label htmlFor="days">{t("Dövr")}</Label>
          <select id="days" value={days} onChange={(e) => setDays(Number(e.target.value))} className="h-9 rounded-md border border-border bg-card px-3 text-sm">
            <option value={7}>{t("Son 7 gün")}</option><option value={30}>{t("Son 30 gün")}</option><option value={90}>{t("Son 90 gün")}</option>
          </select>
        </div>
        <div className="flex flex-col gap-1"><Label htmlFor="q">{t("Axtar")}</Label><Input id="q" type="search" value={q} onChange={(e) => setQ(e.target.value)} className="w-56" placeholder={t("sözə görə")} /></div>
        <div className="flex h-10 items-center gap-2 text-sm"><Switch checked={onlyEmpty} onChange={setOnlyEmpty} id="only-empty" /><Label htmlFor="only-empty">{t("Yalnız nəticəsizlər")}</Label></div>
        <Button disabled={loadingList}>{loadingList ? t("Yüklənir…") : t("Tətbiq et")}</Button>
      </form>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

      {list.queries.length === 0 ? <p className="text-sm text-muted-foreground">{t("Bu filtrə uyğun sorğu yoxdur.")}</p> : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full min-w-[38rem] text-left text-sm">
            <thead className="border-b border-border text-xs text-muted-foreground">
              <tr><th className="px-4 py-2 font-medium">{t("Vaxt")}</th><th className="px-4 py-2 font-medium">{t("Sual")}</th><th className="px-4 py-2 font-medium">{t("Nəticə")}</th><th className="px-4 py-2 text-right font-medium">{t("Xərc")}</th></tr>
            </thead>
            <tbody>
              {list.queries.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0">
                  <td className="whitespace-nowrap px-4 py-2 tabular-nums text-muted-foreground">{short(r.at)}</td>
                  <td className="px-4 py-2 break-words">{r.message}</td>
                  <td className="whitespace-nowrap px-4 py-2">
                    {r.error ? <Badge className="bg-destructive/15 text-destructive">{t("Xəta")}</Badge> : r.results === 0 ? <Badge className="bg-amber/15 text-amber">{t("Tapılmadı")}</Badge> : r.results === -1 ? <Badge className="bg-primary/15 text-primary">{t("Cavablandı")}</Badge> : r.results === -2 ? <Badge className="bg-amber/15 text-amber">{t("Operatora yönləndirildi")}</Badge> : supportMode ? <Badge className="bg-primary/15 text-primary">{t("Cavablandı")}</Badge> : <span className="tabular-nums">{t("{n} elan", { n: r.results })}</span>}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums text-muted-foreground">
                    {r.costAzn == null ? "–" : r.costAzn === 0 ? (r.cached ? t("keşdən") : "0 AZN") : r.costAzn < 0.0001 ? "< 0.0001 AZN" : `${r.costAzn.toFixed(4)} AZN`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {list.queries.length > 0 && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">{t("{n} sorğu göstərilir", { n: list.queries.length })}</p>
          {list.hasMore && <Button type="button" variant="outline" onClick={more} disabled={loadingMore}>{loadingMore ? t("Yüklənir…") : t("Daha çox göstər")}</Button>}
        </div>
      )}
      <p className="text-xs text-muted-foreground">{t("Telefon və email avtomatik gizlədilir. Qeydlər {days} gündən sonra silinir.", { days: list.retentionDays })}</p>
      </>)}

      {report !== null && (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm">
          <Switch checked={report} onChange={toggleReport} id="monthly-report" />
          <div><Label htmlFor="monthly-report">{t("Aylıq e-poçt hesabatı")}</Label><p className="text-xs text-muted-foreground">{t("Hər ayın 1-i son 30 günün qısa nəticəsi qeydiyyat e-poçtuna göndərilir.")}</p></div>
        </div>
      )}

      <DangerAction label="Bütün sorğuları sil" confirm={{ kind: "text", expected: t("sil"), hint: t("Təsdiqləmək üçün “{word}” yaz", { word: t("sil") }) }}
        warning={t("Saxlanmış bütün suallar həmişəlik silinəcək.")}
        onConfirm={async () => { await clearQueries(); toast.success(t("Bütün sorğular silindi.")); setStats(null); setRows(null); setQ(""); setApplied(""); setDays(30); loadFirst(); getQueryStats(30).then(setStats).catch(() => {}); }} />
    </div>
  );
}

export default function QueriesPage() {
  return <RequireTenant><Queries /></RequireTenant>;
}
