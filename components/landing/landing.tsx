"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight, BookOpen, Camera, Check, ChevronDown, Code2, Copy, FileText, Globe, Link2, ListChecks, Menu, MessagesSquare, Plug, RefreshCw, Search,
  Send, ShoppingBag, SlidersHorizontal, Sparkles, X,
} from "lucide-react";
import { LOCALES, useI18n } from "@/lib/i18n";
import { HeroDemo } from "@/components/landing/hero-demo";
import { Reveal } from "@/components/landing/reveal";
import { LiveDemo } from "@/components/landing/demo";
import { Everything, Showcase } from "@/components/landing/showcase";
import { LangDropdown } from "@/components/lang-dropdown";

const wrap = "mx-auto w-full max-w-6xl px-5 sm:px-6";
// Düymələr: iki ölçü, hamısı eyni hündürlükdə; en məzmuna görədir, telefonda hero düymələri tam en olur
const btn = "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold transition-[background-color,border-color,transform] active:scale-[.98]";
const md = `${btn} h-11 px-5 text-[15px]`;
const sm = `${btn} h-9 px-3.5 text-sm`;
const primary = "bg-[var(--l-ink)] text-white hover:bg-black l-btn-arrow";
const secondary = "border border-[var(--l-line)] bg-white text-[var(--l-ink)] hover:border-[#d4d4d8] hover:bg-[var(--l-mist)]";
const h2 = "l-display text-[clamp(1.75rem,3.6vw,2.75rem)] font-semibold leading-[1.08]";
const eyebrow = "inline-flex items-center gap-2 text-[13px] font-semibold tracking-wide text-[var(--l-orange-d)] uppercase";
const lead = "text-[17px] leading-relaxed text-[var(--l-sub)]";

/** Kartın üzərində siçanı izləyən işıq üçün koordinatlar */
const spot = (e: React.MouseEvent<HTMLElement>) => {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
};

function Logo() {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2.5 whitespace-nowrap" aria-label="Car Advisor">
      <span className="relative grid size-9 place-items-center rounded-xl bg-[var(--l-ink)] text-white">
        <MessagesSquare size={18} aria-hidden />
        <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full border-2 border-white bg-[var(--l-orange)]" aria-hidden />
      </span>
      <span className="l-display text-[16px] font-semibold">Car Advisor</span>
    </Link>
  );
}

const LANG_PATH = { az: "/", en: "/en", ru: "/ru", tr: "/tr" } as const;

/** Açılış səhifəsində dil ünvanın bir hissəsidir (/, /en, /ru, /tr): seçəndə həmin ünvana keçilir. Seçim cookie-yə də yazılır ki, panel eyni dildə açılsın. */
function LandingLang() {
  const { locale, t } = useI18n();
  return (
    <LangDropdown options={LOCALES} value={locale} label={t("Dil")} buttonClassName="h-9 border-[var(--l-line)] bg-white hover:bg-[var(--l-mist)]"
      onChange={(l) => {
        try { document.cookie = `lang=${l}; path=/; max-age=31536000; samesite=lax`; } catch { /* kuki bağlıdır */ }
        window.location.assign(LANG_PATH[l]);
      }} />
  );
}

/** Yuxarıda üzən başlıq: aktiv bölmə vurğulanır, telefonda menyu açılır */
function Header({ signedIn }: { signedIn: boolean }) {
  const { t } = useI18n();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("");
  const links: [string, string][] = [["nece", t("Necə işləyir")], ["imkanlar", t("İmkanlar")], ["daha", t("Daha çox")], ["qiymet", t("Qiymətlər")], ["sual", t("Sual-cavab")]];
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on(); window.addEventListener("scroll", on, { passive: true });
    // Hansı bölmə ekranın ortasındadırsa, menyuda o vurğulanır
    const io = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver((es) => {
      for (const e of es) if (e.isIntersecting) setActive(e.target.id);
    }, { rootMargin: "-45% 0px -50% 0px" });
    links.forEach(([id]) => { const el = document.getElementById(id); if (el && io) io.observe(el); });
    return () => { window.removeEventListener("scroll", on); io?.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { document.body.style.overflow = open ? "hidden" : ""; return () => { document.body.style.overflow = ""; }; }, [open]);

  return (
    <header className="sticky top-0 z-40 px-3 pt-3 sm:px-4">
      <div className={`mx-auto flex h-14 w-full max-w-6xl items-center gap-2 rounded-2xl border px-3 transition-[background-color,border-color,box-shadow] sm:gap-3 sm:px-4 ${scrolled || open ? "border-[var(--l-line)] bg-white/85 shadow-[0_10px_30px_-18px_rgba(9,9,11,.35)] backdrop-blur-md" : "border-transparent bg-transparent"}`}>
        <Logo />
        <nav aria-label={t("Səhifə bölmələri")} className="ml-3 hidden items-center gap-0.5 text-sm font-medium lg:flex">
          {links.map(([id, label]) => (
            <a key={id} href={`#${id}`} className={`rounded-lg px-3 py-1.5 transition-colors ${active === id ? "bg-[var(--l-mist)] text-[var(--l-ink)]" : "text-[var(--l-sub)] hover:text-[var(--l-ink)]"}`}>{label}</a>
          ))}
        </nav>
        <span className="flex-1" />
        <div className="hidden sm:block"><LandingLang /></div>
        {signedIn ? (
          <Link href="/dashboard" className={`${sm} ${primary}`}>{t("Panelə keç")}<ArrowRight size={15} aria-hidden /></Link>
        ) : (
          <>
            <Link href="/login" className={`${sm} text-[var(--l-ink)] hover:bg-[var(--l-mist)] max-sm:hidden`}>{t("Daxil ol")}</Link>
            <Link href="/register" className={`${sm} ${primary}`}>{t("Qeydiyyat")}</Link>
          </>
        )}
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label={t("Menyu")} className="grid size-9 cursor-pointer place-items-center rounded-lg hover:bg-[var(--l-mist)] lg:hidden">
          {open ? <X size={20} aria-hidden /> : <Menu size={20} aria-hidden />}
        </button>
      </div>
      {open && (
        <div className="l-swap mx-auto mt-2 w-full max-w-6xl rounded-2xl border border-[var(--l-line)] bg-white p-3 shadow-[0_20px_40px_-20px_rgba(9,9,11,.35)] lg:hidden">
          <nav className="flex flex-col" aria-label={t("Səhifə bölmələri")}>
            {links.map(([id, label]) => <a key={id} href={`#${id}`} onClick={() => setOpen(false)} className="rounded-lg px-3 py-3 text-[15px] font-medium hover:bg-[var(--l-mist)]">{label}</a>)}
          </nav>
          <div className="mt-2 flex items-center gap-2 border-t border-[var(--l-line)] pt-3">
            <LandingLang />
            {!signedIn && <Link href="/login" className={`${sm} ${secondary} ml-auto`}>{t("Daxil ol")}</Link>}
          </div>
        </div>
      )}
    </header>
  );
}

