"use client";
import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Flag } from "@/components/flag";
import type { Locale } from "@/lib/locale";

export type LangOption = { code: Locale; name: string };

/** Dil seçimi: bayraq + ad göstərən açılan siyahı (select). Klaviatura: ↑ ↓ Enter Esc. */
export function LangDropdown({ options, value, onChange, label, className = "", buttonClassName = "", up = false, alignRight = true, showName = false }: {
  options: LangOption[]; value: Locale; onChange: (l: Locale) => void; label: string;
  className?: string; buttonClassName?: string; up?: boolean; alignRight?: boolean; showName?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const id = useId();
  const current = options.find((o) => o.code === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open]);

  function pick(l: Locale) { setOpen(false); btn.current?.focus(); if (l !== value) onChange(l); }
  function openMenu() { setActive(Math.max(0, options.findIndex((o) => o.code === value))); setOpen(true); }
  function key(e: React.KeyboardEvent) {
    if (!open) { if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) { e.preventDefault(); openMenu(); } return; }
    if (e.key === "Escape") { e.preventDefault(); setOpen(false); btn.current?.focus(); }
    else if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => (i + 1) % options.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => (i - 1 + options.length) % options.length); }
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(options[active].code); }
    else if (e.key === "Tab") setOpen(false);
  }

  return (
    <div ref={root} className={`relative ${className}`} onKeyDown={key}>
      <button ref={btn} type="button" aria-haspopup="listbox" aria-expanded={open} aria-controls={`${id}-list`} aria-label={`${label}: ${current.name}`}
        onClick={() => (open ? setOpen(false) : openMenu())}
        className={`flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-2.5 text-sm text-foreground hover:bg-muted ${buttonClassName}`}>
        <Flag locale={current.code} />
        <span className={showName ? "" : "hidden sm:inline"}>{current.name}</span>
        <ChevronDown size={14} aria-hidden className={`text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <ul id={`${id}-list`} role="listbox" aria-label={label} aria-activedescendant={`${id}-${options[active].code}`}
          className={`absolute z-50 min-w-48 overflow-hidden rounded-xl border border-border bg-card p-1 text-sm text-foreground shadow-lg ${up ? "bottom-full mb-1.5" : "top-full mt-1.5"} ${alignRight ? "right-0" : "left-0"}`}>
          {options.map((o, i) => (
            <li key={o.code} id={`${id}-${o.code}`} role="option" aria-selected={o.code === value} lang={o.code}
              onPointerEnter={() => setActive(i)} onClick={() => pick(o.code)}
              className={`flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 ${i === active ? "bg-muted" : ""}`}>
              <Flag locale={o.code} />
              <span className="flex-1">{o.name}</span>
              {o.code === value && <Check size={15} className="text-primary" aria-hidden />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
