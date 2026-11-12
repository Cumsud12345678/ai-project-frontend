// Hazırlıq addımları: TƏK mənbə. Quraşdırma sehirbazı (/setup), yuxarı zolaqdakı "Hazırlıq x/5",
// Ümumi baxış və Köməkçi səhifələri eyni addımları, eyni adları və eyni şərtləri göstərir.
import type { Overview } from "./api";
import type { T } from "./i18n";

export type Goal = "answer" | "catalog";
export type StepId = "business" | "goals" | "data" | "test" | "launch";
export type SetupFacts = { hasTenant: boolean; goals: Goal[]; dataReady: boolean; tested: boolean; launched: boolean; hasSite: boolean };
export type SetupStep = { id: StepId; label: string; note: string; done: boolean; href: string };

/** Məlumat addımı: elan axtarışı seçilibsə kataloq, yalnız suallar seçilibsə bilik bazası (backend /tenant/overview ilə eyni qayda) */
export const dataDone = (goals: Goal[], catalogReady: boolean, kbReady: boolean, fallback: boolean) =>
  goals.length ? (goals.includes("catalog") ? catalogReady : kbReady) : fallback;

export function setupSteps(f: SetupFacts, t: T): SetupStep[] {
  const href = (id: StepId) => `/setup?step=${id}`;
  return [
    { id: "business", label: t("Biznes"), note: t("Ad və sayt"), done: f.hasTenant, href: href("business") },
    { id: "goals", label: t("Biznes növü"), note: t("Hazır ayarlar"), done: f.hasTenant && f.goals.length > 0, href: href("goals") },
    { id: "data", label: t("Məlumat"), note: f.goals.includes("catalog") ? t("Elanlar və kataloq") : t("Cavablar nədən gəlsin"), done: f.dataReady, href: href("data") },
    { id: "test", label: t("Sınaq"), note: t("Müştəri kimi yoxla"), done: f.dataReady && f.tested, href: href("test") },
    { id: "launch", label: t("Yayımla"), note: f.hasSite ? t("Sayta və kanallara qoş") : t("Telegram və WhatsApp"), done: f.launched, href: href("launch") },
  ];
}

/** Server hazırlığından (panelin hər yerində) */
export function factsFromOverview(o: Overview | null | undefined): SetupFacts | null {
  const s = o?.setup;
  if (!s) return null;
  return {
    hasTenant: true,
    goals: (s.goals ?? []).filter((g): g is Goal => g === "answer" || g === "catalog"),
    dataReady: s.dataReady,
    tested: s.tested ?? s.firstQuestion, // köhnə backend
    launched: s.launched ?? s.widgetInstalled,
    hasSite: s.hasSite ?? true,
  };
}

export type Readiness = SetupFacts & { done: number; total: number };
export function readiness(o: Overview | null | undefined): Readiness | null {
  const f = factsFromOverview(o);
  if (!f) return null;
  const steps = setupSteps(f, (k) => k);
  return { ...f, done: steps.filter((x) => x.done).length, total: steps.length };
}
