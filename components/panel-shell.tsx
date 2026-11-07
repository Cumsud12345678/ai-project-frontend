"use client";
// Panelin çərçivəsi: sol ikon zolağı (əsas bölmələr), bölmənin öz menyusu, yuxarı zolaq (hazırlıq, balans, axtarış),
// telefonda açılan menyu və Ctrl+K ilə axtarış/keçid pəncərəsi.
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Activity, BarChart3, Bell, Bot, Building2, Globe, Hash, LayoutGrid, BookOpen, Code, Gauge, HandCoins, Inbox, LayoutDashboard, List, LogOut, Menu, MessageSquare, MessagesSquare, Plug, Rocket,
  Search, Send, Settings, Shield, ShieldCheck, Sparkles, UserRound, Users, Wallet, Wand2, Workflow, X, Zap, type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Overview } from "@/lib/api";
import { useSession } from "@/components/session";
import { LangSwitch, useI18n } from "@/lib/i18n";

type Mode = "listings" | "support" | "both";
type Item = { href: string; label: string; icon: LucideIcon; only?: Mode[]; when?: "noTenant" | "partner"; /** menyuda bu bənddən əvvəl alt başlıq */ section?: string };
type Group = { id: string; label: string; icon: LucideIcon; items: Item[]; bottom?: boolean };

// label: Azərbaycan açarı, render zamanı tərcümə olunur. only: göstərildiyi rejimlər.
const GROUPS: Group[] = [
  { id: "home", label: "Ümumi", icon: LayoutDashboard, items: [
    { href: "/setup", label: "Quraşdırma", icon: Rocket, when: "noTenant" },
    { href: "/dashboard", label: "İstifadə", icon: Gauge },
  ] },
  { id: "inbox", label: "Müraciətlər", icon: Inbox, items: [{ href: "/inbox", label: "Müraciətlər", icon: Inbox }] },
  { id: "customers", label: "Müştərilər", icon: Users, items: [{ href: "/customers", label: "Müştərilər", icon: Users }] },
  { id: "ai", label: "Köməkçi", icon: Bot, items: [
    { href: "/assistant", label: "Ümumi baxış", icon: Activity },
    { href: "/assistant/profile", label: "Profil", icon: UserRound },
    { href: "/assistant/skills", label: "Bacarıqlar", icon: Wand2 },
    { href: "/knowledge", label: "Bilik bazası", icon: BookOpen },
    { href: "/listings", label: "Kataloq", icon: List, only: ["listings", "both"] },
    { href: "/connection", label: "Elan mənbəyi", icon: Plug, only: ["listings", "both"] },
    { href: "/customer-data", label: "Müştəri məlumatı", icon: ShieldCheck },
    { href: "/actions", label: "Əməliyyatlar", icon: Zap },
    { href: "/playground", label: "Sınaq söhbəti", icon: MessageSquare },
  ] },
  { id: "reports", label: "Hesabatlar", icon: BarChart3, items: [
    { href: "/reports", label: "Ümumi baxış", icon: Activity },
    { href: "/reports/ai", label: "AI köməkçi", icon: Sparkles },
    { href: "/reports/team", label: "Komanda performansı", icon: Users },
    { href: "/queries", label: "Sorğu jurnalı", icon: MessagesSquare },
  ] },
  { id: "automations", label: "Avtomatika", icon: Workflow, items: [{ href: "/automations", label: "Avtomatlaşdırmalar", icon: Workflow }] },
  { id: "account", label: "Ayarlar", icon: Settings, bottom: true, items: [
    { href: "/settings", label: "Hesab", icon: UserRound },
    { href: "/settings/notifications", label: "Bildirişlər", icon: Bell },
    { href: "/settings/company", label: "Şirkət məlumatı", icon: Building2 },
    { href: "/settings/team", label: "Komanda üzvləri", icon: Users, section: "Komanda" },
    { href: "/settings/channels", label: "Bütün kanallar", icon: LayoutGrid, section: "Kanallar" },
    { href: "/embed", label: "Sayt vidjeti", icon: Globe },
    { href: "/channels", label: "Telegram və WhatsApp", icon: Send },
    { href: "/settings/canned", label: "Hazır cavablar", icon: Hash, section: "Söhbət qutusu" },
    { href: "/settings/security", label: "Giriş və təhlükəsizlik", icon: ShieldCheck, section: "Təhlükəsizlik" },
    { href: "/settings/api", label: "API girişi", icon: Code, section: "İnteqrasiyalar" },
    { href: "/billing", label: "Balans", icon: Wallet, section: "Ödəniş" },
    { href: "/partner", label: "Partnyor", icon: HandCoins, when: "partner" },
  ] },
];

