"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BarChart3, BookOpen, Check, ChevronDown, Headset, MessagesSquare, Plug, Search, ShieldCheck, ShoppingBag, SlidersHorizontal, Sparkles } from "lucide-react";
import { LOCALES, useI18n } from "@/lib/i18n";
import { HeroDemo } from "@/components/landing/hero-demo";
import { Reveal } from "@/components/landing/reveal";
import { Everything, Showcase } from "@/components/landing/showcase";
import { LangDropdown } from "@/components/lang-dropdown";

const wrap = "mx-auto w-full max-w-6xl px-5";
const btn = "inline-flex h-12 items-center justify-center rounded-xl px-6 text-[15px] font-semibold transition-colors";
const btnPrimary = `${btn} bg-[var(--l-teal)] text-white hover:bg-[var(--l-teal-d)]`;
const btnGhost = `${btn} border border-[var(--l-line)] bg-white text-[var(--l-ink)] hover:bg-[var(--l-mist)]`;

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2.5 whitespace-nowrap" aria-label="Car Advisor">
      <span className="grid size-9 place-items-center rounded-xl bg-[var(--l-orange-d)] text-white"><MessagesSquare size={19} aria-hidden /></span>
      <span className={`l-display text-[15px] font-semibold ${compact ? "hidden min-[400px]:inline" : ""}`}>Car Advisor</span>
    </Link>
  );
}

const LANG_PATH = { az: "/", en: "/en", ru: "/ru" } as const;

/** Açılış səhifəsində dil ünvanın bir hissəsidir (/, /en, /ru): seçəndə həmin ünvana keçilir. Seçim cookie-yə də yazılır ki, panel eyni dildə açılsın. */
function LandingLang() {
  const { locale, t } = useI18n();
  return (
    <LangDropdown options={LOCALES} value={locale} label={t("Dil")} buttonClassName="border-[var(--l-line)] bg-white hover:bg-[var(--l-mist)]"
      onChange={(l) => {
        try { document.cookie = `lang=${l}; path=/; max-age=31536000; samesite=lax`; } catch { /* kuki bağlıdır */ }
        window.location.assign(LANG_PATH[l]);
      }} />
  );
}

function Header({ signedIn }: { signedIn: boolean }) {
  const { t } = useI18n();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on(); window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  const links = [["#problem", t("Problem")], ["#nece", t("Necə işləyir")], ["#imkanlar", t("İmkanlar")], ["#canli", t("Yeniliklər")], ["#qiymet", t("Qiymətlər")], ["#sual", t("Sual-cavab")]];
  return (
    <header className={`sticky top-0 z-30 border-b border-[var(--l-line)] bg-[var(--l-paper)]/85 backdrop-blur transition-shadow ${scrolled ? "shadow-[0_8px_24px_-16px_rgba(12,42,37,.35)]" : ""}`}>
      <div className={`${wrap} flex h-16 items-center gap-2 sm:gap-4`}>
        <Logo compact />
        <nav aria-label={t("Səhifə bölmələri")} className="ml-6 hidden gap-6 text-sm font-medium text-[#41594f] lg:flex">
          {links.map(([href, label]) => <a key={href} href={href} className="hover:text-[var(--l-ink)]">{label}</a>)}
        </nav>
        <span className="flex-1" />
        <LandingLang />
        {signedIn ? (
          <Link href="/dashboard" className={`${btn} h-10 bg-[var(--l-teal)] px-4 text-white hover:bg-[var(--l-teal-d)]`}>{t("Panelə keç")}</Link>
        ) : (
          <>
            <Link href="/login" className="hidden px-2 text-sm font-semibold hover:underline sm:inline">{t("Daxil ol")}</Link>
            <Link href="/register" className={`${btn} h-10 bg-[var(--l-teal)] px-4 text-white hover:bg-[var(--l-teal-d)]`}>{t("Qeydiyyat")}</Link>
          </>
        )}
      </div>
    </header>
  );
}

