import Link from "next/link";
import { ArrowLeft, BarChart3, BookOpen, MessagesSquare, ShieldCheck, Sparkles } from "lucide-react";
import { LangSwitch, useT } from "@/lib/i18n";

function Brand({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label="Car Advisor">
      <span className={`relative grid size-9 place-items-center rounded-xl ${light ? "bg-white text-black" : "bg-foreground text-background"}`}>
        <MessagesSquare size={18} aria-hidden />
        <span className={`absolute -top-0.5 -right-0.5 size-2.5 rounded-full border-2 bg-[#f97316] ${light ? "border-black" : "border-background"}`} aria-hidden />
      </span>
      <span className={`text-[15px] font-semibold tracking-tight ${light ? "text-white" : "text-foreground"}`}>Car Advisor</span>
    </Link>
  );
}

/** Kiçik nümunə söhbət: brend panelində məhsulun nə etdiyini göstərir */
function MiniChat() {
  const t = useT();
  return (
    <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm backdrop-blur" aria-hidden>
      <div className="flex items-center gap-2.5 border-b border-white/10 pb-3">
        <span className="grid size-8 place-items-center rounded-full bg-white text-black"><Sparkles size={15} /></span>
        <span className="leading-tight"><span className="block font-semibold">{t("Köməkçi")}</span><span className="text-xs text-white/50">{t("Axtarır, cavab verir, lazım olsa operatora yönləndirir")}</span></span>
      </div>
      <div className="mt-3 flex flex-col gap-2">
        <p className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-white px-3 py-2 text-black">{t("Sifariş neçə günə çatdırılır?")}</p>
        <div className="max-w-[90%] rounded-2xl rounded-bl-md bg-white/10 px-3 py-2 text-white/90">
          {t("Bakı daxilində 1–2 iş günü, rayonlara 3–4 gün. 100 ₼-dən yuxarı sifarişlərdə çatdırılma pulsuzdur.")}
          <span className="mt-2 flex w-fit items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-xs text-white/70"><BookOpen size={12} />{t("Mənbə: Çatdırılma şərtləri")}</span>
        </div>
      </div>
    </div>
  );
}

/** Giriş səhifələri: solda brend paneli (yalnız geniş ekranda), sağda forma. Açılış səhifəsi ilə eyni qara-ağ kimlik. */
export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle?: string; children?: React.ReactNode; footer?: React.ReactNode }) {
  const t = useT();
  const points = [
    { icon: MessagesSquare, text: t("Saytındakı çat sualları cavablandırır, lazım olanda operatora ötürür.") },
    { icon: BarChart3, text: t("Hər sorğunun xərcini, söhbətləri və müraciətləri bir yerdə izlə.") },
    { icon: ShieldCheck, text: t("Hər istifadəçi yalnız öz məlumatını görür, telefon və kart nömrələri maskalanır.") },
  ];
  return (
    <div className="grid min-h-screen grid-cols-1 bg-background lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <aside className="relative hidden flex-col justify-between gap-10 overflow-hidden bg-[#09090b] p-12 text-white lg:flex">
        <div className="pointer-events-none absolute inset-0 opacity-60 [background-image:radial-gradient(rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_40%,#000_30%,transparent_100%)]" aria-hidden />
        <div className="pointer-events-none absolute -bottom-40 left-1/2 h-80 w-[36rem] -translate-x-1/2 rounded-full bg-[#f97316] opacity-20 blur-3xl" aria-hidden />
        <div className="relative"><Brand light /></div>
        <div className="relative flex max-w-md flex-col gap-8">
          <p className="text-[2rem] font-semibold leading-[1.1] tracking-[-0.03em]">{t("Müştərilərin suallarına saytında 24 saat cavab ver.")}</p>
          <MiniChat />
          <ul className="flex flex-col gap-4">
            {points.map((p) => (
              <li key={p.text} className="flex items-start gap-3 text-[15px] leading-relaxed text-white/75">
                <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-white/10"><p.icon size={15} aria-hidden /></span>
                <span>{p.text}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-white/45">{t("Azərbaycan, ingilis, rus və türk dillərində")}</p>
      </aside>

      <main className="flex flex-col px-5 py-6 sm:px-10 sm:py-8">
        <div className="flex items-center justify-between gap-3">
          <div className="lg:hidden"><Brand /></div>
          <Link href="/" className="hidden items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground lg:inline-flex"><ArrowLeft size={15} aria-hidden />{t("Ana səhifə")}</Link>
          <LangSwitch />
        </div>
        <div className="mx-auto flex w-full max-w-[26rem] flex-1 flex-col justify-center gap-7 py-10">
          <div>
            <h1 className="text-[1.75rem] font-semibold leading-tight tracking-[-0.025em]">{title}</h1>
            {subtitle && <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{subtitle}</p>}
          </div>
          {children}
          {footer && <div className="border-t border-border pt-5 text-sm text-muted-foreground">{footer}</div>}
        </div>
        <p className="text-center text-xs text-muted-foreground">© {new Date().getFullYear()} Car Advisor</p>
      </main>
    </div>
  );
}

/** Forma xətası (bütün giriş səhifələrində eyni görünüş) */
export function FormError({ children }: { children: React.ReactNode }) {
  return <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{children}</p>;
}

/** Link stili: qara, alt xətt */
export const authLink = "font-medium text-foreground underline underline-offset-2 hover:no-underline";
