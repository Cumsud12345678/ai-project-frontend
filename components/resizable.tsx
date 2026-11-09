"use client";
// Dartılan panel eni: tutacağı siçan/barmaqla çək, ox düymələri ilə dəyiş, iki dəfə klikləyəndə standart enə qayıt.
// En brauzerdə yadda qalır (hər istifadəçinin öz ekranı üçün rahatlıq). Yalnız md və daha geniş ekranda işləyir.
import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const read = (k: string) => { try { const v = Number(localStorage.getItem(k)); return Number.isFinite(v) && v > 0 ? v : null; } catch { return null; } };
const write = (k: string, v: number) => { try { localStorage.setItem(k, String(Math.round(v))); } catch { /* gizli rejim */ } };

/**
 * edge: tutacaq panelin hansı kənarındadır. "right" — sol sütun (sağa çəkəndə genişlənir), "left" — sağ sütun (sola çəkəndə genişlənir).
 * Qaytarır: cari en, eni CSS dəyişəni kimi verən stil (md:w-[var(--pane-w)] ilə) və tutacaq elementi.
 */
export function useResizable(key: string, def: number, min: number, max: number, edge: "left" | "right", bp: "md" | "xl" = "md") {
  const storageKey = `ca:w:${key}`;
  const [w, setW] = useState(def);
  useEffect(() => { const v = read(storageKey); if (v) setW(Math.min(max, Math.max(min, v))); }, [storageKey, min, max]);
  const clamp = useCallback((v: number) => Math.min(max, Math.max(min, v)), [min, max]);
  const set = useCallback((v: number) => { const c = clamp(v); setW(c); write(storageKey, c); }, [clamp, storageKey]);
  const handle = <ResizeHandle width={w} min={min} max={max} edge={edge} bp={bp} onChange={set} onReset={() => set(def)} />;
  return { width: w, style: { "--pane-w": `${w}px` } as React.CSSProperties, handle };
}

function ResizeHandle({ width, min, max, edge, bp, onChange, onReset }: { width: number; min: number; max: number; edge: "left" | "right"; bp: "md" | "xl"; onChange: (w: number) => void; onReset: () => void }) {
  const { t } = useI18n();
  const start = useRef<{ x: number; w: number } | null>(null);
  const [drag, setDrag] = useState(false);
  const dir = edge === "right" ? 1 : -1;

  function down(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    start.current = { x: e.clientX, w: width };
    setDrag(true);
  }
  function move(e: React.PointerEvent<HTMLDivElement>) {
    if (!start.current) return;
    onChange(start.current.w + (e.clientX - start.current.x) * dir);
  }
  function up() { start.current = null; setDrag(false); }
  // Çəkmə zamanı mətn seçilməsin və kursor hər yerdə eyni qalsın
  useEffect(() => {
    if (!drag) return;
    const b = document.body.style;
    const prev = [b.userSelect, b.cursor];
    b.userSelect = "none"; b.cursor = "col-resize";
    return () => { b.userSelect = prev[0]!; b.cursor = prev[1]!; };
  }, [drag]);

  return (
    <div role="separator" aria-orientation="vertical" aria-label={t("Panelin enini dəyiş")} aria-valuenow={Math.round(width)} aria-valuemin={min} aria-valuemax={max} tabIndex={0}
      title={t("Çək: eni dəyiş · iki klik: əvvəlki ölçü")}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onDoubleClick={onReset}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); onChange(width + (e.key === "ArrowRight" ? 16 : -16) * dir); }
        else if (e.key === "Home") { e.preventDefault(); onReset(); }
      }}
      className={cn("group absolute inset-y-0 z-10 hidden w-2 cursor-col-resize touch-none focus-visible:outline-none", bp === "xl" ? "xl:block" : "md:block", edge === "right" ? "-right-1" : "-left-1")}>
      <span aria-hidden className={cn("absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 rounded-full transition-colors group-hover:bg-foreground/25 group-focus-visible:bg-foreground/40", drag && "bg-foreground/40")} />
    </div>
  );
}
