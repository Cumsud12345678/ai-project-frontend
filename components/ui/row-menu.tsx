"use client";
// "..." menyusu (cədvəl sətri və ya kart üçün): Redaktə et, Sına, Sil və s.
// Menyu body-yə (portal) çıxarılır və düymənin yanında sabit (fixed) yerləşir: cədvəlin sürüşən çərçivəsi
// (overflow-x-auto) və ya modal onu kəsmir. Aşağıda yer yoxdursa yuxarı açılır.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal, type LucideIcon } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type RowMenuItem = { label: string; icon: LucideIcon; run: () => void; danger?: boolean; disabled?: boolean };

const W = 208; // w-52

export function RowMenu({ items, label }: { items: RowMenuItem[]; label?: string }) {
  const { t } = useI18n();
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLUListElement>(null);

  const place = () => {
    const r = btn.current?.getBoundingClientRect();
    if (!r) return;
    const h = menu.current?.offsetHeight ?? items.length * 38 + 8;
    const up = r.bottom + 4 + h > window.innerHeight - 8 && r.top - 4 - h > 8;
    const left = Math.min(Math.max(8, r.right - W), window.innerWidth - W - 8);
    setPos({ top: up ? r.top - 4 - h : r.bottom + 4, left });
  };
  // Menyunun real hündürlüyü bilinəndən sonra yeri dəqiqləşdirilir
  const isOpen = pos !== null;
  useLayoutEffect(() => { if (isOpen) place(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const away = (e: MouseEvent) => { const n = e.target as Node; if (!btn.current?.contains(n) && !menu.current?.contains(n)) setPos(null); };
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); setPos(null); btn.current?.focus(); } };
    // Səhifə və ya cədvəl sürüşəndə menyu düymədən ayrılmasın: bağlanır
    const close = (e: Event) => { if (!menu.current?.contains(e.target as Node)) setPos(null); };
    const resize = () => setPos(null);
    document.addEventListener("mousedown", away); document.addEventListener("keydown", k, true);
    window.addEventListener("scroll", close, true); window.addEventListener("resize", resize);
    return () => {
      document.removeEventListener("mousedown", away); document.removeEventListener("keydown", k, true);
      window.removeEventListener("scroll", close, true); window.removeEventListener("resize", resize);
    };
  }, [isOpen]);

  return (
    <div className="relative inline-block">
      <button ref={btn} type="button" aria-label={label ?? t("Əməliyyatlar")} aria-haspopup="menu" aria-expanded={isOpen} onClick={() => (isOpen ? setPos(null) : place())}
        className="grid size-8 cursor-pointer place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"><MoreHorizontal size={17} aria-hidden /></button>
      {pos && typeof document !== "undefined" && createPortal(
        <ul ref={menu} role="menu" style={{ top: pos.top, left: pos.left, width: W }} onClick={(e) => e.stopPropagation()}
          className="fixed z-[70] rounded-xl border border-border bg-card p-1 text-left shadow-lg">
          {items.map((i) => (
            <li key={i.label}>
              <button type="button" role="menuitem" disabled={i.disabled} onClick={() => { setPos(null); i.run(); }}
                className={cn("flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm hover:bg-muted disabled:cursor-default disabled:opacity-40", i.danger && "text-destructive")}>
                <i.icon size={14} aria-hidden />{i.label}
              </button>
            </li>
          ))}
        </ul>, document.body,
      )}
    </div>
  );
}
