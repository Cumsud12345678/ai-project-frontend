"use client";
// Admin: plan kataloqu — qiymət, aylıq cavab limiti, istifadəçi sayı, imkanlar, əlavə paketlər. Planlar yalnız aylıqdır.
// Dəyişiklik yeni sifarişlərə dərhal tətbiq olunur; mövcud abunənin limiti növbəti yeniləmədə dəyişir, imkanlar isə dərhal.
import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { adminGetPlans, adminSavePlans, PLAN_FEATURES, type PlanCatalog } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { PageHeader } from "@/components/page-header";
import { usePlanLabels } from "@/components/plan-ui";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";

type Draft = Omit<PlanCatalog, "plans" | "packs"> & {
  plans: { id: string; name: string; priceAzn: string; replies: string; seats: string; features: PlanCatalog["plans"][number]["features"] }[];
  packs: { id: string; replies: string; priceAzn: string }[];
};
const toDraft = (c: PlanCatalog): Draft => ({ ...c, plans: c.plans.map((p) => ({ ...p, priceAzn: String(p.priceAzn), replies: String(p.replies), seats: String(p.seats) })), packs: c.packs.map((k) => ({ ...k, replies: String(k.replies), priceAzn: String(k.priceAzn) })) });
const n = (s: string) => Number(String(s).replace(",", "."));

