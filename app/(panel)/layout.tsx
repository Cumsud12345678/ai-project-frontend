"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BookOpen, Gauge, Inbox, MessageSquare, MessagesSquare, List, Plug, Code, Send, Settings, LogOut, Menu, Shield, Rocket, ShieldCheck, Wallet, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { getLiveCount } from "@/lib/api";
import { AnnouncementBanner } from "@/components/announcement-banner";
import { SessionProvider, useSession } from "@/components/session";
import { LangSwitch, useT } from "@/lib/i18n";
import { useLiveEvents } from "@/lib/live-socket";

// label: Azərbaycan açarı, render zamanı tərcümə olunur
// only: göstərildiyi rejimlər (yoxdursa hamısında); listings = elan, support = dəstək botu
const nav: { href: string; label: string; icon: typeof Gauge; only?: ("listings" | "support" | "both")[] }[] = [
  { href: "/setup", label: "Quraşdırma", icon: Rocket },
  { href: "/dashboard", label: "İstifadə", icon: Gauge },
  { href: "/playground", label: "Sınaq söhbəti", icon: MessageSquare },
  { href: "/knowledge", label: "Bilik bazası", icon: BookOpen },
  { href: "/inbox", label: "Müraciətlər", icon: Inbox },
  { href: "/queries", label: "Sorğular", icon: MessagesSquare },
  { href: "/listings", label: "Kataloq", icon: List, only: ["listings", "both"] },
  { href: "/connection", label: "Elan mənbəyi", icon: Plug, only: ["listings", "both"] },
  { href: "/customer-data", label: "Müştəri məlumatı", icon: ShieldCheck },
  { href: "/billing", label: "Balans", icon: Wallet },
  { href: "/embed", label: "Saytına qoş", icon: Code },
  { href: "/channels", label: "Kanallar", icon: Send },
  { href: "/settings", label: "Ayarlar", icon: Settings },
];

