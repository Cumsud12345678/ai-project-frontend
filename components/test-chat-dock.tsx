"use client";
// Sınaq çatı paneli: istənilən səhifədə sağ kənardakı düymə ilə açılır. Ayarı dəyişib saxlayırsan və
// səhifədən çıxmadan köməkçini ziyarətçi kimi yoxlayırsan. Kompüterdə səhifənin yanında açılır (eni dartılır),
// telefonda bütün ekranı tutur. Bağlananda söhbət itmir: panel yenidən açılanda qaldığın yerdən davam edir.
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ExternalLink, MessageSquareText, X } from "lucide-react";
import { AssistantPreview } from "@/components/assistant-preview";
import { useResizable } from "@/components/resizable";
import { useSession } from "@/components/session";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

// Bu səhifələrdə sınaq çatı onsuz da var: düymə göstərilmir
const HAS_OWN_CHAT = ["/playground", "/setup", "/assistant/profile", "/assistant/skills"];
const KEY = "ca:test-dock";

export function useTestDock() {
  const pathname = usePathname();
  const { tenant } = useSession();
  const [open, setOpen] = useState(false);
  useEffect(() => { try { setOpen(localStorage.getItem(KEY) === "1"); } catch { /* */ } }, []);
  const set = (v: boolean) => { setOpen(v); try { localStorage.setItem(KEY, v ? "1" : "0"); } catch { /* */ } };
  const available = Boolean(tenant) && !HAS_OWN_CHAT.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  return { available, open: available && open, setOpen: set };
}

/** Sağ kənardakı şaquli düymə (panel bağlı olanda) */
export function TestDockTab({ onOpen }: { onOpen: () => void }) {
  const { t } = useI18n();
  return (
    <button type="button" onClick={onOpen} aria-label={t("Sınaq çatını aç")}
      className="fixed right-0 top-1/2 z-30 flex -translate-y-1/2 cursor-pointer flex-col items-center gap-2 rounded-l-xl border border-r-0 border-border bg-card px-2 py-3 text-xs font-medium text-muted-foreground shadow-md transition-colors hover:bg-muted hover:text-foreground">
      <MessageSquareText size={16} aria-hidden className="text-foreground" />
      <span className="[writing-mode:vertical-rl] rotate-180 tracking-wide">{t("Sınaq çatı")}</span>
    </button>
  );
}

/** Panelin özü. open=false olanda gizlənir, amma söhbəti saxlamaq üçün DOM-da qalır. */
export function TestDock({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const { tenant } = useSession();
  const w = useResizable("test-dock", 380, 320, 640, "left");
  const name = tenant?.config.profile?.agentName || tenant?.businessName || t("Köməkçi");
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape" && window.matchMedia("(max-width: 767px)").matches) onClose(); };
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [open, onClose]);
  return (
    <aside aria-label={t("Sınaq çatı")} hidden={!open} style={w.style}
      className={cn("flex-col bg-card",
        // telefon: bütün ekran; kompüter: səhifənin yanında, eni dartılan kart
        "fixed inset-0 z-40 md:relative md:inset-auto md:z-auto md:mr-2 md:mb-2 md:w-[var(--pane-w)] md:shrink-0 md:rounded-2xl md:border md:border-border md:shadow-[0_1px_2px_rgba(15,23,42,.04)]",
        open ? "flex" : "hidden")}>
      {w.handle}
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3">
        <MessageSquareText size={16} aria-hidden />
        <h2 className="min-w-0 flex-1 truncate text-sm font-semibold">{t("Sınaq çatı")}</h2>
        <Link href="/playground" className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={t("Tam səhifədə aç")} title={t("Tam səhifədə aç")}><ExternalLink size={15} aria-hidden /></Link>
        <button type="button" onClick={onClose} aria-label={t("Sınaq çatını bağla")} className="grid size-8 cursor-pointer place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"><X size={16} aria-hidden /></button>
      </div>
      <div className="min-h-0 flex-1 p-2">
        <AssistantPreview name={name} className="h-full min-h-0 rounded-xl border-0 bg-muted/40 shadow-none" />
      </div>
    </aside>
  );
}
