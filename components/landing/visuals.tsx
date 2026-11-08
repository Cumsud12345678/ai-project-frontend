"use client";
import { ArrowRight, BookOpen, Check, Circle, EyeOff, FileText, Globe, KeyRound, Link2, Lock, Mic, Phone, Send } from "lucide-react";
import { Reveal } from "@/components/landing/reveal";
import { useI18n } from "@/lib/i18n";

/**
 * Showcase bölməsinin vizualları. Hər biri məhsulun fərqli hissəsini göstərir (gələn qutusu, icazələr,
 * əməliyyat jurnalı, kanallar, dillər), ona görə telefon-çat təkrarlanmır. Hamısı statik nümunədir.
 */

const muted = "text-[#71717a]";

/** Ortaq çərçivə: incə xətt, yüngül kölgə, istəyə görə başlıq zolağı. */
function Frame({ title, meta, label, children, className = "" }: { title?: string; meta?: React.ReactNode; label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`mx-auto w-full max-w-md overflow-hidden rounded-2xl border border-[var(--l-line)] bg-white shadow-[0_1px_2px_rgba(9,9,11,.06),0_24px_48px_-28px_rgba(9,9,11,.28)] ${className}`} role="img" aria-label={label}>
      {title && (
        <div className="flex items-center justify-between gap-3 border-b border-[var(--l-line)] px-4 py-3" aria-hidden>
          <p className="text-[13px] font-semibold">{title}</p>
          {meta}
        </div>
      )}
      <div aria-hidden>{children}</div>
    </div>
  );
}

function Dot({ tone }: { tone: "amber" | "teal" | "gray" }) {
  const c = tone === "amber" ? "bg-amber-500" : tone === "teal" ? "bg-[var(--l-teal)]" : "bg-[#a1a1aa]";
  return <span className={`inline-block size-2 shrink-0 rounded-full ${c}`} />;
}

/** Canlı operator: operatorun gələn qutusu. */
export function InboxVisual() {
  const { t } = useI18n();
  const rows: { name: string; text: string; time: string; tone: "amber" | "teal" | "gray"; status: string; active?: boolean }[] = [
    { name: "Nigar M.", text: t("Zəmanəti 3 ilə uzatmaq olarmı?"), time: "0:12", tone: "amber", status: t("Cavab gözləyir"), active: true },
    { name: "Elvin Q.", text: t("Sifariş neçə günə çatdırılır?"), time: t("{n} dəq", { n: 2 }), tone: "teal", status: t("AI cavablayır") },
    { name: t("Ziyarətçi #4821"), text: t("Təşəkkürlər, aydın oldu"), time: t("{n} dəq", { n: 9 }), tone: "gray", status: t("Bağlandı") },
  ];
  return (
    <Frame title={t("Canlı söhbətlər")} label={t("Nümunə: operatorun canlı söhbət qutusu")}
      meta={<span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800"><Dot tone="amber" />{t("1 gözləyir")}</span>}>
      <ul className="divide-y divide-[var(--l-line)]">
        {rows.map((r, i) => (
          <Reveal as="li" key={r.name} delay={i * 120} className={`flex gap-3 px-4 py-3.5 ${r.active ? "bg-[#fbf7ee]" : ""}`}>
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--l-mist)] text-[13px] font-semibold text-[var(--l-teal)]">{r.name.slice(0, 1)}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-3">
                <p className="truncate text-sm font-semibold">{r.name}</p>
                <span className={`shrink-0 text-[11px] tabular-nums ${muted}`}>{r.time}</span>
              </div>
              <p className={`truncate text-[13px] ${muted}`}>{r.text}</p>
              <p className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] font-medium text-[#52525b]"><Dot tone={r.tone} />{r.status}</p>
            </div>
          </Reveal>
        ))}
      </ul>
      <div className="grid grid-cols-2 border-t border-[var(--l-line)] bg-[#fafafa]">
        <div className="px-4 py-3.5">
          <p className={`text-[11px] ${muted}`}>{t("Orta ilk cavab")}</p>
          <p className="l-display mt-0.5 text-lg font-semibold tabular-nums">14 {t("san")}</p>
        </div>
        <div className="border-l border-[var(--l-line)] px-4 py-3.5">
          <p className={`text-[11px] ${muted}`}>{t("Söhbət saxlanır")}</p>
          <p className="l-display mt-0.5 text-lg font-semibold tabular-nums">7 {t("gün")}</p>
        </div>
      </div>
    </Frame>
  );
}

