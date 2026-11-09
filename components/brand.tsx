// Hazırcavab brend işarəsi: sürətlə yazan danışıq balonu. Paneldə, giriş səhifələrində və saytda eyni işarə.
// size ≤ 32 olanda kiçik ölçü üçün sadələşdirilmiş variant (detallar itməsin). inverted: tünd fonda ağ kvadrat.
import { cn } from "@/lib/utils";

export const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME || "Hazırcavab";

export function BrandMark({ size = 36, inverted = false, className }: { size?: number; inverted?: boolean; className?: string }) {
  const small = size <= 32;
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden className={cn("shrink-0", className)}>
      {small
        ? (inverted ? <><rect width="64" height="64" rx="14" fill="#ffffff"/><path fill="#18181b" d="M29 10h16a12 12 0 0 1 12 12v13a12 12 0 0 1 -12 12H30l-7.5 6.5c-.9.8-2.3.1-2.2-1.1l.5-5.4H29a12 12 0 0 1 -12 -12V22a12 12 0 0 1 12 -12z"/><g stroke="#f97316" strokeWidth="5.5" strokeLinecap="round"><path d="M6.5 22h6"/><path d="M4.5 33h8"/></g><g fill="#ffffff"><circle cx="28" cy="28.5" r="3.6"/><circle cx="37" cy="28.5" r="3.6"/><circle cx="46" cy="28.5" r="3.6"/></g></> : <><rect width="64" height="64" rx="14" fill="#18181b"/><path fill="#ffffff" d="M29 10h16a12 12 0 0 1 12 12v13a12 12 0 0 1 -12 12H30l-7.5 6.5c-.9.8-2.3.1-2.2-1.1l.5-5.4H29a12 12 0 0 1 -12 -12V22a12 12 0 0 1 12 -12z"/><g stroke="#f97316" strokeWidth="5.5" strokeLinecap="round"><path d="M6.5 22h6"/><path d="M4.5 33h8"/></g><g fill="#18181b"><circle cx="28" cy="28.5" r="3.6"/><circle cx="37" cy="28.5" r="3.6"/><circle cx="46" cy="28.5" r="3.6"/></g></>)
        : (inverted ? <><rect width="64" height="64" rx="15" fill="#ffffff"/><path fill="#18181b" d="M30 13h14a10 10 0 0 1 10 10v11a10 10 0 0 1 -10 10H33l-7.5 6.5c-.9.8-2.3.1-2.2-1.1l.5-5.4H30a10 10 0 0 1 -10 -10V23a10 10 0 0 1 10 -10z"/><g stroke="#f97316" strokeWidth="4" strokeLinecap="round"><path d="M9 22h7"/><path d="M6 30h10"/><path d="M10 38h6"/></g><g fill="#ffffff"><circle cx="29.5" cy="28.5" r="2.6"/><circle cx="37" cy="28.5" r="2.6"/><circle cx="44.5" cy="28.5" r="2.6"/></g></> : <><rect width="64" height="64" rx="15" fill="#18181b"/><path fill="#ffffff" d="M30 13h14a10 10 0 0 1 10 10v11a10 10 0 0 1 -10 10H33l-7.5 6.5c-.9.8-2.3.1-2.2-1.1l.5-5.4H30a10 10 0 0 1 -10 -10V23a10 10 0 0 1 10 -10z"/><g stroke="#f97316" strokeWidth="4" strokeLinecap="round"><path d="M9 22h7"/><path d="M6 30h10"/><path d="M10 38h6"/></g><g fill="#18181b"><circle cx="29.5" cy="28.5" r="2.6"/><circle cx="37" cy="28.5" r="2.6"/><circle cx="44.5" cy="28.5" r="2.6"/></g></>)}
    </svg>
  );
}

/** İşarə + söz: "hazır" qalın, "cavab" yüngül */
export function BrandLogo({ size = 36, inverted = false, className }: { size?: number; inverted?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <BrandMark size={size} inverted={inverted} />
      <span className={cn("text-[17px] tracking-tight", inverted ? "text-white" : "text-foreground")}>
        <span className="font-bold">hazır</span><span className={cn("font-medium", inverted ? "text-white/60" : "text-zinc-500")}>cavab</span>
      </span>
    </span>
  );
}
