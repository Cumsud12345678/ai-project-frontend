"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Globe, Headset, RotateCcw, Send, Sparkles } from "lucide-react";
import { Reveal } from "@/components/landing/reveal";
import { useI18n } from "@/lib/i18n";

type Msg =
  | { k: "user"; text: string }
  | { k: "bot"; text: string; note?: string }
  | { k: "system"; text: string }
  | { k: "operator"; text: string }
  | { k: "action"; state: "ask" | "done" | "no" };
type Step = "faq" | "cancel" | "operator";

/**
 * Landingdə "özün sına": əvvəlcədən yazılmış ssenari (AI çağırılmır, şəbəkə sorğusu yoxdur).
 * Solda ziyarətçinin gördüyü çat, sağda operator tərəfi: söhbət, səhifə konteksti və əməliyyat jurnalı.
 */
export function LiveDemo({ signedIn }: { signedIn: boolean }) {
  const { t } = useI18n();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [used, setUsed] = useState<Step[]>([]);
  const [log, setLog] = useState<string[]>([]);
  const [handoff, setHandoff] = useState(false);
  const timers = useRef<number[]>([]);
  const end = useRef<HTMLDivElement>(null);
  const later = (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)); };
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useEffect(() => { const box = end.current?.parentElement; if (box) box.scrollTop = box.scrollHeight; }, [msgs]);

  const push = (m: Msg) => setMsgs((cur) => [...cur, m]);
  const reset = () => { timers.current.forEach(clearTimeout); timers.current = []; setMsgs([]); setUsed([]); setLog([]); setHandoff(false); };
  const busy = used.length > 0 && msgs[msgs.length - 1]?.k === "user";

  function ask(step: Step) {
    if (used.includes(step) || busy) return;
    setUsed((u) => [...u, step]);
    if (step === "faq") {
      push({ k: "user", text: t("Salam, məhsulların zəmanəti var?") });
      later(() => push({ k: "bot", text: t("Bəli, bütün məhsullara 12 ay zəmanət verilir."), note: t("Mənbə: Zəmanət şərtləri") }), 700);
    } else if (step === "cancel") {
      push({ k: "user", text: t("Sifariş #10482-ni ləğv etmək istəyirəm") });
      later(() => push({ k: "bot", text: t("Ləğv etməzdən əvvəl yoxla:") }), 600);
      later(() => push({ k: "action", state: "ask" }), 1100);
    } else {
      push({ k: "user", text: t("Operatorla danışmaq istəyirəm") });
      later(() => { push({ k: "system", text: t("Operator söhbətə qoşuldu") }); setHandoff(true); }, 700);
      later(() => push({ k: "operator", text: t("Salam! Sizə necə kömək edə bilərəm?") }), 1700);
    }
  }
  function decide(yes: boolean) {
    setMsgs((cur) => cur.map((m) => (m.k === "action" && m.state === "ask" ? { ...m, state: yes ? "done" : "no" } : m)));
    later(() => push({ k: "bot", text: yes ? t("Sifariş {orderNo} ləğv edildi.", { orderNo: "#10482" }) : t("Əməliyyat ləğv olundu, heç nə dəyişmədi.") }), 500);
    if (yes) setLog((l) => [...l, t("Sifariş {orderNo} ləğv olunacaq", { orderNo: "#10482" })]);
  }

  const chips: [Step, string][] = [["faq", t("Salam, məhsulların zəmanəti var?")], ["cancel", t("Sifariş #10482-ni ləğv etmək istəyirəm")], ["operator", t("Operatorla danışmaq istəyirəm")]];
  const asked = msgs.some((m) => m.k === "action" && m.state === "ask");

  return (
    <section id="sinaq" className="scroll-mt-20 bg-[var(--l-mist)] py-16 lg:py-24">
      <div className="mx-auto w-full max-w-6xl px-5">
        <Reveal as="p" className="text-sm font-semibold tracking-wide text-[var(--l-orange-d)] uppercase">{t("Özün sına")}</Reveal>
        <Reveal as="h2" delay={80} className="l-display mt-3 max-w-3xl text-[clamp(1.5rem,3.4vw,2.4rem)] font-semibold leading-[1.15]">{t("Çatda yaz, operatorun nə gördüyünü də gör")}</Reveal>
        <Reveal as="p" delay={160} className="mt-5 max-w-2xl text-[16px] leading-relaxed text-[#41594f]">{t("Aşağıdakı suallardan birini bas. Solda ziyarətçinin gördüyü çatı, sağda isə eyni anda operatorun və sahibin panelində nə göründüyünü izləyirsən.")}</Reveal>

        <div className="mt-10 grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-2">
          <div className="flex min-w-0 flex-col overflow-hidden rounded-3xl border border-[var(--l-line)] bg-white shadow-[0_24px_60px_-24px_rgba(12,42,37,.35)]">
            <div className="flex items-center gap-3 bg-[var(--l-teal)] px-4 py-3.5 text-white">
              <span className="grid size-9 place-items-center rounded-full bg-white/15"><Sparkles size={18} aria-hidden /></span>
              <div className="leading-tight"><p className="text-sm font-semibold">{t("Köməkçi")}</p><p className="text-xs text-white/75">{t("Ziyarətçinin gördüyü")}</p></div>
            </div>
            <div className="flex h-[22rem] flex-col gap-3 overflow-y-auto bg-[#f4f7f4] p-4 text-sm" role="log" aria-live="polite" aria-label={t("Nümunə söhbət")}>
              {!msgs.length && <p className="m-auto max-w-[16rem] text-center text-[#58706a]">{t("Aşağıdan bir sual seç.")}</p>}
              {msgs.map((m, i) => {
                if (m.k === "user") return <div key={i} className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-[var(--l-teal)] px-3.5 py-2.5 text-white">{m.text}</div>;
                if (m.k === "bot") return (
                  <div key={i} className="max-w-[90%] rounded-2xl rounded-bl-md bg-white px-3.5 py-2.5 shadow-sm">{m.text}
                    {m.note && <p className="mt-2 inline-flex rounded-full bg-[var(--l-mist)] px-2.5 py-1 text-xs text-[#41594f]">{m.note}</p>}
                  </div>
                );
                if (m.k === "system") return <div key={i} className="mx-auto rounded-full bg-[var(--l-mist)] px-3 py-1 text-xs text-[#41594f]">{m.text}</div>;
                if (m.k === "operator") return (
                  <div key={i} className="max-w-[90%] rounded-2xl rounded-bl-md border border-[var(--l-orange-d)]/30 bg-white px-3.5 py-2.5 shadow-sm">
                    <p className="mb-1 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--l-orange-d)]"><Headset size={13} aria-hidden />{t("Operator · Aynur")}</p>
                    <p>{m.text}</p>
                  </div>
                );
                return (
                  <div key={i} className={`max-w-[92%] rounded-2xl rounded-bl-md border bg-white p-3.5 shadow-sm ${m.state === "ask" ? "border-[var(--l-teal)]/30" : "border-[var(--l-line)] opacity-80"}`}>
                    <p className="font-semibold">{t("Sifariş {orderNo} ləğv olunacaq", { orderNo: "#10482" })}</p>
                    <dl className="mt-2 flex flex-col gap-1 text-xs text-[#41594f]">
                      <div className="flex justify-between gap-3"><dt>{t("Sifariş nömrəsi")}</dt><dd className="font-medium text-[var(--l-ink)]">10482</dd></div>
                      <div className="flex justify-between gap-3"><dt>{t("Səbəb")}</dt><dd className="font-medium text-[var(--l-ink)]">{t("Fikrimi dəyişdim")}</dd></div>
                    </dl>
                    <div className="mt-3 flex gap-2 text-xs font-semibold">
                      <button type="button" disabled={m.state !== "ask"} onClick={() => decide(true)} className="cursor-pointer rounded-lg bg-[var(--l-teal)] px-3 py-2 text-white hover:bg-[var(--l-teal-d)] disabled:cursor-default disabled:opacity-60">{t("Təsdiq et")}</button>
                      <button type="button" disabled={m.state !== "ask"} onClick={() => decide(false)} className="cursor-pointer rounded-lg border border-[var(--l-line)] px-3 py-2 hover:bg-[var(--l-mist)] disabled:cursor-default disabled:opacity-60">{t("Ləğv et")}</button>
                    </div>
                  </div>
                );
              })}
              <div ref={end} />
            </div>
            <div className="flex flex-col gap-2 border-t border-[var(--l-line)] bg-white p-3">
              <div className="flex flex-wrap gap-2">
                {chips.map(([s, label]) => (
                  <button key={s} type="button" disabled={used.includes(s) || busy || (s === "cancel" && asked)} onClick={() => ask(s)}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[var(--l-teal)]/40 px-3 py-1.5 text-xs font-medium text-[var(--l-teal)] hover:bg-[var(--l-teal)]/5 disabled:cursor-default disabled:border-[var(--l-line)] disabled:text-[#8a9b95] disabled:hover:bg-transparent">
                    <Send size={12} aria-hidden />{label}
                  </button>
                ))}
              </div>
              {!!msgs.length && <button type="button" onClick={reset} className="inline-flex cursor-pointer items-center gap-1.5 self-start text-xs text-[#58706a] hover:underline"><RotateCcw size={12} aria-hidden />{t("Yenidən başla")}</button>}
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-4 rounded-3xl border border-[var(--l-line)] bg-white p-5 shadow-[0_24px_60px_-24px_rgba(12,42,37,.2)]">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold">{t("Operator və sahib paneli")}</p>
              <span className="rounded-full bg-[var(--l-mist)] px-2.5 py-1 text-xs text-[#41594f]">{t("Nümunə")}</span>
            </div>
            <div>
              <p className="text-xs font-semibold tracking-wide text-[#58706a] uppercase">{t("Canlı söhbətlər")}</p>
              {!handoff ? <p className="mt-2 rounded-xl border border-dashed border-[var(--l-line)] p-4 text-sm text-[#58706a]">{t("Hələ operatora keçən söhbət yoxdur. Ziyarətçi operator istəyəndə burada görünəcək.")}</p> : (
                <div className="mt-2 flex flex-col gap-2 rounded-xl border border-[var(--l-line)] p-3 text-sm">
                  <p className="flex flex-wrap items-center gap-2 font-medium">{t("Ziyarətçi")}<span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">{t("Cavab gözləyir")}</span></p>
                  <p className="flex min-w-0 items-center gap-1.5 text-xs text-[#58706a]"><Globe size={12} aria-hidden className="shrink-0" /><span className="shrink-0">{t("Yazdığı səhifə:")}</span><span className="truncate font-medium text-[var(--l-ink)]">{t("Kross velosiped")} · /products/5</span></p>
                  <p className="text-xs text-[#58706a]">{t("Çatla əvvəlki yazışma ({n} mesaj)", { n: msgs.filter((m) => m.k === "user" || m.k === "bot").length - 1 })}</p>
                </div>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold tracking-wide text-[#58706a] uppercase">{t("Əməliyyat jurnalı")}</p>
              {!log.length ? <p className="mt-2 rounded-xl border border-dashed border-[var(--l-line)] p-4 text-sm text-[#58706a]">{t("İstifadəçi kartda təsdiq verəndə əməliyyat burada qeyd olunur.")}</p> : (
                <ul className="mt-2 flex flex-col gap-2">{log.map((x, i) => <li key={i} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--l-line)] p-3 text-sm"><span className="truncate">{x}</span><span className="shrink-0 rounded-full bg-[var(--l-teal)]/10 px-2.5 py-0.5 text-xs font-medium text-[var(--l-teal)]">{t("icra olundu")}</span></li>)}</ul>
              )}
            </div>
            <p className="mt-auto text-xs leading-relaxed text-[#58706a]">{t("Bu, əvvəlcədən yazılmış nümunədir, real AI çağırılmır. Öz saytının məlumatı ilə sınamaq üçün qeydiyyatdan keç.")}</p>
            <Link href={signedIn ? "/dashboard" : "/register"} className="inline-flex h-11 items-center justify-center self-start rounded-xl bg-[var(--l-teal)] px-5 text-sm font-semibold text-white hover:bg-[var(--l-teal-d)]">{signedIn ? t("Panelə keç") : t("Qeydiyyatdan keç")}</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
