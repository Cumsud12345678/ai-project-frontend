"use client";
import { ChevronDown, Headset, MessageCircle, Sparkles, StickyNote, Star, X } from "lucide-react";
import { Reveal } from "@/components/landing/reveal";
import { useI18n } from "@/lib/i18n";

/** Operator iş masası: statik nümunə (real məlumat yoxdur). Qeyd, etiket, hazır cavab, AI qaralaması və qiymət. */
export function DeskMock() {
  const { t } = useI18n();
  return (
    <div className="relative mx-auto w-full max-w-md">
      <div className="absolute inset-x-4 -bottom-3 top-6 rounded-[2rem] bg-white/70" aria-hidden />
      <div className="relative overflow-hidden rounded-3xl border border-[var(--l-line)] bg-white shadow-[0_24px_60px_-24px_rgba(12,42,37,.35)]" role="img" aria-label={t("Nümunə: operator iş masası")}>
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--l-line)] px-4 py-3" aria-hidden>
          <span className="grid size-9 place-items-center rounded-full bg-[var(--l-mist)] text-[var(--l-teal)]"><Headset size={17} /></span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-semibold">{t("Leyla")}</p>
            <p className="text-xs text-[#58706a]">{t("İşçi saatları: {h}", { h: "09:00–18:00" })}</p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--l-mist)] px-2.5 py-1 text-xs font-medium"><Star size={12} aria-hidden />{t("Müştəri qiyməti: {n}/5", { n: 5 })}</span>
        </div>
        <div className="flex flex-wrap gap-1.5 border-b border-[var(--l-line)] px-4 py-2 text-xs" aria-hidden>
          {[t("Sifariş"), t("Təcili")].map((x) => <span key={x} className="rounded-full bg-[var(--l-teal)]/10 px-2.5 py-1 font-medium text-[var(--l-teal)]">{x}</span>)}
          <span className="rounded-full border border-dashed border-[var(--l-line)] px-2.5 py-1 text-[#8a9b95]">{t("+ etiket")}</span>
        </div>
        <div className="flex flex-col gap-2.5 bg-[#f4f7f4] p-4 text-sm" aria-hidden>
          <Reveal className="max-w-[85%] rounded-2xl rounded-bl-md bg-white px-3.5 py-2.5 shadow-sm">{t("Sifarişimin ünvanını dəyişmək olar?")}</Reveal>
          <Reveal delay={300} className="rounded-xl border border-amber-300/60 bg-amber-50 px-3.5 py-2.5 text-[13px]">
            <p className="mb-1 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800"><StickyNote size={13} />{t("Daxili qeyd")} · Aynur</p>
            <p className="text-[#5b4a14]">{t("Müştəri əvvəl də yazıb, ünvanı yoxla.")}</p>
          </Reveal>
        </div>
        <div className="flex flex-col gap-2.5 border-t border-[var(--l-line)] p-3" aria-hidden>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[var(--l-line)] px-2.5">{t("Hazır cavab…")}<ChevronDown size={13} /></span>
            <span className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[var(--l-teal)]/40 bg-[var(--l-teal)]/5 px-2.5 font-medium text-[var(--l-teal)]"><Sparkles size={13} />{t("AI qaralaması")}</span>
          </div>
          <div className="rounded-xl border border-[var(--l-line)] px-3 py-2.5 text-sm leading-snug text-[#41594f]">{t("Bəli, ünvanı hələ kuryerə verilməyibsə dəyişmək olar. Yeni ünvanı yazın.")}</div>
          <div className="flex items-center justify-between gap-3 text-xs text-[#58706a]">
            <span>{t("Qaralama yalnız sahəyə yazılır, sən oxuyub göndərirsən.")}</span>
            <span className="shrink-0 rounded-lg bg-[var(--l-orange-d)] px-3 py-2 text-sm font-semibold text-white">{t("Göndər")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Proaktiv mesaj: sayt pəncərəsi, çat düyməsi və onun yanında təklif. */
export function ProactiveMock() {
  const { t } = useI18n();
  return (
    <div className="relative mx-auto w-full max-w-md">
      <div className="absolute inset-x-4 -bottom-3 top-6 rounded-[2rem] bg-[var(--l-mist)]" aria-hidden />
      <div className="relative overflow-hidden rounded-3xl border border-[var(--l-line)] bg-white shadow-[0_24px_60px_-24px_rgba(12,42,37,.35)]" role="img" aria-label={t("Nümunə: çat düyməsinin yanında proaktiv təklif")}>
        <div className="flex items-center gap-1.5 border-b border-[var(--l-line)] bg-[#f4f7f4] px-4 py-2.5" aria-hidden>
          {[0, 1, 2].map((k) => <span key={k} className="size-2.5 rounded-full bg-[#cfd9d2]" />)}
          <span className="ml-3 truncate rounded-md bg-white px-3 py-1 text-xs text-[#58706a]">magaza.az/products/5</span>
        </div>
        <div className="relative h-[22rem] p-5" aria-hidden>
          <div className="h-32 rounded-xl bg-[var(--l-mist)]" />
          <div className="mt-4 h-3 w-2/3 rounded-full bg-[#dde7e0]" />
          <div className="mt-2.5 h-3 w-5/6 rounded-full bg-[#e8efea]" />
          <div className="mt-2.5 h-3 w-1/2 rounded-full bg-[#e8efea]" />
          <div className="mt-5 h-9 w-32 rounded-lg bg-[var(--l-teal)]/80" />
          <Reveal delay={350} className="absolute right-5 bottom-[4.6rem] flex max-w-[15rem] items-start gap-2 rounded-2xl rounded-br-md border border-[var(--l-line)] bg-white px-3.5 py-2.5 text-sm shadow-lg">
            <span>{t("Sualın var? Sənə kömək edə bilərəm.")}</span>
            <X size={14} className="mt-0.5 shrink-0 text-[#8a9b95]" />
          </Reveal>
          <span className="absolute right-5 bottom-5 grid size-12 place-items-center rounded-full bg-[var(--l-teal)] text-white shadow-lg"><MessageCircle size={22} /></span>
          <span className="absolute bottom-6 left-5 rounded-full bg-[var(--l-mist)] px-3 py-1 text-xs text-[#41594f]">{t("Səhifədə 20 saniyə")}</span>
        </div>
      </div>
    </div>
  );
}
