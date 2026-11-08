"use client";
import { useEffect, useState } from "react";
import { BookOpen, Headset, Search, Send, ShoppingBag, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const PRODUCTS = [
  { name: "Sonic X2 Pro", info: "Qara · 12 ay zəmanət", price: "139" },
  { name: "Aero Buds 3", info: "Ağ · 24 ay zəmanət", price: "129" },
  { name: "Nova Air", info: "Qara · 12 ay zəmanət", price: "115" },
];

type Scenario = { id: "catalog" | "support" | "handoff"; tab: string; icon: React.ElementType; query: string; answer: string; note?: string; action?: string };
const HOLD = 5200; // cavab göründükdən sonra növbəti ssenariyə qədər

/**
 * Hero-dakı canlı nümunə: üç ssenari (kataloq axtarışı, bilik bazasından cavab, operatora yönləndirmə).
 * Yuxarıdakı tablarla istənilən ssenarini seçmək olar; üzərinə gələndə avtomatik keçid dayanır.
 */
export function HeroDemo() {
  const { t } = useI18n();
  const scenarios: Scenario[] = [
    { id: "catalog", tab: t("Kataloq"), icon: Search, query: t("Büdcəm 150 AZN-dir, yaxşı simsiz qulaqlıq axtarıram"), answer: t("Büdcənə uyğun 3 məhsul tapdım. Ən ucuzu axırıncıdır.") },
    { id: "support", tab: t("Sual-cavab"), icon: BookOpen, query: t("Sifariş neçə günə çatdırılır?"), answer: t("Bakı daxilində 1–2 iş günü, rayonlara 3–4 gün. 100 ₼-dən yuxarı sifarişlərdə çatdırılma pulsuzdur."), note: t("Mənbə: Çatdırılma şərtləri") },
    { id: "handoff", tab: t("Operator"), icon: Headset, query: t("Zəmanəti 3 ilə uzatmaq olarmı?"), answer: t("Bu barədə dəqiq məlumatım yoxdur, uydurmaq istəmirəm. İstəsəniz operatora yazın, sizinlə əlaqə saxlasınlar."), action: t("Operatora yaz") },
  ];
  const [idx, setIdx] = useState(0);
  const [run, setRun] = useState(0); // eyni taba yenidən klikləyəndə ssenari təzədən oynasın
  const [paused, setPaused] = useState(false);
  const sc = scenarios[idx]!;
  const query = sc.query;
  const [typed, setTyped] = useState(0);
  const [phase, setPhase] = useState<"typing" | "thinking" | "done">("typing");

  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setTyped(query.length); setPhase("done"); return; }
    setTyped(0); setPhase("typing");
    let i = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const tick = setInterval(() => {
      i += 1; setTyped(i);
      if (i >= query.length) {
        clearInterval(tick);
        timers.push(setTimeout(() => setPhase("thinking"), 400));
        timers.push(setTimeout(() => setPhase("done"), 1500));
      }
    }, 34);
    return () => { clearInterval(tick); timers.forEach(clearTimeout); };
  }, [query, idx, run]);

  // Cavab göründükdən sonra növbəti ssenari (üzərinə gələndə gözləyir)
  useEffect(() => {
    if (phase !== "done" || paused) return;
    const id = setTimeout(() => setIdx((n) => (n + 1) % scenarios.length), HOLD);
    return () => clearTimeout(id);
  }, [phase, paused, scenarios.length]);

  const pick = (i: number) => { setIdx(i); setRun((n) => n + 1); };
  const sent = phase !== "typing";
  return (
    <div className="relative" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="absolute -inset-x-3 -top-3 -bottom-6 rounded-[2.25rem] bg-gradient-to-b from-[var(--l-mist)] to-transparent" aria-hidden />

      <div role="tablist" aria-label={t("Nümunə ssenarilər")} className="relative mx-auto mb-3 grid w-full max-w-md grid-cols-3 gap-1 rounded-2xl border border-[var(--l-line)] bg-white/80 p-1 backdrop-blur">
        {scenarios.map((s, i) => (
          <button key={s.id} type="button" role="tab" aria-selected={i === idx} onClick={() => pick(i)}
            className={`relative flex cursor-pointer items-center justify-center gap-1.5 overflow-hidden rounded-xl px-2 py-2 text-[13px] font-semibold transition-colors ${i === idx ? "bg-[var(--l-ink)] text-white" : "text-[var(--l-sub)] hover:bg-[var(--l-mist)] hover:text-[var(--l-ink)]"}`}>
            <s.icon size={14} aria-hidden /><span className="truncate">{s.tab}</span>
            {i === idx && phase === "done" && !paused && <span key={`${idx}-${run}`} className="l-progress absolute inset-x-0 bottom-0 h-0.5 bg-[var(--l-orange)]" style={{ "--dur": `${HOLD}ms` } as React.CSSProperties} aria-hidden />}
          </button>
        ))}
      </div>

      <div className="relative mx-auto flex h-[34rem] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-[var(--l-line)] bg-white shadow-[0_30px_70px_-30px_rgba(9,9,11,.45)] sm:h-[36rem]" role="img" aria-label={t("Nümunə söhbət: ziyarətçi sual yazır, köməkçi uyğun variantları tapır, suala cavab verir və ya operatora yönləndirir")}>
        <div className="flex items-center gap-3 border-b border-[var(--l-line)] px-4 py-3.5">
          <span className="relative grid size-9 place-items-center rounded-full bg-[var(--l-ink)] text-white"><Sparkles size={17} aria-hidden /><span className="absolute right-0 bottom-0 size-2.5 rounded-full border-2 border-white bg-emerald-500" /></span>
          <div className="min-w-0 leading-tight"><p className="text-sm font-semibold">{t("Köməkçi")}</p><p className="truncate text-xs text-[var(--l-sub)]">{t("Axtarır, cavab verir, lazım olsa operatora yönləndirir")}</p></div>
        </div>

        <div className="flex flex-1 flex-col gap-3 overflow-hidden bg-[#fafafa] p-4 text-sm">
          <div className="max-w-[85%] rounded-2xl rounded-bl-md border border-[var(--l-line)] bg-white px-3.5 py-2.5">{t("Salam! Nə axtardığınızı və ya sualınızı yazın, kömək edim.")}</div>
          {sent && <div className="l-in ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-[var(--l-ink)] px-3.5 py-2.5 text-white">{query}</div>}
          {phase === "thinking" && (
            <div className="l-in flex w-fit gap-1 rounded-2xl rounded-bl-md border border-[var(--l-line)] bg-white px-4 py-3" aria-hidden>
              {[0, 1, 2].map((i) => <span key={i} className="size-1.5 animate-bounce rounded-full bg-[var(--l-ink)]/50" style={{ animationDelay: `${i * 120}ms` }} />)}
            </div>
          )}
          {phase === "done" && (
            <div key={`${sc.id}-${run}`} className="l-in flex flex-col gap-2.5">
              <div className="max-w-[90%] rounded-2xl rounded-bl-md border border-[var(--l-line)] bg-white px-3.5 py-2.5">
                {sc.answer}
                {sc.note && <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[var(--l-mist)] px-2.5 py-1 text-xs text-[var(--l-sub)]"><BookOpen size={12} aria-hidden />{sc.note}</p>}
              </div>
              {sc.action && <span className="inline-flex w-fit items-center gap-2 rounded-xl bg-[var(--l-orange-d)] px-3.5 py-2 text-sm font-semibold text-white"><Headset size={15} aria-hidden />{sc.action}</span>}
              {sc.id === "catalog" && PRODUCTS.map((c, i) => (
                <div key={c.name} className={`${i === 2 ? "max-sm:hidden " : ""}l-in flex items-center gap-3 rounded-xl border border-[var(--l-line)] bg-white p-2.5`} style={{ animationDelay: `${(i + 1) * 120}ms` }}>
                  <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-[var(--l-mist)] to-[#e4e4e7]"><ShoppingBag size={22} aria-hidden /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{c.name}</p>
                    <p className="truncate text-xs text-[#71717a]">{t(c.info)}</p>
                  </div>
                  <p className="shrink-0 font-semibold">{c.price} ₼</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 border-t border-[var(--l-line)] bg-white p-3">
          <div className="flex min-h-10 min-w-0 flex-1 items-center rounded-xl border border-[var(--l-line)] px-3 text-sm" aria-hidden>
            {phase === "typing" ? <span className="py-2 leading-snug">{query.slice(0, typed)}<span className="l-caret ml-px inline-block h-4 w-px translate-y-0.5 bg-[var(--l-ink)]" /></span> : <span className="text-[#a1a1aa]">{t("Mesajınızı yazın…")}</span>}
          </div>
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--l-ink)] text-white" aria-hidden><Send size={16} /></span>
        </div>
      </div>
      <p className="relative mt-5 text-center text-xs text-[#71717a]">{t("Nümunə söhbət. Real məlumat sənin saytından və sənədlərindən gələcək.")}</p>
    </div>
  );
}