function Hero({ signedIn }: { signedIn: boolean }) {
  const { t } = useI18n();
  const title = t("Ziyarətçin sual yazsın, saytın özü cavab versin.");
  // Başlığın ikinci hissəsi (vergüldən sonra) vurğulanır; vergül yoxdursa bütöv qalır
  const cut = title.indexOf(", ");
  const stats: [string, string][] = [["1", t("sətir kod")], ["4", t("dildə panel")], ["2 ₼", t("hər ay pulsuz")]];
  return (
    <section className="relative -mt-[4.25rem] overflow-hidden pt-[4.25rem]">
      <div className="l-grid pointer-events-none absolute inset-0" aria-hidden />
      <div className="l-glow pointer-events-none absolute -top-40 left-1/2 h-[36rem] w-[56rem] -translate-x-1/2" aria-hidden />
      <div className={`${wrap} relative grid items-center gap-14 pt-12 pb-20 lg:grid-cols-[1.08fr_.92fr] lg:gap-12 lg:pt-20 lg:pb-28`}>
        <div className="min-w-0">
          <Reveal>
            <a href="#daha" className="group inline-flex items-center gap-2 rounded-full border border-[var(--l-line)] bg-white/80 py-1 pr-3 pl-1 text-[13px] font-medium shadow-sm backdrop-blur hover:border-[#d4d4d8]">
              <span className="rounded-full bg-[var(--l-ink)] px-2 py-0.5 text-[11px] font-semibold text-white">{t("Yeni")}</span>
              {t("Canlı operator, Telegram və WhatsApp")}
              <ArrowRight size={14} className="text-[var(--l-sub)] transition-transform group-hover:translate-x-0.5" aria-hidden />
            </a>
          </Reveal>
          <Reveal as="h1" delay={80} className="l-display mt-6 text-[clamp(2.25rem,5.4vw,3.9rem)] font-semibold leading-[1.02]">
            {cut > 0 ? <>{title.slice(0, cut + 1)} <span className="l-mark">{title.slice(cut + 2)}</span></> : title}
          </Reveal>
          <Reveal as="p" delay={160} className={`mt-6 max-w-xl ${lead}`}>{t("Car Advisor saytına qoşulan AI köməkçidir. Elan, məhsul və ya xidmətlərini axtarıb ziyarətçiyə uyğununu tapır, şirkət haqqında suallara sənin sənədlərinə və səhifələrinə əsasən cavab verir, cavab tapılmayanda isə operatora yönləndirir.")}</Reveal>
          <Reveal delay={240} className="mt-8 grid grid-cols-1 gap-3 min-[420px]:flex min-[420px]:flex-wrap">
            <Link href={signedIn ? "/dashboard" : "/register"} className={`${md} ${primary} min-[420px]:min-w-[11rem]`}>{signedIn ? t("Panelə keç") : t("Pulsuz başla")}<ArrowRight size={16} aria-hidden /></Link>
            <a href="#sinaq" className={`${md} ${secondary} min-[420px]:min-w-[11rem]`}><Sparkles size={16} aria-hidden />{t("Özün sına")}</a>
          </Reveal>
          <Reveal delay={320} className="mt-10 grid max-w-md grid-cols-3 divide-x divide-[var(--l-line)] rounded-2xl border border-[var(--l-line)] bg-white/70 backdrop-blur">
            {stats.map(([n, l]) => (
              <div key={l} className="px-4 py-3">
                <p className="l-display text-xl font-semibold">{n}</p>
                <p className="text-xs leading-snug text-[var(--l-sub)]">{l}</p>
              </div>
            ))}
          </Reveal>
        </div>
        <Reveal variant="right" delay={200} className="min-w-0"><HeroDemo /></Reveal>
      </div>
    </section>
  );
}

