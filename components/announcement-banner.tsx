"use client";
import { useEffect, useState } from "react";
import { AlertTriangle, Info, Megaphone, X } from "lucide-react";
import { getAnnouncement } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const bannerTone = {
  info: "border-primary/30 bg-primary/10 text-primary",
  warn: "border-amber/40 bg-amber/10 text-amber",
  critical: "border-destructive/40 bg-destructive/10 text-destructive",
} as const;
const icons = { info: Info, warn: Megaphone, critical: AlertTriangle };

/** Admin elanı: panelin yuxarısında göstərilir. İstifadəçi bağlaya bilər (həmin mətn bu sessiyada bir daha çıxmır). */
export function AnnouncementView({ text, level, onClose }: { text: string; level: keyof typeof bannerTone; onClose?: () => void }) {
  const t = useT();
  const Icon = icons[level];
  return (
    <div role={level === "critical" ? "alert" : "status"} className={cn("flex items-start gap-3 rounded-xl border px-4 py-3 text-sm", bannerTone[level])}>
      <Icon size={18} className="mt-0.5 shrink-0" aria-hidden />
      <p className="min-w-0 flex-1 text-foreground">{text}</p>
      {onClose && <button type="button" onClick={onClose} aria-label={t("Elanı bağla")} className="-m-1 grid size-7 shrink-0 cursor-pointer place-items-center rounded-md hover:bg-black/5"><X size={16} aria-hidden /></button>}
    </div>
  );
}

export function AnnouncementBanner() {
  const [a, setA] = useState<{ text: string; level: keyof typeof bannerTone } | null>(null);
  useEffect(() => {
    getAnnouncement().then((r) => {
      if (!r.announcement) return;
      let closed = false;
      try { closed = sessionStorage.getItem("ann") === r.announcement.text; } catch { /* yaddaş bağlıdır */ }
      if (!closed) setA(r.announcement);
    }).catch(() => {});
  }, []);
  if (!a) return null;
  return <div className="mb-5"><AnnouncementView {...a} onClose={() => { try { sessionStorage.setItem("ann", a.text); } catch { /* yaddaş bağlıdır */ } setA(null); }} /></div>;
}
