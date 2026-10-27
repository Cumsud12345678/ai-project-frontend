"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Bug, LayoutDashboard, LogOut, Megaphone, ScrollText, Shield, Users } from "lucide-react";
import { SessionProvider, useSession } from "@/components/session";
import { adminOverview } from "@/lib/api";
import { LangSwitch, useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/admin", label: "Ümumi baxış", icon: LayoutDashboard },
  { href: "/admin/users", label: "İstifadəçilər", icon: Users },
  { href: "/admin/errors", label: "Xətalar", icon: Bug },
  { href: "/admin/audit", label: "Audit jurnalı", icon: ScrollText },
  { href: "/admin/announcement", label: "Elan", icon: Megaphone },
];

/** Yan menyu (kompüter) və üfüqi sürüşən menyu (telefon). Xətalar bölməsində son 24 saatın sayı qırmızı nişanla görünür. */
function Shell({ children }: { children: React.ReactNode }) {
  const { me, signOut } = useSession();
  const pathname = usePathname();
  const t = useT();
  const [errors, setErrors] = useState(0);
  useEffect(() => {
    let on = true;
    const f = () => adminOverview().then((o) => { if (on) setErrors(o.errors.last24h); }).catch(() => {});
    f();
    const i = setInterval(f, 60_000);
    return () => { on = false; clearInterval(i); };
  }, [pathname]);
  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  return (
    <div className="min-h-screen md:grid md:grid-cols-[15rem_1fr]">
      <aside className="hidden bg-sidebar text-sidebar-foreground md:sticky md:top-0 md:flex md:h-screen md:flex-col md:gap-4 md:p-4">
        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
          <span aria-hidden className="grid size-10 place-items-center rounded-lg bg-primary text-primary-foreground"><Shield size={20} /></span>
          <div className="min-w-0"><p className="truncate text-sm font-semibold">{t("Car Advisor admin")}</p><p className="truncate text-xs text-sidebar-muted">{me.email}</p></div>
        </div>
        <nav aria-label={t("Admin bölmələri")} className="flex flex-col gap-1">
          {tabs.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} aria-current={isActive(href) ? "page" : undefined}
              className={cn("flex items-center gap-3 rounded-md border-l-2 px-3 py-2.5 text-sm transition-colors", isActive(href) ? "border-white bg-sidebar-accent font-medium text-white" : "border-transparent text-sidebar-muted hover:bg-sidebar-accent hover:text-white")}>
              <Icon size={16} aria-hidden /> {t(label)}
              {href === "/admin/errors" && errors > 0 && <span className="ml-auto rounded-full bg-destructive px-2 py-0.5 text-xs font-semibold text-white" aria-label={t("Son 24 saatda {n} xəta", { n: errors })}>{errors > 99 ? "99+" : errors}</span>}
            </Link>
          ))}
        </nav>
        <Link href="/dashboard" className="mt-auto rounded-md px-3 py-2.5 text-sm text-sidebar-muted hover:bg-sidebar-accent hover:text-white">← {t("Panelə qayıt")}</Link>
        <LangSwitch className="self-start" up alignRight={false} showName />
        <button onClick={signOut} className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm text-sidebar-muted hover:bg-sidebar-accent hover:text-white"><LogOut size={16} aria-hidden /> {t("Çıxış")}</button>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 border-b border-border bg-card md:hidden">
          <div className="flex h-12 items-center gap-3 px-4">
            <p className="flex-1 truncate font-semibold">{t("Car Advisor admin")}</p>
            <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">{t("Panelə qayıt")}</Link>
            <LangSwitch />
            <button className="cursor-pointer text-sm text-muted-foreground hover:underline" onClick={signOut}>{t("Çıxış")}</button>
          </div>
          <nav aria-label={t("Admin bölmələri")} className="flex gap-1 overflow-x-auto px-3">
            {tabs.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} aria-current={isActive(href) ? "page" : undefined}
                className={cn("-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm", isActive(href) ? "border-primary font-medium text-foreground" : "border-transparent text-muted-foreground")}>
                <Icon size={16} aria-hidden /> {t(label)}
                {href === "/admin/errors" && errors > 0 && <span className="rounded-full bg-destructive px-1.5 text-xs font-semibold text-white">{errors > 99 ? "99+" : errors}</span>}
              </Link>
            ))}
          </nav>
        </header>
        <main className="mx-auto w-full max-w-6xl px-5 py-6 md:py-8">{children}</main>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <SessionProvider adminOnly><Shell>{children}</Shell></SessionProvider>;
}