/** Hansı saytlar üçün: sonsuz sürüşən sətir (üzərinə gələndə dayanır) */
function UseCases() {
  const { t } = useI18n();
  const items = [t("Elan saytları"), t("E-ticarət"), t("Avtosalonlar"), t("Daşınmaz əmlak"), t("Klinikalar"), t("Təhsil mərkəzləri"), t("Turizm"), t("Restoranlar"), t("Xidmət şirkətləri"), t("Bloq və media")];
  return (
    <section aria-label={t("Hansı saytlar üçün")} className="border-y border-[var(--l-line)] bg-[var(--l-mist)]/50 py-5">
      <div className={`${wrap} flex items-center gap-6`}>
        <p className="hidden shrink-0 text-sm font-medium text-[var(--l-sub)] md:block">{t("Hansı saytlar üçün")}</p>
        <div className="l-marquee-wrap l-fade-x min-w-0 flex-1 overflow-hidden">
          <div className="l-marquee flex w-max gap-3">
            {[...items, ...items].map((x, i) => (
              <span key={i} aria-hidden={i >= items.length} className="inline-flex items-center gap-2 rounded-full border border-[var(--l-line)] bg-white px-4 py-1.5 text-sm font-medium whitespace-nowrap">
                <span className="size-1.5 rounded-full bg-[var(--l-orange)]" />{x}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

const FIELDS = ["Kateqoriya", "Brend", "Qiymət (min)", "Qiymət (max)", "Rəng", "Ölçü", "Şəhər", "Çatdırılma", "Reytinq"];

function Problem() {
  const { t } = useI18n();
  return (
    <section id="problem" className="relative scroll-mt-24 overflow-hidden bg-[var(--l-ink)] py-20 text-white lg:py-28">
      <div className="l-grid-dark pointer-events-none absolute inset-0" aria-hidden />
      <div className={`${wrap} relative`}>
        <Reveal as="h2" className={`${h2} max-w-3xl`}>{t("Ziyarətçi axtardığını tapa bilməyəndə saytı tərk edir")}</Reveal>
        <Reveal as="p" delay={100} className="mt-5 max-w-2xl text-[17px] leading-relaxed text-white/70">{t("Doqquz filtr xanası, uzun “Qaydalar” səhifəsi, cavabı gec gələn email. Ziyarətçi nəticə tapmır və gedir. Axtardığı məhsul, elan və ya cavab isə sənin saytında var idi, sadəcə onu tapa bilmədi.")}</Reveal>

        <div className="mt-12 grid gap-5 lg:grid-cols-2">
          <Reveal variant="left"><div className="h-full rounded-3xl border border-white/10 bg-white/[0.04] p-6 sm:p-7">
            <p className="text-sm font-semibold text-white/55">{t("İndi: filtrlərlə")}</p>
            <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {FIELDS.map((f) => <div key={f} className="flex h-10 items-center justify-between rounded-lg border border-white/10 bg-white/[0.05] px-3 text-sm text-white/50">{t(f)}<ChevronDown size={14} aria-hidden /></div>)}
            </div>
            <div className="mt-5 rounded-xl border border-red-300/25 bg-red-400/10 px-4 py-3 text-sm text-red-100">{t("Nəticə tapılmadı. Filtrləri dəyişib yenidən cəhd edin.")}</div>
          </div></Reveal>

          <Reveal variant="right" delay={150}><div className="h-full rounded-3xl bg-white p-6 text-[var(--l-ink)] sm:p-7">
            <p className="text-sm font-semibold text-[var(--l-orange-d)]">{t("Car Advisor ilə: bir cümlə")}</p>
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-[var(--l-line)] px-4 py-3.5 text-[15px]"><Search size={18} className="shrink-0" aria-hidden />{t("Büdcəm 150 AZN-dir, yaxşı simsiz qulaqlıq axtarıram")}</div>
            <div className="mt-5 flex flex-col gap-2.5 text-sm">
              {[["Sonic X2 Pro", "139"], ["Aero Buds 3", "129"], ["Nova Air", "115"]].map(([n, p]) => (
                <div key={n} className="flex items-center gap-3 rounded-xl bg-[var(--l-mist)] px-3 py-2.5"><ShoppingBag size={18} aria-hidden /><span className="flex-1 font-medium">{n}</span><span className="font-semibold">{p} ₼</span></div>
              ))}
            </div>
            <p className="mt-4 text-sm text-[var(--l-sub)]">{t("Ziyarətçi 10 saniyəyə uyğun variantları görür. Sual olsa, cavabı da dərhal alır.")}</p>
          </div></Reveal>
        </div>
      </div>
    </section>
  );
}

/** Üç addım: addıma klikləyəndə sağda onun nümunəsi açılır */
function Steps() {
  const { t } = useI18n();
  const [step, setStep] = useState(0);
  const [copied, setCopied] = useState(false);
  const code = '<script src="https://sənin-portalın/widget.js"\n        data-key="wk_…" defer></script>';
  const steps = [
    { title: t("Məlumatını əlavə et"), body: t("Elan, məhsul və ya xidmətlərin API ünvanını yaz və/ya bilik bazasına sənəd, sayt linki və ya mətn əlavə et. Panel API-nin nümunə cavabından sahələri özü tanıyır. Texniki biliyin azdırsa, hazır tapşırığı AI alətinə (ChatGPT, Claude, Cursor) də verə bilərsən.") },
    { title: t("Sınaq söhbəti ilə yoxla"), body: t("Panelin içində köməkçi ilə yaz, nə tapdığını və cavabın hansı mənbəyə əsaslandığını gör. Səhv varsa, xəritələməni və ya bilik bazasını düzəldib yenidən yoxla.") },
    { title: t("Bir sətir kodu saytına yapışdır"), body: t("Çat düyməsi saytında görünür. Rəngini, yazısını və yerini paneldən dəyişirsən, kodu yenidən yapışdırmaq lazım olmur.") },
  ];
  const sources: [React.ElementType, string, string][] = [[Plug, "REST API", "api.sayt.az/products"], [FileText, t("Çatdırılma şərtləri.pdf"), "PDF · 84 KB"], [Link2, "sayt.az/haqqimizda", t("hər gün yenilənir")]];
  return (
    <section id="nece" className={`${wrap} scroll-mt-24 py-20 lg:py-28`}>
      <Reveal as="p" className={eyebrow}>{t("Necə işləyir")}</Reveal>
      <Reveal as="h2" delay={60} className={`${h2} mt-3 max-w-2xl`}>{t("Üç addımda saytında işləyir")}</Reveal>
      <div className="mt-12 grid gap-6 lg:grid-cols-[.95fr_1.05fr] lg:gap-10">
        <ol className="flex flex-col gap-3">
          {steps.map((s, i) => (
            <Reveal as="li" key={s.title} delay={i * 100}>
              <button type="button" onClick={() => setStep(i)} aria-pressed={step === i}
                className={`group flex w-full cursor-pointer gap-4 rounded-2xl border p-5 text-left transition-colors ${step === i ? "border-[var(--l-ink)] bg-white shadow-[0_16px_40px_-28px_rgba(9,9,11,.5)]" : "border-[var(--l-line)] bg-white/60 hover:border-[#d4d4d8] hover:bg-white"}`}>
                <span className={`grid size-9 shrink-0 place-items-center rounded-full text-sm font-semibold transition-colors ${step === i ? "bg-[var(--l-ink)] text-white" : "bg-[var(--l-mist)] text-[var(--l-sub)]"}`}>{i + 1}</span>
                <span className="min-w-0">
                  <span className="block text-[17px] font-semibold leading-snug">{s.title}</span>
                  <span className={`mt-2 block text-[15px] leading-relaxed text-[var(--l-sub)] ${step === i ? "" : "line-clamp-2"}`}>{s.body}</span>
                </span>
              </button>
            </Reveal>
          ))}
        </ol>
        <Reveal variant="right" className="min-w-0">
          <div className="relative h-full min-h-[22rem] overflow-hidden rounded-3xl border border-[var(--l-line)] bg-[var(--l-mist)] p-5 sm:p-8">
            <div className="l-grid pointer-events-none absolute inset-0 opacity-60" aria-hidden />
            <div key={step} className="l-swap relative flex h-full flex-col justify-center">
              {step === 0 && (
                <div className="flex flex-col gap-3">
                  {sources.map(([Icon, name, note], i) => (
                    <div key={name} className="l-in flex items-center gap-3 rounded-2xl border border-[var(--l-line)] bg-white p-3.5 shadow-sm" style={{ animationDelay: `${i * 120}ms` }}>
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--l-mist)]"><Icon size={18} aria-hidden /></span>
                      <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{name}</span><span className="block truncate font-mono text-xs text-[var(--l-sub)]">{note}</span></span>
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700"><Check size={12} aria-hidden />{t("hazır")}</span>
                    </div>
                  ))}
                </div>
              )}
              {step === 1 && (
                <div className="flex flex-col gap-3 rounded-2xl border border-[var(--l-line)] bg-white p-4 text-sm shadow-sm">
                  <p className="flex items-center gap-2 text-xs font-semibold text-[var(--l-sub)]"><Sparkles size={14} aria-hidden />{t("Sınaq söhbəti")}</p>
                  <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-[var(--l-ink)] px-3.5 py-2.5 text-white">{t("Sifariş neçə günə çatdırılır?")}</div>
                  <div className="max-w-[90%] rounded-2xl rounded-bl-md bg-[var(--l-mist)] px-3.5 py-2.5">{t("Bakı daxilində 1–2 iş günü, rayonlara 3–4 gün. 100 ₼-dən yuxarı sifarişlərdə çatdırılma pulsuzdur.")}
                    <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs text-[var(--l-sub)]"><FileText size={12} aria-hidden />{t("Mənbə: Çatdırılma şərtləri")}</p>
                  </div>
                </div>
              )}
              {step === 2 && (
                <div className="flex flex-col gap-4">
                  <div className="overflow-hidden rounded-2xl bg-[var(--l-ink)] shadow-lg">
                    <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-2.5">
                      <span className="flex items-center gap-2 text-xs font-medium text-white/60"><Code2 size={14} aria-hidden />index.html</span>
                      <button type="button" onClick={() => { void navigator.clipboard?.writeText(code).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }); }}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-white/80 hover:bg-white/10">{copied ? <Check size={13} aria-hidden /> : <Copy size={13} aria-hidden />}{copied ? t("Kopyalandı") : t("Kopyala")}</button>
                    </div>
                    <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed text-[#d4d4d8]" aria-label={t("Quraşdırma kodu nümunəsi")}><code>{code}</code></pre>
                  </div>
                  <div className="flex items-center justify-end gap-3">
                    <span className="rounded-2xl rounded-br-md border border-[var(--l-line)] bg-white px-3.5 py-2 text-sm shadow-sm">{t("Salam! Nə axtardığınızı və ya sualınızı yazın, kömək edim.")}</span>
                    <span className="grid size-12 shrink-0 place-items-center rounded-full bg-[var(--l-ink)] text-white shadow-lg"><MessagesSquare size={20} aria-hidden /></span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Features() {
  const { t } = useI18n();
  const card = "l-spot l-lift h-full rounded-3xl border border-[var(--l-line)] bg-white p-7";
  const icon = "grid size-11 place-items-center rounded-xl bg-[var(--l-mist)]";
  const h = "mt-5 text-[18px] font-semibold leading-snug tracking-[-0.01em]";
  const p = "mt-2.5 text-[15px] leading-relaxed text-[var(--l-sub)]";
  const small: [React.ElementType, string, string, string][] = [
    [Plug, t("Məlumat sənin saytından gəlir"), t("Qiymət, şəkil və keçid birbaşa sənin API-ndən, qaydalar və şərtlər isə sənin əlavə etdiyin məzmundan götürülür. Köməkçi uydurmur: tapmadısa bunu açıq deyir."), "md:col-span-5"],
    [BookOpen, t("Bilik bazası: fayl, link, mətn"), t("PDF, Word, TXT, CSV faylı yüklə, səhifə linki ver, bütün saytı skan etdir və ya mətn yapışdır. Cavabın altında hansı mənbəyə əsaslandığı göstərilir."), "md:col-span-4"],
    [SlidersHorizontal, t("Kataloqu sən öyrədirsən"), t("API-nin nümunə cavabını yapışdır: panel ad, qiymət, şəkil kimi sahələri özü tanıyır (AI-sız və pulsuz). Filtrləri bir dəfə yazırsan, marka və kateqoriya kimi siyahıları (ID ilə işləyənləri də) köməkçi özü çevirir."), "md:col-span-4"],
    [ListChecks, t("Ssenarilər və dəqiq cavablar"), t("Qaytarma, ləğv, rezerv kimi prosesləri addım-addım yaz: bot sənin qaydanla irəliləyir. Vacib suallara özün cavab yaz: uyğun sual gələndə cavab olduğu kimi, AI-sız və pulsuz verilir."), "md:col-span-4"],
    [Camera, t("Şəkillə axtarış"), t("Ziyarətçi çatda, Telegram-da və ya WhatsApp-da şəkil göndərəndə köməkçi şəkildən növ, marka, rəng kimi xüsusiyyətləri çıxarıb oxşar elan və ya məhsul axtarır. Dəqiq eyni məhsulu tapacağına zəmanət yoxdur, oxşarlarını göstərir."), "md:col-span-6"],
    [RefreshCw, t("Məlumat həmişə təzədir"), t("Sayt linkləri seçdiyin tezliklə (hər gün və ya həftə) özü yenilənir. API-n yoxdursa, kataloqu CSV, JSON və ya XML fayl və ya feed linki ilə də qoşa bilərsən."), "md:col-span-6"],
  ];
  return (
    <section id="imkanlar" className="scroll-mt-24 bg-[var(--l-mist)]/60 py-20 lg:py-28">
      <div className={wrap}>
        <Reveal as="p" className={eyebrow}>{t("İmkanlar")}</Reveal>
        <Reveal as="h2" delay={60} className={`${h2} mt-3 max-w-2xl`}>{t("Ziyarətçi üçün rahat, sənin üçün idarəolunan")}</Reveal>
        <div className="mt-12 grid gap-4 md:grid-cols-12">
          <Reveal className="md:col-span-7">
            <div onMouseMove={spot} className="l-spot l-lift relative h-full overflow-hidden rounded-3xl bg-[var(--l-ink)] p-7 text-white">
              <div className="l-grid-dark pointer-events-none absolute inset-0" aria-hidden />
              <div className="relative">
                <span className="grid size-11 place-items-center rounded-xl bg-white/10"><Sparkles size={22} aria-hidden /></span>
                <h3 className="mt-5 text-xl font-semibold leading-snug tracking-[-0.01em]">{t("Həm axtarır, həm cavab verir")}</h3>
                <p className="mt-2.5 max-w-lg text-[15px] leading-relaxed text-white/70">{t("Cümləni başa düşür: kataloqunda uyğun elan, məhsul və ya xidməti tapır, şirkət haqqında suallara isə sənin sənədlərinə və səhifələrinə əsasən cavab verir. Ziyarətçi filtr seçmir, sadəcə yazır.")}</p>
                <div className="mt-6 flex flex-wrap gap-2 text-sm">
                  {[t("150 AZN-ə qədər hədiyyə"), t("Çatdırılma neçə günə gəlir?"), t("Cümə günü boş vaxtınız var?")].map((x) => <span key={x} className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5"><Send size={12} aria-hidden />{x}</span>)}
                </div>
              </div>
            </div>
          </Reveal>
          {small.map(([Icon, title, body, span], i) => (
            <Reveal key={title} delay={(i + 1) * 80} className={span}>
              <div onMouseMove={spot} className={card}>
                <span className={icon}><Icon size={21} aria-hidden /></span>
                <h3 className={h}>{title}</h3>
                <p className={p}>{body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// Qiymət kalkulyatoru: "10 AZN ≈ 4 000 sorğu" nümunəsindən hesablanır (təxmini)
const PER_Q = 10 / 4000;
const FREE = 2;
const STEPS_Q = [100, 250, 500, 800, 1000, 2000, 3000, 5000, 7500, 10000, 15000, 20000, 30000, 50000];

function Pricing({ signedIn }: { signedIn: boolean }) {
  const { t } = useI18n();
  const [i, setI] = useState(4);
  // Server və brauzer eyni mətni versin deyə (hydration) Intl əvəzinə sadə format: 10 000
  const num = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const q = STEPS_Q[i]!;
  const cost = Math.max(0, q * PER_Q - FREE);
  const fmt = useMemo(() => (n: number) => (n < 10 ? n.toFixed(2) : String(Math.round(n))).replace(".", ","), []);
  const pts = [
    t("Aylıq abunə yoxdur. Yalnız çatın real istifadəsi üçün ödəyirsən."),
    t("Hər ay 2 AZN pulsuz balans verilir. Kiçik saytlar üçün çox vaxt bəs edir."),
    t("Pulsuz hissə bitəndə istədiyin qədər (məs. 10 AZN) yükləyirsən. Hər sorğunun qiyməti paneldə AZN ilə görünür."),
    t("Balans bitəndə çat dayanır, ziyarətçiyə əlaqə forması çıxır. Sonradan gələn fatura və ya gözlənilməz borc yoxdur."),
  ];
  return (
    <section id="qiymet" className={`${wrap} scroll-mt-24 py-20 lg:py-28`}>
      <Reveal as="p" className={eyebrow}>{t("Qiymətlər")}</Reveal>
      <Reveal as="h2" delay={60} className={`${h2} mt-3 max-w-2xl`}>{t("Qiymət: yalnız istifadə etdiyin qədər")}</Reveal>
      <div className="mt-12 grid gap-6 lg:grid-cols-[1fr_1fr] lg:gap-10">
        <Reveal as="ul" className="flex flex-col gap-4 self-center text-[16px] leading-relaxed text-[var(--l-sub)]">
          {pts.map((x) => <li key={x} className="flex gap-3"><span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-[var(--l-ink)] text-white"><Check size={14} strokeWidth={3} aria-hidden /></span>{x}</li>)}
        </Reveal>
        <Reveal variant="right" delay={120}>
          <div className="rounded-3xl border border-[var(--l-line)] bg-white p-6 shadow-[0_30px_60px_-36px_rgba(9,9,11,.45)] sm:p-8">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold">{t("Ayda neçə sual gəlir?")}</p>
              <span className="rounded-full bg-[var(--l-mist)] px-2.5 py-1 text-xs text-[var(--l-sub)]">{t("Təxmini hesab")}</span>
            </div>
            <p className="l-display mt-4 text-4xl font-semibold tabular-nums">{num(q)} <span className="text-base font-medium text-[var(--l-sub)]">{t("sorğu / ay")}</span></p>
            <input type="range" min={0} max={STEPS_Q.length - 1} step={1} value={i} onChange={(e) => setI(Number(e.target.value))} aria-label={t("Ayda neçə sual gəlir?")}
              className="l-range mt-5 w-full cursor-pointer" style={{ "--p": `${(i / (STEPS_Q.length - 1)) * 100}%` } as React.CSSProperties} />
            <div className="mt-1.5 flex justify-between text-xs text-[var(--l-sub)] tabular-nums"><span>{num(STEPS_Q[0]!)}</span><span>{num(STEPS_Q[STEPS_Q.length - 1]!)}</span></div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-[var(--l-mist)] p-4">
                <p className="text-xs text-[var(--l-sub)]">{t("Ayda ödəyəcəyin")}</p>
                <p className="l-display mt-1 text-2xl font-semibold tabular-nums">{cost === 0 ? t("Pulsuz") : `≈ ${fmt(cost)} ₼`}</p>
              </div>
              <div className="rounded-2xl bg-[var(--l-mist)] p-4">
                <p className="text-xs text-[var(--l-sub)]">{t("Pulsuz hissə")}</p>
                <p className="l-display mt-1 text-2xl font-semibold tabular-nums">≈ {num(Math.round(FREE / PER_Q))}</p>
              </div>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-[var(--l-sub)]">{t("Təxmini hesabdır: real qiymət sualın uzunluğuna görə dəyişir və paneldə hər gün dəqiq göstərilir.")}</p>
            <Link href={signedIn ? "/billing" : "/register"} className={`${md} ${primary} mt-6 w-full`}>{signedIn ? t("Balansa bax") : t("Pulsuz başla")}<ArrowRight size={16} aria-hidden /></Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Faq() {
  const { t } = useI18n();
  const [open, setOpen] = useState(0);
  const items = [
    [t("Texniki biliyim azdırsa, qura bilərəm?"), t("Bəli. Yalnız bilik bazası (dəstək botu) istəyirsənsə, texniki iş yoxdur: fayl yüklə, sayt linki ver. Kataloq axtarışı üçün API-nin nümunə cavabını yapışdırırsan, panel sahələri özü tanıyır. Çətin hal olsa, paneldəki hazır tapşırığı saytını yazan AI alətinə verirsən, o konfiqurasiyanı hazırlayır. Sən cavabı yapışdırıb sınaq söhbəti ilə yoxlayırsan, sonra bir sətir kodu saytına əlavə edirsən.")],
    [t("Verilənlər bazama giriş verməliyəm?"), t("Xeyr. Köməkçi yalnız saytının açıq API-sindən və sənin əlavə etdiyin fayl, link və mətnlərdən oxuyur. Bazaya heç bir giriş lazım deyil.")],
    [t("Hansı saytlarla işləyir?"), t("Elan, e-ticarət və ya xidmət saytı fərqi yoxdur. Kataloqu API ilə qaytaran istənilən sayt qoşula bilər. Kataloqun yoxdursa, yalnız dəstək botu kimi (sənədlər və sayt məzmunu ilə) qurmaq olar. İkisi birlikdə də işləyir.")],
    [t("Bilik bazasına nə əlavə edə bilərəm?"), t("PDF, Word, TXT, MD, CSV və HTML faylları (6 MB-a qədər), tək səhifənin linki, bütün saytın skanı və ya yapışdırılmış mətn. Şəkil kimi skan olunmuş PDF oxunmur, mətni seçilə bilən olmalıdır.")],
    [t("Köməkçi səhv cavab verə bilərmi? Bilmədikdə nə edir?"), t("Kataloq sualında yalnız sənin API-nin qaytardığını, digər suallarda yalnız bilik bazandakı məlumatı istifadə edir və cavabın altında mənbəni göstərir. Bilmirsə uydurmur: bunu deyir və əlaqə formasını təklif edir. Cavabsız və 👎 alan suallar paneldə ayrıca görünür ki, çatışan məzmunu əlavə edəsən. Yenə də sınaq söhbətində yoxlamağı məsləhət görürük.")],
    [t("Ziyarətçilərin yazdıqları saxlanırmı?"), t("Yalnız sən “Sorğu jurnalı”nı aktiv saxlasan. Telefon və email avtomatik gizlədilir, qeydlər 90 gündən sonra silinir. İstəsən bunu ayarlardan söndürürsən.")],
    [t("Gözlənilmədən çox pul tutula bilərmi?"), t("Xeyr. Əvvəlcədən yüklədiyin balansdan xərclənir, bitəndə çat dayanır. Balans azalanda email gəlir, panelin Balans səhifəsində orta sorğu qiyməti və ay sonuna proqnoz göstərilir.")],
  ];
  return (
    <section id="sual" className="scroll-mt-24 bg-[var(--l-mist)]/60 py-20 lg:py-28">
      <div className={`${wrap} grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:gap-16`}>
        <div>
          <Reveal as="p" className={eyebrow}>{t("Sual-cavab")}</Reveal>
          <Reveal as="h2" delay={60} className={`${h2} mt-3`}>{t("Tez-tez verilən suallar")}</Reveal>
        </div>
        <div className="flex flex-col gap-2">
          {items.map(([q, a], i) => (
            <Reveal key={q} delay={i * 50}>
              <div className={`rounded-2xl border bg-white transition-colors ${open === i ? "border-[#d4d4d8] shadow-sm" : "border-[var(--l-line)]"}`}>
                <h3>
                  <button type="button" onClick={() => setOpen(open === i ? -1 : i)} aria-expanded={open === i} aria-controls={`faq-${i}`}
                    className="flex w-full cursor-pointer items-center justify-between gap-4 px-5 py-4 text-left text-[16px] font-semibold sm:text-[17px]">
                    {q}
                    <span className={`grid size-7 shrink-0 place-items-center rounded-full transition-[transform,background-color] ${open === i ? "rotate-180 bg-[var(--l-ink)] text-white" : "bg-[var(--l-mist)]"}`}><ChevronDown size={16} aria-hidden /></span>
                  </button>
                </h3>
                <div id={`faq-${i}`} className="l-acc" data-open={open === i}><div><p className="px-5 pb-5 text-[15px] leading-relaxed text-[var(--l-sub)]">{a}</p></div></div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Cta({ signedIn }: { signedIn: boolean }) {
  const { t } = useI18n();
  return (
    <section className={`${wrap} py-20 lg:py-28`}>
      <Reveal variant="scale" className="relative overflow-hidden rounded-[2rem] bg-[var(--l-ink)] px-6 py-14 text-center text-white sm:px-12 lg:py-20">
        <div className="l-grid-dark pointer-events-none absolute inset-0" aria-hidden />
        <div className="l-glow pointer-events-none absolute -bottom-40 left-1/2 h-80 w-[40rem] -translate-x-1/2" aria-hidden />
        <div className="relative">
          <h2 className={`${h2} mx-auto max-w-2xl`}>{t("Saytın ziyarətçini gözləyir. Ona yol göstər.")}</h2>
          <p className="mx-auto mt-5 max-w-xl text-[17px] leading-relaxed text-white/70">{t("Qeydiyyatdan keç, kataloqunu qoş və ya sənədlərini yüklə, köməkçini sınaq söhbətində yoxla.")}</p>
          <div className="mx-auto mt-8 grid max-w-sm grid-cols-1 gap-3 sm:flex sm:max-w-none sm:justify-center">
            <Link href={signedIn ? "/dashboard" : "/register"} className={`${md} l-btn-arrow bg-white text-[var(--l-ink)] hover:bg-[var(--l-mist)] sm:min-w-[11rem]`}>{signedIn ? t("Panelə keç") : t("Pulsuz başla")}<ArrowRight size={16} aria-hidden /></Link>
            {!signedIn && <Link href="/login" className={`${md} border border-white/25 text-white hover:bg-white/10 sm:min-w-[11rem]`}>{t("Hesabım var, daxil ol")}</Link>}
          </div>
          <p className="mt-6 text-xs text-white/50">{t("Kart tələb olunmur · hər ay 2 AZN pulsuz")}</p>
        </div>
      </Reveal>
    </section>
  );
}

function Footer({ signedIn }: { signedIn: boolean }) {
  const { t, locale } = useI18n();
  const lq = locale === "az" ? "" : `?lang=${locale}`;
  const cols: [string, [string, string][]][] = [
    [t("Məhsul"), [["#nece", t("Necə işləyir")], ["#imkanlar", t("İmkanlar")], ["#daha", t("Daha çox")], ["#sinaq", t("Özün sına")]]],
    [t("Məlumat"), [["#qiymet", t("Qiymətlər")], ["#sual", t("Sual-cavab")], ["#hamisi", t("Hamısı bir siyahıda")]]],
    [t("Hesab"), signedIn ? [["/dashboard", t("Panelə keç")]] : [["/login", t("Daxil ol")], ["/register", t("Qeydiyyat")]]],
    [t("Hüquqi"), [[`/legal/terms${lq}`, t("İstifadə şərtləri")], [`/legal/privacy${lq}`, t("Məxfilik siyasəti")], [`/legal/refund${lq}`, t("Ödəniş və geri qaytarma")]]],
  ];
  return (
    <footer className="border-t border-[var(--l-line)] bg-[var(--l-mist)]/40">
      <div className={`${wrap} grid gap-10 py-12 sm:grid-cols-2 md:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]`}>
        <div className="flex flex-col gap-3">
          <Logo />
          <p className="max-w-xs text-sm leading-relaxed text-[var(--l-sub)]">{t("Saytına qoşulan AI köməkçi: axtarır, cavab verir, lazım olanda operatora yönləndirir.")}</p>
          <div className="mt-1 sm:hidden"><LandingLang /></div>
        </div>
        {cols.map(([title, links]) => (
          <div key={title}>
            <p className="text-sm font-semibold">{title}</p>
            <ul className="mt-3 flex flex-col gap-2 text-sm text-[var(--l-sub)]">
              {links.map(([href, label]) => <li key={href}>{href.startsWith("#") ? <a href={href} className="hover:text-[var(--l-ink)]">{label}</a> : <Link href={href} className="hover:text-[var(--l-ink)]">{label}</Link>}</li>)}
            </ul>
          </div>
        ))}
      </div>
      <div className={`${wrap} flex flex-wrap items-center justify-between gap-3 border-t border-[var(--l-line)] py-5 text-xs text-[var(--l-sub)]`}>
        <p>© {new Date().getFullYear()} Car Advisor</p>
        <p className="flex items-center gap-1.5"><Globe size={13} aria-hidden />Azərbaycanca · English · Русский · Türkçe</p>
      </div>
    </footer>
  );
}

export function Landing({ signedIn }: { signedIn: boolean }) {
  const { locale } = useI18n();
  // Ünvanla gələn dil panelin də dili olsun (məs. paylaşılmış /ru linkindən qeydiyyata keçən).
  useEffect(() => {
    try { if (!document.cookie.split("; ").includes(`lang=${locale}`)) document.cookie = `lang=${locale}; path=/; max-age=31536000; samesite=lax`; } catch { /* kuki bağlıdır */ }
  }, [locale]);
  return (
    <div className="landing min-h-screen">
      <Header signedIn={signedIn} />
      <main>
        <Hero signedIn={signedIn} />
        <UseCases />
        <Problem />
        <Steps />
        <Features />
        <Showcase />
        <LiveDemo signedIn={signedIn} />
        <Everything />
        <Pricing signedIn={signedIn} />
        <Faq />
        <Cta signedIn={signedIn} />
      </main>
      <Footer signedIn={signedIn} />
    </div>
  );
}
