"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Activity, Bug, Globe, Coins, CornerUpLeft, HandCoins, LayoutDashboard, Megaphone, Menu, MessagesSquare, PauseCircle, ReceiptText, ScrollText, Search, Settings, Shield, Users, Wallet } from "lucide-react";
import { SessionProvider, useSession } from "@/components/session";
import { Frame, type NavGroup } from "@/components/panel-shell";
import { adminOverview, type AdminOverview } from "@/lib/api";
import { LangSwitch, useT } from "@/lib/i18n";
import { TwoFactorCard } from "@/components/two-factor";

/** ADMIN_2FA=required olanda 2FA qurmamış admin panelin əvəzinə bunu görür. */
function TwoFactorGate() {
  const { me, refresh, signOut } = useSession();
  const t = useT();
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center gap-5 px-5 py-10">
      <div className="flex items-center gap-3">
        <span aria-hidden className="grid size-10 place-items-center rounded-xl bg-foreground text-background"><Shield size={20} /></span>
        <div>
          <h1 className="text-xl font-semibold">{t("Admin panel üçün iki addımlı giriş lazımdır")}</h1>
          <p className="text-sm text-muted-foreground">{t("Admin hesabı balansları və istifadəçiləri idarə edir. Davam etmək üçün authenticator tətbiqini qoş.")}</p>
        </div>
      </div>
      <TwoFactorCard me={me} onChange={refresh} />
      <div className="flex gap-4 text-sm">
        <Link href="/dashboard" className="text-muted-foreground hover:underline">← {t("Panelə qayıt")}</Link>
        <button type="button" onClick={signOut} className="cursor-pointer text-muted-foreground hover:underline">{t("Çıxış")}</button>
      </div>
    </main>
  );
}

// Müştəri panelindəki kimi: sol zolaqda əsas bölmələr, içəridə alt səhifələr
const GROUPS: NavGroup[] = [
  { id: "home", label: "Ümumi", icon: LayoutDashboard, items: [{ href: "/admin", label: "Ümumi baxış", icon: LayoutDashboard }] },
  { id: "users", label: "Müştərilər", icon: Users, items: [
    { href: "/admin/users", label: "İstifadəçilər", icon: Users },
    { href: "/admin/domains", label: "Domenlər", icon: Globe },
  ] },
  { id: "money", label: "Maliyyə", icon: Wallet, items: [
    { href: "/admin/payments", label: "Ödənişlər", icon: ReceiptText },
    { href: "/admin/finance", label: "Gəlir və xərc", icon: Coins },
    { href: "/admin/partners", label: "Partnyorlar", icon: HandCoins },
  ] },
  { id: "system", label: "Sistem", icon: Activity, items: [
    { href: "/admin/channels", label: "Kanallar", icon: MessagesSquare },
    { href: "/admin/errors", label: "Xətalar", icon: Bug },
    { href: "/admin/audit", label: "Audit jurnalı", icon: ScrollText },
  ] },
  { id: "settings", label: "Ayarlar", icon: Settings, bottom: true, items: [
    { href: "/admin/settings", label: "Ümumi ayarlar", icon: Settings },
    { href: "/admin/announcement", label: "Elan", icon: Megaphone },
  ] },
];

function AdminTopBar({ o, onSearch, onMenu, menuRef }: { o: AdminOverview | null; onSearch: () => void; onMenu: () => void; menuRef: React.RefObject<HTMLButtonElement | null> }) {
  const t = useT();
  const pill = "flex h-9 shrink-0 items-center gap-2 rounded-full bg-card/70 px-3 text-sm ring-1 ring-border/70 transition-colors hover:bg-card";
  return (
    <header className="flex h-14 min-w-0 items-center gap-2 px-2 md:px-3">
      <button ref={menuRef} type="button" onClick={onMenu} aria-label={t("Menyu")} className="relative grid size-10 shrink-0 cursor-pointer place-items-center rounded-lg hover:bg-card md:hidden">
        <Menu size={20} aria-hidden />
        {!!o && (o.errors.last24h > 0 || o.pendingTopups > 0) && <span className="absolute top-2 right-2 size-2 rounded-full bg-destructive" />}
      </button>
      <Link href="/admin" className={`${pill} pl-1.5`}>
        <span aria-hidden className="grid size-6 place-items-center rounded-full bg-foreground text-background"><Shield size={13} /></span>
        <span className="font-medium">{t("Admin panel")}</span>
      </Link>
      {o?.aiControl?.paused && (
        <Link href="/admin/settings" className={`${pill} hidden text-destructive sm:flex`}><PauseCircle size={15} aria-hidden /><span className="font-medium">{t("AI dayandırılıb")}</span></Link>
      )}
      {!!o && o.pendingTopups > 0 && (
        <Link href="/admin/payments" className={`${pill} hidden text-amber lg:flex`}><ReceiptText size={15} aria-hidden /><span className="font-medium">{t("{n} təsdiq gözləyir", { n: o.pendingTopups })}</span></Link>
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

/** Admin çərçivəsi müştəri paneli ilə eynidir; Xətalar və Ödənişlər yanında qırmızı sayğac görünür. */
function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [o, setO] = useState<AdminOverview | null>(null);
  useEffect(() => {
    let on = true;
    const f = () => adminOverview().then((r) => { if (on) setO(r); }).catch(() => {});
    f();
    const i = setInterval(f, 60_000);
    return () => { on = false; clearInterval(i); };
  }, [pathname]);
  const sig = (href: string) => href === "/admin/errors" ? { count: o?.errors.last24h ?? 0 } : href === "/admin/payments" ? { count: o?.pendingTopups ?? 0 } : href === "/admin/settings" ? { dot: Boolean(o?.aiControl?.paused) } : href === "/admin/domains" ? { count: o?.domains?.suspicious ?? 0 } : {};
  return (
    <Frame groups={GROUPS} sig={sig} home="/admin" wide
      cross={{ href: "/dashboard", label: "Panel", icon: CornerUpLeft }}
      menuLinks={[{ href: "/dashboard", label: "Panelə qayıt", icon: CornerUpLeft }, { href: "/settings/security", label: "Giriş və təhlükəsizlik", icon: Shield }]}
      topBar={(p) => <AdminTopBar o={o} {...p} />}>
      {children}
    </Frame>
  );
}

function Gate({ children }: { children: React.ReactNode }) {
  const { me } = useSession();
  return me.twoFactor?.setupNeeded ? <TwoFactorGate /> : <Shell>{children}</Shell>;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <SessionProvider adminOnly><Gate>{children}</Gate></SessionProvider>;
}