/** Müştərinin öz məlumatı: köməkçiyə hansı sahələrin çatdığı. */
export function DataAccessVisual() {
  const { t } = useI18n();
  const rows: { field: string; value: string; open: boolean }[] = [
    { field: "order.status", value: t("Yoldadır"), open: true },
    { field: "order.eta", value: t("Sabah 12:00–18:00"), open: true },
    { field: "payment.amount", value: "139 ₼", open: true },
    { field: "card.number", value: "•••• 4417", open: false },
    { field: "customer.phone", value: "+994 •• ••• •• 21", open: false },
  ];
  return (
    <Frame title={t("Köməkçiyə görünən sahələr")} label={t("Nümunə: müştəri məlumatının hansı sahələrinin açıq, hansının gizli olduğu")}
      meta={<span className="inline-flex items-center gap-1 font-mono text-[11px] text-[#52525b]"><KeyRound size={12} />HMAC</span>}>
      <div className="flex items-center gap-2 border-b border-[var(--l-line)] bg-[#fafafa] px-4 py-2.5 font-mono text-[12px] text-[#52525b]">
        <span className="rounded bg-[var(--l-teal)]/10 px-1.5 py-0.5 font-semibold text-[var(--l-teal)]">GET</span>
        <span className="truncate">/api/me/orders/10482</span>
      </div>
      <ul className="divide-y divide-[var(--l-line)] text-[13px]">
        {rows.map((r, i) => (
          <Reveal as="li" key={r.field} delay={i * 90} className="flex items-center gap-3 px-4 py-3">
            <span className="w-32 shrink-0 truncate font-mono text-[12px] text-[#52525b]">{r.field}</span>
            <span className={`min-w-0 flex-1 truncate ${r.open ? "font-medium" : `font-mono ${muted}`}`}>{r.value}</span>
            {r.open
              ? <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-[var(--l-teal)]"><Check size={13} strokeWidth={2.5} />{t("açıq")}</span>
              : <span className={`inline-flex shrink-0 items-center gap-1 text-[11px] font-medium ${muted}`}><EyeOff size={13} />{t("gizli")}</span>}
          </Reveal>
        ))}
      </ul>
      <div className={`flex items-center gap-2 border-t border-[var(--l-line)] px-4 py-3 text-[12px] ${muted}`}>
        <Lock size={13} className="shrink-0" />{t("Hər müştəri yalnız öz qeydini görür · sorğu limiti var")}
      </div>
    </Frame>
  );
}

/** Əməliyyatlar: təsdiq kartından API-yə qədər jurnal. */
export function ActionFlowVisual() {
  const { t } = useI18n();
  const steps: { time: string; title: string; detail: React.ReactNode; done?: boolean }[] = [
    { time: "14:02:11", title: t("Köməkçi əməliyyat təklif etdi"), detail: <span className="font-mono">cancel_order(order_id: 10482)</span> },
    { time: "14:02:15", title: t("İstifadəçi “Təsdiq et” basdı"), detail: t("Kartda bütün dəyərlər göstərilmişdi") },
    { time: "14:02:15", title: t("Sənin API-nə imzalı sorğu"), detail: <span className="font-mono">POST /orders/10482/cancel → <span className="font-semibold text-[var(--l-teal)]">200 OK</span></span> },
    { time: "14:02:16", title: t("Jurnala yazıldı"), detail: t("Təkrar göndərilsə icra olunmayacaq"), done: true },
  ];
  return (
    <Frame title={t("Əməliyyat jurnalı")} label={t("Nümunə: sifarişin ləğvi təklifdən icraya qədər")}
      meta={<span className="rounded-full bg-[var(--l-teal)]/10 px-2 py-0.5 text-[11px] font-medium text-[var(--l-teal)]">{t("icra olundu")}</span>}>
      <ol className="relative px-4 py-4">
        <span className="absolute top-6 bottom-6 left-[1.4rem] w-px bg-[var(--l-line)]" />
        {steps.map((s, i) => (
          <Reveal as="li" key={i} delay={i * 160} className="relative flex gap-3.5 pb-5 last:pb-0">
            <span className={`relative z-10 mt-0.5 grid size-[0.85rem] shrink-0 place-items-center rounded-full ${s.done ? "bg-[var(--l-teal)]" : "border-2 border-[var(--l-teal)] bg-white"}`}>
              {s.done && <Check size={9} strokeWidth={4} className="text-white" />}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-[13px] font-semibold">{s.title}</p>
                <span className={`shrink-0 font-mono text-[11px] ${muted}`}>{s.time}</span>
              </div>
              <p className={`mt-0.5 truncate text-[12px] ${muted}`}>{s.detail}</p>
            </div>
          </Reveal>
        ))}
      </ol>
    </Frame>
  );
}

