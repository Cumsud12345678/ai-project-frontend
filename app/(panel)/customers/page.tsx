"use client";
// Müştərilər: sayt, Telegram, WhatsApp söhbətləri və əlaqə formasından gələn müraciətlər bir kartda.
// Eyni telefon / e-poçt / kanal ID-si olan qeydlər bir müştəriyə birləşir (hesablama backend-dədir).
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Ban, Globe, Inbox as InboxIcon, Mail, MessageCircle, Phone, Search, Send, Star, Users } from "lucide-react";
import { getCustomers, type Customer } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { RequireTenant } from "@/components/session";
import { VisitorFacts } from "@/components/visitor-facts";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

const CH_ICON = { site: Globe, telegram: Send, whatsapp: MessageCircle, form: InboxIcon } as const;

function initials(name: string) {
  const p = name.trim().split(/\s+/).filter(Boolean);
  return (p.length ? p.slice(0, 2).map((x) => x[0]!.toUpperCase()).join("") : "?");
}

function Detail({ c }: { c: Customer }) {
  const { t, short } = useI18n();
  const chLabel = { site: t("Sayt"), telegram: "Telegram", whatsapp: "WhatsApp", form: t("Forma") };
  const stLabel: Record<string, string> = { new: t("Yeni"), open: t("İşdədir"), pending: t("Gözləmədə"), solved: t("Həll olunub") };
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-primary/10 text-base font-semibold text-primary">{initials(c.name)}</span>
        <div className="min-w-0">
          <h2 className="flex flex-wrap items-center gap-2 text-lg font-semibold">{c.name || t("Adsız")}{c.blocked && <Badge className="bg-destructive/10 text-destructive"><Ban size={12} aria-hidden />{t("Bloklanıb")}</Badge>}</h2>
          <p className="text-xs text-muted-foreground">{t("İlk əlaqə {a} · son əlaqə {b}", { a: short(c.firstAt), b: short(c.lastAt) })}</p>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2 text-sm">
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("Əlaqə")}</h3>
          {c.contacts.length ? c.contacts.map((x) => (
            <a key={x} href={x.includes("@") ? `mailto:${x}` : `tel:${x.replace(/[^\d+]/g, "")}`} className="inline-flex items-center gap-2 text-primary underline">
              {x.includes("@") ? <Mail size={14} aria-hidden /> : <Phone size={14} aria-hidden />}{x}
            </a>
          )) : <p className="text-muted-foreground">{t("Əlaqə məlumatı yoxdur.")}</p>}
          <div className="mt-1 flex flex-wrap gap-1.5">
            {c.channels.map((ch) => { const I = CH_ICON[ch]; return <Badge key={ch} className="bg-muted text-foreground"><I size={12} aria-hidden />{chLabel[ch]}</Badge>; })}
            {c.tags.map((g) => <Badge key={g} className="bg-primary/10 text-primary">#{g}</Badge>)}
            {c.csat && <Badge className="bg-amber/15 text-amber"><Star size={12} aria-hidden />{c.csat}/5</Badge>}
          </div>
        </div>
        {c.visitor && (
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("Ziyarətçi haqqında")}</h3>
            <VisitorFacts v={c.visitor} />
          </div>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("Söhbətlər ({n})", { n: c.chats.length })}</h3>
        {c.chats.length ? (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {c.chats.map((ch) => { const I = CH_ICON[ch.channel]; return (
              <li key={ch.id}>
                <Link href={`/inbox?chat=${encodeURIComponent(ch.id)}${ch.status === "closed" ? "&closed=1" : ""}`} className="flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-muted/60">
                  <I size={15} aria-hidden className="shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1"><span className="block truncate">{ch.first || t("(mesaj yoxdur)")}</span><span className="text-xs text-muted-foreground">{short(ch.createdAt)} · {t("{n} mesaj", { n: ch.count })}{ch.assignee ? ` · ${ch.assignee}` : ""}</span></span>
                  <Badge className={ch.status === "open" ? "bg-chart-2/15 text-chart-2" : "bg-muted text-muted-foreground"}>{ch.status === "open" ? t("Açıq") : t("Bağlı")}</Badge>
                </Link>
              </li>
            ); })}
          </ul>
        ) : <p className="text-sm text-muted-foreground">{t("Canlı söhbət olmayıb.")}</p>}
      </section>

      {!!c.leads.length && (
        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("Müraciətlər ({n})", { n: c.leads.length })}</h3>
          <ul className="divide-y divide-border rounded-lg border border-border">
            {c.leads.map((l) => (
              <li key={l.id}>
                <Link href={`/inbox?f=${l.status === "solved" ? "handled" : l.status === "pending" ? "pending" : "leads"}`} className="flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-muted/60">
                  <InboxIcon size={15} aria-hidden className="shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1"><span className="block truncate">{l.question || t("(sual yoxdur)")}</span><span className="text-xs text-muted-foreground">{short(l.at)}</span></span>
                  <Badge className="bg-muted text-foreground">{stLabel[l.status] ?? l.status}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Customers() {
  const { t, short } = useI18n();
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Customer[] | null>(null);
  const [err, setErr] = useState("");
  const [sel, setSel] = useState<string | null>(null);
  useEffect(() => {
    const h = setTimeout(() => { getCustomers(q).then((r) => { setItems(r.items); setErr(""); }).catch((e) => setErr((e as Error).message)); }, q ? 300 : 0);
    return () => clearTimeout(h);
  }, [q]);
  const cur = useMemo(() => items?.find((c) => c.id === sel) ?? null, [items, sel]);

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-xl font-semibold">{t("Müştərilər")}</h1>
        <p className="text-sm text-muted-foreground">{t("Saytda, Telegramda, WhatsAppda yazan və forma dolduran hər kəs. Eyni telefon və ya e-poçt bir müştəri kartında birləşir.")}</p>
      </header>
      <div className="relative max-w-md">
        <Search size={15} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Ad, telefon, e-poçt və ya teq üzrə axtar")} aria-label={t("Müştəri axtar")} className="pl-9" />
      </div>
      {err && <p className="text-sm text-destructive">{err}</p>}
      {items && !items.length && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          <Users size={28} aria-hidden />
          {q ? t("Axtarışa uyğun müştəri tapılmadı.") : t("Hələ müştəri yoxdur. Kimsə canlı söhbətə yazanda və ya əlaqə formasını dolduranda burada görünəcək.")}
        </div>
      )}
      {!!items?.length && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
          <ul className={`divide-y divide-border overflow-hidden rounded-xl border border-border bg-card ${cur ? "hidden lg:block" : ""}`}>
            {items.map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => setSel(c.id)} aria-current={c.id === sel} className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-muted/60 ${c.id === sel ? "bg-primary/5" : ""}`}>
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold">{initials(c.name)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 truncate font-medium">{c.name || t("Adsız")}{c.blocked && <Ban size={12} aria-label={t("Bloklanıb")} className="text-destructive" />}</span>
                    <span className="block truncate text-xs text-muted-foreground">{c.contacts[0] ?? c.channels.map((ch) => (ch === "site" ? t("Sayt") : ch === "form" ? t("Forma") : ch === "telegram" ? "Telegram" : "WhatsApp")).join(", ")}</span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1 text-[11px] text-muted-foreground">
                    {short(c.lastAt)}
                    <span className="flex gap-1">{c.channels.map((ch) => { const I = CH_ICON[ch]; return <I key={ch} size={12} aria-hidden />; })}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <div className={`rounded-xl border border-border bg-card p-5 ${cur ? "" : "hidden lg:block"}`}>
            {cur ? (
              <>
                <button type="button" onClick={() => setSel(null)} className="mb-3 text-sm text-primary lg:hidden">← {t("Siyahıya qayıt")}</button>
                <Detail c={cur} />
              </>
            ) : <p className="text-sm text-muted-foreground">{t("Ətraflı baxmaq üçün soldan müştəri seç.")}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Page() {
  return <RequireTenant><Customers /></RequireTenant>;
}
