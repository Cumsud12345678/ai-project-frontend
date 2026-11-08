"use client";
// Modal pəncərə: başlıq, sürüşən məzmun və aşağıda sağa düzülmüş düymələr (Ləğv et · əsas düymə).
// Esc və fona klik bağlayır, açıq olanda səhifə sürüşmür, fokus pəncərənin içində qalır.
import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function Modal({ open, onClose, title, description, children, footer, size = "md", busy, focusFirst = true }: {
  open: boolean; onClose: () => void; title: React.ReactNode; description?: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl"; /** iş gedərkən fona klik və Esc bağlamasın */ busy?: boolean; /** false: ilk sahəyə fokuslanmasın (uzun baxış pəncərəsi aşağı sürüşməsin) */ focusFirst?: boolean;
}) {
  const { t } = useI18n();
  const id = useId();
  const box = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // İlk sahəyə fokus (yoxdursa pəncərənin özünə)
    const first = !focusFirst ? null : box.current?.querySelector<HTMLElement>("input:not([type=hidden]):not([disabled]),textarea:not([disabled]),select:not([disabled])");
    (first ?? box.current)?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) { e.stopPropagation(); close.current(); }
      if (e.key === "Tab" && box.current) {
        const els = [...box.current.querySelectorAll<HTMLElement>("a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex='-1'])")];
        if (!els.length) return;
        const a = els[0]!, z = els[els.length - 1]!;
        if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
        else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
      }
    };
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("keydown", key); document.body.style.overflow = overflow; prev?.focus?.(); };
  }, [open, busy, focusFirst]);
  if (!open || typeof document === "undefined") return null;
  const w = { sm: "max-w-md", md: "max-w-xl", lg: "max-w-3xl", xl: "max-w-5xl" }[size];
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div ref={box} role="dialog" aria-modal="true" aria-labelledby={`${id}-t`} tabIndex={-1}
        className={cn("flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-border bg-card shadow-2xl outline-none sm:rounded-2xl", w)}>
        <div className="flex items-start gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 id={`${id}-t`} className="text-lg font-semibold">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
          </div>
          <button type="button" onClick={onClose} disabled={busy} aria-label={t("Bağla")} className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"><X size={18} aria-hidden /></button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border bg-muted/30 px-5 py-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