/** Hansı səhifədə nə diqqət tələb edir (qırmızı nöqtə və ya say) */
export type Signals = { waiting: number; overview: Overview | null };

function useGroups() {
  const { me, tenant, isOperator } = useSession();
  const mode: Mode = tenant?.config.profile?.mode ?? "listings";
  return useMemo(() => {
    if (isOperator) return GROUPS.filter((g) => g.id === "inbox" || g.id === "customers"); // operator: müraciətlər və "İndi saytda"
    return GROUPS.map((g) => ({
      ...g,
      items: g.items.filter((i) => (i.when === "noTenant" ? !tenant : i.when === "partner" ? Boolean(me.partner) : !i.only || !tenant || i.only.includes(mode))),
    })).filter((g) => g.items.length);
  }, [me.partner, tenant, isOperator, mode]);
}

/** Bu səhifələr çərçivənin içini tam tutur (boşluq və eni məhdudlaşdırılmır) */
const FULL_BLEED = ["/inbox", "/customers"];

const isActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

/** Səhifə üzrə nişan: say (qırmızı) və ya nöqtə */
function itemSignal(href: string, s: Signals): { count?: number; dot?: boolean } {
  const att = (k: string) => s.overview?.attention?.find((a) => a.kind === k)?.count ?? 0;
  if (href === "/inbox") return s.waiting > 0 ? { count: s.waiting } : { dot: att("leads") + att("unanswered") > 0 };
  if (href === "/knowledge") return { dot: att("sourceErrors") > 0 };
  if (href === "/embed") return { dot: att("widgetOff") > 0 };
  if (href === "/billing") return { dot: s.overview?.billing?.state === "empty" };
  return {};
}

function Badge({ count, dot, className }: { count?: number; dot?: boolean; className?: string }) {
  if (count) return <span className={cn("grid h-[18px] min-w-[18px] place-items-center rounded-full bg-destructive px-1 text-[11px] font-semibold leading-none text-white tabular-nums", className)}>{count > 99 ? "99+" : count}</span>;
  if (dot) return <span className={cn("size-2 rounded-full bg-destructive", className)} />;
  return null;
}

/** Hazırlıq addımları (İstifadə səhifəsindəki siyahı ilə eyni) */
function setupSteps(o: Overview | null) {
  if (!o?.setup) return null;
  const s = o.setup;
  const steps = [s.dataReady, s.widgetInstalled, ...(s.queriesLogged ? [s.firstQuestion] : [])];
  return { done: steps.filter(Boolean).length, total: steps.length };
}

function Ring({ done, total }: { done: number; total: number }) {
  const r = 7, c = 2 * Math.PI * r;
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden className="-rotate-90">
      <circle cx="9" cy="9" r={r} fill="none" stroke="currentColor" strokeOpacity=".18" strokeWidth="2.5" />
      <circle cx="9" cy="9" r={r} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - done / total)} className="transition-[stroke-dashoffset] duration-700" />
    </svg>
  );
}

