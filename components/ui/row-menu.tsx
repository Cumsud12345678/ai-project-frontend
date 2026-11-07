"use client";
// "..." menyusu (cədvəl sətri və ya kart üçün): Redaktə et, Sına, Sil və s.
import { useEffect, useRef, useState } from "react";
import { MoreHorizontal, type LucideIcon } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type RowMenuItem = { label: string; icon: LucideIcon; run: () => void; danger?: boolean; disabled?: boolean };

export function RowMenu({ items, label }: { items: RowMenuItem[]; label?: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const f = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", f); document.addEventListener("keydown", k);
    return () => { document.removeEventListener("mousedown", f); document.removeEventListener("keydown", k); };
  }, [open]);
  return (
    <div ref={ref} className="relative inline-block">
      <button type="button" aria-label={label ?? t("Əməliyyatlar")} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}
        className="grid size-8 cursor-pointer place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"><MoreHorizontal size={17} aria-hidden /></button>
      {open && (
        <ul role="menu" className="absolute right-0 z-30 mt-1 w-52 rounded-xl border border-border bg-card p-1 text-left shadow-lg">
          {items.map((i) => (
            <li key={i.label}>
              <button type="button" role="menuitem" disabled={i.disabled} onClick={() => { setOpen(false); i.run(); }}
                className={cn("flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm hover:bg-muted disabled:cursor-default disabled:opacity-40", i.danger && "text-destructive")}>
                <i.icon size={14} aria-hidden />{i.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
