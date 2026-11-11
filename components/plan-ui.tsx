"use client";
// Abunə planı üçün ortaq hissələr: imkan adları, plan kartındakı siyahı, qiymət, bağlı imkan nişanı və hook.
import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Lock, X } from "lucide-react";
import { PLAN_FEATURES, getEntitlements, type Entitlements, type Plan, type PlanFeature } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";


export function usePlanLabels() {
  const { t } = useI18n();
  const feature: Record<PlanFeature, string> = {
    channels: t("WhatsApp və Telegram"),
    live: t("Canlı operator söhbəti"),
    automations: t("Avtomatlaşdırmalar"),
    campaigns: t("Proaktiv kampaniyalar"),
    actions: t("Əməliyyatlar (sifariş, rezerv və s.)"),
    customerData: t("Müştəri məlumatı (giriş etmiş istifadəçi)"),
    noBranding: t("“Hazırcavab” yazısı olmadan"),
  };
  return {
    feature,
    // Rəqəm sadə formatla (10 000): saytın server və brauzer görüntüsü eyni olsun (hydration)
    repliesShort: (n: number) => t("{n} cavab / ay", { n: String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ") }),
    seats: (n: number) => (n <= 1 ? t("1 istifadəçi") : t("{n} istifadəçi (sahib + {o} operator)", { n, o: n - 1 })),
    upgrade: t("yüksəltmə"),
  };
}

/** Plan kartındakı imkanlar: daxil olanlar yaşıl işarə, olmayanlar solğun */
export function PlanFeatureList({ plan, dark = false }: { plan: Plan; dark?: boolean }) {
  const L = usePlanLabels();
  return (
    <ul className="flex flex-col gap-2 text-sm">
      <li className="flex gap-2 font-medium"><Check size={16} aria-hidden className="mt-0.5 shrink-0 text-emerald-600" />{L.repliesShort(plan.replies)}</li>
      <li className="flex gap-2"><Check size={16} aria-hidden className="mt-0.5 shrink-0 text-emerald-600" />{L.seats(plan.seats)}</li>
      {PLAN_FEATURES.map((k) => (
        <li key={k} className={cn("flex gap-2", !plan.features[k] && (dark ? "text-white/40" : "text-muted-foreground/70"))}>
          {plan.features[k] ? <Check size={16} aria-hidden className="mt-0.5 shrink-0 text-emerald-600" /> : <X size={16} aria-hidden className="mt-0.5 shrink-0" />}
          <span className={cn(!plan.features[k] && "line-through decoration-1")}>{L.feature[k]}</span>
        </li>
      ))}
    </ul>
  );
}

type Ent = Entitlements & { unlock: Record<PlanFeature, string | null> };
let cache: { at: number; p: Promise<Ent> } | null = null;
/** Panel: planın imkanları (30 saniyə keşlənir; plan dəyişəndə səhifə yenilənəndə təzələnir) */
export function useEntitlements() {
  const [e, setE] = useState<Ent | null>(null);
  useEffect(() => {
    if (!cache || Date.now() - cache.at > 30_000) cache = { at: Date.now(), p: getEntitlements() };
    let on = true;
    cache.p.then((v) => { if (on) setE(v); }).catch(() => { cache = null; });
    return () => { on = false; };
  }, []);
  return e;
}

/** Bağlı imkan: "Biznes planında" nişanı (Plan səhifəsinə keçid). İmkan açıqdırsa heç nə göstərmir. */
export function PlanLock({ feature, className }: { feature: PlanFeature; className?: string }) {
  const { t } = useI18n();
  const e = useEntitlements();
  if (!e || e.features[feature] !== false) return null;
  return (
    <Link href="/billing" className={cn("inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground ring-1 ring-inset ring-border hover:bg-card", className)}>
      <Lock size={12} aria-hidden />{e.unlock[feature] ? t("{p} planında", { p: e.unlock[feature]! }) : t("Planınızda yoxdur")}
    </Link>
  );
}

/** Bağlı imkan üçün səhifə başında izah zolağı */
export function PlanLockNotice({ feature }: { feature: PlanFeature }) {
  const { t } = useI18n();
  const L = usePlanLabels();
  const e = useEntitlements();
  if (!e || e.features[feature] !== false) return null;
  return (
    <div role="status" className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-muted/40 p-4 text-sm">
      <Lock size={16} aria-hidden className="shrink-0" />
      <p className="min-w-0 flex-1">{e.unlock[feature]
        ? t("“{f}” sənin planında yoxdur: ayarlar saxlanılır, amma işləmir. {p} planında açılır.", { f: L.feature[feature], p: e.unlock[feature]! })
        : t("“{f}” sənin planında yoxdur: ayarlar saxlanılır, amma işləmir.", { f: L.feature[feature] })}</p>
      <Link href="/billing" className="rounded-lg bg-foreground px-3 py-1.5 font-medium text-background hover:bg-foreground/90">{t("Planı yüksəlt")}</Link>
    </div>
  );
}
