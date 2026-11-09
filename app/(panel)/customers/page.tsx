"use client";
// Müştərilər: İndi saytda (real vaxt), Kontaktlar (sayt, Telegram, WhatsApp, forma bir kartda) və Kampaniyalar.
// Eyni telefon / e-poçt / kanal ID-si olan qeydlər bir müştəriyə birləşir (hesablama backend-dədir).
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Ban, Bot, CalendarClock, CircleSlash, Globe, Headset, Inbox as InboxIcon, Mail, Megaphone, MessageCircle, MousePointer2, Phone, Play, Radar, Repeat, Search, Send, Star, Users } from "lucide-react";
import { getCampaignStats, getCustomers, getVisitors, getWidget, type CampaignStat, type Customer, type SiteVisitor, type WidgetResponse } from "@/lib/api";
import { useLiveEvents } from "@/lib/live-socket";
import { FolderPane, Pane, type FolderGroup } from "@/components/folder-pane";
import { RealtimeVisitors, rtMatch, type RtFilter } from "@/components/realtime-visitors";
import { Campaigns, campStatus, type CampFilter } from "@/components/campaigns";
import { useI18n } from "@/lib/i18n";
import { RequireTenant, useSession } from "@/components/session";
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
          <h2 className="flex flex-wrap items-center gap-2 text-lg font-semibold">{c.name || t("Adsız")}{c.blocked && <Badge className="bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20"><Ban size={12} aria-hidden />{t("Bloklanıb")}</Badge>}</h2>
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
            {c.tags.map((g) => <Badge key={g} className="bg-muted text-foreground">#{g}</Badge>)}
            {c.csat && <Badge className="bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/20"><Star size={12} aria-hidden />{c.csat}/5</Badge>}
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
                  <Badge className={ch.status === "open" ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20" : "bg-muted text-muted-foreground"}>{ch.status === "open" ? t("Açıq") : t("Bağlı")}</Badge>
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

type FolderId = "rt_all" | "rt_ai" | "rt_live" | "rt_invited" | "rt_browsing" | "ct_all" | "ct_leads" | "ct_repeat" | "ct_vip" | "ct_blocked" | "cp_all" | "cp_ongoing" | "cp_scheduled" | "cp_inactive";
const STORE = "customers_folder";
const isVip = (c: Customer) => c.tags.some((g) => g.toLowerCase() === "vip");
const contactFilter: Record<string, (c: Customer) => boolean> = {
  ct_all: () => true, ct_leads: (c) => c.leads.length > 0, ct_repeat: (c) => c.chats.length + c.leads.length > 1, ct_vip: isVip, ct_blocked: (c) => c.blocked,
};

/** Kontaktlar: siyahı + seçilmiş müştərinin kartı */
function Contacts({ items, q, setQ, err, folder }: { items: Customer[] | null; q: string; setQ: (v: string) => void; err: string; folder: FolderId }) {
  const { t, short } = useI18n();
  const [sel, setSel] = useState<string | null>(null);
  const rows = useMemo(() => items?.filter(contactFilter[folder] ?? (() => true)) ?? null, [items, folder]);
  const cur = rows?.find((c) => c.id === sel) ?? null;
  return (
    <div className="flex flex-col gap-4">
      <div className="relative max-w-md">
        <Search size={15} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Ad, telefon, e-poçt və ya teq üzrə axtar")} aria-label={t("Müştəri axtar")} className="pl-9" />
      </div>
      {err && <p className="text-sm text-destructive">{err}</p>}
      {rows && !rows.length && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          <Users size={28} aria-hidden />
          {q ? t("Axtarışa uyğun müştəri tapılmadı.") : folder === "ct_all" ? t("Hələ müştəri yoxdur. Kimsə canlı söhbətə yazanda və ya əlaqə formasını dolduranda burada görünəcək.") : t("Bu qovluqda müştəri yoxdur.")}
        </div>
      )}
      {!!rows?.length && (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
          <ul className={`divide-y divide-border overflow-hidden rounded-xl border border-border bg-card ${cur ? "hidden xl:block" : ""}`}>
            {rows.map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => setSel(c.id)} aria-current={c.id === sel} className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-muted/60 ${c.id === sel ? "bg-primary/5" : ""}`}>
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold">{initials(c.name)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 truncate font-medium">{c.name || t("Adsız")}{c.blocked && <Ban size={12} aria-label={t("Bloklanıb")} className="text-destructive" />}{isVip(c) && <Star size={12} aria-label="VIP" className="text-amber" />}</span>
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
          <div className={`rounded-xl border border-border bg-card p-5 ${cur ? "" : "hidden xl:block"}`}>
            {cur ? (
              <>
                <button type="button" onClick={() => setSel(null)} className="mb-3 text-sm text-primary xl:hidden">← {t("Siyahıya qayıt")}</button>
                <Detail c={cur} />
              </>
            ) : <p className="text-sm text-muted-foreground">{t("Ətraflı baxmaq üçün soldan müştəri seç.")}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

function Customers() {
  const { t } = useI18n();
  const { isOperator } = useSession();
  const [folder, setFolder] = useState<FolderId>("ct_all");
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Customer[] | null>(null);
  const [err, setErr] = useState("");
  const [vis, setVis] = useState<{ enabled: boolean; items: SiteVisitor[] } | null>(null);
  const [widget, setWidget] = useState<WidgetResponse | null>(null);
  const [stats, setStats] = useState<Record<string, CampaignStat>>({});

  useEffect(() => {
    const f = new URLSearchParams(window.location.search).get("f");
    if (isOperator) return setFolder("rt_all"); // operator yalnız "İndi saytda"nı görür
    if (f === "campaigns") return setFolder("cp_all");
    if (f === "realtime") return setFolder("rt_all");
    if (f === "blocked") return setFolder("ct_blocked");
    try { const v = localStorage.getItem(STORE) as FolderId | null; if (v) setFolder(v); } catch { /* yaddaş bağlıdır */ }
  }, [isOperator]);
  const pick = (f: FolderId) => { setFolder(f); try { localStorage.setItem(STORE, f); } catch { /* yaddaş bağlıdır */ } };

  useEffect(() => {
    if (isOperator) return;
    const h = setTimeout(() => { getCustomers(q).then((r) => { setItems(r.items); setErr(""); }).catch((e) => setErr((e as Error).message)); }, q ? 300 : 0);
    return () => clearTimeout(h);
  }, [q, isOperator]);
  const loadVis = useCallback(() => { getVisitors().then(setVis).catch(() => {}); }, []);
  const live = useLiveEvents((e) => { if (e.t === "visitors" || (e.t === "live" && e.kind === "start")) loadVis(); });
  useEffect(() => { loadVis(); const i = setInterval(loadVis, live ? 15000 : 8000); return () => clearInterval(i); }, [loadVis, live]);
  const loadStats = useCallback(() => { getCampaignStats().then((r) => setStats(r.stats)).catch(() => {}); }, []);
  useEffect(() => { if (!isOperator) { getWidget().then(setWidget).catch(() => {}); loadStats(); } }, [loadStats, isOperator]);
  const [, tick] = useState(0);
  useEffect(() => { const i = setInterval(() => tick((x) => x + 1), 30000); return () => clearInterval(i); }, []); // "neçə dəqiqədir saytda" yenilənsin

  const v = vis?.items ?? [];
  const rtN = (f: RtFilter) => (vis?.enabled ? v.filter((x) => rtMatch(x, f)).length : undefined);
  const ctN = (id: string) => items?.filter(contactFilter[id]!).length;
  const rules = widget?.widget.proactive?.rules ?? [];
  const cpN = (f: CampFilter) => (widget ? rules.filter((r) => f === "all" || campStatus(r) === f).length : undefined);
  const allGroups: FolderGroup<FolderId>[] = [
    { id: "rt", label: t("İndi saytda"), items: [
      { id: "rt_all", label: t("Hamısı"), icon: Radar, count: rtN("all"), color: "text-emerald-600" },
      { id: "rt_ai", label: t("AI ilə yazışır"), icon: Bot, count: rtN("ai") },
      { id: "rt_live", label: t("Operatorla yazışır"), icon: Headset, count: rtN("live") },
      { id: "rt_invited", label: t("Dəvət olunub"), icon: Send, count: rtN("invited") },
      { id: "rt_browsing", label: t("Sadəcə baxır"), icon: MousePointer2, count: rtN("browsing") },
    ] },
    { id: "ct", label: t("Kontaktlar"), items: [
      { id: "ct_all", label: t("Hamısı"), icon: Users, count: ctN("ct_all") },
      { id: "ct_leads", label: t("Forma dolduranlar"), icon: InboxIcon, count: ctN("ct_leads") },
      { id: "ct_repeat", label: t("Təkrar yazanlar"), icon: Repeat, count: ctN("ct_repeat") },
      { id: "ct_vip", label: "VIP", icon: Star, color: "text-amber", count: ctN("ct_vip") },
      { id: "ct_blocked", label: t("Bloklanmış"), icon: Ban, count: ctN("ct_blocked") },
    ] },
    { id: "cp", label: t("Kampaniyalar"), items: [
      { id: "cp_all", label: t("Hamısı"), icon: Megaphone, count: cpN("all") },
      { id: "cp_ongoing", label: t("Davam edir"), icon: Play, count: cpN("ongoing") },
      { id: "cp_scheduled", label: t("Planlaşdırılıb"), icon: CalendarClock, count: cpN("scheduled") },
      { id: "cp_inactive", label: t("Dayandırılıb"), icon: CircleSlash, count: cpN("inactive") },
    ] },
  ];
  const groups = isOperator ? allGroups.slice(0, 1) : allGroups;
  const cur = groups.flatMap((g) => g.items).find((f) => f.id === folder) ?? groups[groups.length > 1 ? 1 : 0]!.items[0]!;
  const group = groups.find((g) => g.items.includes(cur))!;
  const title = `${group.label}${cur.label === t("Hamısı") ? "" : ` · ${cur.label}`}`;

  let content: React.ReactNode;
  if (folder.startsWith("rt_")) content = <Pane title={title} wide><RealtimeVisitors items={vis ? vis.items : null} enabled={vis?.enabled ?? true} filter={folder.slice(3) as RtFilter} reload={loadVis} /></Pane>;
  else if (folder.startsWith("cp_")) content = <Pane title={title} wide>{widget ? <Campaigns widget={widget} stats={stats} filter={folder.slice(3) as CampFilter} onChange={setWidget} reloadStats={loadStats} /> : <p className="text-sm text-muted-foreground">{t("Yüklənir…")}</p>}</Pane>;
  else content = <Pane title={title} wide><Contacts items={items} q={q} setQ={setQ} err={err} folder={folder} /></Pane>;

  return <FolderPane title={t("Müştərilər")} groups={groups} value={cur.id} onPick={pick}>{content}</FolderPane>;
}

export default function Page() {
  return <RequireTenant><Customers /></RequireTenant>;
}