/** Menyunun məzmunu: kompüterdə sol panel, telefonda açılan yan menyu. */
function SidebarContent({ onNavigate, waiting = 0 }: { onNavigate?: () => void; waiting?: number }) {
  const pathname = usePathname();
  const { me, tenant, signOut } = useSession();
  const t = useT();
  const mode = tenant?.config.profile?.mode ?? "listings";
  return (
    <div className="flex h-full flex-col gap-4 bg-sidebar p-4 text-sidebar-foreground">
      <div className="flex min-w-0 items-center gap-3 border-b border-white/10 pb-4">
        <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary text-base font-bold text-primary-foreground">{(tenant?.businessName ?? "C").trim().charAt(0).toUpperCase()}</span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{tenant?.businessName ?? "Car Advisor"}</p>
          <p className="truncate text-xs text-sidebar-muted">{tenant?.domain ?? me.email}</p>
        </div>
      </div>
      <nav aria-label={t("Panel")} className="flex flex-col gap-1">
        {nav.filter((n) => (n.href === "/setup" ? !tenant : !n.only || !tenant || n.only.includes(mode))).map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link key={href} href={href} onClick={onNavigate} aria-current={active ? "page" : undefined}
              className={cn("flex items-center gap-3 whitespace-nowrap rounded-md border-l-2 px-3 py-2.5 text-sm transition-colors", active ? "border-white bg-sidebar-accent font-medium text-white" : "border-transparent text-sidebar-muted hover:bg-sidebar-accent hover:text-white")}>
              <Icon size={16} aria-hidden /> {t(label)}
              {href === "/inbox" && waiting > 0 && <span aria-label={t("{n} cavab gözləyən canlı söhbət", { n: waiting })} className="ml-auto rounded-full bg-destructive px-2 py-0.5 text-xs font-semibold text-white">{waiting}</span>}
            </Link>
          );
        })}
        {me.role === "admin" && (
          <Link href="/admin" onClick={onNavigate} className="flex items-center gap-3 whitespace-nowrap rounded-md border-l-2 border-transparent px-3 py-2.5 text-sm text-sidebar-muted transition-colors hover:bg-sidebar-accent hover:text-white">
            <Shield size={16} aria-hidden /> {t("Admin")}
          </Link>
        )}
      </nav>
      <LangSwitch className="mt-auto self-start" up alignRight={false} showName />
      <p className="truncate px-3 text-xs text-sidebar-muted">{me.email}</p>
      <button onClick={signOut} className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm text-sidebar-muted hover:bg-sidebar-accent hover:text-white">
        <LogOut size={16} aria-hidden /> {t("Çıxış")}
      </button>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { tenant } = useSession();
  const t = useT();
  const [open, setOpen] = useState(false);
  const [waiting, setWaiting] = useState(0);
  const [liveOn, setLiveOn] = useState(false);
  const refreshWaiting = useRef<() => void>(() => {});
  const closeRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLButtonElement>(null);

  useEffect(() => { setOpen(false); }, [pathname]);
  // Cavab gözləyən canlı söhbətlər menyuda qırmızı sayğacla görünür
  useEffect(() => {
    if (!tenant) return;
    let on = true;
    const f = () => getLiveCount().then((r) => { if (on) { setLiveOn(r.enabled); setWaiting(r.enabled ? r.waiting : 0); } }).catch(() => {});
    f();
    const i = setInterval(f, 20000);
    refreshWaiting.current = f;
    return () => { on = false; clearInterval(i); };
  }, [tenant]);
  // Canlı söhbət açıqdırsa: yeni mesaj siqnalı ilə sayğac dərhal yenilənir
  useLiveEvents((e) => { if (e.t === "live") refreshWaiting.current(); }, liveOn);
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); menuRef.current?.focus(); } };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden"; // menyu açıqkən arxa səhifə sürüşmür
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open]);

  return (
    <div className="min-h-screen md:grid md:grid-cols-[15rem_1fr]">
      {/* Telefon: yuxarıda yalnız menyu düyməsi və sayt adı */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-card px-3 shadow-sm md:hidden">
        <button ref={menuRef} type="button" onClick={() => setOpen(true)} aria-label={t("Menyu")} aria-expanded={open} aria-controls="mobile-menu"
          className="grid size-10 cursor-pointer place-items-center rounded-lg hover:bg-muted"><Menu size={22} aria-hidden /></button>
        <p className="min-w-0 truncate font-semibold">{tenant?.businessName ?? "Car Advisor"}</p>
      </header>

      {/* Telefon: yandan açılan menyu */}
      <div className={cn("fixed inset-0 z-40 md:hidden", open ? "" : "pointer-events-none")} aria-hidden={!open}>
        <div onClick={() => setOpen(false)} className={cn("absolute inset-0 bg-black/40 transition-opacity duration-300", open ? "opacity-100" : "opacity-0")} />
        <aside id="mobile-menu" role="dialog" aria-modal="true" aria-label={t("Menyu")} inert={!open}
          className={cn("absolute inset-y-0 left-0 w-72 max-w-[85vw] overflow-y-auto bg-sidebar shadow-xl transition-transform duration-300 ease-out", open ? "translate-x-0" : "-translate-x-full")}>
          <button ref={closeRef} type="button" onClick={() => { setOpen(false); menuRef.current?.focus(); }} aria-label={t("Menyunu bağla")}
            className="absolute top-3 right-3 grid size-9 cursor-pointer place-items-center rounded-lg text-sidebar-foreground hover:bg-sidebar-accent"><X size={20} aria-hidden /></button>
          <SidebarContent onNavigate={() => setOpen(false)} waiting={waiting} />
        </aside>
      </div>

      {/* Kompüter: sabit sol panel */}
      <aside className="hidden bg-sidebar md:sticky md:top-0 md:block md:h-screen">
        <SidebarContent waiting={waiting} />
      </aside>
      <main className="mx-auto w-full max-w-5xl px-5 py-6 md:py-8"><AnnouncementBanner />{children}</main>
    </div>
  );
}

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return <SessionProvider><Shell>{children}</Shell></SessionProvider>;
}
