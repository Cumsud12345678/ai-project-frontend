"use client";
import { Check } from "lucide-react";
import { Reveal } from "@/components/landing/reveal";
import { PhoneChat, type ChatMsg } from "@/components/landing/phone-chat";
import { useI18n } from "@/lib/i18n";

const wrap = "mx-auto w-full max-w-6xl px-5";

function Points({ items }: { items: string[] }) {
  return (
    <ul className="mt-6 flex flex-col gap-3 text-[15px] leading-relaxed text-[#41594f]">
      {items.map((x) => <li key={x} className="flex gap-3"><Check size={19} className="mt-0.5 shrink-0 text-[var(--l-teal)]" aria-hidden />{x}</li>)}
    </ul>
  );
}

/** Mətn solda, telefon söhbəti sağda (flip=true olanda tərsinə). Kartsız: yalnız başlıq, abzas və siyahı. */
function Block({ id, eyebrow, title, body, points, phone, flip = false, tint = false }: {
  id: string; eyebrow: string; title: string; body: string; points: string[]; phone: React.ReactNode; flip?: boolean; tint?: boolean;
}) {
  return (
    <section id={id} className={`scroll-mt-20 py-16 lg:py-24 ${tint ? "bg-[var(--l-mist)]" : ""}`}>
      <div className={`${wrap} grid items-center gap-12 lg:grid-cols-2 lg:gap-20`}>
        <div className={flip ? "lg:order-2" : ""}>
          <Reveal as="p" className="text-sm font-semibold tracking-wide text-[var(--l-orange-d)] uppercase">{eyebrow}</Reveal>
          <Reveal as="h3" delay={80} className="l-display mt-3 text-[clamp(1.35rem,2.8vw,2rem)] font-semibold leading-[1.2]">{title}</Reveal>
          <Reveal as="p" delay={160} className="mt-5 max-w-xl text-[16px] leading-relaxed text-[#41594f]">{body}</Reveal>
          <Reveal delay={240}><Points items={points} /></Reveal>
        </div>
        <Reveal variant={flip ? "left" : "right"} delay={120} className={flip ? "lg:order-1" : ""}>{phone}</Reveal>
      </div>
    </section>
  );
}

function Funnel() {
  const { t } = useI18n();
  const rows: [string, number][] = [[t("Söhbətlər"), 1240], [t("Operatora yönləndirilənlər"), 186], [t("Müraciət qoyanlar"), 94], [t("Canlı söhbətə keçənlər"), 61]];
  const max = rows[0]![1];
  return (
    <div className="mx-auto w-full max-w-md" role="img" aria-label={t("Nümunə satış hunisi")}>
      <div className="flex flex-col gap-5">
        {rows.map(([name, n], i) => (
          <Reveal key={name} delay={i * 140}>
            <div className="flex items-baseline justify-between gap-4 text-sm"><span className="font-medium">{name}</span><span className="l-display text-lg font-semibold text-[var(--l-teal)]">{n.toLocaleString("en-US").replace(",", " ")}</span></div>
            <div className="mt-2 h-3 rounded-full bg-white"><div className="h-3 rounded-full bg-[var(--l-teal)]" style={{ width: `${Math.max(4, (n / max) * 100)}%`, opacity: 1 - i * 0.18 }} /></div>
          </Reveal>
        ))}
      </div>
      <p className="mt-6 text-xs text-[#58706a]">{t("Nümunə rəqəmlərdir. Panelində öz saytının real göstəriciləri olacaq.")}</p>
    </div>
  );
}