function Hero({ signedIn }: { signedIn: boolean }) {
  const { t } = useI18n();
  return (
    <section className={`${wrap} grid items-center gap-14 pt-12 pb-20 lg:grid-cols-[1.05fr_.95fr] lg:gap-10 lg:pt-20 lg:pb-28`}>
      <div>
        <Reveal as="h1" className="l-display text-[clamp(1.8rem,4.2vw,2.8rem)] font-semibold leading-[1.1]">{t("Ziyarətçin sual yazsın, saytın özü cavab versin.")}</Reveal>
        <Reveal as="p" delay={120} className="mt-6 max-w-xl text-[17px] leading-relaxed text-[#41594f]">{t("Car Advisor saytına qoşulan AI köməkçidir. Elan, məhsul və ya xidmətlərini axtarıb ziyarətçiyə uyğununu tapır, şirkət haqqında suallara sənin sənədlərinə və səhifələrinə əsasən cavab verir, cavab tapılmayanda isə operatora yönləndirir.")}</Reveal>
        <Reveal delay={240} className="mt-8 flex flex-wrap gap-3">
          <Link href={signedIn ? "/dashboard" : "/register"} className={btnPrimary}>{signedIn ? t("Panelə keç") : t("Qeydiyyatdan keç")}</Link>
          <a href="#nece" className={btnGhost}>{t("Necə işləyir")}</a>
        </Reveal>
        <Reveal as="ul" delay={360} className="mt-10 flex flex-col gap-2.5 text-sm text-[#41594f]">
          {[t("Elan, e-ticarət və xidmət saytları üçün: kataloqunu API ilə oxuyur"), t("Sənəd, sayt linki və ya mətnlə öyrədilir, cavabda mənbəni göstərir"), t("Bir sətir kodla qoşulur, üç dildə cavab verir")].map((x) => (
            <li key={x} className="flex items-start gap-2.5"><span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-[var(--l-mist)] text-[var(--l-teal)]"><Check size={13} strokeWidth={3} aria-hidden /></span>{x}</li>
          ))}
        </Reveal>
      </div>
      <Reveal variant="right" delay={200}><HeroDemo /></Reveal>
    </section>
  );
}

const FIELDS = ["Kateqoriya", "Brend", "Qiymət (min)", "Qiymət (max)", "Rəng", "Ölçü", "Şəhər", "Çatdırılma", "Reytinq"];

