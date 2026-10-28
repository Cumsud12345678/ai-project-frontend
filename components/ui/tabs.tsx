"use client";
import { useRef } from "react";
import { cn } from "@/lib/utils";

export type TabItem<T extends string> = { value: T; label: string; badge?: number | string; icon?: React.ReactNode };

/** Səhifə bölmələri üçün alt xətli tab paneli (klaviatura: ← → Home End). */
export function Tabs<T extends string>({ value, onChange, items, label, className }: { value: T; onChange: (v: T) => void; items: TabItem<T>[]; label: string; className?: string }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const move = (i: number) => {
    const n = (i + items.length) % items.length;
    onChange(items[n].value);
    refs.current[n]?.focus();
  };
  return (
    <div className={cn("-mx-5 overflow-x-auto overflow-y-hidden px-5 md:mx-0 md:px-0", className)}>
      <div role="tablist" aria-label={label} className="flex w-full min-w-max gap-1 border-b border-border">
        {items.map((it, i) => {
          const on = it.value === value;
          return (
            <button key={it.value} ref={(el) => { refs.current[i] = el; }} type="button" role="tab" id={`tab-${it.value}`} aria-selected={on} tabIndex={on ? 0 : -1}
              onClick={() => onChange(it.value)}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight") { e.preventDefault(); move(i + 1); }
                else if (e.key === "ArrowLeft") { e.preventDefault(); move(i - 1); }
                else if (e.key === "Home") { e.preventDefault(); move(0); }
                else if (e.key === "End") { e.preventDefault(); move(items.length - 1); }
              }}
              className={cn("-mb-px flex cursor-pointer items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary",
                on ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:border-border hover:text-foreground")}>
              {it.icon}{it.label}
              {it.badge !== undefined && it.badge !== 0 && (
                <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", on ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>{it.badge}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}