export function Showcase() {
  const { t } = useI18n();
  const live: ChatMsg[] = [
    { from: "user", text: t("Zəmanəti 3 ilə uzatmaq olarmı?") },
    { from: "bot", text: t("Bu barədə dəqiq məlumatım yoxdur. İstəsəniz operatoru çağırım.") },
    { from: "system", text: t("Operator söhbətə qoşuldu") },
    { from: "operator", name: t("Operator · Aynur"), text: t("Salam! Bəli, 3 ilə qədər uzatmaq olar. Qiyməti 45 ₼-dir.") },
    { from: "typing", text: t("Operator yazır…") },
  ];
  const mine: ChatMsg[] = [
    { from: "user", text: t("Sifarişim haradadır?") },
    { from: "bot", text: t("#10482 nömrəli sifarişiniz yoldadır, kuryerə təhvil verilib. Çatdırılma: sabah 12:00–18:00.") , note: t("Mənbə: sənin sifarişlərin") },
    { from: "user", text: t("Son ödənişim keçib?") },
    { from: "bot", text: t("Bəli, dünən 139 ₼ ödənişiniz uğurla tamamlanıb."), note: t("Mənbə: sənin ödənişlərin") },
  ];
  const langs: ChatMsg[] = [
    { from: "user", text: "Сколько стоит доставка?" },
    { from: "bot", text: "По Баку доставка 1–2 рабочих дня. При заказе от 100 ₼ она бесплатная." },
    { from: "user", text: "And how long does a refund take?" },
    { from: "bot", text: "Refunds reach your card within 5 business days after we receive the item." },
  ];
  return (
    <div id="daha">
      <section className={`${wrap} pt-20 lg:pt-28`}>
        <Reveal as="h2" className="l-display max-w-3xl text-[clamp(1.5rem,3.4vw,2.4rem)] font-semibold leading-[1.15]">{t("Çat cavab verməklə bitmir")}</Reveal>
        <Reveal as="p" delay={100} className="mt-5 max-w-2xl text-[17px] leading-relaxed text-[#41594f]">{t("Köməkçini ilk gündən bəri artırdıq: indi canlı operator, müştərinin öz məlumatı, statistika və hesabat da var. Aşağıda hər birinin real söhbətdə necə göründüyünü görə bilərsən.")}</Reveal>
      </section>

      <Block id="canli" eyebrow={t("Canlı operator")} title={t("Lazım olanda insan söhbətə qoşulur")}
        body={t("Köməkçi cavab tapa bilmirsə, ziyarətçi eyni pəncərədə operatorla yazışır. Operator cavabı paneldən yazır, ziyarətçi dərhal görür və operatorun yazdığını canlı izləyir.")}
        points={[t("Cavab saniyənin bir hissəsində çatır, səhifəni yeniləmək lazım deyil."), t("Ziyarətçi səhifəni bağlasa belə, 7 gün ərzində qayıdanda söhbət qaldığı yerdən davam edir."), t("Ziyarətçi çatdan çıxıbsa, operatorun cavabı onun e-poçtuna gedir.")]}
        phone={<PhoneChat title={t("Köməkçi")} subtitle={t("Operator ilə canlı söhbət")} label={t("Nümunə söhbət: operator canlı cavab verir")} messages={live} />} />

      <Block id="musteri" tint flip eyebrow={t("Müştərinin öz məlumatı")} title={t("“Sifarişim haradadır?” sualına cavab verir")}
        body={t("Hesabına daxil olmuş müştəri öz sifarişini, ödəniş tarixçəsini, müraciət və şikayətlərinin statusunu çatdan soruşa bilər. Hansı məlumat növlərinin açılacağını sən seçirsən: sifariş, ödəniş, şikayət, abunə və ya istənilən başqası.")}
        points={[t("Müştəri saytın imzaladığı gizli açarla tanınır, ona görə başqasının məlumatını soruşmaq mümkün deyil."), t("Köməkçiyə yalnız sənin icazə verdiyin sahələr çatır, kart və telefon kimi həssas dəyərlər gizlədilir."), t("Hər müştəri üçün sorğu limiti var, sənin API-ni yükləmir."), t("Məlumat sorğu anında sənin API-ndən oxunur.")]}
        phone={<PhoneChat title={t("Köməkçi")} subtitle={t("Sənin hesabın üçün")} label={t("Nümunə söhbət: müştəri sifarişini soruşur")} messages={mine} />} />

      <Block id="diller" eyebrow={t("Üç dildə")} title={t("Ziyarətçi hansı dildə yazırsa, o dildə cavab alır")}
        body={t("Sənədlərin Azərbaycan dilindədirsə belə, rus və ya ingilis dilində gələn suala həmin dildə cavab verir. Ayrıca tərcümə hazırlamaq lazım deyil.")}
        points={[t("Çat pəncərəsi və panel Azərbaycan, ingilis və rus dillərindədir."), t("Kataloqdakı ad və dəyərlər (rəng, şəhər, marka) ziyarətçinin dilində də başa düşülür.")]}
        phone={<PhoneChat title="Assistant" subtitle="AZ · EN · RU" label={t("Nümunə söhbət: rus və ingilis dilində suallar")} messages={langs} />} />

      <section id="statistika" className="scroll-mt-20 bg-[var(--l-mist)] py-16 lg:py-24">
        <div className={`${wrap} grid items-center gap-12 lg:grid-cols-2 lg:gap-20`}>
          <div>
            <Reveal as="p" className="text-sm font-semibold tracking-wide text-[var(--l-orange-d)] uppercase">{t("Statistika və hesabat")}</Reveal>
            <Reveal as="h3" delay={80} className="l-display mt-3 text-[clamp(1.35rem,2.8vw,2rem)] font-semibold leading-[1.2]">{t("Çatın sənə nə qazandırdığını rəqəmlə gör")}</Reveal>
            <Reveal as="p" delay={160} className="mt-5 max-w-xl text-[16px] leading-relaxed text-[#41594f]">{t("Hər söhbətin tarixçəsi saxlanır, ziyarətçinin sualından operatora yönləndirilməsinə və müraciətə qədər yol isə huni şəklində göstərilir.")}</Reveal>
            <Reveal delay={240}><Points items={[t("Söhbət tarixçəsini aç, hansı sualın cavabsız qaldığını gör."), t("Hunidə neçə nəfərin operatora keçdiyini və müraciət qoyduğunu izlə."), t("Hesabatı CSV faylı kimi yüklə."), t("Hər ay e-poçtuna qısa hesabat gəlir.")]} /></Reveal>
          </div>
          <Funnel />
        </div>
      </section>
    </div>
  );
}