function Problem() {
  const { t } = useI18n();
  return (
    <section id="problem" className="scroll-mt-20 bg-[var(--l-ink)] py-20 text-white lg:py-28">
      <div className={wrap}>
        <Reveal as="h2" className="l-display max-w-3xl text-[clamp(1.5rem,3.4vw,2.4rem)] font-semibold leading-[1.15]">{t("Ziyarətçi axtardığını tapa bilməyəndə saytı tərk edir")}</Reveal>
        <Reveal as="p" delay={100} className="mt-5 max-w-2xl text-[17px] leading-relaxed text-white/75">{t("Doqquz filtr xanası, uzun “Qaydalar” səhifəsi, cavabı gec gələn email. Ziyarətçi nəticə tapmır və gedir. Axtardığı məhsul, elan və ya cavab isə sənin saytında var idi, sadəcə onu tapa bilmədi.")}</Reveal>

        <div className="mt-12 grid gap-5 lg:grid-cols-2">
          <Reveal variant="left"><div className="h-full rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <p className="text-sm font-semibold text-white/60">{t("İndi: filtrlərlə")}</p>
            <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {FIELDS.map((f) => <div key={f} className="flex h-10 items-center justify-between rounded-lg border border-white/15 bg-white/[0.05] px-3 text-sm text-white/55">{t(f)}<ChevronDown size={14} aria-hidden /></div>)}
            </div>
            <div className="mt-5 rounded-xl border border-red-300/30 bg-red-400/10 px-4 py-3 text-sm text-red-100">{t("Nəticə tapılmadı. Filtrləri dəyişib yenidən cəhd edin.")}</div>
          </div></Reveal>

          <Reveal variant="right" delay={150}><div className="h-full rounded-3xl bg-white p-6 text-[var(--l-ink)]">
            <p className="text-sm font-semibold text-[var(--l-teal)]">{t("Car Advisor ilə: bir cümlə")}</p>
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-[var(--l-line)] px-4 py-3.5 text-[15px]"><Search size={18} className="shrink-0 text-[var(--l-teal)]" aria-hidden />{t("Büdcəm 150 AZN-dir, yaxşı simsiz qulaqlıq axtarıram")}</div>
            <div className="mt-5 flex flex-col gap-2.5 text-sm">
              {[["Sonic X2 Pro", "139"], ["Aero Buds 3", "129"], ["Nova Air", "115"]].map(([n, p]) => (
                <div key={n} className="flex items-center gap-3 rounded-lg bg-[var(--l-mist)] px-3 py-2.5"><ShoppingBag size={18} className="text-[var(--l-teal)]" aria-hidden /><span className="flex-1 font-medium">{n}</span><span className="font-semibold text-[var(--l-orange-d)]">{p} ₼</span></div>
              ))}
            </div>
            <p className="mt-4 text-sm text-[#41594f]">{t("Ziyarətçi 10 saniyəyə uyğun variantları görür. Sual olsa, cavabı da dərhal alır.")}</p>
          </div></Reveal>
        </div>
      </div>
    </section>
  );
}

function Steps() {
  const { t } = useI18n();
  const steps = [
    { title: t("Məlumatını əlavə et"), body: t("Elan, məhsul və ya xidmətlərin API ünvanını yaz və/ya bilik bazasına sənəd, sayt linki və ya mətn əlavə et. Texniki biliyin azdırsa, hazır tapşırığı AI alətinə (ChatGPT, Claude, Cursor) ver: konfiqurasiyanı o yazsın, sən yapışdır.") },
    { title: t("Sınaq söhbəti ilə yoxla"), body: t("Panelin içində köməkçi ilə yaz, nə tapdığını və cavabın hansı mənbəyə əsaslandığını gör. Səhv varsa, xəritələməni və ya bilik bazasını düzəldib yenidən yoxla.") },
    { title: t("Bir sətir kodu saytına yapışdır"), body: t("Çat düyməsi saytında görünür. Rəngini, yazısını və yerini paneldən dəyişirsən, kodu yenidən yapışdırmaq lazım olmur.") },
  ];
  return (
    <section id="nece" className={`${wrap} scroll-mt-20 py-20 lg:py-28`}>
      <Reveal as="h2" className="l-display max-w-2xl text-[clamp(1.5rem,3.4vw,2.4rem)] font-semibold leading-[1.15]">{t("Üç addımda saytında işləyir")}</Reveal>
      <ol className="mt-14 md:grid md:grid-cols-3 md:gap-12">
        {steps.map((s, i) => (
          <Reveal as="li" key={s.title} delay={i * 160} className="relative pb-12 pl-16 last:pb-0 md:pb-0 md:pl-0">
            {i < steps.length - 1 && <>
              <span className="l-draw-y absolute top-12 bottom-0 left-5 border-l-2 border-dashed border-[var(--l-teal)]/40 md:hidden" aria-hidden />
              <span className="l-draw absolute top-5 left-14 right-[-2.5rem] hidden border-t-2 border-dashed border-[var(--l-teal)]/40 md:block" aria-hidden />
            </>}
            <span className="absolute top-0 left-0 grid size-10 place-items-center rounded-full bg-[var(--l-teal)] font-semibold text-white md:static">{i + 1}</span>
            <h3 className="l-display text-[17px] font-semibold leading-snug md:mt-6">{s.title}</h3>
            <p className="mt-3 text-[15px] leading-relaxed text-[#41594f]">{s.body}</p>
          </Reveal>
        ))}
      </ol>
      <Reveal className="mt-12 overflow-x-auto rounded-2xl bg-[var(--l-ink)] p-5 font-mono text-[13px] leading-relaxed text-[#bfe3d3]" aria-label={t("Quraşdırma kodu nümunəsi")}>
        <code className="whitespace-pre">{'<script src="https://sənin-portalın/widget.js"\n        data-key="wk_…" defer></script>'}</code>
      </Reveal>
    </section>
  );
}

