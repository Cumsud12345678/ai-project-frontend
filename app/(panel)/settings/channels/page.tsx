"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Code, Facebook, Globe, Instagram, Mail, MessageCircle, Send } from "lucide-react";
import { getTelegram, getWhatsApp, getWidget, type TelegramStatus, type WhatsAppStatus, type WidgetResponse } from "@/lib/api";
import { FilterPills, PageHeader } from "@/components/page-header";
import { useI18n } from "@/lib/i18n";
import { RequireTenant } from "@/components/session";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type State = "on" | "off" | "soon" | "setup";
type Ch = { id: string; icon: React.ElementType; name: string; note: string; state: State; detail?: string; href?: string; cta?: string };

function Channels() {
  const { t, day } = useI18n();
  const [w, setW] = useState<WidgetResponse | null>(null);
  const [tg, setTg] = useState<TelegramStatus | null>(null);
  const [wa, setWa] = useState<WhatsAppStatus | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [f, setF] = useState<"all" | "on" | "off">("all");

  useEffect(() => {
    void Promise.all([getWidget().then(setW).catch(() => {}), getTelegram().then(setTg).catch(() => {}), getWhatsApp().then(setWa).catch(() => {})]).then(() => setLoaded(true));
  }, []);

  const site: State = !w ? "setup" : !w.widget.enabled ? "off" : "on";
  const list: Ch[] = [
    { id: "widget", icon: Globe, name: t("Sayt vidjeti"), note: t("Saytının küncündəki çat pəncərəsi: köməkçi, canlı operator, kampaniyalar."), state: site,
      detail: w?.widget.lastSeenAt ? t("Saytda son görünmə: {date}", { date: day(w.widget.lastSeenAt) }) : t("Hələ saytda görünməyib"), href: "/embed", cta: t("Ayarla") },
    { id: "telegram", icon: Send, name: "Telegram", note: t("Öz botunu qoş: müştərilər Telegram-da yazır, köməkçi cavab verir."), state: !tg?.connected ? "setup" : tg.enabled ? "on" : "off",
      detail: tg?.botUsername ? `@${tg.botUsername}` : undefined, href: "/channels?c=telegram", cta: tg?.connected ? t("Ayarla") : t("Qoş") },
    { id: "whatsapp", icon: MessageCircle, name: "WhatsApp", note: t("Nömrəni QR kodla qoş: WhatsApp mesajlarına köməkçi cavab verir."), state: !wa?.connected ? "setup" : wa.enabled ? "on" : "off",
      detail: wa?.phone ? `+${wa.phone.replace(/^\+/, "")}` : undefined, href: "/channels?c=whatsapp", cta: wa?.connected ? t("Ayarla") : t("Qoş") },
    { id: "api", icon: Code, name: t("Öz saytın / tətbiqin (API)"), note: t("Öz çat pəncərən və ya mobil tətbiqin varsa, köməkçini API ilə çağır."), state: "on", href: "/settings/api", cta: t("Aç") },
    { id: "instagram", icon: Instagram, name: "Instagram", note: t("Direkt mesajlarına cavab."), state: "soon" },
    { id: "messenger", icon: Facebook, name: "Messenger", note: t("Facebook səhifənin mesajlarına cavab."), state: "soon" },
    { id: "email", icon: Mail, name: t("E-poçt"), note: t("Dəstək ünvanına gələn məktublar söhbət qutusunda."), state: "soon" },
  ];
  const isOn = (c: Ch) => c.state === "on";
  const shown = list.filter((c) => f === "all" || (f === "on" ? isOn(c) : !isOn(c)));
  const badge = (s: State) => s === "on" ? <Badge className="bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20">{t("Aktiv")}</Badge>
    : s === "off" ? <Badge className="bg-muted text-muted-foreground">{t("Söndürülüb")}</Badge>
    : s === "setup" ? <Badge className="bg-muted text-muted-foreground">{t("Qoşulmayıb")}</Badge>
    : <Badge className="border border-dashed border-border bg-transparent text-muted-foreground">{t("Tezliklə")}</Badge>;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("Bütün kanallar")} description={t("Müştərilərin sənə harada yaza bildiyi yerlər. Hamısına eyni köməkçi və eyni bilik bazası cavab verir, söhbətlər bir qutuya düşür.")} />
      <FilterPills value={f} onChange={setF} label={t("Kanallar")} items={[
        { value: "all", label: t("Hamısı"), count: list.length },
        { value: "on", label: t("Aktiv"), count: loaded ? list.filter(isOn).length : undefined },
        { value: "off", label: t("Aktiv deyil"), count: loaded ? list.filter((c) => !isOn(c)).length : undefined },
      ]} />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {shown.map((c) => (
          <article key={c.id} className={cn("flex flex-col gap-3 rounded-2xl border border-border bg-card p-4", c.state === "soon" && "bg-muted/30")}>
            <header className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted"><c.icon size={19} aria-hidden /></span>
              <div className="min-w-0 flex-1"><h3 className="font-semibold">{c.name}</h3>{c.detail && <p className="truncate text-xs text-muted-foreground">{c.detail}</p>}</div>
              {loaded && badge(c.state)}
            </header>
            <p className="flex-1 text-sm text-muted-foreground">{c.note}</p>
            {c.href && <Link href={c.href} className={cn(buttonVariants({ variant: c.state === "setup" ? "default" : "outline", size: "sm" }), "self-start")}>{c.cta}</Link>}
          </article>
        ))}
      </div>
    </div>
  );
}

export default function ChannelsOverviewPage() {
  return <RequireTenant><Channels /></RequireTenant>;
}
