"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Users } from "lucide-react";
import { SessionProvider, useSession } from "@/components/session";
import { LangSwitch, useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/admin", label: "Ümumi baxış", icon: BarChart3 },
  { href: "/admin/users", label: "İstifadəçilər", icon: Users },
];

function Header() {
  const { me, signOut } = useSession();
  const pathname = usePathname();
  const t = useT();
  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-5 py-3">
        <p className="font-semibold">{t("Car Advisor admin")}</p>
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">{t("Panelə qayıt")}</Link>
        <span className="flex-1" />
        <LangSwitch />
        <span className="hidden text-xs text-muted-foreground sm:inline">{me.email}</span>
        <button className="cursor-pointer text-sm text-muted-foreground hover:underline" onClick={signOut}>{t("Çıxış")}</button>
      </div>
      <nav aria-label={t("Admin bölmələri")} className="mx-auto flex max-w-6xl gap-1 px-5">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
          return (
            <Link key={href} href={href} aria-current={active ? "page" : undefined}
              className={cn("-mb-px flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm", active ? "border-primary font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>
              <Icon size={16} aria-hidden /> {t(label)}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider adminOnly>
      <Header />
      <main className="mx-auto max-w-6xl px-5 py-8">{children}</main>
    </SessionProvider>
  );
}
