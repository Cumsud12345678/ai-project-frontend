"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, BarChart3, BellRing, Check, ChevronDown, Headset, Languages, Send, UserRound, Users, Zap } from "lucide-react";
import { Reveal } from "@/components/landing/reveal";
import { ActionFlowVisual, ChannelsVisual, DataAccessVisual, InboxVisual, LanguagesVisual } from "@/components/landing/visuals";
import { DeskMock, ProactiveMock } from "@/components/landing/mocks";
import { useI18n } from "@/lib/i18n";

const wrap = "mx-auto w-full max-w-6xl px-5 sm:px-6";

function Points({ items }: { items: string[] }) {
  return (
    <ul className="mt-6 flex flex-col gap-3 text-[15px] leading-relaxed text-[var(--l-sub)]">
      {items.map((x) => <li key={x} className="flex gap-3"><span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-[var(--l-ink)] text-white"><Check size={12} strokeWidth={3} aria-hidden /></span>{x}</li>)}
    </ul>
  );
}

type Tab = { id: string; icon: React.ElementType; label: string; title: string; body: string; points: string[]; visual: React.ReactNode };

function Funnel() {
  const { t } = useI18n();
  const rows: [string, number][] = [[t("Söhbətlər"), 1240], [t("Operatora yönləndirilənlər"), 186], [t("Müraciət qoyanlar"), 94], [t("Canlı söhbətə keçənlər"), 61]];
  const max = rows[0]![1];
  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border border-[var(--l-line)] bg-white p-5 shadow-[0_24px_48px_-28px_rgba(9,9,11,.28)]" role="img" aria-label={t("Nümunə satış hunisi")}>
      <div className="flex flex-col gap-5">
        {rows.map(([name, n], i) => (
          <div key={name} className="l-in" style={{ animationDelay: `${i * 120}ms` }}>
            <div className="flex items-baseline justify-between gap-4 text-sm"><span className="font-medium">{name}</span><span className="l-display text-lg font-semibold">{n.toLocaleString("en-US").replace(",", " ")}</span></div>
            <div className="mt-2 h-2.5 rounded-full bg-[var(--l-mist)]"><div className="h-2.5 rounded-full bg-[var(--l-ink)]" style={{ width: `${Math.max(4, (n / max) * 100)}%`, opacity: 1 - i * 0.18 }} /></div>
          </div>
        ))}
      </div>
      <p className="mt-6 text-xs text-[#71717a]">{t("Nümunə rəqəmlərdir. Panelində öz saytının real göstəriciləri olacaq.")}</p>
    </div>
  );
}

/**
 * "Daha çox": səkkiz imkan bir interaktiv bölmədə. Solda (telefonda yuxarıda) mövzular, sağda seçilənin izahı və vizualı.
 * Əvvəl hər biri ayrıca uzun blok idi; indi səhifə qısalıb, ziyarətçi maraqlandığını özü seçir.
 */
export function Showcase() {
  const { t } = useI18n();
  const tabs: Tab[] = [
    { id: "canli", icon: Headset, label: t("Canlı operator"), title: t("Lazım olanda insan söhbətə qoşulur"),
      body: t("Köməkçi cavab tapa bilmirsə, ziyarətçi eyni pəncərədə operatorla yazışır. Operator cavabı paneldən yazır, ziyarətçi dərhal görür və operatorun yazdığını canlı izləyir."),
      points: [t("Cavab saniyənin bir hissəsində çatır, səhifəni yeniləmək lazım deyil."), t("Ziyarətçi səhifəni bağlasa belə, 7 gün ərzində qayıdanda söhbət qaldığı yerdən davam edir."), t("Ziyarətçi çatdan çıxıbsa, operatorun cavabı onun e-poçtuna gedir.")],
      visual: <InboxVisual /> },
    { id: "masa", icon: Users, label: t("Operator iş masası və komanda"), title: t("Operatorlar üçün hazır iş masası: qeyd, etiket, hazır cavab, AI qaralaması"),
      body: t("Canlı söhbət qutusu yalnız yazışma deyil. Komanda söhbətə daxili qeyd yazır, etiket qoyur, hazır cavabı seçib redaktə edir və istəsə AI-dan qaralama alır. Qaralama yalnız yazı sahəsinə düşür, operator oxuyub özü göndərir."),
      points: [t("Komandanı dəvət et: operatorlar email ilə qoşulur və yalnız canlı söhbət qutusunu görür, ayarlara və ödənişə toxuna bilmir."), t("Daxili qeydləri yalnız komanda görür, müştəriyə heç vaxt getmir. Hər söhbətə 5-ə qədər etiket qoy."), t("Hazır cavabları bir dəfə yaz, operatorlar bir kliklə seçir. AI qaralaması planın limitinə yazılmır."), t("İşçi saatlarını və saat qurşağını təyin et: kənarda canlı operator düyməsi gizlənir, ziyarətçiyə əlaqə forması çıxır."), t("Söhbət bitəndə ziyarətçi 1-5 ulduzla qiymət verir, orta qiyməti paneldə görürsən.")],
      visual: <DeskMock /> },
    { id: "musteri", icon: UserRound, label: t("Müştərinin öz məlumatı"), title: t("“Sifarişim haradadır?” sualına cavab verir"),
      body: t("Hesabına daxil olmuş müştəri öz sifarişini, ödəniş tarixçəsini, müraciət və şikayətlərinin statusunu çatdan soruşa bilər. Hansı məlumat növlərinin açılacağını sən seçirsən: sifariş, ödəniş, şikayət, abunə və ya istənilən başqası."),
      points: [t("Müştəri saytın imzaladığı gizli açarla tanınır, ona görə başqasının məlumatını soruşmaq mümkün deyil."), t("Köməkçiyə yalnız sənin icazə verdiyin sahələr çatır, kart və telefon kimi həssas dəyərlər gizlədilir."), t("Hər müştəri üçün sorğu limiti var, sənin API-ni yükləmir."), t("Məlumat sorğu anında sənin API-ndən oxunur.")],
      visual: <DataAccessVisual /> },
    { id: "emeliyyat", icon: Zap, label: t("Əməliyyatlar"), title: t("Çat yalnız cavab vermir, sənin saytında iş də görür"),
      body: t("İstifadəçi “sifarişimi ləğv et”, “bilet aç”, “görüş rezerv et” və ya “mənimlə əlaqə saxlayın” yazanda köməkçi hərəkəti təklif edir. Nə olacağı kartda bütün dəyərlərlə göstərilir və yalnız istifadəçi “Təsdiq et” basandan sonra sənin API-nə göndərilir."),
      points: [t("AI əməliyyatı özü icra etmir: yalnız təklif yaradır, qərarı istifadəçi verir."), t("Yalnız sənin yazdığın əməliyyatlar və parametrlər mümkündür, hər dəyər tip və uzunluq üzrə yoxlanır."), t("Sorğular imzalanır, təkrar icra olunmur, cavab gəlməsə uğur uydurulmur: “bəlli deyil” bildirilir."), t("Hər addım jurnala yazılır, istifadəçi və sayt üzrə limit var."), t("Bunun üçün saytının API-si lazımdır: əməliyyatı orada sən yazırsan.")],
      visual: <ActionFlowVisual /> },
    { id: "proaktiv", icon: BellRing, label: t("Proaktiv mesajlar"), title: t("Ziyarətçi yazmamış, çat özü təklif göstərir"),
      body: t("Məhsul səhifəsində 20 saniyə qalan ziyarətçiyə çat düyməsinin yanında qısa təklif çıxır. Mətni, gözləmə vaxtını və hansı səhifələrdə göstəriləcəyini sən seçirsən."),
      points: [t("Mətn sənin yazdığındır, ona görə AI xərci yoxdur."), t("Ən çox 5 qayda: hər biri üçün gözləmə vaxtı və səhifə şablonu (məs. /products/*)."), t("Eyni ziyarətçiyə bir sessiyada hər mesaj yalnız bir dəfə göstərilir."), t("Səbət tərk edilib kimi öz şərtin üçün saytın skriptindən bir sətirlə çağıra bilərsən.")],
      visual: <ProactiveMock /> },
    { id: "kanallar", icon: Send, label: t("Telegram və WhatsApp"), title: t("Müştəri yazsa da, səsli mesaj göndərsə də cavab alır"),
      body: t("Öz Telegram botunu bir tokenlə, WhatsApp nömrəni QR kodla qoşursan. Müştəri orada yazanda və ya səsli mesaj göndərəndə köməkçi saytdakı çatla eyni bilik bazasından cavab verir, tapmasa operatora yönləndirir."),
      points: [t("Səsli mesaj (60 saniyəyə qədər) mətnə çevrilir və adi sual kimi cavablandırılır. Səs heç yerdə saxlanmır."), t("Telegram: BotFather-dən aldığın tokeni yapışdırmaq kifayətdir."), t("WhatsApp QR ilə qoşulur: bu, rəsmi API deyil və nömrənin bloklanma riski var, ona görə ayrıca iş nömrəsi məsləhətdir."), t("Cavab tapılmayanda köməkçi telefon və ya e-poçt istəyir, operator həmin söhbətə paneldən qoşulub cavab verə bilər."), t("Qrup yazışmalarına cavab vermir, sifariş və ödəniş kimi müştəri məlumatı bu kanallarda açılmır.")],
      visual: <ChannelsVisual /> },
    { id: "diller", icon: Languages, label: t("İstənilən dildə"), title: t("Ziyarətçi hansı dildə yazırsa, o dildə cavab alır"),
      body: t("Sənədlərin Azərbaycan dilindədirsə belə, rus, ingilis və ya başqa dildə gələn suala həmin dildə cavab verir. Ayrıca tərcümə hazırlamaq lazım deyil."),
      points: [t("Çat pəncərəsi və panel Azərbaycan, ingilis, rus və türk dillərindədir."), t("Kataloqdakı ad və dəyərlər (rəng, şəhər, marka) ziyarətçinin dilində də başa düşülür.")],
      visual: <LanguagesVisual /> },
    { id: "statistika", icon: BarChart3, label: t("Statistika və hesabat"), title: t("Çatın sənə nə qazandırdığını rəqəmlə gör"),
      body: t("Hər söhbətin tarixçəsi saxlanır, ziyarətçinin sualından operatora yönləndirilməsinə və müraciətə qədər yol isə huni şəklində göstərilir."),
      points: [t("Söhbət tarixçəsini aç, hansı sualın cavabsız qaldığını gör."), t("AI sualları mövzulara bölür və bilik bazasına nəyi əlavə etməli olduğunu göstərir. Yalnız sən düymə basanda işləyir."), t("Ziyarətçi hər cavaba 👍 və ya 👎 verir, bəyənilməyən cavabları paneldə ayrıca görürsən."), t("Hunidə neçə nəfərin operatora keçdiyini və müraciət qoyduğunu izlə."), t("Hesabatı CSV faylı kimi yüklə, hər ay e-poçtuna qısa hesabat gəlsin.")],
      visual: <Funnel /> },
  ];
  const [cur, setCur] = useState(0);
  const tab = tabs[cur]!;
  const pills = useRef<HTMLDivElement>(null);
  // Telefonda seçilən tab üfüqi siyahının ortasına gəlsin. scrollIntoView işlədilmir: o, bütün səhifəni də
  // bu bölməyə sürüşdürürdü (səhifə açılan kimi "Daha çox"a düşürdü). Yalnız siyahının öz üfüqi sürüşməsi dəyişir.
  useEffect(() => {
    const box = pills.current, el = box?.querySelector<HTMLElement>(`[data-i="${cur}"]`);
    if (!box || !el || box.scrollWidth <= box.clientWidth) return;
    box.scrollTo({ left: el.offsetLeft - (box.clientWidth - el.offsetWidth) / 2, behavior: "smooth" });
  }, [cur]);
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowRight") { e.preventDefault(); setCur((c) => (c + 1) % tabs.length); }
    if (e.key === "ArrowUp" || e.key === "ArrowLeft") { e.preventDefault(); setCur((c) => (c - 1 + tabs.length) % tabs.length); }
  };

  return (
    <section id="daha" className={`${wrap} scroll-mt-24 py-20 lg:py-28`}>
      <Reveal as="p" className="inline-flex items-center gap-2 text-[13px] font-semibold tracking-wide text-[var(--l-orange-d)] uppercase">{t("Daha çox")}</Reveal>
      <Reveal as="h2" delay={60} className="l-display mt-3 max-w-3xl text-[clamp(1.75rem,3.6vw,2.75rem)] font-semibold leading-[1.08]">{t("Çat cavab verməklə bitmir")}</Reveal>
      <Reveal as="p" delay={120} className="mt-5 max-w-2xl text-[17px] leading-relaxed text-[var(--l-sub)]">{t("Canlı operator və komanda, müştərinin öz məlumatı, saytında icra olunan əməliyyatlar, proaktiv mesajlar, səsli mesajla birlikdə Telegram və WhatsApp, statistika. Aşağıda hər birinin ziyarətçiyə və sənə necə göründüyünü görə bilərsən.")}</Reveal>

      <Reveal delay={160} className="mt-12 grid gap-6 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-8">
        <div ref={pills} role="tablist" aria-orientation="vertical" aria-label={t("Daha çox")} onKeyDown={onKey}
          className="no-scrollbar relative -mx-5 flex gap-2 overflow-x-auto px-5 sm:-mx-6 sm:px-6 lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:px-0">
          {tabs.map((x, i) => (
            <button key={x.id} id={`tab-${x.id}`} data-i={i} type="button" role="tab" aria-selected={i === cur} aria-controls="daha-panel" tabIndex={i === cur ? 0 : -1} onClick={() => setCur(i)}
              className={`flex shrink-0 cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left text-sm font-semibold whitespace-nowrap transition-colors lg:whitespace-normal ${i === cur ? "border-[var(--l-ink)] bg-[var(--l-ink)] text-white" : "border-[var(--l-line)] bg-white text-[var(--l-sub)] hover:border-[#d4d4d8] hover:text-[var(--l-ink)] lg:border-transparent lg:bg-transparent lg:hover:bg-[var(--l-mist)]"}`}>
              <x.icon size={17} aria-hidden className="shrink-0" />{x.label}
            </button>
          ))}
        </div>

        <div id="daha-panel" role="tabpanel" aria-labelledby={`tab-${tab.id}`} className="min-w-0 overflow-hidden rounded-3xl border border-[var(--l-line)] bg-[var(--l-mist)]/60">
          <div key={tab.id} className="l-swap grid gap-8 p-5 sm:p-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:items-center">
            <div className="min-w-0">
              <h3 className="text-[clamp(1.3rem,2.4vw,1.75rem)] font-semibold leading-[1.2] tracking-[-0.02em]">{tab.title}</h3>
              <p className="mt-4 text-[15px] leading-relaxed text-[var(--l-sub)]">{tab.body}</p>
              <Points items={tab.points} />
            </div>
            <div className="min-w-0">{tab.visual}</div>
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-[var(--l-line)] bg-white/60 px-5 py-3 sm:px-8">
            <span className="text-xs text-[var(--l-sub)] tabular-nums">{cur + 1} / {tabs.length}</span>
            <button type="button" onClick={() => setCur((c) => (c + 1) % tabs.length)} className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold hover:bg-white">
              {tabs[(cur + 1) % tabs.length]!.label}<ArrowRight size={15} aria-hidden />
            </button>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/** “Nələr var” siyahısı: kartsız, qruplaşdırılmış mətn. Bütün işlərin bir baxışda xülasəsi. */
export function Everything() {
  const { t } = useI18n();
  const [all, setAll] = useState(false); // telefonda əvvəlcə 3 qrup, qalanı düymə ilə
  const groups: [string, string[]][] = [
    [t("Söhbət"), [t("Canlı operator söhbəti"), t("“Operator yazır” göstəricisi"), t("Söhbətin 7 gün davam etməsi"), t("Ziyarətçiyə e-poçtla cavab"), t("Əlaqə forması və gələn qutusu"), t("Proaktiv mesajlar (səhifə və vaxta görə)")]],
    [t("Operator iş masası"), [t("Daxili qeydlər"), t("Etiketlər"), t("Hazır cavablar"), t("AI qaralaması (operator özü göndərir)"), t("İşçi saatları"), t("Söhbət sonrası qiymət (CSAT)"), t("Komanda: 5 operatora qədər")]],
    [t("Əməliyyatlar"), [t("Sifarişin ləğvi, bilet, görüş rezervi, müraciət"), t("İstifadəçi kartda təsdiq verir"), t("İmzalı sorğu və təkrar icradan qorunma"), t("Əməliyyat jurnalı və limitlər")]],
    [t("Kanallar"), [t("Telegram botu"), t("WhatsApp (QR ilə, qeyri-rəsmi)"), t("Səsli mesajlar mətnə çevrilir"), t("Operatorun müştəriyə ilk yazması"), t("Ziyarətçinin dilində cavab"), t("Çat və panel: AZ, EN, RU, TR")]],
    [t("Axtarış və cavab"), [t("Kataloq axtarışı (REST və GraphQL API)"), t("Bilik bazası: fayl, link, bütün sayt, mətn"), t("Məna və açar söz üzrə birgə axtarış"), t("Cavabın altında mənbə"), t("Bilmədikdə uydurmaq əvəzinə operatora yönləndirmə"), t("Şəkillə axtarış"), t("Ssenarilər və dəqiq cavablar"), t("Saytın avtomatik yenilənməsi"), t("CSV, JSON, XML fayl və ya feed"), t("Nümunə cavabdan sahələrin avtomatik tanınması")]],
    [t("Müştəri məlumatı"), [t("Sifariş, ödəniş, şikayət, abunə və başqa növlər"), t("İmzalı müştəri açarı"), t("Sahə siyahısı və maskalama"), t("Müştəri üzrə sorğu limiti"), t("Başqasının qeydinə baxmağa qarşı qoruma")]],
    [t("İdarəetmə"), [t("Söhbət tarixçəsi və satış hunisi"), t("Sualların AI ilə mövzulara bölünməsi"), t("Cavablara 👍/👎 rəyi"), t("CSV ixracı"), t("Aylıq e-poçt hesabatı"), t("Aylıq plan, limit xəbərdarlığı (80% və 100%)"), t("Rəng, başlıq və yer paneldən dəyişir")]],
    [t("Təhlükəsizlik"), [t("Telefon və e-poçtun avtomatik gizlədilməsi"), t("API açarı şifrələnib saxlanır"), t("Vidjet yalnız sənin domenində işləyir"), t("Qeydlərin 90 gündən sonra silinməsi"), t("E-poçt təsdiqi, güclü parol")]],
  ];
  return (
    <section id="hamisi" className={`${wrap} scroll-mt-24 py-20 lg:py-28`}>
      <Reveal as="h2" className="l-display max-w-3xl text-[clamp(1.75rem,3.6vw,2.75rem)] font-semibold leading-[1.08]">{t("Hamısı bir siyahıda")}</Reveal>
      <div className="mt-12 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map(([name, items], i) => (
          <Reveal key={name} delay={(i % 3) * 80} className={!all && i >= 3 ? "max-sm:hidden" : ""}>
            <h3 className="l-display border-t-2 border-[var(--l-teal)] pt-4 text-[17px] font-semibold">{name}</h3>
            <ul className="mt-4 flex flex-col gap-2.5 text-[15px] leading-snug text-[#52525b]">
              {items.map((x) => <li key={x} className="flex gap-2.5"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-[var(--l-orange)]" aria-hidden />{x}</li>)}
            </ul>
          </Reveal>
        ))}
      </div>
      {!all && <button type="button" onClick={() => setAll(true)} className="mt-8 inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-[var(--l-line)] bg-white text-[15px] font-semibold sm:hidden">{t("Hamısını göstər")}<ChevronDown size={16} aria-hidden /></button>}
    </section>
  );
}
