"use client";
// Köməkçi → Bacarıqlar: öz ssenarilərin (nə vaxt nə etsin) və hazır bacarıqlar (aç/söndür). Sağda canlı önizləmə.
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Bot, Hand, Headset, ImageIcon, Inbox as InboxIcon, Lightbulb, Megaphone, Pencil, Zap } from "lucide-react";
import { getKb, getWidget, saveProfile, saveWidget, type KbInfo, type Profile, type WidgetResponse } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { RequireTenant, useSession } from "@/components/session";
import { AssistantPreview } from "@/components/assistant-preview";
import { ProcCard } from "../../knowledge/proc-card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

function Skill({ icon: Icon, title, desc, on, onToggle, always, children, href, hrefLabel }: {
  icon: typeof Bot; title: string; desc: string; on?: boolean; onToggle?: (v: boolean) => void; always?: boolean; children?: React.ReactNode; href?: string; hrefLabel?: string;
}) {
  const { t } = useI18n();
  return (
    <div className={cn("flex flex-col gap-3 rounded-2xl bg-muted/50 p-4", on === false && "opacity-75")}>
      <div className="flex items-start justify-between gap-3">
        <span className="grid size-9 place-items-center rounded-xl bg-card shadow-sm ring-1 ring-border/60"><Icon size={17} aria-hidden /></span>
        {onToggle ? <Switch checked={Boolean(on)} onChange={onToggle} label={title} /> : always && <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">{t("Həmişə aktiv")}</span>}
      </div>
      <div><h3 className="font-semibold">{title}</h3><p className="mt-1 text-sm text-muted-foreground">{desc}</p></div>
      {children}
      {href && <Link href={href} className="self-start text-sm text-primary underline">{hrefLabel}</Link>}
    </div>
  );
}

function Skills() {
  const { t } = useI18n();
  const { tenant, refresh } = useSession();
  const p = tenant?.config.profile ?? {};
  const mode = p.mode ?? "listings";
  const [w, setW] = useState<WidgetResponse | null>(null);
  const [kb, setKb] = useState<KbInfo | null>(null);
  const [greet, setGreet] = useState<string | null>(null);
  const [showProc, setShowProc] = useState(false);
  useEffect(() => { if (window.location.hash === "#proc") setShowProc(true); }, []);
  const loadKb = useCallback(() => { getKb().then(setKb).catch(() => {}); }, []);
  useEffect(() => { getWidget().then(setW).catch(() => {}); loadKb(); }, [loadKb]);

  async function prof(x: Profile, ok: string) {
    try { await saveProfile(x); await refresh(); toast.success(ok); } catch (e) { toast.error((e as Error).message); }
  }
  async function widget(x: Parameters<typeof saveWidget>[0], ok: string) {
    try { setW(await saveWidget(x)); toast.success(ok); } catch (e) { toast.error((e as Error).message); }
  }
  const on = t("Aktivləşdi."), off = t("Söndürüldü.");

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="flex flex-col gap-8">
        <header>
          <h1 className="text-2xl font-semibold">{t("Bacarıqlar")}</h1>
          <p className="text-sm text-muted-foreground">{t("Köməkçinin nə edə biləcəyi: öz ssenarilərin və hazır bacarıqlar.")}</p>
        </header>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">{t("Öz bacarıqların")}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Link href="/actions" className="flex flex-col gap-2 rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-amber/10 p-4 transition hover:border-primary">
              <span className="grid size-9 place-items-center rounded-xl bg-card shadow-sm ring-1 ring-border/60"><Zap size={17} aria-hidden /></span>
              <h3 className="font-semibold">{t("Əməliyyatlar")}</h3>
              <p className="text-sm text-muted-foreground">{t("Köməkçi saytında iş görsün: sifarişin statusu, ləğv, ünvan dəyişikliyi və s. Müştəri hər addımı təsdiqləyir.")}</p>
            </Link>
            <button type="button" onClick={() => setShowProc((v) => !v)} aria-expanded={showProc} className="flex cursor-pointer flex-col items-start gap-2 rounded-2xl border border-border bg-gradient-to-br from-violet-500/10 via-card to-sky-500/10 p-4 text-left transition hover:border-primary">
              <span className="grid size-9 place-items-center rounded-xl bg-card shadow-sm ring-1 ring-border/60"><Lightbulb size={17} aria-hidden /></span>
              <h3 className="font-semibold">{t("Ssenarilər")} <span className="font-normal text-muted-foreground">{kb?.totals.proc ?? 0}</span></h3>
              <p className="text-sm text-muted-foreground">{t("“Müştəri geri qaytarma istəyəndə əvvəl sifariş nömrəsini soruş, sonra…” kimi: nə vaxt nə etsin, sən yaz.")}</p>
            </button>
          </div>
          {showProc && <div id="proc" className="scroll-mt-4">
            {mode === "listings"
              ? <p className="rounded-xl bg-muted/50 p-4 text-sm text-muted-foreground">{t("Ssenarilər bilik bazası ilə işləyir. Çatın rejimində “Şirkət haqqında suallar”ı aç.")} <Link href="/knowledge" className="text-primary underline">{t("Bilik bazası")}</Link></p>
              : kb && <ProcCard info={kb} onChange={loadKb} />}
          </div>}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">{t("Hazır bacarıqlar")}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Skill icon={Hand} title={t("Salamlama mesajı")} desc={t("Çat açılanda ziyarətçinin gördüyü ilk mesaj.")} always>
              {w && (greet === null ? (
                <button type="button" onClick={() => setGreet(w.widget.greeting)} className="flex cursor-pointer items-start gap-2 rounded-xl bg-card p-3 text-left text-sm ring-1 ring-border/60">
                  <span className="flex-1">“{w.widget.greeting}”</span><Pencil size={14} aria-hidden className="mt-0.5 shrink-0 text-muted-foreground" />
                </button>
              ) : (
                <form className="flex flex-col gap-2" onSubmit={(e) => { e.preventDefault(); const g = greet.trim(); if (g) void widget({ greeting: g }, t("Saxlandı.")).then(() => setGreet(null)); }}>
                  <Textarea autoFocus rows={3} maxLength={300} value={greet} onChange={(e) => setGreet(e.target.value)} aria-label={t("Salamlama mesajı")} />
                  <div className="flex gap-2"><Button size="sm" disabled={!greet.trim()}>{t("Saxla")}</Button><Button size="sm" type="button" variant="ghost" onClick={() => setGreet(null)}>{t("Ləğv et")}</Button></div>
                </form>
              ))}
            </Skill>
            <Skill icon={Headset} title={t("Operatora ötürmə")} desc={t("Ziyarətçi istəyəndə və ya köməkçi kömək edə bilməyəndə söhbət canlı operatora keçir. Telegram və WhatsApp-da /operator ilə.")}
              on={Boolean(w?.widget.live?.enabled)} onToggle={w ? (v) => void widget({ live: { enabled: v } }, v ? on : off) : undefined} href="/embed#live" hrefLabel={t("İş saatları və CSAT")} />
            <Skill icon={InboxIcon} title={t("Əlaqə toplamaq")} desc={t("Cavab tapılmayanda və ya operator onlayn olmayanda ziyarətçidən ad və telefon/e-poçt istənir; müraciət sənə gəlir.")} always href="/inbox?f=leads" hrefLabel={t("Müraciətlər")} />
            <Skill icon={Bot} title={t("Ümumi məsləhət")} desc={t("Sənin məlumatından başqa, sahənlə bağlı ümumi suallara da cavab versin (“ümumi məlumatdır” qeydi ilə).")}
              on={p.generalKnowledge !== false} onToggle={(v) => void prof({ generalKnowledge: v }, v ? on : off)} />
            <Skill icon={ImageIcon} title={t("Şəkillə axtarış")} desc={t("Ziyarətçi şəkil göndərəndə köməkçi oxşar elan, məhsul və ya məlumat axtarsın. Hər şəkil ayrıca sorğu sayılır.")}
              on={p.imageSearch === true} onToggle={(v) => void prof({ imageSearch: v }, v ? on : off)} />
            <Skill icon={Megaphone} title={t("Kampaniyalar")} desc={t("Ziyarətçi yazmamış, şərtə görə çat düyməsinin yanında salam kartı göstərilsin.")}
              on={Boolean(w?.widget.proactive?.enabled)} onToggle={w ? (v) => void widget({ proactive: { enabled: v, rules: w.widget.proactive?.rules ?? [] } }, v ? on : off) : undefined} href="/customers?f=campaigns" hrefLabel={t("Kampaniyaları qur")} />
          </div>
        </section>
      </div>
      <aside className="xl:sticky xl:top-4 xl:h-[calc(100dvh-8rem)] xl:self-start">
        <AssistantPreview name={p.agentName || tenant?.businessName || t("Köməkçi")} className="h-full" />
      </aside>
    </div>
  );
}

export default function Page() {
  return <RequireTenant><Skills /></RequireTenant>;
}
