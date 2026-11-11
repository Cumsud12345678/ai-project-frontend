"use client";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { CircleCheck, Clock, Mail, Phone, Rocket, Wrench } from "lucide-react";
import { adminBuildSetupRequest, adminSetupRequests, adminUpdateSetupRequest, type AdminSetupRequest, type SetupRequestStatus } from "@/lib/api";
import { FilterPills, PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n";

type Filter = "all" | SetupRequestStatus;

/** Bir sorğu: müştərinin yazdıqları, admin qeydi, status və "Botu qur" düyməsi */
function RequestCard({ r, reload }: { r: AdminSetupRequest; reload: () => void }) {
  const { t, short } = useI18n();
  const [note, setNote] = useState(r.adminNote ?? "");
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const stLabel: Record<SetupRequestStatus, string> = { new: t("Yeni"), in_progress: t("İşdədir"), done: t("Hazırdır") };
  const stColor: Record<SetupRequestStatus, string> = { new: "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/20", in_progress: "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-600/20", done: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20" };
  const patch = async (p: { status?: SetupRequestStatus; adminNote?: string }, ok: string) => {
    setBusy(true);
    try { await adminUpdateSetupRequest(r.userId, p); toast.success(ok); reload(); } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };
  async function build() {
    setBusy(true);
    try {
      const out = await adminBuildSetupRequest(r.userId);
      toast.success(out.created ? t("Bot yaradıldı, {n} mətn bilik bazasına əlavə olundu. Müştəriyə e-poçt getdi.", { n: out.kb }) : t("{n} mətn mövcud botun bilik bazasına əlavə olundu. Müştəriyə e-poçt getdi.", { n: out.kb }));
      if (out.warnings.length) toast.warning(out.warnings.join("\n"));
      setConfirm(false); reload();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  const Block = ({ title, text }: { title: string; text: string }) => text ? <div><p className="text-xs font-medium text-muted-foreground">{title}</p><p className="mt-0.5 whitespace-pre-wrap break-words text-sm">{text}</p></div> : null;
  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4">
      <header className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 font-semibold">{r.businessName}<Badge className={stColor[r.status]}>{stLabel[r.status]}</Badge></p>
          <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <a href={`mailto:${r.email}`} className="inline-flex items-center gap-1 hover:underline"><Mail size={13} aria-hidden />{r.email}</a>
            <a href={`tel:${r.phone.replace(/[^\d+]/g, "")}`} className="inline-flex items-center gap-1 hover:underline"><Phone size={13} aria-hidden />{r.phone}</a>
            {r.website && <span>{r.website}</span>}
            <span>{short(r.createdAt)}</span>
          </p>
          {!!r.channels.length && <p className="mt-1 text-xs text-muted-foreground">{t("Kanallar")}: {r.channels.join(", ")}</p>}
          {r.status === "done" && r.doneBy && <p className="mt-1 text-xs text-muted-foreground">{t("Qurdu: {by}, {d}", { by: r.doneBy, d: r.doneAt ? short(r.doneAt) : "" })}{r.tenantId ? ` · ${r.tenantId}` : ""}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {r.status === "new" && <Button size="sm" variant="outline" disabled={busy} onClick={() => patch({ status: "in_progress" }, t("İşə götürüldü."))}><Clock size={14} aria-hidden />{t("İşə götür")}</Button>}
          {r.status !== "done" && <Button size="sm" disabled={busy} onClick={() => setConfirm(true)}><Rocket size={14} aria-hidden />{t("Botu qur")}</Button>}
          {r.status === "done" && <Button size="sm" variant="ghost" disabled={busy} onClick={() => patch({ status: "in_progress" }, t("Yenidən açıldı."))}>{t("Yenidən aç")}</Button>}
        </div>
      </header>
      <div className="flex flex-col gap-3 rounded-xl bg-muted/40 p-3">
        <Block title={t("Biznes, məhsul/xidmətlər və qiymətlər")} text={r.description} />
        <Block title={t("Satış ssenarisi")} text={r.salesScript} />
        <Block title={t("Tez-tez verilən suallar")} text={r.faq} />
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <Textarea rows={2} value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)} placeholder={t("Müştəriyə görünən qeyd (məs. “Sabah zəng edəcəyik”)")} aria-label={t("Qeyd")} className="flex-1" />
        <Button size="sm" variant="outline" disabled={busy || note === (r.adminNote ?? "")} onClick={() => patch({ adminNote: note }, t("Qeyd saxlandı."))}>{t("Qeydi saxla")}</Button>
      </div>
      <Modal open={confirm} onClose={() => setConfirm(false)} busy={busy} size="sm" title={t("Bot qurulsun?")}
        footer={<><Button variant="outline" onClick={() => setConfirm(false)} disabled={busy}>{t("Ləğv et")}</Button><Button disabled={busy} onClick={build}>{busy ? t("Qurulur…") : t("Qur")}</Button></>}>
        <p className="text-sm text-muted-foreground">{t("Müştərinin hesabı yoxdursa dəstək rejimində bot yaradılır, yazdıqları bilik bazasına əlavə olunur, satış ssenarisi təlimat olur. Hesab varsa yalnız bilik bazasına əlavə olunur. Sonda müştəriyə “hazırdır” e-poçtu gedir.")}</p>
      </Modal>
    </article>
  );
}

export default function AdminSetupPage() {
  const { t } = useI18n();
  const [filter, setFilter] = useState<Filter>("new");
  const [data, setData] = useState<{ items: AdminSetupRequest[]; counts: Record<SetupRequestStatus, number> } | null>(null);
  const load = useCallback(() => { adminSetupRequests(filter === "all" ? undefined : filter).then(setData).catch((e) => toast.error((e as Error).message)); }, [filter]);
  useEffect(() => { setData(null); load(); }, [load]);
  const c = data?.counts;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("Qurulum sorğuları")} description={t("Müştəri “Qurulumu bizə həvalə et” formasını doldurur. Məlumatı yoxla, lazım olsa zəng et, sonra bir kliklə botu qur.")} />
      <FilterPills value={filter} onChange={setFilter} label={t("Status")} items={[
        { value: "new", label: t("Yeni"), count: c?.new }, { value: "in_progress", label: t("İşdədir"), count: c?.in_progress }, { value: "done", label: t("Hazırdır"), count: c?.done }, { value: "all", label: t("Hamısı") },
      ]} />
      {!data ? <Skeleton className="h-48" /> : data.items.length ? (
        <div className="flex flex-col gap-4">{data.items.map((r) => <RequestCard key={r.userId} r={r} reload={load} />)}</div>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border px-6 py-10 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-muted">{filter === "done" ? <CircleCheck size={22} aria-hidden /> : <Wrench size={22} aria-hidden />}</span>
          <p className="text-sm text-muted-foreground">{t("Bu bölmədə sorğu yoxdur.")}</p>
        </div>
      )}
    </div>
  );
}