function Features() {
  const { t } = useI18n();
  const card = "rounded-3xl border border-[var(--l-line)] bg-white p-7";
  const icon = "grid size-11 place-items-center rounded-xl bg-[var(--l-mist)] text-[var(--l-teal)]";
  const h = "l-display mt-5 text-[17px] font-semibold leading-snug";
  const p = "mt-2.5 text-[15px] leading-relaxed text-[#41594f]";
  return (
    <section id="imkanlar" className="scroll-mt-20 bg-[var(--l-mist)] py-20 lg:py-28">
      <div className={wrap}>
        <Reveal as="h2" className="l-display max-w-2xl text-[clamp(1.5rem,3.4vw,2.4rem)] font-semibold leading-[1.15]">{t("Ziyarətçi üçün rahat, sənin üçün idarəolunan")}</Reveal>
        <div className="mt-12 grid gap-4 md:grid-cols-12">
          <Reveal delay={0} className="md:col-span-7">
          <div className="rounded-3xl bg-[var(--l-teal)] p-7 text-white l-lift h-full">
            <span className="grid size-11 place-items-center rounded-xl bg-white/15"><Sparkles size={22} aria-hidden /></span>
            <h3 className="l-display mt-5 text-lg font-semibold leading-snug">{t("Həm axtarır, həm cavab verir")}</h3>
            <p className="mt-2.5 max-w-lg text-[15px] leading-relaxed text-white/85">{t("Cümləni başa düşür: kataloqunda uyğun elan, məhsul və ya xidməti tapır, şirkət haqqında suallara isə sənin sənədlərinə və səhifələrinə əsasən cavab verir. Ziyarətçi filtr seçmir, sadəcə yazır.")}</p>
            <div className="mt-6 flex flex-wrap gap-2 text-sm">
              {[t("150 AZN-ə qədər hədiyyə"), t("Çatdırılma neçə günə gəlir?"), t("Cümə günü boş vaxtınız var?")].map((x) => <span key={x} className="rounded-full bg-white/15 px-3.5 py-1.5">{x}</span>)}
            </div>
          </div>
          </Reveal>
          <Reveal delay={90} className="md:col-span-5">
          <div className={`${card} l-lift h-full`}>
            <span className={icon}><Plug size={22} aria-hidden /></span>
            <h3 className={h}>{t("Məlumat sənin saytından gəlir")}</h3>
            <p className={p}>{t("Qiymət, şəkil və keçid birbaşa sənin API-ndən, qaydalar və şərtlər isə sənin əlavə etdiyin məzmundan götürülür. Köməkçi uydurmur: tapmadısa bunu açıq deyir.")}</p>
          </div>
          </Reveal>
          <Reveal delay={180} className="md:col-span-4">
          <div className={`${card} l-lift h-full`}>
            <span className={icon}><BookOpen size={22} aria-hidden /></span>
            <h3 className={h}>{t("Bilik bazası: fayl, link, mətn")}</h3>
            <p className={p}>{t("PDF, Word, TXT, CSV faylı yüklə, səhifə linki ver, bütün saytı skan etdir və ya mətn yapışdır. Cavabın altında hansı mənbəyə əsaslandığı göstərilir.")}</p>
          </div>
          </Reveal>
          <Reveal delay={270} className="md:col-span-4">
          <div className={`${card} l-lift h-full`}>
            <span className={icon}><Headset size={22} aria-hidden /></span>
            <h3 className={h}>{t("Lazım olanda operatora yönləndirir")}</h3>
            <p className={p}>{t("Cavab tapılmayanda ziyarətçi əlaqə formasını doldurur. Müraciət panelindəki gələn qutusuna düşür və sənə email gəlir.")}</p>
          </div>
          </Reveal>
          <Reveal delay={360} className="md:col-span-4">
          <div className={`${card} l-lift h-full`}>
            <span className={icon}><BarChart3 size={22} aria-hidden /></span>
            <h3 className={h}>{t("Nə soruşduqlarını gör")}</h3>
            <p className={p}>{t("Ziyarətçilərin sualları, cavabsız qalanlar və ən çox soruşulanlar bir yerdə. Cavabsız qalan sual sənin növbəti əlavə edəcəyin məzmundur.")}</p>
          </div>
          </Reveal>
          <Reveal delay={450} className="md:col-span-4">
          <div className={`${card} l-lift h-full`}>
            <span className={icon}><SlidersHorizontal size={22} aria-hidden /></span>
            <h3 className={h}>{t("Kataloqu sən öyrədirsən")}</h3>
            <p className={p}>{t("Hansı filtr nə üçündür və API-n onu hansı adla qəbul edir, bunu bir dəfə yazırsan. Marka, kateqoriya kimi siyahıları (ID ilə işləyənləri də) köməkçi özü çevirir.")}</p>
          </div>
          </Reveal>
          <Reveal delay={495} className="md:col-span-4">
          <div className={`${card} l-lift h-full`}>
            <span className={icon}><MessagesSquare size={22} aria-hidden /></span>
            <h3 className={h}>{t("Hazır çat pəncərəsi, üç dildə")}</h3>
            <p className={p}>{t("Backend yazmağa ehtiyac yoxdur. Rəng, başlıq və yer paneldən dəyişir, telefonda tam ekran açılır. Azərbaycan, rus və ingilis dilində cavab verir, panel də eyni üç dildədir.")}</p>
          </div>
          </Reveal>
          <Reveal delay={540} className="md:col-span-4">
          <div className={`${card} l-lift h-full`}>
            <span className={icon}><ShieldCheck size={22} aria-hidden /></span>
            <h3 className={h}>{t("Məxfilik və nəzarət")}</h3>
            <p className={p}>{t("Suallardakı telefon və email avtomatik gizlədilir. API açarı şifrələnib saxlanır. Vidjet yalnız sənin domenində işləyir, aylıq limiti sən görürsən.")}</p>
          </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function Pricing({ signedIn }: { signedIn: boolean }) {
  const { t } = useI18n();
  const pts = [
    t("Aylıq abunə yoxdur. Yalnız çatın real istifadəsi üçün ödəyirsən."),
    t("Hər ay 2 AZN pulsuz balans verilir. Kiçik saytlar üçün çox vaxt bəs edir."),
    t("Pulsuz hissə bitəndə istədiyin qədər (məs. 10 AZN) yükləyirsən. Hər sorğunun qiyməti paneldə AZN ilə görünür."),
    t("Balans bitəndə çat dayanır, ziyarətçiyə əlaqə forması çıxır. Sonradan gələn fatura və ya gözlənilməz borc yoxdur."),
  ];
  return (
    <section id="qiymet" className={`${wrap} scroll-mt-20 py-20 lg:py-28`}>
      <Reveal as="h2" className="l-display max-w-2xl text-[clamp(1.5rem,3.4vw,2.4rem)] font-semibold leading-[1.15]">{t("Qiymət: yalnız istifadə etdiyin qədər")}</Reveal>
      <div className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
        <Reveal as="ul" className="flex flex-col gap-3 text-[16px] leading-relaxed text-[#41594f]">
          {pts.map((x) => <li key={x} className="flex gap-3"><Check size={20} className="mt-0.5 shrink-0 text-[var(--l-teal)]" aria-hidden />{x}</li>)}
        </Reveal>
        <Reveal variant="right" delay={120}>
          <div className="rounded-3xl bg-[var(--l-ink)] p-7 text-white">
            <p className="text-sm text-white/70">{t("Nümunə")}</p>
            <p className="l-display mt-2 text-3xl font-semibold">{t("10 AZN ≈ 4 000 sorğu")}</p>
            <p className="mt-3 text-sm leading-relaxed text-white/75">{t("Təxmini hesabdır: real qiymət sualın uzunluğuna görə dəyişir və paneldə hər gün dəqiq göstərilir.")}</p>
            <Link href={signedIn ? "/billing" : "/register"} className={`${btn} mt-6 h-11 bg-white px-5 text-[var(--l-ink)]`}>{signedIn ? t("Balansa bax") : t("Pulsuz başla")}</Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Faq() {
  const { t } = useI18n();
  const items = [
    [t("Texniki biliyim azdırsa, qura bilərəm?"), t("Bəli. Yalnız bilik bazası (dəstək botu) istəyirsənsə, texniki iş yoxdur: fayl yüklə, sayt linki ver. Kataloq axtarışı üçün paneldə hazır tapşırıq var: onu saytını yazan AI alətinə verirsən, o konfiqurasiyanı hazırlayır. Sən cavabı yapışdırıb sınaq söhbəti ilə yoxlayırsan, sonra bir sətir kodu saytına əlavə edirsən.")],
    [t("Verilənlər bazama giriş verməliyəm?"), t("Xeyr. Köməkçi yalnız saytının açıq API-sindən və sənin əlavə etdiyin fayl, link və mətnlərdən oxuyur. Bazaya heç bir giriş lazım deyil.")],
    [t("Hansı saytlarla işləyir?"), t("Elan, e-ticarət və ya xidmət saytı fərqi yoxdur. Kataloqu API ilə qaytaran istənilən sayt qoşula bilər. Kataloqun yoxdursa, yalnız dəstək botu kimi (sənədlər və sayt məzmunu ilə) qurmaq olar. İkisi birlikdə də işləyir.")],
    [t("Bilik bazasına nə əlavə edə bilərəm?"), t("PDF, Word, TXT, MD, CSV və HTML faylları (6 MB-a qədər), tək səhifənin linki, bütün saytın skanı və ya yapışdırılmış mətn. Şəkil kimi skan olunmuş PDF oxunmur, mətni seçilə bilən olmalıdır.")],
    [t("Cavabı bilmədikdə nə edir?"), t("Uydurmur. Bilmədiyini deyir və ziyarətçiyə əlaqə formasını təklif edir. Müraciət panelindəki gələn qutusuna düşür, cavabsız suallar isə ayrıca siyahıda görünür ki, çatışan məzmunu əlavə edəsən.")],
    [t("Müştəri çatdan öz sifarişini soruşa bilərmi?"), t("Bəli, sən sifariş, ödəniş və ya şikayət kimi məlumatı öz API-nlə qoşursan. Müştəri saytda daxil olubsa, köməkçi yalnız onun öz qeydlərini göstərir. Başqasının məlumatına baxmaq mümkün deyil.")],
    [t("Operator necə cavab verir?"), t("Ziyarətçi operator istəyəndə panelin gələn qutusundakı “Canlı söhbət” bölməsinə düşür. Orada cavab yazırsan və ziyarətçi onu dərhal görür. Çatda olmasa, cavab onun e-poçtuna gedir.")],
    [t("Ziyarətçilərin yazdıqları saxlanırmı?"), t("Yalnız sən “Sorğu jurnalı”nı aktiv saxlasan. Telefon və email avtomatik gizlədilir, qeydlər 90 gündən sonra silinir. İstəsən bunu ayarlardan söndürürsən.")],
    [t("Gözlənilmədən çox pul tutula bilərmi?"), t("Xeyr. Əvvəlcədən yüklədiyin balansdan xərclənir, bitəndə çat dayanır. Balans azalanda email gəlir, panelin Balans səhifəsində orta sorğu qiyməti və ay sonuna proqnoz göstərilir.")],
    [t("Köməkçi səhv cavab verə bilərmi?"), t("Kataloq sualında yalnız sənin API-nin qaytardığını, digər suallarda yalnız bilik bazandakı məlumatı istifadə edir və cavabın altında mənbəni göstərir. Yenə də sınaq söhbətində yoxlamağı məsləhət görürük.")],
  ];
  return (
    <section id="sual" className={`${wrap} scroll-mt-20 grid gap-10 py-20 lg:grid-cols-[.8fr_1.2fr] lg:gap-16 lg:py-28`}>
      <Reveal as="h2" className="l-display text-[clamp(1.5rem,3.4vw,2.4rem)] font-semibold leading-[1.15]">{t("Tez-tez verilən suallar")}</Reveal>
      <div className="divide-y divide-[var(--l-line)] border-y border-[var(--l-line)]">
        {items.map(([q, a], i) => (
          <Reveal key={q} delay={i * 70}><details className="group py-1">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-[17px] font-semibold [&::-webkit-details-marker]:hidden">
              {q}<ChevronDown size={20} className="shrink-0 text-[var(--l-teal)] transition-transform group-open:rotate-180" aria-hidden />
            </summary>
            <p className="pb-5 text-[15px] leading-relaxed text-[#41594f]">{a}</p>
          </details></Reveal>
        ))}
      </div>
    </section>
  );
}

function Cta({ signedIn }: { signedIn: boolean }) {
  const { t } = useI18n();
  return (
    <section className={`${wrap} pb-20 lg:pb-28`}>
      <Reveal variant="scale" className="rounded-[2rem] bg-[var(--l-teal)] px-6 py-14 text-center text-white sm:px-12 lg:py-20">
        <Reveal as="h2" className="l-display mx-auto max-w-2xl text-[clamp(1.5rem,3.6vw,2.5rem)] font-semibold leading-[1.15]">{t("Saytın ziyarətçini gözləyir. Ona yol göstər.")}</Reveal>
        <p className="mx-auto mt-5 max-w-xl text-[17px] leading-relaxed text-white/85">{t("Qeydiyyatdan keç, kataloqunu qoş və ya sənədlərini yüklə, köməkçini sınaq söhbətində yoxla.")}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href={signedIn ? "/dashboard" : "/register"} className={`${btn} bg-white text-[var(--l-ink)] hover:bg-[var(--l-mist)]`}>{signedIn ? t("Panelə keç") : t("Qeydiyyatdan keç")}</Link>
          {!signedIn && <Link href="/login" className={`${btn} border border-white/40 text-white hover:bg-white/10`}>{t("Hesabım var, daxil ol")}</Link>}
        </div>
      </Reveal>
    </section>
  );
}

function Footer({ signedIn }: { signedIn: boolean }) {
  const { t } = useI18n();
  return (
    <footer className="border-t border-[var(--l-line)] py-8">
      <div className={`${wrap} flex flex-wrap items-center justify-between gap-4 text-sm text-[#41594f]`}>
        <Logo />
        <p>© {new Date().getFullYear()} Car Advisor</p>
        <div className="flex gap-5 font-medium">
          {signedIn ? <Link href="/dashboard" className="hover:underline">{t("Panelə keç")}</Link> : <><Link href="/login" className="hover:underline">{t("Daxil ol")}</Link><Link href="/register" className="hover:underline">{t("Qeydiyyat")}</Link></>}
        </div>
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
        <Problem />
        <Steps />
        <Features />
        <Showcase />
        <Everything />
        <Pricing signedIn={signedIn} />
        <Faq />
        <Cta signedIn={signedIn} />
      </main>
      <Footer signedIn={signedIn} />
    </div>
  );
}
