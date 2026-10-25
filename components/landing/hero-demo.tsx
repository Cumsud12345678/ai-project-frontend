"use client";
import { useEffect, useState } from "react";
import { Headset, Send, ShoppingBag, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const PRODUCTS = [
  { name: "Sonic X2 Pro", info: "Qara · 12 ay zəmanət", price: "139" },
  { name: "Aero Buds 3", info: "Ağ · 24 ay zəmanət", price: "129" },
  { name: "Nova Air", info: "Qara · 12 ay zəmanət", price: "115" },
];

type Scenario = { id: "catalog" | "support" | "handoff"; query: string; answer: string; note?: string; action?: string };

/** Hero-dakı canlı nümunə: üç ssenari növbə ilə oynayır. Kataloq axtarışı, bilik bazasından cavab, operatora yönləndirmə. */
export function HeroDemo() {
  const { t } = useI18n();
  const scenarios: Scenario[] = [
    { id: "catalog", query: t("Büdcəm 150 AZN-dir, yaxşı simsiz qulaqlıq axtarıram"), answer: t("Büdcənə uyğun 3 məhsul tapdım. Ən ucuzu axırıncıdır.") },
    { id: "support", query: t("Sifariş neçə günə çatdırılır?"), answer: t("Bakı daxilində 1–2 iş günü, rayonlara 3–4 gün. 100 ₼-dən yuxarı sifarişlərdə çatdırılma pulsuzdur."), note: t("Mənbə: Çatdırılma şərtləri") },
    { id: "handoff", query: t("Zəmanəti 3 ilə uzatmaq olarmı?"), answer: t("Bu barədə dəqiq məlumatım yoxdur, uydurmaq istəmirəm. İstəsəniz operatora yazın, sizinlə əlaqə saxlasınlar."), action: t("Operatora yaz") },
  ];
  const [idx, setIdx] = useState(0);
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
        timers.push(setTimeout(() => setPhase("thinking"), 450));
        timers.push(setTimeout(() => setPhase("done"), 1700));
        timers.push(setTimeout(() => setIdx((n) => (n + 1) % 3), 1700 + 5200)); // növbəti ssenari
      }
    }, 38);
    return () => { clearInterval(tick); timers.forEach(clearTimeout); };
  }, [query, idx]);

  const sent = phase !== "typing";
  return (
    <div className="relative">
      <div className="absolute inset-x-4 -bottom-4 top-6 rounded-[2rem] bg-[var(--l-mist)]" aria-hidden />
      <div className="l-float relative mx-auto flex h-[38rem] sm:h-[40rem] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-[var(--l-line)] bg-white shadow-[0_24px_60px_-20px_rgba(12,42,37,.35)]" role="img" aria-label={t("Nümunə söhbət: ziyarətçi sual yazır, köməkçi uyğun variantları tapır, suala cavab verir və ya operatora yönləndirir")}>
        <div className="flex items-center gap-3 bg-[var(--l-teal)] px-4 py-3.5 text-white">
          <span className="grid size-9 place-items-center rounded-full bg-white/15"><Sparkles size={18} aria-hidden /></span>
          <div className="leading-tight"><p className="text-sm font-semibold">{t("Köməkçi")}</p><p className="text-xs text-white/75">{t("Axtarır, cavab verir, lazım olsa operatora yönləndirir")}</p></div>
        </div>

        <div className="flex flex-1 flex-col gap-3 overflow-hidden bg-[#f4f7f4] p-4 text-sm">
          <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-white px-3.5 py-2.5 shadow-sm">{t("Salam! Nə axtardığınızı və ya sualınızı yazın, kömək edim.")}</div>
          {sent && <div className="l-in ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-[var(--l-teal)] px-3.5 py-2.5 text-white">{query}</div>}
          {phase === "thinking" && (
            <div className="l-in flex w-fit gap-1 rounded-2xl rounded-bl-md bg-white px-4 py-3 shadow-sm" aria-hidden>
              {[0, 1, 2].map((i) => <span key={i} className="size-1.5 animate-bounce rounded-full bg-[var(--l-teal)]/60" style={{ animationDelay: `${i * 120}ms` }} />)}
            </div>
          )}
          {phase === "done" && (
            <div key={sc.id} className="l-in flex flex-col gap-2.5">
              <div className="max-w-[90%] rounded-2xl rounded-bl-md bg-white px-3.5 py-2.5 shadow-sm">
                {sc.answer}
                {sc.note && <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[var(--l-mist)] px-2.5 py-1 text-xs text-[#41594f]">{sc.note}</p>}
              </div>
              {sc.action && <span className="inline-flex w-fit items-center gap-2 rounded-xl bg-[var(--l-orange-d)] px-3.5 py-2 text-sm font-semibold text-white"><Headset size={15} aria-hidden />{sc.action}</span>}
              {sc.id === "catalog" && PRODUCTS.map((c, i) => (
                <div key={c.name} className={`${i === 2 ? "max-sm:hidden " : ""}flex items-center gap-3 rounded-xl border border-[var(--l-line)] bg-white p-2.5 shadow-sm`}>
                  <span className="grid size-14 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-[var(--l-mist)] to-[#cfe0d6] text-[var(--l-teal)]"><ShoppingBag size={26} aria-hidden /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{c.name}</p>
                    <p className="truncate text-xs text-[#58706a]">{t(c.info)}</p>
                  </div>
                  <p className="shrink-0 font-semibold text-[var(--l-orange-d)]">{c.price} ₼</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 border-t border-[var(--l-line)] bg-white p-3">
          <div className="flex min-h-10 flex-1 items-center rounded-xl border border-[var(--l-line)] px-3 text-sm" aria-hidden>
            {phase === "typing" ? <span>{query.slice(0, typed)}<span className="l-caret ml-px inline-block h-4 w-px translate-y-0.5 bg-[var(--l-ink)]" /></span> : <span className="text-[#8a9b95]">{t("Mesajınızı yazın…")}</span>}
          </div>
          <span className="grid size-10 place-items-center rounded-xl bg-[var(--l-orange-d)] text-white" aria-hidden><Send size={16} /></span>
        </div>
      </div>
      <p className="relative mt-6 text-center text-xs text-[#58706a]">{t("Nümunə söhbət. Real məlumat sənin saytından və sənədlərindən gələcək.")}</p>
    </div>
  );
}