/** “Nələr var” siyahısı: kartsız, qruplaşdırılmış mətn. Bütün işlərin bir baxışda xülasəsi. */
export function Everything() {
  const { t } = useI18n();
  const groups: [string, string[]][] = [
    [t("Söhbət"), [t("Canlı operator söhbəti"), t("“Operator yazır” göstəricisi"), t("Söhbətin 7 gün davam etməsi"), t("Ziyarətçiyə e-poçtla cavab"), t("Əlaqə forması və gələn qutusu")]],
    [t("Axtarış və cavab"), [t("Kataloq axtarışı (REST və GraphQL API)"), t("Bilik bazası: fayl, link, bütün sayt, mətn"), t("Məna və açar söz üzrə birgə axtarış"), t("Cavabın altında mənbə"), t("Bilmədikdə uydurmaq əvəzinə operatora yönləndirmə")]],
    [t("Müştəri məlumatı"), [t("Sifariş, ödəniş, şikayət, abunə və başqa növlər"), t("İmzalı müştəri açarı"), t("Sahə siyahısı və maskalama"), t("Müştəri üzrə sorğu limiti"), t("Başqasının qeydinə baxmağa qarşı qoruma")]],
    [t("İdarəetmə"), [t("Söhbət tarixçəsi və satış hunisi"), t("CSV ixracı"), t("Aylıq e-poçt hesabatı"), t("İstifadəyə görə balans, aşağı balans xəbərdarlığı"), t("Rəng, başlıq və yer paneldən dəyişir")]],
    [t("Təhlükəsizlik"), [t("Telefon və e-poçtun avtomatik gizlədilməsi"), t("API açarı şifrələnib saxlanır"), t("Vidjet yalnız sənin domenində işləyir"), t("Qeydlərin 90 gündən sonra silinməsi"), t("E-poçt təsdiqi, güclü parol")]],
  ];
  return (
    <section id="hamisi" className={`${wrap} scroll-mt-20 py-20 lg:py-28`}>
      <Reveal as="h2" className="l-display max-w-3xl text-[clamp(1.5rem,3.4vw,2.4rem)] font-semibold leading-[1.15]">{t("Hamısı bir siyahıda")}</Reveal>
      <div className="mt-12 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map(([name, items], i) => (
          <Reveal key={name} delay={i * 80}>
            <h3 className="l-display border-t-2 border-[var(--l-teal)] pt-4 text-[17px] font-semibold">{name}</h3>
            <ul className="mt-4 flex flex-col gap-2.5 text-[15px] leading-snug text-[#41594f]">
              {items.map((x) => <li key={x} className="flex gap-2.5"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-[var(--l-orange-d)]" aria-hidden />{x}</li>)}
            </ul>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
