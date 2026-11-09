import * as React from "react";
import { cn } from "@/lib/utils";

/** Status nişanlarının vahid rəngləri: aktiv/hazır = yaşıl, xəbərdarlıq = kəhrəba, xəta = qırmızı, qalan hər şey = boz. */
export const BADGE_TONE = {
  neutral: "bg-muted text-muted-foreground",
  success: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20",
  warning: "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/20",
  danger: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20",
  info: "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-600/20",
} as const;
export type BadgeTone = keyof typeof BADGE_TONE;

export const Badge = ({ className, tone = "neutral", ...p }: React.ComponentProps<"span"> & { tone?: BadgeTone }) => (
  <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", BADGE_TONE[tone], className)} {...p} />
);
