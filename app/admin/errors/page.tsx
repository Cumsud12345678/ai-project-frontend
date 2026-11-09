"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { CircleCheck, Copy, Eye, Search, Trash2 } from "lucide-react";
import { adminDeleteErrors, adminErrors, type AdminErrors, type ErrorGroup, type ErrorSource } from "@/lib/api";
import { DangerAction } from "@/components/danger-action";
import { FilterPills, PageHeader } from "@/components/page-header";
import { InfoRow } from "@/components/settings-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { RowMenu } from "@/components/ui/row-menu";
import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const SOURCES: ErrorSource[] = ["api", "ai", "mail", "widget", "channel", "client", "job", "process"];
// Rəng yalnız ciddi mənbələr üçün (server/proses), qalanları neytral
const tone = (s: ErrorSource) => (s === "api" || s === "process" ? "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20" : "bg-muted text-foreground");

function useLabels() {
  const { t } = useI18n();
  return { api: t("Server"), ai: t("AI servisi"), mail: t("E-poçt"), widget: t("Vidjet"), channel: t("Kanal"), client: t("Brauzer"), job: t("Planlı iş"), process: t("Proses") } as Record<ErrorSource, string>;
}

/** Bir xəta qrupunun təfərrüatı: vaxtlar, nümunə sorğu və stack */
function Detail({ g, onClose, onDelete }: { g: ErrorGroup; onClose: () => void; onDelete: () => void }) {
  const { t, num, date } = useI18n();
  const label = useLabels();
  const copy = () => { void navigator.clipboard.writeText([g.message, g.path, g.sample.stack].filter(Boolean).join("\n")).then(() => toast.success(t("Kopyalandı."))).catch(() => {}); };
  return (
    <Modal open onClose={onClose} size="xl" focusFirst={false} title={<span className="flex flex-wrap items-center gap-2"><Badge className={tone(g.source)}>{label[g.source]}</Badge><span className="break-all">{g.message}</span></span>}
      description={g.path ? <span className="font-mono">{g.sample.method ? `${g.sample.method} ` : ""}{g.path}</span> : undefined}
      footer={<>
        <Button variant="outline" className="mr-auto" onClick={copy}><Copy size={15} aria-hidden />{t("Kopyala")}</Button>
        <Button variant="outline" onClick={onDelete}><Trash2 size={15} aria-hidden />{t("Bu qrupu sil")}</Button>
      </>}>
      <div className="flex flex-col gap-4 text-sm">
        <div className="divide-y divide-border rounded-xl border border-border px-4 py-3">
          <InfoRow label={t("Təkrar sayı")}>× {num(g.count)}</InfoRow>
          <InfoRow label={t("İlk baş vermə")}>{date(g.firstAt)}</InfoRow>
          <InfoRow label={t("Son baş vermə")}>{date(g.lastAt)}</InfoRow>
          {(g.status || g.code) && <InfoRow label={t("Kod")}>{[g.status, g.code].filter(Boolean).join(" · ")}</InfoRow>}
          {g.sample.tenantId && <InfoRow label={t("Müştəri ID")}><Link href={`/admin/users?q=${encodeURIComponent(g.sample.tenantId)}`} className="font-mono text-xs hover:underline">{g.sample.tenantId}</Link></InfoRow>}
          {g.sample.userId && <InfoRow label={t("İstifadəçi ID")}><span className="font-mono text-xs">{g.sample.userId}</span></InfoRow>}
        </div>
        {g.sample.stack ? <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-muted p-3 font-mono text-[11px] leading-relaxed">{g.sample.stack}</pre> : <p className="text-muted-foreground">{t("Stack yoxdur.")}</p>}
      </div>
    </Modal>
  );
}

/** Sistem xəta jurnalı: eyni xətalar qruplaşır, mənbə (server, AI, e-poçt, vidjet, brauzer) və vaxta görə süzülür. */
export default function AdminErrorsPage() {
  const { t, num, short } = useI18n();
  const label = useLabels();
  const [range, setRange] = useState<"1d" | "7d" | "30d">("7d");
  const [source, setSource] = useState<ErrorSource | "">("");
  const [q, setQ] = useState("");
  const [data, setData] = useState<AdminErrors | null>(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState<ErrorGroup | null>(null);
  const [clear, setClear] = useState(false);
  const load = useCallback(() => adminErrors({ range, source: source || undefined, q }).then((r) => { setData(r); setError(""); }).catch((e: Error) => setError(e.message)), [range, source, q]);
  useEffect(() => { const id = setTimeout(() => void load(), q ? 250 : 0); return () => clearTimeout(id); }, [load, q]);
  useEffect(() => { const i = setInterval(() => void load(), 30_000); return () => clearInterval(i); }, [load]);

  const remove = async (fingerprint?: string) => {
    try {
      const r = await adminDeleteErrors(fingerprint);
      toast.success(t("{n} qeyd silindi.", { n: r.deleted }));
      setOpen(null); setClear(false);
      await load();
    } catch (e) { toast.error((e as Error).message); }
  };
  const all = data ? Object.values(data.bySource).reduce((a, b) => a + b, 0) : undefined;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("Xətalar")} description={t("Serverdə, AI servisində, e-poçtda, vidjetdə və panelin brauzerində baş verən gözlənilməz xətalar. Qeydlər 30 gündən sonra avtomatik silinir.")}
        actions={<>
          <Segmented value={range} onChange={setRange} label={t("Dövr")} options={[{ value: "1d", label: t("24 saat") }, { value: "7d", label: t("7 gün") }, { value: "30d", label: t("30 gün") }]} />
          <Button variant="outline" disabled={!data?.groups.length} onClick={() => setClear(true)}><Trash2 size={16} aria-hidden />{t("Hamısını təmizlə")}</Button>
        </>} />

      <div className="flex flex-wrap items-center gap-3">
        <FilterPills value={source} onChange={setSource} label={t("Mənbə")} items={[
          { value: "" as ErrorSource | "", label: t("Hamısı"), count: all },
          ...SOURCES.filter((s) => data?.bySource[s] || source === s).map((s) => ({ value: s as ErrorSource | "", label: label[s], count: data?.bySource[s] ?? 0 })),
        ]} />
        <div className="relative ml-auto w-full max-w-xs">
          <Search size={15} aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input type="search" placeholder={t("Mesaj, ünvan və ya kod üzrə axtar")} aria-label={t("Axtar")} value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
        </div>
      </div>

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {!data && !error && <Skeleton className="h-40" />}
      {data && data.groups.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border px-6 py-12 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-muted"><CircleCheck size={22} className="text-emerald-600" aria-hidden /></span>
          <p className="font-medium">{q || source ? t("Bu süzgəc üzrə xəta yoxdur.") : t("Bu dövrdə xəta qeydə alınmayıb.")}</p>
        </div>
      )}
      {data && data.groups.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="border-b border-border text-left text-xs text-muted-foreground"><tr><th className="w-28 px-4 py-3 font-medium">{t("Mənbə")}</th><th className="w-[60%] px-4 py-3 font-medium">{t("Xəta")}</th><th className="px-4 py-3 text-right font-medium">{t("Say")}</th><th className="px-4 py-3 font-medium">{t("Son")}</th><th className="w-12" /></tr></thead>
              <tbody className="divide-y divide-border">
                {data.groups.map((g) => (
                  <tr key={g.fingerprint} className="cursor-pointer align-top hover:bg-muted/40" onClick={() => setOpen(g)}>
                    <td className="px-4 py-3"><Badge className={tone(g.source)}>{label[g.source]}</Badge></td>
                    <td className="max-w-0 px-4 py-3"><p className="truncate font-medium">{g.message}</p><p className="truncate text-xs text-muted-foreground">{g.path && <span className="font-mono">{g.path}</span>}{g.path && (g.status || g.code) ? " · " : ""}{[g.status, g.code].filter(Boolean).join(" · ")}</p></td>
                    <td className={cn("px-4 py-3 text-right font-semibold tabular-nums", g.count >= 10 && "text-destructive")}>{num(g.count)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{short(g.lastAt)}</td>
                    <td className="px-2 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                      <RowMenu items={[{ label: t("Ətraflı"), icon: Eye, run: () => setOpen(g) }, { label: t("Bu qrupu sil"), icon: Trash2, danger: true, run: () => void remove(g.fingerprint) }]} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">{t("{g} fərqli xəta, cəmi {n} hadisə", { g: num(data.groups.length), n: num(data.total) })} · {t("Səhifə hər 30 saniyədə yenilənir.")}</p>
        </div>
      )}

      {open && <Detail g={open} onClose={() => setOpen(null)} onDelete={() => void remove(open.fingerprint)} />}
      <Modal open={clear} onClose={() => setClear(false)} size="sm" title={t("Bütün xətalar təmizlənsin?")} description={t("Bütün xəta qeydləri silinəcək. Bu əməliyyat audit jurnalına yazılır.")}>
        <DangerAction label="Bütün xətaları təmizlə" warning={t("Bu əməliyyat geri qaytarılmır.")} confirm={{ kind: "text", expected: "sil", hint: t("Təsdiqləmək üçün “sil” yaz") }} onConfirm={() => remove()} />
      </Modal>
    </div>
  );
}