export default function AdminPlansPage() {
  const { t } = useI18n();
  const L = usePlanLabels();
  const [d, setD] = useState<Draft | null>(null);
  const [err, setErr] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { adminGetPlans().then((c) => setD(toDraft(c))).catch((e: Error) => setErr(e.message)); }, []);
  if (err) return <p role="alert" className="text-sm text-destructive">{err}</p>;
  if (!d) return <Skeleton className="h-96" />;

  const setPlan = (i: number, patch: Partial<Draft["plans"][number]>) => setD({ ...d, plans: d.plans.map((p, j) => (j === i ? { ...p, ...patch } : p)) });
  const setPack = (i: number, patch: Partial<Draft["packs"][number]>) => setD({ ...d, packs: d.packs.map((p, j) => (j === i ? { ...p, ...patch } : p)) });
  async function save() {
    setBusy(true);
    try {
      const c = await adminSavePlans({
        graceDays: Number(d!.graceDays), packDays: Number(d!.packDays ?? 365),
        plans: d!.plans.map((p) => ({ ...p, priceAzn: n(p.priceAzn), replies: n(p.replies), seats: n(p.seats) })),
        packs: d!.packs.map((k) => ({ ...k, replies: n(k.replies), priceAzn: n(k.priceAzn) })),
      });
      setD(toDraft(c)); setConfirm(false); toast.success(t("Planlar yadda saxlandı."));
    } catch (e) { toast.error((e as Error).message); setConfirm(false); } finally { setBusy(false); }
  }
  const field = "flex flex-col gap-1";
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("Planlar")} description={t("Qiymət, cavab limiti və imkanlar. Yeni sifarişlərə dərhal tətbiq olunur; mövcud abunələrdə imkanlar dərhal, limit isə növbəti yeniləmədə dəyişir.")}
        actions={<Button onClick={() => setConfirm(true)}>{t("Yadda saxla")}</Button>} />

      <section className="grid gap-4 rounded-2xl border border-border bg-card p-5 sm:grid-cols-2">
        <div className={field}><Label htmlFor="gd">{t("Güzəşt günləri")}</Label><Input id="gd" inputMode="numeric" value={String(d.graceDays)} onChange={(e) => setD({ ...d, graceDays: Number(e.target.value) || 0 })} /><p className="text-xs text-muted-foreground">{t("Müddət bitəndən sonra köməkçi neçə gün işləməyə davam edir")}</p></div>
        <div className={field}><Label htmlFor="pd">{t("Paketin müddəti (gün)")}</Label><Input id="pd" inputMode="numeric" value={String(d.packDays ?? 365)} onChange={(e) => setD({ ...d, packDays: Number(e.target.value) || 0 })} /><p className="text-xs text-muted-foreground">{t("0 = müddətsiz")}</p></div>
      </section>

      <ul className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        {d.plans.map((p, i) => (
          <li key={i} className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5">
            <div className="flex items-start gap-2">
              <div className="grid flex-1 gap-3 sm:grid-cols-2">
                <div className={field}><Label htmlFor={`pn${i}`}>{t("Ad")}</Label><Input id={`pn${i}`} value={p.name} onChange={(e) => setPlan(i, { name: e.target.value })} /></div>
                <div className={field}><Label htmlFor={`pi${i}`}>{t("Kod")}</Label><Input id={`pi${i}`} value={p.id} onChange={(e) => setPlan(i, { id: e.target.value.toLowerCase() })} /></div>
              </div>
              <button type="button" disabled={d.plans.length <= 1} onClick={() => setD({ ...d, plans: d.plans.filter((_, j) => j !== i) })} aria-label={t("Planı sil")} className="mt-6 grid size-9 cursor-pointer place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-destructive disabled:opacity-30"><Trash2 size={16} aria-hidden /></button>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className={field}><Label htmlFor={`pp${i}`}>{t("Qiymət (AZN/ay)")}</Label><Input id={`pp${i}`} inputMode="decimal" value={p.priceAzn} onChange={(e) => setPlan(i, { priceAzn: e.target.value })} /></div>
              <div className={field}><Label htmlFor={`pr${i}`}>{t("Cavab / ay")}</Label><Input id={`pr${i}`} inputMode="numeric" value={p.replies} onChange={(e) => setPlan(i, { replies: e.target.value })} /></div>
              <div className={field}><Label htmlFor={`ps${i}`}>{t("İstifadəçi")}</Label><Input id={`ps${i}`} inputMode="numeric" value={p.seats} onChange={(e) => setPlan(i, { seats: e.target.value })} /></div>
            </div>
            <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
              {PLAN_FEATURES.map((k) => (
                <li key={k} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  <span>{L.feature[k]}</span>
                  <Switch checked={p.features[k]} onChange={(v) => setPlan(i, { features: { ...p.features, [k]: v } })} label={`${p.name}: ${L.feature[k]}`} />
                </li>
              ))}
            </ul>
          </li>
        ))}
        {d.plans.length < 8 && (
          <li><button type="button" onClick={() => setD({ ...d, plans: [...d.plans, { id: `plan${d.plans.length + 1}`, name: t("Yeni plan"), priceAzn: "0", replies: "1000", seats: "1", features: Object.fromEntries(PLAN_FEATURES.map((k) => [k, k === "channels"])) as Draft["plans"][number]["features"] }] })}
            className="flex h-full min-h-40 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border text-sm text-muted-foreground hover:bg-muted/40 hover:text-foreground"><Plus size={18} aria-hidden />{t("Plan əlavə et")}</button></li>
        )}
      </ul>

      <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5">
        <h2 className="font-semibold">{t("Əlavə cavab paketləri")}</h2>
        {d.packs.map((k, i) => (
          <div key={i} className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
            <div className={field}><Label htmlFor={`ki${i}`}>{t("Kod")}</Label><Input id={`ki${i}`} value={k.id} onChange={(e) => setPack(i, { id: e.target.value.toLowerCase() })} /></div>
            <div className={field}><Label htmlFor={`kr${i}`}>{t("Cavab")}</Label><Input id={`kr${i}`} inputMode="numeric" value={k.replies} onChange={(e) => setPack(i, { replies: e.target.value })} /></div>
            <div className={field}><Label htmlFor={`kp${i}`}>{t("Qiymət (AZN)")}</Label><Input id={`kp${i}`} inputMode="decimal" value={k.priceAzn} onChange={(e) => setPack(i, { priceAzn: e.target.value })} /></div>
            <button type="button" onClick={() => setD({ ...d, packs: d.packs.filter((_, j) => j !== i) })} aria-label={t("Paketi sil")} className="grid size-10 cursor-pointer place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-destructive"><Trash2 size={16} aria-hidden /></button>
          </div>
        ))}
        {d.packs.length < 6 && <div><Button variant="outline" size="sm" onClick={() => setD({ ...d, packs: [...d.packs, { id: `p${d.packs.length + 1}`, replies: "500", priceAzn: "10" }] })}><Plus size={14} aria-hidden />{t("Paket əlavə et")}</Button></div>}
      </section>

      <Modal open={confirm} onClose={() => setConfirm(false)} busy={busy} size="sm" title={t("Planlar dəyişsin?")}
        footer={<><Button variant="outline" onClick={() => setConfirm(false)} disabled={busy}>{t("Ləğv et")}</Button><Button onClick={save} disabled={busy}>{t("Yadda saxla")}</Button></>}>
        <p className="text-sm text-muted-foreground">{t("İmkanlar bütün mövcud abunəçilər üçün dərhal dəyişir. Aktiv abunəçisi olan planı silmək və ya kodunu dəyişmək olmaz: əvvəlcə həmin müştəriləri başqa plana keçir.")}</p>
      </Modal>
    </div>
  );
}