/** Telegram, WhatsApp və sayt: üç kanal, bir bilik bazası. */
export function ChannelsVisual() {
  const { t } = useI18n();
  const channels: { name: string; meta: string; icon: React.ReactNode }[] = [
    { name: t("Sayt"), meta: "widget.js", icon: <Globe size={16} /> },
    { name: "Telegram", meta: "@magaza_bot", icon: <Send size={16} /> },
    { name: "WhatsApp", meta: "+994 50 •••", icon: <Phone size={16} /> },
  ];
  const docs: [React.ReactNode, string][] = [[<FileText key="a" size={14} />, "Çatdırılma şərtləri.pdf"], [<FileText key="b" size={14} />, "Zəmanət.docx"], [<Link2 key="c" size={14} />, "magaza.az/faq"]];
  return (
    <div className="mx-auto w-full max-w-md" role="img" aria-label={t("Nümunə: sayt, Telegram və WhatsApp eyni bilik bazasından cavab verir")}>
      <div className="grid grid-cols-3 gap-2.5" aria-hidden>
        {channels.map((c, i) => (
          <Reveal key={c.name} delay={i * 110} className="rounded-xl border border-[var(--l-line)] bg-white px-3 py-3 shadow-[0_1px_2px_rgba(9,9,11,.05)]">
            <span className="grid size-8 place-items-center rounded-lg bg-[var(--l-mist)] text-[var(--l-teal)]">{c.icon}</span>
            <p className="mt-2.5 text-[13px] font-semibold">{c.name}</p>
            <p className={`truncate font-mono text-[11px] ${muted}`}>{c.meta}</p>
          </Reveal>
        ))}
      </div>
      {/* üç kanaldan aşağı birləşən xətlər */}
      <div className="relative mx-[16.66%] h-8" aria-hidden>
        <span className="absolute top-0 left-0 h-4 w-px bg-[var(--l-teal)]/40" />
        <span className="absolute top-0 left-1/2 h-8 w-px bg-[var(--l-teal)]/40" />
        <span className="absolute top-0 right-0 h-4 w-px bg-[var(--l-teal)]/40" />
        <span className="absolute top-4 right-0 left-0 h-px bg-[var(--l-teal)]/40" />
      </div>
      <Reveal delay={360} className="rounded-2xl border border-[var(--l-line)] bg-white p-4 shadow-[0_1px_2px_rgba(9,9,11,.06),0_24px_48px_-28px_rgba(9,9,11,.28)]">
        <div aria-hidden>
          <p className="flex items-center gap-2 text-[13px] font-semibold"><BookOpen size={15} className="text-[var(--l-teal)]" />{t("Bir bilik bazası")}</p>
          <ul className="mt-3 flex flex-col gap-1.5">
            {docs.map(([icon, name]) => <li key={name} className={`flex items-center gap-2 rounded-lg bg-[#f4f4f5] px-2.5 py-2 text-[12px] ${muted}`}>{icon}<span className="truncate text-[var(--l-ink)]">{name}</span></li>)}
          </ul>
          <div className="mt-3 flex items-center gap-3 rounded-lg border border-dashed border-[var(--l-line)] px-2.5 py-2">
            <Mic size={14} className="shrink-0 text-[var(--l-orange-d)]" />
            <span className="flex h-4 items-center gap-[2px]">{[5, 9, 13, 7, 11, 6, 12, 8, 4, 10].map((h, k) => <span key={k} className="w-[2px] rounded-full bg-[var(--l-orange-d)]/60" style={{ height: h }} />)}</span>
            <ArrowRight size={12} className={`shrink-0 ${muted}`} />
            <span className={`truncate text-[12px] ${muted}`}>{t("Səsli mesaj mətnə çevrilir")}</span>
          </div>
        </div>
      </Reveal>
    </div>
  );
}

/** Dillər: eyni sual dörd dildə, cavab eyni mənbədən. */
export function LanguagesVisual() {
  const { t } = useI18n();
  const rows: [string, string, string][] = [
    ["AZ", "Çatdırılma neçəyədir?", "1–2 gün · 100 ₼-dən pulsuz"],
    ["EN", "How much is delivery?", "1–2 days · free over 100 ₼"],
    ["RU", "Сколько стоит доставка?", "1–2 дня · бесплатно от 100 ₼"],
    ["TR", "Kargo ücreti ne kadar?", "1–2 gün · 100 ₼ üzeri ücretsiz"],
  ];
  return (
    <Frame label={t("Nümunə: eyni sual dörd dildə, cavab eyni Azərbaycan dilindəki sənəddən")}>
      <ul className="divide-y divide-[var(--l-line)]">
        {rows.map(([code, q, a], i) => (
          <Reveal as="li" key={code} delay={i * 110} className="grid grid-cols-[2.25rem_minmax(0,1fr)] items-start gap-3 px-4 py-3.5">
            <span className="l-display mt-0.5 text-[13px] font-semibold text-[var(--l-teal)]">{code}</span>
            <div className="min-w-0">
              <p className="truncate text-[14px] font-medium">{q}</p>
              <p className={`mt-0.5 truncate text-[12px] ${muted}`}>{a}</p>
            </div>
          </Reveal>
        ))}
      </ul>
      <div className={`flex items-center gap-2 border-t border-[var(--l-line)] bg-[#fafafa] px-4 py-3 text-[12px] ${muted}`}>
        <Circle size={8} className="shrink-0 fill-[var(--l-teal)] text-[var(--l-teal)]" />
        {t("Mənbə: Çatdırılma şərtləri (AZ) · ayrıca tərcümə lazım deyil")}
      </div>
    </Frame>
  );
}