// ---------------------------------------------------------------- yuxarı zolaq
function TopBar({ signals, onSearch, onMenu, menuRef }: { signals: Signals; onSearch: () => void; onMenu: () => void; menuRef: React.RefObject<HTMLButtonElement | null> }) {
  const { t, locale } = useI18n();
  const { tenant, isOperator } = useSession();
  const steps = setupSteps(signals.overview);
  const bill = signals.overview?.billing;
  const money = new Intl.NumberFormat(locale === "en" ? "en-US" : locale === "ru" ? "ru-RU" : locale === "tr" ? "tr-TR" : "az-Latn-AZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const pill = "flex h-9 shrink-0 items-center gap-2 rounded-full bg-card/70 px-3 text-sm ring-1 ring-border/70 transition-colors hover:bg-card";
  return (
    <header className="flex h-14 min-w-0 items-center gap-2 px-2 md:px-3">
      <button ref={menuRef} type="button" onClick={onMenu} aria-label={t("Menyu")} className="relative grid size-10 shrink-0 cursor-pointer place-items-center rounded-lg hover:bg-card md:hidden">
        <Menu size={20} aria-hidden />
        {["/inbox", "/knowledge", "/embed", "/billing"].some((h) => { const x = itemSignal(h, signals); return x.count || x.dot; }) && <span className="absolute top-2 right-2 size-2 rounded-full bg-destructive" />}
      </button>
      <Link href={isOperator ? "/inbox" : "/settings"} className={cn(pill, "min-w-0 max-w-[16rem] pl-1.5")} title={tenant?.domain}>
        <span aria-hidden className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{(tenant?.businessName ?? "C").trim().charAt(0).toUpperCase()}</span>
        <span className="truncate font-medium">{tenant?.businessName ?? t("Hesabım")}</span>
      </Link>
      {!isOperator && steps && steps.done < steps.total && (
        <Link href="/dashboard" className={cn(pill, "hidden text-primary sm:flex")}>
          <Ring done={steps.done} total={steps.total} />
          <span className="font-medium">{t("Hazırlıq")}</span>
          <span className="tabular-nums text-muted-foreground">{steps.done}/{steps.total}</span>
        </Link>
      )}
      {!isOperator && bill && (
        <Link href="/billing" className={cn(pill, "hidden lg:flex", bill.state === "empty" ? "text-destructive" : bill.state === "low" ? "text-amber" : "")}>
          <Wallet size={15} aria-hidden className={bill.state === "ok" ? "text-muted-foreground" : ""} />
          <span className="font-medium tabular-nums">{money.format(bill.balanceAzn)} ₼</span>
          {bill.state !== "ok" && <span className="text-xs">{bill.state === "empty" ? t("bitib") : t("azalır")}</span>}
        </Link>
      )}
      <div className="flex min-w-0 flex-1 justify-end md:justify-center">
        <button type="button" onClick={onSearch} aria-label={t("Axtar və ya keç")} aria-keyshortcuts="Control+K Meta+K"
          className="flex h-9 cursor-pointer items-center gap-2 rounded-full bg-card/70 px-3 text-sm text-muted-foreground ring-1 ring-border/70 transition-colors hover:bg-card md:w-full md:max-w-md">
          <Search size={16} aria-hidden />
          <span className="hidden md:inline">{t("Axtar və ya keç…")}</span>
          <kbd className="ml-auto hidden rounded border border-border bg-muted px-1.5 font-sans text-[11px] md:inline">Ctrl K</kbd>
        </button>
      </div>
      <LangSwitch className="shrink-0" />
    </header>
  );
}

// ---------------------------------------------------------------- sol ikon zolağı
function Rail({ groups, active, signals }: { groups: ReturnType<typeof useGroups>; active: string; signals: Signals }) {
  const { t } = useI18n();
  const { me, signOut } = useSession();
  // Hesab menyusu: ikon zolağı sürüşən (overflow) olduğu üçün kart orada kəsilirdi və aşağıda sürüşmə yaranırdı.
  // Ona görə kart body-yə (portal) çıxarılır və düymənin yanında sabit (fixed) yerləşir.
  const [menu, setMenu] = useState<{ left: number; bottom: number } | null>(null);
  const menuBox = useRef<HTMLDivElement>(null);
  const menuCard = useRef<HTMLDivElement>(null);
  const toggleMenu = () => {
    if (menu) return setMenu(null);
    const r = menuBox.current?.getBoundingClientRect();
    if (r) setMenu({ left: r.right + 10, bottom: Math.max(8, window.innerHeight - r.bottom) });
  };
  useEffect(() => {
    if (!menu) return;
    const away = (e: PointerEvent) => { const n = e.target as Node; if (!menuBox.current?.contains(n) && !menuCard.current?.contains(n)) setMenu(null); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setMenu(null); };
    const close = () => setMenu(null);
    document.addEventListener("pointerdown", away); document.addEventListener("keydown", esc); window.addEventListener("resize", close);
    return () => { document.removeEventListener("pointerdown", away); document.removeEventListener("keydown", esc); window.removeEventListener("resize", close); };
  }, [menu]);

  const link = (g: (typeof groups)[number]) => {
    const on = g.id === active;
    const sig = g.items.map((i) => itemSignal(i.href, signals));
    const count = sig.reduce((n, s) => n + (s.count ?? 0), 0);
    const dot = sig.some((s) => s.dot);
    return (
      <Link key={g.id} href={g.items[0]!.href} aria-current={on ? "page" : undefined} title={t(g.label)}
        className={cn("group relative flex w-full flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[11px] leading-tight transition-colors", on ? "text-foreground" : "text-muted-foreground hover:text-foreground")}>
        <span className={cn("relative grid size-10 place-items-center rounded-xl transition-all", on ? "bg-card shadow-sm ring-1 ring-border/70" : "group-hover:bg-card/60")}>
          <g.icon size={20} strokeWidth={on ? 2.2 : 1.8} aria-hidden />
          <Badge count={count} dot={!count && dot} className={cn("absolute", count ? "-top-1.5 -right-1.5" : "top-1 right-1")} />
        </span>
        <span className={cn("max-w-full truncate", on && "font-semibold")}>{t(g.label)}</span>
      </Link>
    );
  };

  return (
    <nav aria-label={t("Panel")} className="no-scrollbar hidden w-[84px] shrink-0 flex-col items-center gap-1 overflow-y-auto overflow-x-hidden px-1.5 pb-3 md:flex">
      {groups.filter((g) => !g.bottom).map(link)}
      <div className="mt-auto flex w-full flex-col items-center gap-1 pt-3">
        {me.role === "admin" && (
          <Link href="/admin" title={t("Admin")} className="group flex w-full flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[11px] text-muted-foreground hover:text-foreground">
            <span className="grid size-10 place-items-center rounded-xl group-hover:bg-card/60"><Shield size={20} strokeWidth={1.8} aria-hidden /></span>{t("Admin")}
          </Link>
        )}
        {groups.filter((g) => g.bottom).map(link)}
        <div ref={menuBox} className="relative mt-1">
          <button type="button" onClick={toggleMenu} aria-haspopup="menu" aria-expanded={!!menu} aria-label={t("Hesab menyusu")}
            className="grid size-10 cursor-pointer place-items-center rounded-full bg-foreground text-sm font-semibold text-background ring-2 ring-transparent transition hover:ring-border">
            {me.email.charAt(0).toUpperCase()}
          </button>
          {menu && createPortal(
            <div ref={menuCard} role="menu" style={{ left: menu.left, bottom: menu.bottom }} className="fixed z-[60] w-64 rounded-xl border border-border bg-card p-1.5 shadow-lg">
              <div className="flex items-center gap-2.5 px-2.5 py-2">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-foreground text-xs font-semibold text-background">{me.email.charAt(0).toUpperCase()}</span>
                <span className="min-w-0 truncate text-sm font-medium">{me.email}</span>
              </div>
              <div className="my-1 h-px bg-border" />
              <Link role="menuitem" href="/settings" onClick={() => setMenu(null)} className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm hover:bg-muted"><Settings size={15} aria-hidden />{t("Ayarlar")}</Link>
              <Link role="menuitem" href="/settings/notifications" onClick={() => setMenu(null)} className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm hover:bg-muted"><Bell size={15} aria-hidden />{t("Bildirişlər")}</Link>
              <div className="my-1 h-px bg-border" />
              <button role="menuitem" type="button" onClick={signOut} className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-muted"><LogOut size={15} aria-hidden />{t("Çıxış")}</button>
            </div>, document.body,
          )}
        </div>
      </div>
    </nav>
  );
}

// ---------------------------------------------------------------- bölmənin menyusu
function SectionNav({ group, signals, onNavigate, className, compact }: { group: ReturnType<typeof useGroups>[number]; signals: Signals; onNavigate?: () => void; className?: string; compact?: boolean }) {
  const { t } = useI18n();
  const pathname = usePathname();
  // Ən uzun uyğun ünvan seçilir: /assistant/profile açıqdırsa "Ümumi baxış" (/assistant) da yanmasın
  const current = group.items.filter((i) => isActive(pathname, i.href)).sort((a, b) => b.href.length - a.href.length)[0]?.href;
  return (
    <div className={className}>
      {/* Telefon menyusunda tək səhifəli bölmənin başlığı təkrar olmasın ("Müraciətlər / Müraciətlər") */}
      {!(compact && group.items.length === 1) && <p className="px-3 pt-3 pb-2 text-[15px] font-semibold">{t(group.label)}</p>}
      <ul className="flex flex-col gap-0.5">
        {group.items.map((i) => {
          const on = i.href === current;
          const s = itemSignal(i.href, signals);
          return (
            <li key={i.href}>
              {i.section && <p className="px-3 pb-1 pt-4 text-[13px] font-semibold text-foreground">{t(i.section)}</p>}
              <Link href={i.href} onClick={onNavigate} aria-current={on ? "page" : undefined}
                className={cn("flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors", on ? "bg-card font-medium text-foreground shadow-sm ring-1 ring-border/70" : "text-muted-foreground hover:bg-card/60 hover:text-foreground")}>
                <i.icon size={16} aria-hidden className="shrink-0" />
                <span className="min-w-0 flex-1 truncate">{t(i.label)}</span>
                <Badge {...s} />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------- Ctrl+K
function CommandPalette({ open, onClose, groups }: { open: boolean; onClose: () => void; groups: ReturnType<typeof useGroups> }) {
  const { t } = useI18n();
  const { me, signOut } = useSession();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { if (open) { setQ(""); setSel(0); setTimeout(() => input.current?.focus(), 0); } }, [open]);

  const all = useMemo(() => {
    const pages = groups.flatMap((g) => g.items.map((i) => ({ key: i.href, label: t(i.label), group: t(g.label), icon: i.icon, run: () => router.push(i.href) })));
    if (me.role === "admin") pages.push({ key: "/admin", label: t("Admin"), group: t("Hesab"), icon: Shield, run: () => router.push("/admin") });
    pages.push({ key: "logout", label: t("Çıxış"), group: t("Hesab"), icon: LogOut, run: signOut });
    return pages;
  }, [groups, me.role, router, signOut, t]);
  const norm = (s: string) => s.toLocaleLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/ı/g, "i").replace(/ə/g, "e");
  const list = all.filter((x) => !q.trim() || norm(`${x.label} ${x.group}`).includes(norm(q.trim())));
  const go = (i: number) => { const x = list[i]; if (!x) return; onClose(); x.run(); };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 p-4 pt-[12vh] backdrop-blur-[2px]" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label={t("Axtar və ya keç")} className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center gap-2 border-b border-border px-4">
          <Search size={18} aria-hidden className="text-muted-foreground" />
          <input ref={input} value={q} onChange={(e) => { setQ(e.target.value); setSel(0); }} placeholder={t("Səhifə adı yaz…")} aria-label={t("Axtar")}
            role="combobox" aria-expanded="true" aria-controls="cmdk-list" aria-activedescendant={list[sel] ? `cmdk-${sel}` : undefined}
            onKeyDown={(e) => {
              if (e.key === "Escape") { e.preventDefault(); onClose(); }
              else if (e.key === "ArrowDown") { e.preventDefault(); setSel((i) => Math.min(i + 1, list.length - 1)); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setSel((i) => Math.max(i - 1, 0)); }
              else if (e.key === "Enter") { e.preventDefault(); go(sel); }
            }}
            className="h-12 flex-1 bg-transparent text-[15px] outline-none" />
          <kbd className="rounded border border-border bg-muted px-1.5 text-[11px] text-muted-foreground">Esc</kbd>
        </div>
        <ul id="cmdk-list" role="listbox" className="max-h-[50vh] overflow-y-auto p-1.5">
          {list.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted-foreground">{t("Heç nə tapılmadı.")}</li>}
          {list.map((x, i) => (
            <li key={x.key} id={`cmdk-${i}`} role="option" aria-selected={i === sel} onMouseMove={() => setSel(i)} onClick={() => go(i)}
              className={cn("flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm", i === sel && "bg-muted")}>
              <x.icon size={16} aria-hidden className="text-muted-foreground" />
              <span className="flex-1">{x.label}</span>
              <span className="text-xs text-muted-foreground">{x.group}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- çərçivə
export function PanelFrame({ signals, children }: { signals: Signals; children: React.ReactNode }) {
  const { t } = useI18n();
  const pathname = usePathname();
  const groups = useGroups();
  const { me, signOut } = useSession();
  const active = groups.find((g) => g.items.some((i) => isActive(pathname, i.href)))?.id ?? "";
  const activeGroup = groups.find((g) => g.id === active);
  const bleed = FULL_BLEED.some((p) => isActive(pathname, p));
  const [drawer, setDrawer] = useState(false);
  const [palette, setPalette] = useState(false);
  const menuRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const main = useRef<HTMLElement>(null);

  useEffect(() => { setDrawer(false); main.current?.scrollTo({ top: 0 }); }, [pathname]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPalette((v) => !v); } };
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, []);
  useEffect(() => {
    if (!drawer) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setDrawer(false); menuRef.current?.focus(); } };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawer]);

  return (
    <div className="flex h-dvh flex-col bg-shell text-foreground">
      <div className="flex min-w-0 shrink-0 items-center">
        <Link href={groups[0]?.items[0]?.href ?? "/dashboard"} aria-label={t("Ana səhifə")} className="hidden w-[84px] shrink-0 justify-center md:flex">
          <span className="grid size-9 place-items-center rounded-xl bg-foreground text-background shadow-sm"><Bot size={19} aria-hidden /></span>
        </Link>
        <div className="min-w-0 flex-1"><TopBar signals={signals} onSearch={() => setPalette(true)} onMenu={() => setDrawer(true)} menuRef={menuRef} /></div>
      </div>
      <div className="flex min-h-0 flex-1">
        <Rail groups={groups} active={active} signals={signals} />
        {activeGroup && activeGroup.items.length > 1 && (
          <SectionNav group={activeGroup} signals={signals} className="hidden w-56 shrink-0 overflow-y-auto pr-3 pb-3 md:block" />
        )}
        <main ref={main} className={cn("min-w-0 flex-1 border-border bg-card md:mr-2 md:mb-2 md:rounded-2xl md:border md:shadow-[0_1px_2px_rgba(15,23,42,.04)]", bleed ? "flex flex-col overflow-hidden" : "overflow-y-auto")}>
          {/* Müraciətlər kimi iş səhifələri bütün sahəni tutur (öz sütunları və sürüşməsi var) */}
          {bleed ? <div className="flex min-h-0 flex-1 flex-col [&>*:last-child]:min-h-0 [&>*:last-child]:flex-1">{children}</div>
            : <div className="mx-auto w-full max-w-5xl px-4 py-6 md:px-8 md:py-8">{children}</div>}
        </main>
      </div>

      {/* Telefon: yandan açılan menyu (bütün bölmələr qruplarla) */}
      <div className={cn("fixed inset-0 z-40 md:hidden", drawer ? "" : "pointer-events-none")} aria-hidden={!drawer}>
        <div onClick={() => setDrawer(false)} className={cn("absolute inset-0 bg-black/40 transition-opacity duration-300", drawer ? "opacity-100" : "opacity-0")} />
        <aside role="dialog" aria-modal="true" aria-label={t("Menyu")} inert={!drawer}
          className={cn("absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-shell shadow-xl transition-transform duration-300 ease-out", drawer ? "translate-x-0" : "-translate-x-full")}>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="grid size-9 place-items-center rounded-xl bg-foreground text-background"><Bot size={19} aria-hidden /></span>
            <button ref={closeRef} type="button" onClick={() => { setDrawer(false); menuRef.current?.focus(); }} aria-label={t("Menyunu bağla")} className="grid size-9 cursor-pointer place-items-center rounded-lg hover:bg-card"><X size={20} aria-hidden /></button>
          </div>
          <div className="flex-1 overflow-y-auto px-2 pb-3">
            {groups.map((g) => <SectionNav key={g.id} group={g} signals={signals} onNavigate={() => setDrawer(false)} compact className={g.items.length === 1 ? "pt-2" : ""} />)}
            {me.role === "admin" && <Link href="/admin" className="mt-2 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-card"><Shield size={16} aria-hidden />{t("Admin")}</Link>}
          </div>
          <div className="border-t border-border px-2 py-2">
            <p className="truncate px-3 py-1 text-xs text-muted-foreground">{me.email}</p>
            <button type="button" onClick={signOut} className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm hover:bg-card"><LogOut size={16} aria-hidden />{t("Çıxış")}</button>
          </div>
        </aside>
      </div>

      <CommandPalette open={palette} onClose={() => setPalette(false)} groups={groups} />
    </div>
  );
}
