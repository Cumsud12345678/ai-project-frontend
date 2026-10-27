import Link from "next/link";
import { BarChart3, Check, MessagesSquare, ShieldCheck } from "lucide-react";
import { LangSwitch, useT } from "@/lib/i18n";

function Brand({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label="Car Advisor">
      <span className="grid size-9 place-items-center rounded-xl bg-[#c2410c] text-white"><MessagesSquare size={19} aria-hidden /></span>
      <span className={`text-[15px] font-semibold tracking-tight ${light ? "text-white" : "text-foreground"}`}>Car Advisor</span>
    </Link>
  );
}

/** Böyük məhsulların giriş səhifələri kimi: sol tərəfdə brend paneli (yalnız geniş ekranda), sağda forma. */
export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle?: string; children?: React.ReactNode; footer?: React.ReactNode }) {
  const t = useT();
  const points = [
    { icon: MessagesSquare, text: t("Saytındakı çat sualları cavablandırır, lazım olanda operatora ötürür.") },
    { icon: BarChart3, text: t("Hər sorğunun xərcini, söhbətləri və müraciətləri bir yerdə izlə.") },
    { icon: ShieldCheck, text: t("Hər istifadəçi yalnız öz məlumatını görür, telefon və kart nömrələri maskalanır.") },
  ];
  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-[#0c2a25] p-12 text-white lg:flex" aria-hidden={false}>
        <div className="pointer-events-none absolute -right-32 -top-32 size-[28rem] rounded-full bg-[#0b6b57] opacity-40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-24 size-[26rem] rounded-full bg-[#ea580c] opacity-20 blur-3xl" />
        <div className="relative"><Brand light /></div>
        <div className="relative max-w-md">
          <p className="text-3xl font-semibold leading-tight tracking-tight">{t("Müştərilərin suallarına saytında 24 saat cavab ver.")}</p>
          <ul className="mt-8 flex flex-col gap-5">
            {points.map((p) => (
              <li key={p.text} className="flex items-start gap-3 text-[15px] leading-relaxed text-white/85">
                <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-white/10"><p.icon size={15} aria-hidden /></span>
                <span>{p.text}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative flex items-center gap-2 text-sm text-white/60"><Check size={14} aria-hidden />{t("Azərbaycan, ingilis və rus dillərində")}</p>
      </aside>

      <main className="flex flex-col px-6 py-8 sm:px-10">
        <div className="flex items-center justify-between"><div className="lg:invisible"><Brand /></div><LangSwitch /></div>
        <div className="mx-auto flex w-full max-w-[26rem] flex-1 flex-col justify-center gap-7 py-10">
          <div>
            <h1 className="text-[1.65rem] font-semibold leading-tight tracking-tight">{title}</h1>
            {subtitle && <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{subtitle}</p>}
          </div>
          {children}
          {footer && <p className="text-sm text-muted-foreground">{footer}</p>}
        </div>
        <p className="text-center text-xs text-muted-foreground">© {new Date().getFullYear()} Car Advisor</p>
      </main>
    </div>
  );
}
